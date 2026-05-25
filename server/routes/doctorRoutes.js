import express from "express";

const router = express.Router();
import { createDoctor, getDoctors, updateDoctor, deleteDoctor } from "../controllers/doctorController.js";
import { checkRole } from "../middleware/roleMiddleware.js";


// Only admin can create doctor (optional rule)
router.post("/", checkRole(["admin"]), createDoctor);

// Anyone can view doctors
router.get("/", getDoctors);
router.put("/:id", checkRole(["admin"]), updateDoctor);
router.delete("/:id", checkRole(["admin"]), deleteDoctor);

export default router;