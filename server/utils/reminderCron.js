import cron from "node-cron";
import prisma from "../prisma/client.js";
import axios from "axios";
import { sendEmail } from "./sendEmail.js";

cron.schedule("* * * * *", async () => {
    try {
        console.log("Checking appointments for reminders...");

        const appointments = await prisma.appointment.findMany({
            include: {
                patient: {
                    include: {
                        user: true,
                    },
                },
                doctor: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        for (const appointment of appointments) {
            const dateStr = new Date(appointment.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
            const timeStr = appointment.time || "scheduled time";

            // ====================================
            // PATIENT REMINDER CHECK
            // ====================================
            const existingPatientReminder = await prisma.reminder.findFirst({
                where: {
                    appointmentId: appointment.id,
                    receiverType: "patient",
                },
            });

            const patientEmail = appointment.patient?.user?.email;

            if (!existingPatientReminder) {
                // Default friendly message format as fallback
                let patientMessage = `Hi ${appointment.patient.name}! Friendly reminder of your ${appointment.doctor.specialty} appointment with Dr. ${appointment.doctor.name} on ${dateStr}, at ${timeStr}. See you soon!`;

                try {
                    const aiResponse = await axios.post(
                        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                        {
                            model: "gemini-3.6-flash",
                            messages: [
                                {
                                    role: "system",
                                    content: `
                                    You are a friendly hospital reminder AI.
                                    Generate a single short reminder for a patient in this exact format style:
                                    "Hi [Patient Name]! Friendly reminder of your [Specialty] appointment with Dr. [Doctor Name] on [Date], at [Time]. See you soon!"
                                    Max 25 words. Keep the exact friendly style. No quotes or extra text.
                                    `,
                                },
                                {
                                    role: "user",
                                    content: `
                                    Patient: ${appointment.patient.name}
                                    Doctor: Dr. ${appointment.doctor.name}
                                    Specialty: ${appointment.doctor.specialty}
                                    Appointment Date: ${dateStr}
                                    Appointment Time: ${timeStr}
                                    `,
                                },
                            ],
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            timeout: 5000,
                        }
                    );

                    const generatedText = aiResponse.data?.choices?.[0]?.message?.content?.trim();
                    if (generatedText) {
                        patientMessage = generatedText;
                    }
                } catch (error) {
                    console.log(`Patient AI Reminder generation fallback used for appointment ${appointment.id}:`, error.message);
                }

                let isSent = false;
                if (patientEmail) {
                    isSent = await sendEmail({
                        to: patientEmail,
                        subject: "Appointment Reminder - HealthRay HMS",
                        text: patientMessage,
                    });
                }

                await prisma.reminder.create({
                    data: {
                        appointmentId: appointment.id,
                        message: patientMessage,
                        receiverType: "patient",
                        receiverId: appointment.patient.id,
                        sent: isSent,
                    },
                });

                console.log(`Patient reminder created (sent=${isSent}) for appointment ${appointment.id}`);
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

            const doctorEmail = appointment.doctor?.user?.email;

            if (!existingDoctorReminder) {
                // Default professional doctor message format as fallback
                let doctorMessage = `Dr. ${appointment.doctor.name}, reminder: You have an appointment scheduled with patient ${appointment.patient.name} on ${dateStr}, at ${timeStr}.`;

                try {
                    const doctorAiResponse = await axios.post(
                        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                        {
                            model: "gemini-3.6-flash",
                            messages: [
                                {
                                    role: "system",
                                    content: `
                                    You are hospital assistant AI.
                                    Generate short professional reminder for doctor in this format style:
                                    "Dr. [Doctor Name], reminder: You have an appointment scheduled with patient [Patient Name] on [Date], at [Time]."
                                    Max 25 words. No extra commentary.
                                    `,
                                },
                                {
                                    role: "user",
                                    content: `
                                    Doctor: Dr. ${appointment.doctor.name}
                                    Patient: ${appointment.patient.name}
                                    Appointment Date: ${dateStr}
                                    Appointment Time: ${timeStr}
                                    `,
                                },
                            ],
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
                                "Content-Type": "application/json",
                            },
                            timeout: 5000,
                        }
                    );

                    const doctorGeneratedText = doctorAiResponse.data?.choices?.[0]?.message?.content?.trim();
                    if (doctorGeneratedText) {
                        doctorMessage = doctorGeneratedText;
                    }
                } catch (error) {
                    console.log(`Doctor AI Reminder generation fallback used for appointment ${appointment.id}:`, error.message);
                }

                let isSent = false;
                if (doctorEmail) {
                    isSent = await sendEmail({
                        to: doctorEmail,
                        subject: "Patient Appointment Reminder - HealthRay HMS",
                        text: doctorMessage,
                    });
                }

                await prisma.reminder.create({
                    data: {
                        appointmentId: appointment.id,
                        message: doctorMessage,
                        receiverType: "doctor",
                        receiverId: appointment.doctor.id,
                        sent: isSent,
                    },
                });

                console.log(`Doctor reminder created (sent=${isSent}) for appointment ${appointment.id}`);
            }
        }
    } catch (error) {
        console.log("REMINDER CRON ERROR:", error.message);
    }
});