import "../env.js";
import nodemailer from "nodemailer";

const createTransporter = () => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : "";

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user,
            pass,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });
};

/**
 * Utility function to send emails via nodemailer
 * @param {Object} options 
 */
export const sendEmail = async ({ to, subject, text, html }) => {
    if (!to) {
        console.log("Email notification skipped: recipient email address is missing.");
        return false;
    }

    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"HealthRay HMS" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html: html || `<p>${text}</p>`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email successfully sent to ${to} (MessageId: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error.message);
        return false;
    }
};
