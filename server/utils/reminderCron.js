import cron from "node-cron";
import prisma from "../prisma/client.js";
import axios from "axios";
import { sendEmail } from "./sendEmail.js";

cron.schedule("* * * * *", async () => {
    try {
        console.log("Checking appointments for reminders...");

        // Fetch appointments to ensure no appointment is missed due to timezone differences
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
                let patientMessage = "You have an appointment today.";
                try {
                    const aiResponse = await axios.post(
                        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                        {
                            model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
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
                                    Patient: ${appointment.patient.name}
                                    Doctor: ${appointment.doctor.name}
                                    Specialty: ${appointment.doctor.specialty}
                                    Appointment Date: ${appointment.date.toISOString().split("T")[0]}
                                    Appointment Time: ${appointment.time || "Not specified"}
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

                    patientMessage = aiResponse.data?.choices?.[0]?.message?.content || "You have an appointment today.";
                } catch (error) {
                    console.log(`Patient AI Reminder generation failed for appointment ${appointment.id}:`, error.message);
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
                let doctorMessage = "You have a patient appointment today.";
                try {
                    const doctorAiResponse = await axios.post(
                        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                        {
                            model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
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
                                    Doctor: ${appointment.doctor.name}
                                    Patient: ${appointment.patient.name}
                                    Appointment Date: ${appointment.date.toISOString().split("T")[0]}
                                    Appointment Time: ${appointment.time || "Not specified"}
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

                    doctorMessage = doctorAiResponse.data?.choices?.[0]?.message?.content || "You have a patient appointment today.";
                } catch (error) {
                    console.log(`Doctor AI Reminder generation failed for appointment ${appointment.id}:`, error.message);
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

        // ====================================
        // UNSENT REMINDERS RETRY / DELIVERY
        // ====================================
        const unsentReminders = await prisma.reminder.findMany({
            where: { sent: false },
            include: {
                appointment: {
                    include: {
                        patient: { include: { user: true } },
                        doctor: { include: { user: true } },
                    },
                },
            },
        });

        for (const reminder of unsentReminders) {
            let email = null;
            if (reminder.receiverType === "patient") {
                email = reminder.appointment?.patient?.user?.email;
            } else if (reminder.receiverType === "doctor") {
                email = reminder.appointment?.doctor?.user?.email;
            }

            if (email) {
                const isSent = await sendEmail({
                    to: email,
                    subject: `HealthRay HMS ${reminder.receiverType === "patient" ? "Appointment Reminder" : "Patient Appointment Reminder"}`,
                    text: reminder.message,
                });

                if (isSent) {
                    await prisma.reminder.update({
                        where: { id: reminder.id },
                        data: { sent: true },
                    });
                    console.log(`Unsent reminder ${reminder.id} successfully emailed and updated to sent=true`);
                }
            }
        }
    } catch (error) {
        console.log("REMINDER CRON ERROR:", error.message);
    }
});