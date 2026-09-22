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

// The model can return punctuation or a closely related word (for example,
// "Cardiologist" when the database contains "Cardiology"). Match against the
// specialties that are actually configured by the admin instead of querying
// the raw model output.
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

    // AI CALL  
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3.1-8b-instruct",
        messages: [
          {
            role: "system",
            content: `
            You are a medical assistant.
            - Max 30 words
            - Only health advice
            - No disclaimers
            - No greetings
            `,
          },
          { role: "user", content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply =
      response.data?.choices?.[0]?.message?.content || "No response";

    // Use the specialties in the database as the model's allowed choices.
    // This prevents a valid recommendation being lost because its wording does
    // not exactly match the specialty entered in Doctor Management.
    const doctors = await prisma.doctor.findMany();
    const availableSpecialties = [
      ...new Set(doctors.map((doctor) => doctor.specialty).filter(Boolean)),
    ];

    // AI SPECIALTY DETECTION
    const specialtyResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3.1-8b-instruct",
        messages: [
          {
            role: "system",
            content: `
              You are a hospital AI system.

              Based on patient symptoms, return ONLY the most suitable doctor specialty.

              Available specialties in this hospital:
              ${availableSpecialties.map((specialty) => `- ${specialty}`).join("\n") || "- General Physician"}

              Return exactly one specialty from the available list. If no
              specialty is clearly suitable, return the closest available one.
              No explanation.
                      `,
          },
          {
            role: "user",
            content: message,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const detectedSpecialty =
      specialtyResponse.data?.choices?.[0]?.message?.content?.trim() ||
      "General Physician";
    const doctor = findSuggestedDoctor(doctors, detectedSpecialty);
    // Store the selected doctor's real specialty so old messages can be
    // rendered with the same recommendation after a page refresh.
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
    console.log(error);
    res.status(500).json({ error: "AI failed" });
  }
};
export const getChats = async (req, res) => {
  try {
    // Get patient using userid header (same auth pattern as rest of app)
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
