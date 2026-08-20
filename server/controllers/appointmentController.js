import prisma from "../prisma/client.js";

// BOOK APPOINTMENT
export const createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, time } = req.body;
    const appointment = await prisma.appointment.create({
      data: {
        patientId: Number(patientId),
        doctorId: Number(doctorId),
        date: new Date(date),
        time: time || null,
      },
    });
    res.status(201).json(appointment);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to create appointment" });
  }
};

// GET ALL APPOINTMENTS
export const getAppointments = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const role = req.headers.role;
    const userId = Number(req.headers.userid);

    let whereCondition = {};

    // If logged in user is doctor
    if (role === "doctor") {

      // find doctor using logged-in userId
      const doctor = await prisma.doctor.findUnique({
        where: { userId }
      });

      if (!doctor) {
        return res.status(404).json({
          error: "Doctor not found"
        });
      }

      // show only this doctor's appointments
      whereCondition = {
        doctorId: doctor.id
      };
    } else if (role === "patient") {
      // find patient using logged-in userId
      const patient = await prisma.patient.findUnique({
        where: { userId }
      });

      if (!patient) {
        return res.status(404).json({
          error: "Patient not found"
        });
      }

      // show only this patient's appointments
      whereCondition = {
        patientId: patient.id
      };
    }

    const total = await prisma.appointment.count({
      where: whereCondition
    });

    const appointments = await prisma.appointment.findMany({
      where: whereCondition,
      skip,
      take: limit,

      include: {
        patient: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },

        doctor: true,
      },

      orderBy: {
        date: "desc"
      }
    });

    res.json({
      data: appointments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
};