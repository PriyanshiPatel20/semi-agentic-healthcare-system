import cron from "node-cron";
import prisma from "../prisma/client.js";
import axios from "axios";
import { sendEmail } from "./sendEmail.js";

// Prevent overlapping executions
let isProcessing = false;
// Set to prevent duplicate concurrent processing for the exact same reminder
const activeProcessingKeys = new Set();

/**
 * Process pending reminders for all appointments
 */
export const processReminders = async () => {
    if (isProcessing) {
        console.log("⏳ [Reminder Processor] Already running, skipping concurrent run...");
        return;
    }

    isProcessing = true;

    try {
        console.log("🔔 [Reminder Processor] Checking appointments for reminders...");

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
            const appointmentDateStr = appointment.date instanceof Date
                ? appointment.date.toISOString().split("T")[0]
                : String(appointment.date || "Scheduled Date");

            // ====================================
            // 1. PATIENT REMINDER CHECK
            // ====================================
            const patientKey = `${appointment.id}-patient`;

            if (!activeProcessingKeys.has(patientKey)) {
                const existingPatientReminder = await prisma.reminder.findFirst({
                    where: {
                        appointmentId: appointment.id,
                        receiverType: "patient",
                    },
                });

                if (!existingPatientReminder && appointment.patient) {
                    activeProcessingKeys.add(patientKey);

                    try {
                        const patientName = appointment.patient?.name || "Patient";
                        const doctorName = appointment.doctor?.name || "Doctor";
                        const specialty = appointment.doctor?.specialty || "General Healthcare";
                        const time = appointment.time || "Scheduled Time";

                        let patientMessage = `Hi ${patientName}, reminder for your appointment with Dr. ${doctorName.replace(/^Dr\.\s*/i, "")} (${specialty}) on ${appointmentDateStr} at ${time}.`;

                        // Try generating customized AI reminder
                        if (process.env.GEMINI_API_KEY) {
                            try {
                                const aiResponse = await axios.post(
                                    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                                    {
                                        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
                                        messages: [
                                            {
                                                role: "system",
                                                content: "You are a hospital reminder AI. Generate a concise, friendly appointment reminder for the patient. Maximum 25 words.",
                                            },
                                            {
                                                role: "user",
                                                content: `Patient: ${patientName}, Doctor: ${doctorName}, Specialty: ${specialty}, Date: ${appointmentDateStr}, Time: ${time}`,
                                            },
                                        ],
                                    },
                                    {
                                        headers: {
                                            Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
                                            "Content-Type": "application/json",
                                        },
                                        timeout: 4000,
                                    }
                                );
                                const aiText = aiResponse.data?.choices?.[0]?.message?.content?.trim();
                                if (aiText) patientMessage = aiText;
                            } catch (e) {
                                // Graceful fallback to default structured message
                            }
                        }

                        // Create the in-app reminder in DB first
                        const created = await prisma.reminder.create({
                            data: {
                                appointmentId: appointment.id,
                                message: patientMessage,
                                receiverType: "patient",
                                receiverId: appointment.patient.id,
                                sent: false,
                            },
                        });

                        // Dispatch email notification if patient email is present
                        const patientEmail = appointment.patient?.user?.email;
                        if (patientEmail) {
                            const isSent = await sendEmail({
                                to: patientEmail,
                                subject: "Appointment Reminder - HealthRay HMS",
                                text: patientMessage,
                                recipientName: patientName,
                                role: "patient",
                                details: {
                                    "Patient Name": patientName,
                                    "Doctor": `Dr. ${doctorName.replace(/^Dr\.\s*/i, "")}`,
                                    "Specialty / Dept": specialty,
                                    "Appointment Date": appointmentDateStr,
                                    "Appointment Time": time,
                                    "Status": "Confirmed",
                                },
                            });

                            if (isSent) {
                                await prisma.reminder.update({
                                    where: { id: created.id },
                                    data: { sent: true },
                                });
                            }
                        }

                        console.log(`✅ [Reminder] Created patient reminder for appointment #${appointment.id}`);
                    } catch (err) {
                        console.error(`❌ [Reminder] Patient error for appointment #${appointment.id}:`, err.message);
                    } finally {
                        activeProcessingKeys.delete(patientKey);
                    }
                }
            }

            // ====================================
            // 2. DOCTOR REMINDER CHECK
            // ====================================
            const doctorKey = `${appointment.id}-doctor`;

            if (!activeProcessingKeys.has(doctorKey)) {
                const existingDoctorReminder = await prisma.reminder.findFirst({
                    where: {
                        appointmentId: appointment.id,
                        receiverType: "doctor",
                    },
                });

                if (!existingDoctorReminder && appointment.doctor) {
                    activeProcessingKeys.add(doctorKey);

                    try {
                        const patientName = appointment.patient?.name || "Patient";
                        const doctorName = appointment.doctor?.name || "Doctor";
                        const time = appointment.time || "Scheduled Time";

                        let doctorMessage = `Dr. ${doctorName.replace(/^Dr\.\s*/i, "")}, reminder: You have an appointment with patient ${patientName} on ${appointmentDateStr} at ${time}.`;

                        // Try generating customized AI reminder
                        if (process.env.GEMINI_API_KEY) {
                            try {
                                const aiResponse = await axios.post(
                                    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
                                    {
                                        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
                                        messages: [
                                            {
                                                role: "system",
                                                content: "You are a hospital assistant AI. Generate a short, professional appointment reminder for the doctor. Maximum 25 words.",
                                            },
                                            {
                                                role: "user",
                                                content: `Doctor: ${doctorName}, Patient: ${patientName}, Date: ${appointmentDateStr}, Time: ${time}`,
                                            },
                                        ],
                                    },
                                    {
                                        headers: {
                                            Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
                                            "Content-Type": "application/json",
                                        },
                                        timeout: 4000,
                                    }
                                );
                                const aiText = aiResponse.data?.choices?.[0]?.message?.content?.trim();
                                if (aiText) doctorMessage = aiText;
                            } catch (e) {
                                // Graceful fallback
                            }
                        }

                        // Create the in-app reminder in DB first
                        const created = await prisma.reminder.create({
                            data: {
                                appointmentId: appointment.id,
                                message: doctorMessage,
                                receiverType: "doctor",
                                receiverId: appointment.doctor.id,
                                sent: false,
                            },
                        });

                        // Dispatch email notification if doctor email is present
                        const doctorEmail = appointment.doctor?.user?.email;
                        if (doctorEmail) {
                            const isSent = await sendEmail({
                                to: doctorEmail,
                                subject: "Patient Appointment Reminder - HealthRay HMS",
                                text: doctorMessage,
                                recipientName: `Dr. ${doctorName.replace(/^Dr\.\s*/i, "")}`,
                                role: "doctor",
                                details: {
                                    "Doctor Name": `Dr. ${doctorName.replace(/^Dr\.\s*/i, "")}`,
                                    "Patient Name": patientName,
                                    "Specialty": appointment.doctor?.specialty || "General Healthcare",
                                    "Appointment Date": appointmentDateStr,
                                    "Appointment Time": time,
                                    "Status": "Scheduled",
                                },
                            });

                            if (isSent) {
                                await prisma.reminder.update({
                                    where: { id: created.id },
                                    data: { sent: true },
                                });
                            }
                        }

                        console.log(`✅ [Reminder] Created doctor reminder for appointment #${appointment.id}`);
                    } catch (err) {
                        console.error(`❌ [Reminder] Doctor error for appointment #${appointment.id}:`, err.message);
                    } finally {
                        activeProcessingKeys.delete(doctorKey);
                    }
                }
            }
        }
    } catch (error) {
        console.error("❌ [Reminder Processor Error]:", error.message);
    } finally {
        isProcessing = false;
    }
};

// Schedule recurring check every minute
cron.schedule("* * * * *", () => {
    processReminders();
});