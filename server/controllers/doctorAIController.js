import prisma from "../prisma/client.js";
import axios from "axios";

const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

const RETIRED_MODELS = new Set([
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-1.0-pro",
]);

const CANDIDATE_CHAT_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
].filter((m) => Boolean(m) && !RETIRED_MODELS.has(m));

const UNIQUE_MODELS = [...new Set(CANDIDATE_CHAT_MODELS)];

async function executeGeminiChat({ messages, json = false, tag = "Doctor AI" }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment!");
  }

  let lastError = null;

  for (let i = 0; i < UNIQUE_MODELS.length; i++) {
    const model = UNIQUE_MODELS[i];
    const startTime = Date.now();
    console.log(`🤖 [${tag}] Attempt ${i + 1}/${UNIQUE_MODELS.length}: Querying model "${model}"...`);

    try {
      const response = await axios.post(
        `${GEMINI_OPENAI_BASE}/chat/completions`,
        {
          model,
          messages,
          ...(json ? { response_format: { type: "json_object" } } : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      const elapsed = Date.now() - startTime;
      const content = response.data.choices[0].message.content;
      console.log(`✅ [${tag}] Model "${model}" responded successfully in ${elapsed}ms`);
      return { content, model, elapsed };
    } catch (err) {
      const elapsed = Date.now() - startTime;
      lastError = err;
      const status = err.response?.status || "NO_STATUS";
      const apiMsg = err.response?.data?.error?.message || err.message;
      console.warn(`⚠️ [${tag}] Model "${model}" failed after ${elapsed}ms (Status ${status}): ${apiMsg}`);

      if (i < UNIQUE_MODELS.length - 1) {
        console.log(`🔄 [${tag}] Falling over to model: "${UNIQUE_MODELS[i + 1]}"...`);
      }
    }
  }

  throw lastError;
}

/**
 * AI CHAT + MEMORY
 */
export const doctorAIChat = async (req, res) => {
  console.log("\n==================== [DOCTOR AI CHAT] ====================");
  try {
    const { message, patient } = req.body;
    const userId = req.headers.userid;

    console.log(`[Doctor AI Chat] Patient: "${patient?.name}" (ID: ${patient?.id}) | User ID: ${userId}`);
    console.log(`[Doctor AI Chat] Message: "${message}"`);

    let doctorId = null;

    if (userId) {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: Number(userId) },
      });
      doctorId = doctor?.id || null;
    }

    // CHAT MEMORY
    const oldChats = await prisma.doctorChat.findMany({
      where: { patientId: patient?.id },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const history = oldChats.flatMap((c) => [
      { role: "user", content: c.message },
      { role: "assistant", content: c.reply },
    ]);

    // GET MEDICAL RECORD
    const record = await prisma.medicalRecord.findFirst({
      where: { patientId: patient?.id },
      orderBy: { createdAt: "desc" },
    });

    const messages = [
      {
        role: "system",
        content: `
          You are a senior clinical doctor assistant helping real doctors.

          STRICT RESPONSE RULES:
          - Respond like an experienced doctor
          - NEVER say: "unknown", "cannot assess", "insufficient information", "medical history unavailable", "consult physician", "seek professional advice"
          - NEVER sound like an AI system
          - NEVER explain limitations or robotic analysis language
          - Always give clinical observations, likely concerns, practical recommendations, preventive advice, and follow-up suggestions

          STYLE RULES:
          - Use clean markdown
          - Sound confident and clinically useful

          FORMAT:
          ## Clinical Assessment
          Short professional assessment.

          ## Observations
          - Point
          - Point

          ## Recommendations
          - Point
          - Point

          ## Follow-up
          - Point
          - Point
        `,
      },
      ...history,
      {
        role: "user",
        content: `
          Doctor Message: ${message}

          Patient Info:
          Name: ${patient?.name}
          Age: ${patient?.age}
          Gender: ${patient?.gender}
          Blood Group: ${patient?.bloodGroup}
          Status: ${patient?.status}

          Medical Record:
          ${record ? JSON.stringify(record) : "No medical record available"}

          Provide a professional doctor-style clinical assessment.
        `,
      },
    ];

    const { content: reply, model } = await executeGeminiChat({
      messages,
      tag: "Doctor AI Chat",
    });

    await prisma.doctorChat.create({
      data: {
        message,
        reply,
        doctorId,
        patientId: patient?.id,
      },
    });

    console.log(`✅ [Doctor AI Chat] Reply saved and returned (Model: ${model})`);
    res.json({ reply });
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error("❌ [Doctor AI Chat] Error:", errorMsg);
    res.status(500).json({ error: "AI failed", detail: errorMsg });
  }
};

/**
 * GET CHAT HISTORY
 */
export const getDoctorChats = async (req, res) => {
  try {
    const patientId = Number(req.query.patientId);
    console.log(`📋 [Doctor AI Chats] Fetching history for patientId: ${patientId}`);

    const chats = await prisma.doctorChat.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
    });

    console.log(`✅ [Doctor AI Chats] Found ${chats.length} messages`);
    res.json(chats);
  } catch (err) {
    console.error("❌ [Doctor AI Chats] Fetch chats error:", err.message);
    res.status(500).json({ error: "Failed to fetch chats", detail: err.message });
  }
};

/**
 * Medical Report PDF
 */
export const generatePDFMedicalReport = async (req, res) => {
  console.log("\n==================== [GENERATE MEDICAL REPORT] ====================");
  try {
    const { patient } = req.body;

    if (!patient?.id) {
      console.warn("⚠️ [Generate Report] Missing patient in request body");
      return res.status(400).json({ error: "Patient required" });
    }

    console.log(`[Generate Report] Patient: "${patient.name}" (ID: ${patient.id})`);

    // GET CHAT HISTORY
    const chats = await prisma.doctorChat.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "asc" },
      take: 30,
    });

    const conversation = chats
      .map((c) => `Doctor: ${c.message}\nAI: ${c.reply}`)
      .join("\n\n");

    const messages = [
      {
        role: "system",
        content: `
You are a senior clinical assistant doctor.

CRITICAL RULES:
- Return ONLY valid JSON
- NO markdown
- NO explanation
- NO text outside JSON
- NEVER leave fields empty
- NEVER use "unknown"
- Use medically accurate clinical language

You MUST return:
{
  "symptoms": "string",
  "diagnosis": "string",
  "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "vitals": "string",
  "prescription": "string",
  "red_flags": ["string"],
  "recommendations": "string",
  "notes": "string"
}
        `,
      },
      {
        role: "user",
        content: `
Patient:
Name: ${patient.name}
Age: ${patient.age}
Gender: ${patient.gender}
Blood Group: ${patient.bloodGroup}

Chat History:
${conversation || "No chat history"}
        `,
      },
    ];

    const { content: rawContent, model } = await executeGeminiChat({
      messages,
      json: true,
      tag: "Medical Report Generation",
    });

    let raw = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start === -1 || end === -1) {
      console.error("❌ [Generate Report] Invalid JSON format returned:", raw);
      return res.status(500).json({ error: "Invalid AI response format", raw });
    }

    const report = JSON.parse(raw.substring(start, end + 1));

    // SAVE INTO DATABASE
    await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        symptoms: report.symptoms,
        diagnosis: report.diagnosis,
        vitals: report.vitals,
        prescription: report.prescription,
        notes: report.notes,
        riskLevel: report.risk_level,
        redFlags: JSON.stringify(report.red_flags || []),
        recommendations: report.recommendations,
      },
    });

    console.log(`✅ [Generate Report] Medical report saved and returned (Model: ${model})`);
    res.json(report);
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error("❌ [Generate Report] Error:", errorMsg);
    res.status(500).json({ error: "AI report generation failed", detail: errorMsg });
  }
};