import prisma from "../prisma/client.js";

//  PATIENT BOOK APPOINTMENT
export const bookAppointmentByPatient = async (req, res) => {
  try {
    const { doctorId, date, time} = req.body;

    // get logged-in user id from headers
    const userId = Number(req.headers.userid);

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Check if THIS patient already booked this doctor (any time on that date)
    const patientExisting = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        doctorId: Number(doctorId),
        date: new Date(date),
      },
    });

    if (patientExisting) {
      return res.status(409).json({
        error: "You have already booked an appointment with this doctor on the selected date.",
      });
    }

    // Check if the DOCTOR's time slot is already taken by another patient
    const slotTaken = await prisma.appointment.findFirst({
      where: {
        doctorId: Number(doctorId),
        date: new Date(date),
        time: time,
      },
    });

    if (slotTaken) {
      return res.status(409).json({
        error: "This time slot is already booked for this doctor. Please choose a different date or time.",
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: Number(doctorId),
        date: new Date(date),
         time,
      },
    });

    res.status(201).json(appointment);

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to book appointment" });
  }
};
// for booked doctor list for patient
export const getPatientAppointments = async (req, res) => {
  try {

    const userId = Number(req.headers.userid);

    const patient = await prisma.patient.findUnique({
      where: { userId }
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      select: {
        doctorId: true,
        date: true,
        time: true,
      },
    });
    res.json(appointments);
  } catch (error) {
    console.log(error);appointmentcontrooler
    
    res.status(500).json({ error: "Failed to fetch patient appointments" });
  }
}