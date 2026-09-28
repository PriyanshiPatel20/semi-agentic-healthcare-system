import prisma from "../prisma/client.js";
import axios from "axios";

const normalizeSpecialty = (value = "") =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const formatDoctor = (doctor) =>
  doctor && {
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty,
    mobile: doctor.mobile,
    experience: doctor.experience,
  };

// Match detected specialty against database specialties
const findSuggestedDoctor = (doctors, detectedSpecialty) => {
  if (!detectedSpecialty) return null;
  const detected = normalizeSpecialty(detectedSpecialty);

  return doctors.find((doctor) => {
    const specialty = normalizeSpecialty(doctor.specialty);
    return (
      specialty === detected ||
      specialty.includes(detected) ||
      detected.includes(specialty)
    );
  });
};

export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;
    let patientId = null;

    // Get patient using userid header (same auth pattern as rest of app)
    const userId = Number(req.headers.userid);
    if (userId) {
      const patient = await prisma.patient.findUnique({
        where: { userId },
      });
      patientId = patient?.id || null;
    }

    // Load last 7 messages from chat history for context memory
    let conversationHistory = [];
    if (patientId) {
      const pastChats = await prisma.chat.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 7,
      });
      // Sort chronologically (oldest to newest)
      pastChats.reverse();

      for (const chat of pastChats) {
        if (chat.message) {
          conversationHistory.push({ role: "user", content: chat.message });
        }
        if (chat.reply) {
          conversationHistory.push({ role: "assistant", content: chat.reply });
        }
      }
    }

    // Fetch available specialties from DB before the AI call
    const doctors = await prisma.doctor.findMany();
    const availableSpecialties = [
      ...new Set(doctors.map((doctor) => doctor.specialty).filter(Boolean)),
    ];
    const specialtyList = availableSpecialties.length > 0
      ? availableSpecialties.join(", ")
      : "General Physician";

    // SINGLE AI CALL (Gemini 3.6 Flash) - Structured JSON output with history
    const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
    const GEMINI_MODEL = "gemini-3.6-flash";

    const systemPrompt = `You are a medical assistant for a healthcare application.

Your job is to answer ONLY questions related to:
- Health
- Symptoms
- Diseases and medical conditions
- Medicines and medication-related questions
- Medical reports and test results
- Treatments and general healthcare information
- Appointments or follow-up questions related to healthcare

IMPORTANT RULES:

1. HEALTH-RELATED QUESTIONS
- If the user's question is related to health, symptoms, medicine, treatment, or medical information, answer clearly and briefly.
- Use simple, easy-to-understand language.
- Do not use unnecessary medical jargon.
- Answer only what the user asked.
- Do not add unrelated health advice.
- Set "isMedical" to true.

2. MEDICINE QUESTIONS
- If the user asks about a medicine, explain its general purpose, common uses, or general information.
- Do not tell the user to start, stop, increase, or decrease a medicine unless this information is already explicitly provided by their doctor.
- Do not invent medicine names, dosages, or prescriptions.
- Set "isMedical" to true.

3. NON-MEDICAL OR RANDOM INPUT
- If the user's message is random, meaningless, unclear, or unrelated to health or medicine, DO NOT provide health tips, wellness advice, nutrition advice, exercise advice, sleep advice, or other medical information.
- Set "reply" to EXACTLY: "Please state your health concerns or symptoms clearly."
- Set "isMedical" to false.
- Set "specialty" to null.

4. DOCTOR RECOMMENDATION
- Do NOT automatically recommend seeing a doctor in text.
- If "isMedical" is true, pick the most suitable doctor specialty from available list: ${specialtyList}.
- If "isMedical" is false, set "specialty" to null.

5. RESPONSE FORMAT & CONVERSATION CONTEXT
- Maintain conversation memory across past messages to provide contextual answers.
- Keep responses concise and directly related to the user's question.
- Do not greet the user unless they greet you first.
- Do not provide general wellness tips unless the user specifically asks for them.
- Do not repeat the user's question.
- Do not add unnecessary disclaimers.
- Do not add unrelated suggestions.
- Never answer a random or meaningless message with general health advice.

6. SAFETY
- Never diagnose a condition with certainty from limited information.
- Never invent medical facts, medicines, dosages, test results, or patient information.
- If the user describes potentially urgent or severe symptoms, clearly explain that urgent medical evaluation may be appropriate.

OUTPUT FORMAT:
You MUST output a valid JSON object with EXACTLY these fields:
{
  "reply": "Your medical answer or warning, or 'Please state your health concerns or symptoms clearly.'",
  "isMedical": true or false,
  "specialty": "Suggested specialty from available list if isMedical is true, or null if isMedical is false"
}`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    let rawContent = "{}";
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await axios.post(
          `${GEMINI_BASE}/chat/completions`,
          {
            model: GEMINI_MODEL,
            response_format: { type: "json_object" },
            messages: apiMessages,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 15000,
          }
        );

        rawContent = response.data?.choices?.[0]?.message?.content || "{}";
        break; // Success
      } catch (err) {
        console.log(`AI Chat Attempt ${attempts} Error:`, err?.response?.data || err.message);
        if (attempts >= maxAttempts) {
          rawContent = JSON.stringify({
            reply: "The AI service is temporarily busy. Please try asking your health question again.",
            isMedical: false,
            specialty: null
          });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // Parse the structured JSON response
    let reply = "Please state your health concerns or symptoms clearly.";
    let detectedSpecialty = null;
    let isMedical = false;

    try {
      const parsed = JSON.parse(rawContent);
      reply = parsed.reply || reply;
      isMedical = Boolean(parsed.isMedical);
      if (isMedical && parsed.specialty) {
        detectedSpecialty = parsed.specialty;
      }
    } catch (e) {
      reply = rawContent || reply;
    }

    let doctor = null;
    let specialty = null;

    if (isMedical && detectedSpecialty) {
      const matchedDoctor = findSuggestedDoctor(doctors, detectedSpecialty);
      if (matchedDoctor) {
        doctor = formatDoctor(matchedDoctor);
        specialty = matchedDoctor.specialty;
      } else {
        specialty = detectedSpecialty;
      }
    }

    // SAVE CHAT IN DB
    await prisma.chat.create({
      data: {
        message,
        reply,
        specialty: specialty || null,
        patientId: patientId || null,
      },
    });

    // RESPONSE
    res.json({
      reply,
      doctor: doctor || null,
    });

  } catch (error) {
    console.log("Chat Controller Error:", error);
    res.status(500).json({ error: "Failed to process chat" });
  }
};

export const getChats = async (req, res) => {
  try {
    const userId = Number(req.headers.userid);

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const chats = await prisma.chat.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "asc" },
    });

    const doctors = await prisma.doctor.findMany();
    res.json(
      chats.map((chat) => ({
        ...chat,
        doctor: chat.specialty ? formatDoctor(findSuggestedDoctor(doctors, chat.specialty)) : null,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chats" });
  }
};

export const clearChats = async (req, res) => {
  try {
    const userId = Number(req.headers.userid);

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    await prisma.chat.deleteMany({
      where: { patientId: patient.id },
    });

    res.json({ message: "Chat history cleared successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear chats" });
  }
};
