import express from "express";

import {
  getPatientReminders
} from "../controllers/reminderController.js";

const router = express.Router();

router.get(
  "/my-reminders",
  getPatientReminders
);

export default router;