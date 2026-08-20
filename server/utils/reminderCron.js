import cron from "node-cron";
import prisma from "../prisma/client.js";
import axios from "axios";

cron.schedule("* * * * *", async () => {
    try {
        console.log("Checking appointments...");

        const today = new Date();
        const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
        const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

        // TODAY APPOINTMENTS
        const appointments = await prisma.appointment.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end,
                },
            },
            include: {
                patient: true,
                doctor: true,
            },
        });

        for (const appointment of appointments) {
            // ====================================
            // PATIENT REMINDER CHECK
            // ====================================
            const existingPatientReminder = await prisma.reminder.findFirst({
                where: {
                    appointmentId: appointment.id,
                    receiverType: "patient",
                },
            });

            // ====================================
            // CREATE PATIENT REMINDER
            // ====================================
            if (!existingPatientReminder) {
                let patientMessage = "You have appointment today.";
                try {
                    const aiResponse = await axios.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        {
                            model: "meta-llama/llama-3.1-8b-instruct",
                            messages: [
                                {
                                    role: "system",
                                    content: `
                                    You are hospital reminder AI.
                                    Generate short reminder for patient.
                                    Max 25 words.
                                    Friendly tone.
                                    `,
                                },
                                {
                                    role: "user",
                                    content: `
                                    Patient:
                                    ${appointment.patient.name}
                                    Doctor:
                                    ${appointment.doctor.name}
                                    Specialty:
                                    ${appointment.doctor.specialty}
                                    Appointment Date:
                                    ${appointment.date.toISOString().split("T")[0]}
                                    Appointment Time:
                                    ${appointment.time || "Not specified"}
                                    `,
                                },
                            ],
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            timeout: 5000
                        }
                    );

                    patientMessage = aiResponse.data?.choices?.[0]?.message?.content || "You have appointment today.";
                } catch (error) {
                    console.log(`Patient AI Reminder generation failed for appointment ${appointment.id}:`, error.message);
                }

                await prisma.reminder.create({
                    data: {
                        appointmentId: appointment.id,
                        message: patientMessage,
                        receiverType: "patient",
                        receiverId: appointment.patient.id,
                    },
                });

                console.log(
                    `Patient reminder created for appointment ${appointment.id}`
                );
            }

            // ====================================
            // DOCTOR REMINDER CHECK
            // ====================================
            const existingDoctorReminder = await prisma.reminder.findFirst({
                where: {
                    appointmentId: appointment.id,
                    receiverType: "doctor",
                },
            });

            // ====================================
            // CREATE DOCTOR REMINDER
            // ====================================
            if (!existingDoctorReminder) {
                let doctorMessage = "You have patient appointment today.";
                try {
                    const doctorAiResponse = await axios.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        {
                            model: "meta-llama/llama-3.1-8b-instruct",
                            messages: [
                                {
                                    role: "system",
                                    content: `
                                    You are hospital assistant AI.
                                    Generate short reminder for doctor.
                                    Max 25 words.
                                    Professional tone.
                                    `,
                                },
                                {
                                    role: "user",
                                    content: `
                                    Doctor:
                                    ${appointment.doctor.name}
                                    Patient:
                                    ${appointment.patient.name}
                                    Appointment Date:
                                    ${appointment.date.toISOString().split("T")[0]}
                                    Appointment Time:
                                    ${appointment.time || "Not specified"}
                                    `,
                                },
                            ],
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            timeout: 5000
                        }
                    );

                    doctorMessage = doctorAiResponse.data?.choices?.[0]?.message?.content || "You have patient appointment today.";
                } catch (error) {
                    console.log(`Doctor AI Reminder generation failed for appointment ${appointment.id}:`, error.message);
                }

                await prisma.reminder.create({
                    data: {
                        appointmentId: appointment.id,
                        message: doctorMessage,
                        receiverType: "doctor",
                        receiverId: appointment.doctor.id,
                    },
                });

                console.log(
                    `Doctor reminder created for appointment ${appointment.id}`
                );
            }
        }
    } catch (error) {
        console.log(
            "REMINDER CRON ERROR:",
            error.message
        );
    }
});