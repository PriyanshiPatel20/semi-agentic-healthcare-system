import express from "express";

import {
  getPatientReminders,
  getDoctorReminders,
  deleteReminder,
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

// DELETE REMINDER
router.delete("/:id", deleteReminder);

export default router;