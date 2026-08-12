import express from "express";
import multer from "multer";
import { checkRole } from "../middleware/roleMiddleware.js";
import {
  transcribeAudio,
  generateSOAPNote,
  saveConsultationDraft,
  approveConsultationNote,
  getConsultationNotes,
  getMyPatientNotes,
} from "../controllers/consultationNoteController.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Transcribe audio → transcript (doctor only)
router.post("/transcribe", checkRole(["doctor", "admin"]), upload.single("audio"), transcribeAudio);

// Transcript → SOAP note (doctor only)
router.post("/generate-soap", checkRole(["doctor", "admin"]), generateSOAPNote);

// Save draft note (doctor only)
router.post("/save-draft", checkRole(["doctor", "admin"]), saveConsultationDraft);

// Doctor approves final note → also auto-generates patient-friendly version
router.post("/approve", checkRole(["doctor", "admin"]), approveConsultationNote);

// Get all notes for a patient — doctor view
router.get("/", checkRole(["doctor", "admin"]), getConsultationNotes);

// Get logged-in patient's own approved notes — patient dashboard
router.get("/my-notes", checkRole(["patient", "admin"]), getMyPatientNotes);

export default router;
