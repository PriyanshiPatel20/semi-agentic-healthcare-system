import prisma from "../prisma/client.js";

export const createMedicalRecord = async (req, res) => {
  try {
    const { patientId, symptoms, diagnosis, vitals, prescription, notes } = req.body;

    const record = await prisma.medicalRecord.create({
      data: {
        patientId: Number(patientId),
        symptoms,
        diagnosis,
        vitals,
        prescription,
        notes,
      },
    });

    res.json(record);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to create record" });
  }
};