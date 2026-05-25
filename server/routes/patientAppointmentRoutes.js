import express from "express";

import { checkRole } from "../middleware/roleMiddleware.js";
import { bookAppointmentByPatient } from "../controllers/patientAppointmentController.js";
import { getPatientAppointments } from "../controllers/patientAppointmentController.js";
const router = express.Router();

//only paient can book appointment
router.post("/book", checkRole(["patient"]), bookAppointmentByPatient);
router.get('/my',checkRole(["patient"]), getPatientAppointments);
export default router;