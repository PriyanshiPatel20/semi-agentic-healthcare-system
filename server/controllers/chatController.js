import prisma from "../prisma/client.js";
import axios from "axios";
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

              Allowed specialties:
              - Cardiologist
              - Dermatologist
              - General Physician
              - Orthopedic
              - Neurologist
              - Gastroenterologist
              - Pediatrician
              - Psychiatrist
              - Oncologist
              - Gynecologist
              - Ophthalmologist

              Return only specialty name.
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

    const specialty =
      specialtyResponse.data?.choices?.[0]?.message?.content?.trim() ||
      "General Physician";
    // FIND DOCTOR
    const doctor = await prisma.doctor.findFirst({
      where: {
        specialty: { contains: specialty },
      },
    });

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
      doctor: doctor
        ? {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          mobile: doctor.mobile,
          experience: doctor.experience,
        }
        : null,
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

    res.json(chats);
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