import prisma from "../prisma/client.js";

export const getPatientReminders = async (req, res) => {
  try {

    const userId = Number(req.headers.userid);

    const patient = await prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found",
      });
    }

    const reminders = await prisma.reminder.findMany({

      where: {
        appointment: {
          patientId: patient.id,
        },
      },

      include: {
        appointment: {
          include: {
            doctor: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(reminders);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Failed to fetch reminders",
    });
  }
};