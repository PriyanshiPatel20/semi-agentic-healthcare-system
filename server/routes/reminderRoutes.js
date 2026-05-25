import express from "express";

import {
  getPatientReminders,
  getDoctorReminders,
} from "../controllers/reminderController.js";

const router = express.Router();

// PATIENT
router.get(
  "/patient-reminders",
  getPatientReminders
);

// DOCTOR
router.get(
  "/doctor-reminders",
  getDoctorReminders
);

export default router;