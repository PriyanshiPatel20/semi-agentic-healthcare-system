import express from "express";
import { chatWithAI, getChats, clearChats } from "../controllers/chatController.js";
import { checkRole } from "../middleware/roleMiddleware.js";
import { doctorAIChat,getDoctorChats, generatePDFMedicalReport} from "../controllers/doctorAIController.js";
const router = express.Router();

router.post("/", checkRole(["admin", "patient"]), chatWithAI);
router.get("/", checkRole(["admin", "patient"]), getChats);
router.delete("/", checkRole(["admin", "patient"]), clearChats);
router.post("/doctor", checkRole(["doctor","admin"]), doctorAIChat);
router.get("/doctor",checkRole(["doctor", "admin"]), getDoctorChats);
// router.post("/doctor/generate-medical-record",checkRole(["doctor", "admin"]),generateMedicalRecordFromChat);   
router.post("/doctor/PDF-report",checkRole(["doctor", "admin"]),generatePDFMedicalReport);
export default router;