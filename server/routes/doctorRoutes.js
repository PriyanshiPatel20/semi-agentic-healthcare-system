import express from "express";

const router = express.Router();
import { createDoctor, getDoctors, getDoctorProfile, updateDoctor, deleteDoctor } from "../controllers/doctorController.js";
import { checkRole } from "../middleware/roleMiddleware.js";

// Only admin can create doctor
router.post("/", checkRole(["admin"]), createDoctor);

// View doctors & doctor profile
router.get("/", getDoctors);
router.get("/profile/:userId", getDoctorProfile);

// Admin or Doctor can update profile
router.put("/:id", checkRole(["admin", "doctor"]), updateDoctor);
router.delete("/:id", checkRole(["admin"]), deleteDoctor);

export default router;