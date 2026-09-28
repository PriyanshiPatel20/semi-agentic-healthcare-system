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

    // Fetch available specialties from DB before the AI call
    const doctors = await prisma.doctor.findMany();
    const availableSpecialties = [
      ...new Set(doctors.map((doctor) => doctor.specialty).filter(Boolean)),
    ];
    const specialtyList = availableSpecialties.length > 0
      ? availableSpecialties.join(", ")
      : "General Physician";

    // SINGLE AI CALL (Gemini 3.6 Flash) - Structured JSON output
    const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
    const GEMINI_MODEL = "gemini-3.6-flash";

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
            messages: [
              {
                role: "system",
                content: `You are a medical assistant for a healthcare application.

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

2. MEDICINE QUESTIONS
- If the user asks about a medicine, explain its general purpose, common uses, or general information.
- Do not tell the user to start, stop, increase, or decrease a medicine unless this information is already explicitly provided by their doctor.
- Do not invent medicine names, dosages, or prescriptions.

3. NON-MEDICAL OR RANDOM INPUT
- If the user's message is random, meaningless, unclear, or unrelated to health or medicine, DO NOT provide health tips, wellness advice, nutrition advice, exercise advice, sleep advice, or other medical information.
- Set "reply" to EXACTLY: "Please state your health concerns or symptoms clearly."

4. DOCTOR RECOMMENDATION
- Do NOT automatically recommend seeing a doctor.
- Only mention consulting a doctor when it is relevant to the user's specific health question, symptoms, medicine, or situation.
- Do not add phrases such as "Please consult a doctor" to normal health questions unless there is a specific reason.

5. RESPONSE FORMAT
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

7. SPECIALTY RECOMMENDATION
- Detect the relevant doctor specialty for the patient's concern.
- Pick exactly one specialty from the available hospital list: ${specialtyList}
- If no specialty is suitable or the query is non-medical, pick "General Physician".

OUTPUT FORMAT:
You MUST output a valid JSON object with EXACTLY two fields:
{
  "reply": "Your medical answer or warning",
  "specialty": "The detected specialty name"
}`,
              },
              { role: "user", content: message },
            ],
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
        break; // Success, exit retry loop
      } catch (err) {
        console.log(`AI Chat Attempt ${attempts} Error:`, err?.response?.data || err.message);
        if (attempts >= maxAttempts) {
          rawContent = JSON.stringify({
            reply: "The AI service is temporarily busy. Please try asking your health question again.",
            specialty: "General Physician"
          });
        } else {
          // Short delay before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // Parse the structured JSON response from single AI prompt
    let reply = "Please state your health concerns or symptoms clearly.";
    let detectedSpecialty = "General Physician";
    try {
      const parsed = JSON.parse(rawContent);
      reply = parsed.reply || reply;
      detectedSpecialty = parsed.specialty || detectedSpecialty;
    } catch (e) {
      reply = rawContent || reply;
    }

    const doctor = findSuggestedDoctor(doctors, detectedSpecialty);
    const specialty = doctor?.specialty || detectedSpecialty;

    // SAVE CHAT IN DB
    await prisma.chat.create({
      data: {
        message,
        reply,
        specialty,
        patientId: patientId || null,
      },
    });

    // RESPONSE
    res.json({
      reply,
      doctor: formatDoctor(doctor),
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
        doctor: formatDoctor(findSuggestedDoctor(doctors, chat.specialty)),
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
