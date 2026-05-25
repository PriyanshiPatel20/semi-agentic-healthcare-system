import express from "express";
import { createAppointment,getAppointments} from "../controllers/appointmentController.js";
import { checkRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Book appointment

router.post("/", checkRole(["admin", "doctor"]), createAppointment);

// Get all appointments
router.get("/", getAppointments);

export default router;