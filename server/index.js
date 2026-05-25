import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import patientAppointmentRoutes from "./routes/patientAppointmentRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import medicalRecordRoutes from "./routes/medicalRecordRoutes.js";
import "./utils/reminderCron.js";
import reminderRoutes from "./routes/reminderRoutes.js";

const app = express();
dotenv.config();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/patient-appointments", patientAppointmentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/medical-records", medicalRecordRoutes);
app.use("/api/reminders", reminderRoutes);

app.listen(3360, () => {
  console.log("Server is running on port: http://localhost:3360");
});