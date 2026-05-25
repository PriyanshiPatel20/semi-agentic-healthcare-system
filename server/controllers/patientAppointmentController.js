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

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        doctorId: Number(doctorId),
        date: new Date(date),
         time,
      }
    });

    if (existingAppointment) {
      return res.status(400).json({ error: "Appointment already exists for this patient and doctor on the selected date" });
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