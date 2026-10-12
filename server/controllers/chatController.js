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

const roots = [
  { key: "cardio", aliases: ["cardiology", "cardiologist", "cardio", "heart", "bp", "blood pressure"] },
  { key: "ortho", aliases: ["orthopedics", "orthopedist", "ortho", "bone", "joint", "back", "spine"] },
  { key: "neuro", aliases: ["neurology", "neurologist", "neuro", "brain", "nerve", "headache"] },
  { key: "derm", aliases: ["dermatology", "dermatologist", "derma", "skin", "rash"] },
  { key: "pedia", aliases: ["pediatric", "pediatrics", "pediatrician", "child", "kids"] },
  { key: "ophthalm", aliases: ["ophthalmology", "ophthalmologist", "eye", "vision"] },
  { key: "pulmon", aliases: ["pulmonology", "pulmonologist", "lung", "respiratory", "chest", "breath"] },
  { key: "rheumat", aliases: ["rheumatology", "rheumatologist", "arthritis", "joint pain"] },
  { key: "general", aliases: ["general", "physician", "gp"] },
];

const findSuggestedDoctor = (doctors, detectedSpecialty) => {
  if (!detectedSpecialty || !doctors || doctors.length === 0) return null;
  const target = detectedSpecialty.toLowerCase().trim();

  // 1. Direct match or substring
  let found = doctors.find((d) => {
    const s = (d.specialty || "").toLowerCase();
    return s === target || s.includes(target) || target.includes(s);
  });
  if (found) return found;

  // 2. Alias / Root match
  for (const r of roots) {
    const matchTarget = r.aliases.some((a) => target.includes(a) || a.includes(target));
    if (matchTarget) {
      found = doctors.find((d) => {
        const s = (d.specialty || "").toLowerCase();
        return r.aliases.some((a) => s.includes(a)) || s.includes(r.key);
      });
      if (found) return found;
    }
  }

  // 3. Fallback to General doctor
  return doctors.find((d) => (d.specialty || "").toLowerCase().includes("general")) || null;
};

const parseAIResponse = (rawContent) => {
  let reply = "";
  let isMedical = false;
  let detectedSpecialty = null;

  try {
    let cleaned = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end >= start) {
      const jsonStr = cleaned.substring(start, end + 1);
      const parsed = JSON.parse(jsonStr);
      reply = parsed.reply || "";
      isMedical = Boolean(parsed.isMedical);
      detectedSpecialty = parsed.specialty || null;
    } else {
      const parsed = JSON.parse(cleaned);
      reply = parsed.reply || "";
      isMedical = Boolean(parsed.isMedical);
      detectedSpecialty = parsed.specialty || null;
    }
  } catch (err) {
    // Regex fallback if JSON parsing failed
    const replyMatch = rawContent.match(/"reply"\s*:\s*"([^"]+)/i);
    if (replyMatch && replyMatch[1]) {
      reply = replyMatch[1];
    } else {
      reply = rawContent
        .replace(/^\{\s*"reply"\s*:\s*"?/gi, "")
        .replace(/"?\s*,?\s*"isMedical".*$/gi, "")
        .replace(/[\{\}]/g, "")
        .trim();
    }

    const isMedMatch = rawContent.match(/"isMedical"\s*:\s*(true|false)/i);
    if (isMedMatch) {
      isMedical = isMedMatch[1].toLowerCase() === "true";
    }

    const specMatch = rawContent.match(/"specialty"\s*:\s*"([^"]+)"/i);
    if (specMatch && specMatch[1] && specMatch[1] !== "null") {
      detectedSpecialty = specMatch[1];
    }
  }

  // Strip any accidental raw JSON syntax residue
  if (reply.startsWith('{"reply":') || reply.startsWith('{ "reply":') || reply.includes('"reply":')) {
    reply = reply
      .replace(/^\{\s*"reply"\s*:\s*"/i, "")
      .replace(/"\s*,?\s*"isMedical".*$/gi, "")
      .replace(/[\{\}]/g, "")
      .trim();
  }

  return { reply, isMedical, detectedSpecialty };
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

    // Fetch doctors from database for dynamic matching
    const allDoctors = await prisma.doctor.findMany();
    const availableSpecialties = [
      ...new Set(
        allDoctors
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

    // Fast working models list
    const CANDIDATE_MODELS = [
      process.env.GEMINI_MODEL,
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.6-flash",
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
   - If health symptoms, pain, BP, fever, eye, skin, or medical concerns are discussed:
     - Provide brief initial care advice under 30 words.
     - Select the best matching specialty from the hospital's available specialties (${specialtyList}).
     - Set "isMedical" to true.
   - If the message is a pure greeting or unrelated to health:
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
                maxOutputTokens: 1000,
                responseMimeType: "application/json"
              },
            },
            {
              headers: { "Content-Type": "application/json" },
              timeout: 5000,
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

    // Parse the structured JSON response cleanly
    let reply = "Please describe your symptoms or ask a health-related question, and I will provide advice and suggest a doctor.";
    let detectedSpecialty = null;
    let isMedical = false;

    if (modelSucceeded) {
      const parsedRes = parseAIResponse(rawContent);
      reply = trimToMaxWords(parsedRes.reply || reply, 30);
      isMedical = parsedRes.isMedical;
      detectedSpecialty = parsedRes.specialty;

      // Fallback: If user mentions obvious health keywords, force isMedical = true
      const healthKeywords = /pain|bp|pressure|fever|cough|dizziness|headache|rash|infection|sick|hurt|stomach|eye|skin|chest|heart|breath|joint|bone/i;
      if (!isMedical && healthKeywords.test(message)) {
        isMedical = true;
      }
    } else {
      reply = "Our clinical assistant is experiencing a momentary connection delay. Please describe your symptoms again, or consult one of our hospital doctors directly.";
    }

    // Query database for matching doctor using smart match
    let doctor = null;
    let specialty = null;

    if (isMedical) {
      // Find doctor using detectedSpecialty or symptoms matching
      let matchedDoctor = findSuggestedDoctor(allDoctors, detectedSpecialty || message);

      if (matchedDoctor) {
        doctor = formatDoctor(matchedDoctor);
        specialty = matchedDoctor.specialty;
        console.log(`👨‍⚕️ [Chat Controller] Doctor matched from DB: ${doctor.name} (${specialty}, ID: ${doctor.id})`);
      } else {
        specialty = detectedSpecialty;
        console.log(`ℹ️ [Chat Controller] Suggested specialty "${detectedSpecialty}", but no specific doctor found`);
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
