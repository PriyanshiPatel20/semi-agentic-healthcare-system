import prisma from "../prisma/client.js";
import axios from "axios";
export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;
    let patientId = null;

    if (req.user) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id },
      });

      patientId = patient?.id || null;
    }

    // AI CALL  
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3-8b-instruct",
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
        model: "meta-llama/llama-3-8b-instruct",
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
    let patientId = null;

    if (req.user) {
      const patient = await prisma.patient.findUnique({
        where: { userId: req.user.id },
      });

      patientId = patient?.id || null;
    }

    const chats = await prisma.chat.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chats" });
  }
};