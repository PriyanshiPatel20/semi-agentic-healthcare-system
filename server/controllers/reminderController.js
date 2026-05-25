import prisma from "../prisma/client.js";

// ===============================
// PATIENT REMINDERS
// ===============================
export const getPatientReminders = async (req, res) => {

    try {

        const userId = Number(req.headers.userid);

        const patient = await prisma.patient.findUnique({
            where: {
                userId,
            },
        });

        if (!patient) {

            return res.status(404).json({
                error: "Patient not found",
            });
        }

        const reminders = await prisma.reminder.findMany({

            where: {

                receiverType: "patient",

                receiverId: patient.id,
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
            error: "Failed to fetch patient reminders",
        });
    }
};


// ===============================
// DOCTOR REMINDERS
// ===============================
export const getDoctorReminders = async (req, res) => {

    try {

        const userId = Number(req.headers.userid);

        const doctor = await prisma.doctor.findUnique({
            where: {
                userId,
            },
        });

        if (!doctor) {

            return res.status(404).json({
                error: "Doctor not found",
            });
        }

        const reminders = await prisma.reminder.findMany({

            where: {

                receiverType: "doctor",

                receiverId: doctor.id,
            },

            include: {

                appointment: {

                    include: {
                        patient: true,
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
        console.log("USER ID:", userId);

console.log("DOCTOR:", doctor);

        res.status(500).json({
            error: "Failed to fetch doctor reminders",
        });
    }
};