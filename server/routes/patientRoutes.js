import express from "express";
const router = express.Router();
import { createPatient, getPatients, updatePatient, deletePatient, getPatientProfile, updatePatientProfile } from "../controllers/patientController.js";
import { checkRole } from "../middleware/roleMiddleware.js";

// Profile routes (must be before /:id)
router.get("/profile", checkRole(["patient"]), getPatientProfile);
router.put("/profile", checkRole(["patient"]), updatePatientProfile);

// Patient CRUD
router.post("/", checkRole(["admin", "doctor"]), createPatient);
router.get("/", getPatients);
router.put("/:id", checkRole(["admin", "doctor"]), updatePatient);
router.delete("/:id", checkRole(["admin"]), deletePatient);

export default router;
