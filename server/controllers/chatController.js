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
    const userId = Number(req.headers.userid);

    // Parallel DB fetch for speed
    const [doctors, patient] = await Promise.all([
      prisma.doctor.findMany(),
      userId ? prisma.patient.findUnique({ where: { userId } }) : null,
    ]);

    const patientId = patient?.id || null;

    // Load last 7 chat messages for memory context
    let conversationHistory = [];
    if (patientId) {
      const pastChats = await prisma.chat.findMany({
        where: { patientId },
        orderBy: { createdAt: "desc" },
        take: 7,
      });
      pastChats.reverse(); // Chronological order

      for (const chat of pastChats) {
        if (chat.message) {
          conversationHistory.push({ role: "user", content: chat.message });
        }
        if (chat.reply) {
          conversationHistory.push({ role: "assistant", content: chat.reply });
        }
      }
    }

    const availableSpecialties = [
      ...new Set(doctors.map((doctor) => doctor.specialty).filter(Boolean)),
    ];
    const specialtyList = availableSpecialties.length > 0
      ? availableSpecialties.join(", ")
      : "General Physician";

    // Fast Single AI Call with token limit
    const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
    const GEMINI_MODEL = "gemini-3.6-flash";

    const systemPrompt = `You are a medical assistant.
RULES:
1. HEALTH/SYMPTOMS: Answer concisely (max 40 words). Set "isMedical": true. Pick 1 specialty from: ${specialtyList}.
2. MEDICINE: Explain general purpose concisely. Do NOT give prescriptions/dosages. Set "isMedical": true.
3. NON-MEDICAL / RANDOM: Set "reply" to EXACTLY: "Please state your health concerns or symptoms clearly.", "isMedical": false, "specialty": null.
4. SAFETY: For severe/urgent symptoms, advise urgent medical evaluation.
5. CONTEXT: Remember previous conversation messages.

JSON OUTPUT ONLY:
{
  "reply": "concise answer",
  "isMedical": true or false,
  "specialty": "Specialty name or null"
}`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    let rawContent = "{}";
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await axios.post(
          `${GEMINI_BASE}/chat/completions`,
          {
            model: GEMINI_MODEL,
            response_format: { type: "json_object" },
            messages: apiMessages,
            max_tokens: 250,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 7000,
          }
        );

        rawContent = response.data?.choices?.[0]?.message?.content || "{}";
        break;
      } catch (err) {
        console.log(`AI Chat Attempt ${attempts} Error:`, err?.response?.data || err.message);
        if (attempts >= maxAttempts) {
          rawContent = JSON.stringify({
            reply: "The AI service is temporarily busy. Please try asking your health question again.",
            isMedical: false,
            specialty: null,
          });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    }

    // Parse AI response
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

    // Save in DB asynchronously
    await prisma.chat.create({
      data: {
        message,
        reply,
        specialty: specialty || null,
        patientId: patientId || null,
      },
    });

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
