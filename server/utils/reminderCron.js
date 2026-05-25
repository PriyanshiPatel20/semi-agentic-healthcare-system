import cron from "node-cron";
import prisma from "../prisma/client.js";
import axios from "axios";
                        

cron.schedule("* * * * *", async () => {

    console.log("Checking appointments...");

    const today = new Date();

    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    // today's appointments
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

        // prevent duplicate reminder
        const existingReminder = await prisma.reminder.findFirst({
            where: {
                appointmentId: appointment.id,
            },
        });

        if (existingReminder) continue;

        // AI Reminder Message
        const aiResponse = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "meta-llama/llama-3-8b-instruct",

                messages: [
                    {
                        role: "system",
                        content: `
                        You are hospital reminder AI.

                        Generate short appointment reminder.

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

                        Appointment Date:
                        ${appointment.date.toISOString().split("T")[0]}

                        Appointment Time:
                        ${appointment.time}
                        `,
                    },
                ],
            },

            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const reminderMessage =
            aiResponse.data?.choices?.[0]?.message?.content ||
            "You have appointment today.";

        // save reminder
        await prisma.reminder.create({
            data: {
                appointmentId: appointment.id,
                message: reminderMessage,
            },
        });

        console.log("Reminder created");
    }
});