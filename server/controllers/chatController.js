import prisma from "../prisma/client.js";
import axios from "axios";

const normalizeSpecialty = (value = "") =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

// Enforce maximum words constraint (strictly max 30 words)
const trimToMaxWords = (text = "", maxWords = 30) => {
  if (!text) return "";
  const cleaned = text.replace(/\s*\(ID:\s*\d+\)/gi, "").trim();
  const words = cleaned.split(/\s+/);
  if (words.length <= maxWords) return cleaned;

  const slice = words.slice(0, maxWords).join(" ");
  const lastPunctuation = Math.max(
    slice.lastIndexOf("."),
    slice.lastIndexOf("!"),
    slice.lastIndexOf("?")
  );
  if (lastPunctuation > 20) {
    return slice.substring(0, lastPunctuation + 1);
  }
  return slice + "...";
};

const formatDoctor = (doctor) =>
  doctor && {
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty,
    mobile: doctor.mobile,
    experience: doctor.experience,
  };

// Match detected specialty dynamically against doctors in database
const findSuggestedDoctor = (doctors, detectedSpecialty) => {
  if (!detectedSpecialty || !doctors || doctors.length === 0) return null;
  const detected = normalizeSpecialty(detectedSpecialty);

  return (
    doctors.find((doctor) => {
      const specialty = normalizeSpecialty(doctor.specialty);
      return (
        specialty === detected ||
        specialty.includes(detected) ||
        detected.includes(specialty)
      );
    }) || null
  );
};

export const chatWithAI = async (req, res) => {
  const startTime = Date.now();
  console.log("\n==================== [AI CHAT REQUEST START] ====================");
  console.log(`[Chat Controller] Timestamp: ${new Date().toISOString()}`);
  console.log(`[Chat Controller] Headers -> userId: "${req.headers.userid || ""}", role: "${req.headers.role || ""}"`);
  console.log("[Chat Controller] Patient Message:", req.body?.message);

  try {
    const { message, history: clientHistory } = req.body;

    if (!message || !message.trim()) {
      console.warn("⚠️ [Chat Controller] Message is empty");
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    let patientId = null;

    // Get patient from headers if logged in
    const userId = Number(req.headers.userid);
    if (userId) {
      const patient = await prisma.patient.findUnique({
        where: { userId },
      });
      patientId = patient?.id || null;
      console.log(`[Chat Controller] Patient lookup for userId ${userId}: ${patient ? `Found (ID: ${patient.id}, Name: ${patient.name})` : "Not found in DB"}`);
    }

    // Capture past 6 to 7 messages history
    let historyLines = [];
    if (Array.isArray(clientHistory) && clientHistory.length > 0) {
      historyLines = clientHistory.slice(-7).map((h) => {
        const sender = h.sender || (h.type === "user" ? "Patient" : "Assistant");
        const text = h.text || h.message || h.reply || "";
        return `${sender}: ${text}`;
      });
    } else if (patientId) {
      const pastChats = await prisma.chat.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 4,
      });
      historyLines = pastChats
        .reverse()
        .flatMap((c) => [`Patient: ${c.message}`, `Assistant: ${c.reply}`])
        .slice(-7);
    }

    const historySection =
      historyLines.length > 0
        ? `\nRecent Conversation History (past 6-7 messages):\n${historyLines.join("\n")}\n`
        : "";

    console.log(`[Chat Controller] Conversation History Context (${historyLines.length} messages):\n${historyLines.join("\n") || "(None)"}`);

    // Fetch unique hospital specialties dynamically from database (lean query)
    const specialtyRecords = await prisma.doctor.findMany({
      where: { specialty: { not: "" } },
      select: { specialty: true },
      distinct: ["specialty"],
    });

    const availableSpecialties = [
      ...new Set(
        specialtyRecords
          .map((d) => d.specialty?.trim())
          .filter(Boolean)
      ),
    ];

    const specialtyList =
      availableSpecialties.length > 0
        ? availableSpecialties.join(", ")
        : "General Doctor";

    console.log(`[Chat Controller] Dynamically loaded ${availableSpecialties.length} hospital specialties: [${specialtyList}]`);

    // Instant fast-path for common greetings
    const cleanMsg = message.trim().toLowerCase();
    const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|namaste|hola|help)\b/i.test(cleanMsg) && cleanMsg.split(/\s+/).length <= 4;
    
    if (isGreeting && (!clientHistory || clientHistory.length === 0)) {
      const quickReply = "Hello! How can I assist you with your health or medical symptoms today?";
      if (patientId) {
        await prisma.chat.create({
          data: {
            patientId,
            message,
            reply: quickReply,
          },
        });
      }
      console.log(`⚡ [Chat Controller] Instant greeting resolved in ${Date.now() - startTime}ms`);
      return res.json({
        reply: quickReply,
        isMedical: false,
        doctor: null,
      });
    }

    // Model candidate list (prioritizing ultra-fast models)
    const CANDIDATE_MODELS = [
      process.env.GEMINI_MODEL,
      "gemini-3-flash-preview",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.5-flash",
      "gemini-3.8-flash",
    ].filter(Boolean);

    const modelsToTry = [...new Set(CANDIDATE_MODELS)];
    const GEMINI_NATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
    const apiKey = process.env.GEMINI_API_KEY;

    let rawContent = "{}";
    let modelSucceeded = false;
    let modelUsed = "";

    const promptText = `
You are a helpful and professional clinical assistant for a healthcare hospital.
${historySection}
Patient's current message:
"${message}"

Hospital Medical Specialties available:
${specialtyList}

INSTRUCTIONS:
1. CONVERSATION CONTEXT:
   - Remember and consider the recent conversation history above so you can answer follow-up questions accurately.
2. SHORT LENGTH CONSTRAINT:
   - Your "reply" MUST BE SHORT: STRICTLY MAXIMUM 30 WORDS (1 to 2 brief sentences).
   - Do NOT write lengthy explanations. Give direct, empathetic advice and recommend consulting the appropriate specialist concisely.
3. SPECIALTY SUGGESTION:
   - If health symptoms or follow-up questions are discussed:
     - Provide brief initial care advice under 30 words.
     - Match the condition to the most appropriate specialty from the hospital's available specialties (${specialtyList}).
     - Set "isMedical" to true.
   - If the message is a greeting or unrelated to health/symptoms:
     - Greet them politely and briefly (under 20 words).
     - Set "isMedical" to false and "specialty" to null.

RETURN ONLY A VALID JSON OBJECT:
{
  "reply": "Brief medical advice or guidance (MAXIMUM 30 WORDS)",
  "isMedical": true or false,
  "specialty": "Matching specialty name from the available specialties list, or null"
}
    `.trim();

    // Call Gemini with model fallback
    if (apiKey) {
      for (let i = 0; i < modelsToTry.length; i++) {
        const currentModel = modelsToTry[i];
        const attemptStartTime = Date.now();
        console.log(`🚀 [Chat Controller] [Attempt ${i + 1}/${modelsToTry.length}] Querying model: "${currentModel}"...`);

        try {
          const response = await axios.post(
            `${GEMINI_NATIVE_BASE}/${currentModel}:generateContent?key=${apiKey}`,
            {
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 500,
                responseMimeType: "application/json"
              },
            },
            {
              headers: { "Content-Type": "application/json" },
              timeout: 4500,
            }
          );

          const attemptElapsed = Date.now() - attemptStartTime;
          rawContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          modelSucceeded = true;
          modelUsed = currentModel;

          console.log(`✅ [Chat Controller] Model "${currentModel}" responded in ${attemptElapsed}ms`);
          console.log(`📥 [Chat Controller] Raw Output:`, rawContent);
          break;
        } catch (err) {
          const attemptElapsed = Date.now() - attemptStartTime;
          const status = err?.response?.status;
          const apiError = err?.response?.data?.error?.message || err.message;

          console.warn(`⚠️ [Chat Controller] Model "${currentModel}" failed after ${attemptElapsed}ms (Status ${status}): ${apiError}`);

          if (i < modelsToTry.length - 1) {
            console.log(`🔄 [Chat Controller] Failing over to next model: "${modelsToTry[i + 1]}"...`);
          }
        }
      }
    }

    // Parse the structured JSON response
    let reply = "Please describe your symptoms or ask a health-related question, and I will provide advice and suggest a doctor.";
    let detectedSpecialty = null;
    let isMedical = false;

    if (modelSucceeded) {
      try {
        let cleaned = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
        if (cleaned.includes("{") && !cleaned.includes("}")) {
          cleaned = cleaned + "\n}";
        }
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end >= start) {
          const jsonStr = cleaned.substring(start, end + 1);
          const parsed = JSON.parse(jsonStr);
          reply = trimToMaxWords(parsed.reply || reply, 30);
          isMedical = Boolean(parsed.isMedical);
          detectedSpecialty = parsed.specialty || null;
        }
      } catch (e) {
        console.warn("⚠️ [Chat Controller] JSON parse fallback on AI output:", e.message);
        // Extract specialty if mentioned in text
        const foundSpec = availableSpecialties.find((s) => new RegExp(`\\b${s}\\b`, "i").test(rawContent));
        if (foundSpec) {
          detectedSpecialty = foundSpec;
          isMedical = true;
        }
        reply = trimToMaxWords(rawContent || reply, 30);
      }
    } else {
      reply = "Our clinical assistant is experiencing a momentary connection delay. Please describe your symptoms again, or consult one of our hospital doctors directly.";
    }

    // Backend queries the database for the matching doctor
    let doctor = null;
    let specialty = null;

    if (isMedical && detectedSpecialty) {
      // 1. Direct match on specialty from database (MySQL matches case-insensitively)
      let matched = await prisma.doctor.findFirst({
        where: {
          specialty: {
            contains: detectedSpecialty.trim(),
          },
        },
        orderBy: {
          id: "asc",
        },
      });

      // 2. Fallback: match normalized specialty from available list
      if (!matched) {
        const normalizedTarget = normalizeSpecialty(detectedSpecialty);
        const bestSpecialty = availableSpecialties.find((sp) => {
          const normSp = normalizeSpecialty(sp);
          return (
            normSp === normalizedTarget ||
            normSp.includes(normalizedTarget) ||
            normalizedTarget.includes(normSp)
          );
        });

        if (bestSpecialty) {
          matched = await prisma.doctor.findFirst({
            where: {
              specialty: bestSpecialty,
            },
            orderBy: {
              id: "asc",
            },
          });
        }
      }

      // 3. Fallback to General Doctor if available
      if (!matched) {
        matched = await prisma.doctor.findFirst({
          where: {
            specialty: {
              contains: "General",
            },
          },
        });
      }

      if (matched) {
        doctor = formatDoctor(matched);
        specialty = matched.specialty;
        console.log(`👨‍⚕️ [Chat Controller] Doctor matched from DB by specialty "${detectedSpecialty}": ${doctor.name} (${specialty}, ID: ${doctor.id})`);
      } else {
        specialty = detectedSpecialty;
        console.log(`ℹ️ [Chat Controller] AI suggested specialty "${detectedSpecialty}", but no doctor found in DB`);
      }
    } else {
      console.log("ℹ️ [Chat Controller] Non-medical query; doctor card suppressed");
    }

    // Save chat to database
    console.log("💾 [Chat Controller] Saving chat to database...");
    const savedChat = await prisma.chat.create({
      data: {
        message,
        reply,
        specialty: specialty || null,
        patientId: patientId || null,
      },
    });
    console.log(`💾 [Chat Controller] Chat saved successfully (Chat ID: ${savedChat.id})`);

    const totalElapsed = Date.now() - startTime;
    console.log(`🏁 [Chat Controller] Request completed in ${totalElapsed}ms`);
    console.log("==================== [AI CHAT REQUEST END] ====================\n");

    // Return advice and suggested doctor
    res.json({
      reply,
      doctor: doctor || null,
    });
  } catch (error) {
    const totalElapsed = Date.now() - startTime;
    console.error(`💥 [Chat Controller Critical Error] after ${totalElapsed}ms:`, {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Failed to process chat", detail: error.message });
  }
};

export const getChats = async (req, res) => {
  console.log("\n📜 [Get Chats] Fetching patient chat history...");
  try {
    const userId = Number(req.headers.userid);

    if (!userId) {
      console.warn("⚠️ [Get Chats] User ID missing from headers");
      return res.status(400).json({ error: "User ID required" });
    }

    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      console.warn(`⚠️ [Get Chats] Patient record not found for userId: ${userId}`);
      return res.status(404).json({ error: "Patient not found" });
    }

    const chats = await prisma.chat.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "asc" },
    });

    const doctors = await prisma.doctor.findMany();
    console.log(`✅ [Get Chats] Found ${chats.length} chats for Patient ID: ${patient.id}`);

    res.json(
      chats.map((chat) => ({
        ...chat,
        doctor: chat.specialty ? formatDoctor(findSuggestedDoctor(doctors, chat.specialty)) : null,
      }))
    );
  } catch (err) {
    console.error("❌ [Get Chats Error]:", { message: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to fetch chats", detail: err.message });
  }
};

export const clearChats = async (req, res) => {
  console.log("\n🗑️ [Clear Chats] Clearing patient chat history...");
  try {
    const userId = Number(req.headers.userid);

    if (!userId) {
      console.warn("⚠️ [Clear Chats] User ID missing from headers");
      return res.status(400).json({ error: "User ID required" });
    }

    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      console.warn(`⚠️ [Clear Chats] Patient record not found for userId: ${userId}`);
      return res.status(404).json({ error: "Patient not found" });
    }

    const deleted = await prisma.chat.deleteMany({
      where: { patientId: patient.id },
    });

    console.log(`✅ [Clear Chats] Deleted ${deleted.count} chats for Patient ID: ${patient.id}`);
    res.json({ message: "Chat history cleared successfully", count: deleted.count });
  } catch (err) {
    console.error("❌ [Clear Chats Error]:", { message: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to clear chats", detail: err.message });
  }
};
