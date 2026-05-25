import express from "express";
import { createMedicalRecord } from "../controllers/medicalRecordController.js";
import { generateMedicalPDFController } from "../controllers/generateMedicalPDFController.js";
const router = express.Router();

router.post("/", createMedicalRecord);
router.post("/doctor/report/pdf", generateMedicalPDFController);
export default router;  