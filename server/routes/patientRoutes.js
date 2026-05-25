import express from "express";
const router = express.Router();
import { createPatient, getPatients, updatePatient, deletePatient, getPatientProfile } from "../controllers/patientController.js";
import { checkRole } from "../middleware/roleMiddleware.js";


// Only admin & doctor can create patient
router.post("/", checkRole(["admin", "doctor"]), createPatient);
router.get("/", getPatients);
router.put("/:id", checkRole(["admin", "doctor"]), updatePatient);
router.delete("/:id", checkRole(["admin"]), deletePatient);
router.get("/profile", checkRole(["patient"]), getPatientProfile);
export default router;
