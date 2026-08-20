import prisma from "../prisma/client.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

// ==========================================
// STEP 1: TRANSCRIBE AUDIO → TRANSCRIPT
// ==========================================
export const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const audioBuffer = req.file.buffer;
    const audioFilename = req.file.originalname || "consultation.webm";

    // Normalize mimetype to prevent Groq API issues
    let contentType = req.file.mimetype || "audio/webm";
    if (contentType.includes("webm")) {
      contentType = "audio/webm";
    } else if (contentType.includes("ogg")) {
      contentType = "audio/ogg";
    } else if (contentType.includes("wav")) {
      contentType = "audio/wav";
    } else if (contentType.includes("mp3") || contentType.includes("mpeg")) {
      contentType = "audio/mpeg";
    }

    // ── Hallucination Prevention Strategy ──
    // 1. Use whisper-large-v3-turbo  → much less hallucination than v3 on short audio
    // 2. NO prompt                   → long prompts cause Whisper to copy prompt text
    //                                  instead of transcribing audio (root cause of your bug!)
    // 3. temperature=0               → deterministic output, no random generation
    // 4. response_format=verbose_json → gives us duration to validate length
    const form = new FormData();
    form.append("file", audioBuffer, {
      filename: audioFilename,
      contentType: contentType,
    });
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");

    const whisperRes = await axios.post(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const transcript = (whisperRes.data?.text || "").trim();
    const audioDurationSecs = whisperRes.data?.duration || null;

    console.log("[Whisper] transcript:", transcript);
    console.log("[Whisper] duration:", audioDurationSecs, "s");

    // ── Hallucination guard ──
    // Known hallucinated phrases Whisper produces when audio is silent/unclear
    const HALLUCINATION_PATTERNS = [
      /^i'?m sorry\.?$/i,
      /^thank you\.?$/i,
      /^\[.*\]$/, // [BLANK_AUDIO], [Music], [silence]
      /^\(.*\)$/, // (inaudible), (silence)
      /^\.+$/,
      /subtitle|subtitles|captions/i,
    ];

    const isKnownHallucination = HALLUCINATION_PATTERNS.some((p) =>
      p.test(transcript)
    );

    // If we know the audio duration, check if transcript is suspiciously long
    // Average speaking speed: ~2–3 words per second → ~10 chars/sec max
    const isTooLong =
      audioDurationSecs &&
      transcript.length > audioDurationSecs * 15; // 15 chars/sec is very generous

    const isEmpty = !transcript || transcript.replace(/[\s.,!?]/g, "").length < 3;

    if (isEmpty || isKnownHallucination || isTooLong) {
      console.warn("[Whisper] Hallucination detected:", { transcript, audioDurationSecs });
      return res.status(400).json({
        error:
          "Audio was unclear or too short. Please speak clearly for at least 3 seconds and try again.",
        detail: `Whisper returned: "${transcript}" (duration: ${audioDurationSecs}s)`,
      });
    }

    res.json({ transcript });
  } catch (err) {
    console.error("Transcription error:", err?.response?.data || err.message);
    res.status(500).json({ error: "Transcription failed", detail: err?.response?.data || err.message });
  }
};

// ==========================================
// STEP 2: GENERATE SOAP NOTE FROM TRANSCRIPT
// ==========================================
export const generateSOAPNote = async (req, res) => {
  try {
    const { transcript, patient } = req.body;

    console.log("[SOAP] Received request for patient:", patient?.name);
    console.log("[SOAP] API Key present:", !!process.env.OPENROUTER_API_KEY);

    if (!transcript?.trim()) {
      return res.status(400).json({ error: "Transcript is required" });
    }

    console.log("[SOAP] Calling OpenRouter AI...");

    const aiRes = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: [
          {
            role: "system",
            content: `
You are a helpful medical scribe. You read doctor-patient consultation transcripts and write clear, easy-to-read clinical notes.

Your job has TWO parts:
1. Write a simple clinical note from the transcript — in plain language, short sentences, easy to skim.
2. Identify important clinical areas the doctor did NOT ask about, and suggest those as questions for the doctor to ask the patient.

RULES:
- Write in simple, plain English. Avoid unnecessary medical jargon.
- Short sentences. Easy to read at a glance.
- Return ONLY a valid JSON object. No extra text, no markdown.
- Never leave any field empty.

Return this exact JSON:
{
  "what_patient_said": "2-3 simple sentences: what the patient complained about and their main symptoms.",
  "what_was_observed": "What the doctor noted during the visit. If not in transcript, mention what would normally be checked.",
  "likely_diagnosis": "Simple 1-2 sentence explanation of what is likely going on with the patient.",
  "treatment_plan": "Step-by-step plan: medicines, dosage, lifestyle advice, rest, diet.",
  "medications": "List of prescribed medicines with dose and frequency. If none, write None prescribed yet.",
  "follow_up": "When the patient should return and what to check at that visit.",
  "warning_signs": ["Specific sign meaning patient should return immediately", "Another urgent warning sign"],
  "suggested_questions": [
    "❓ Ask about [topic] — helps understand [why it matters].",
    "❓ Check [finding or test] — important to rule out [condition]."
  ],
  "quick_summary": "3-4 sentence summary a doctor can read in 10 seconds to understand the entire visit."
}

For suggested_questions: Read the transcript carefully. If the doctor did NOT cover: symptom duration, pain scale (1-10), previous episodes, past medical history, current medications, allergies, family history, lifestyle (smoking/alcohol/diet), related symptoms, or relevant tests — add each as a suggested question starting with ❓ and explain why it matters in simple words. If everything was covered, write ["✅ All key areas were covered in this consultation."].
            `,
          },
          {
            role: "user",
            content: `
Patient Details:
- Name: ${patient?.name || "Unknown"}
- Age: ${patient?.age || "N/A"} years
- Gender: ${patient?.gender || "N/A"}
- Blood Group: ${patient?.bloodGroup || "N/A"}
- Status: ${patient?.status || "N/A"}

Consultation Transcript:
"${transcript}"

Write a clear, simple clinical note and list any important questions the doctor may have missed.
            `,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("[SOAP] AI response received");


    let raw = aiRes.data.choices[0].message.content;

    // Clean markdown wrappers if present
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start === -1 || end === -1) {
      return res.status(500).json({ error: "AI returned invalid note format" });
    }

    const noteData = JSON.parse(raw.substring(start, end + 1));

    // Enrich noteData with patient context
    noteData._patient = {
      name: patient?.name || "N/A",
      age: patient?.age || "N/A",
      gender: patient?.gender || "N/A",
      bloodGroup: patient?.bloodGroup || "N/A",
    };

    // Store structured data as JSON string in DB
    const soapNote = JSON.stringify(noteData);
    const soapData = noteData;

    res.json({ soapNote, soapData });
  } catch (err) {
    console.error("SOAP generation error:", err?.response?.data || err.message);
    res.status(500).json({ error: "SOAP note generation failed", detail: err?.response?.data || err.message });
  }
};

// ==========================================
// STEP 3: SAVE DRAFT NOTE
// ==========================================
export const saveConsultationDraft = async (req, res) => {
  try {
    const { patientId, transcript, soapNote } = req.body;
    const userId = req.headers.userid;

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID required" });
    }
    
    let doctorId = null;
    if (userId) {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: Number(userId) },
      });
      doctorId = doctor?.id || null;
    }

    const note = await prisma.consultationNote.create({
      data: {
        patientId: Number(patientId),
        doctorId,
        transcript,
        soapNote,
        status: "DRAFT",
      },
    });

    res.json({ note });
  } catch (err) {
    console.error("Save draft error:", err.message);
    res.status(500).json({ error: "Failed to save draft" });
  }
};

// ==========================================
// STEP 4: DOCTOR APPROVES & SAVES FINAL NOTE
// (Also auto-generates a patient-friendly version)
// ==========================================
export const approveConsultationNote = async (req, res) => {
  try {
    const { noteId, finalNote } = req.body;

    if (!noteId) {
      return res.status(400).json({ error: "Note ID required" });
    }

    // Fetch the existing note to get patient details & transcript
    const existingNote = await prisma.consultationNote.findUnique({
      where: { id: Number(noteId) },
      include: { patient: true, doctor: true },
    });

    // --- Generate patient-friendly version via AI ---
    let patientNote = null;
    try {
      const aiRes = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "meta-llama/llama-3.3-70b-instruct",
          messages: [
            {
              role: "system",
              content: `
You are a friendly health assistant. A doctor has written a clinical note after seeing a patient.
Your job is to rewrite ONLY the patient-relevant parts in very simple, warm, easy-to-understand language.

RULES:
- Write as if you are talking directly to the patient (use "you" and "your").
- Use simple everyday words. No medical jargon.
- Keep it short and clear. Bullet points are great.
- DO NOT include any doctor-facing questions or clinical assessment details.
- DO NOT include "Questions to ask the patient" or anything for doctors.
- Focus ONLY on: what is happening with the patient's health, their medicines, what to do/avoid, when to see the doctor again, and warning signs to watch for.
- Make it feel caring and reassuring.
- Return plain text (no JSON, no markdown headers — just use simple bullets and short paragraphs).
              `,
            },
            {
              role: "user",
              content: `
Here is the doctor's consultation note:

${finalNote}

Rewrite this as a simple, friendly health summary FOR THE PATIENT. Include:
1. What the doctor found / what is going on with their health (1-2 simple sentences)
2. Their medicines — name, when to take, how much (use simple language)
3. What they should do and avoid (diet, rest, lifestyle tips)
4. When to come back to the doctor
5. Warning signs — when to come back immediately

DO NOT include any questions for the doctor to ask. Keep everything simple and easy to understand.
              `,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
      patientNote = aiRes.data.choices[0].message.content;
    } catch (aiErr) {
      console.error("Patient note AI error:", aiErr?.response?.data || aiErr.message);
      // Non-fatal: fallback to basic patient note without AI
      patientNote = `Your doctor has reviewed your consultation and approved the following note.\n\nPlease follow your doctor's instructions carefully and take your medicines as prescribed. If you feel worse or notice any new symptoms, please come back immediately.`;
    }

    // Format with doctor info
    const doctorName = existingNote?.doctor?.name || "Your Doctor";
    const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

    const formattedPatientNote = ` Note from ${doctorName} — ${date}\n\n${patientNote}`;

    // Save final approved note + patient note
    const note = await prisma.consultationNote.update({
      where: { id: Number(noteId) },
      data: {
        finalNote,
        patientNote: formattedPatientNote,
        status: "APPROVED",
      },
    });

    res.json({ note, message: "Consultation note approved and saved." });
  } catch (err) {
    console.error("Approve note error:", err.message);
    res.status(500).json({ error: "Failed to approve note" });
  }
};

// ==========================================
// GET ALL NOTES FOR A PATIENT (Doctor view)
// ==========================================
export const getConsultationNotes = async (req, res) => {
  try {
    const patientId = Number(req.query.patientId);

    const notes = await prisma.consultationNote.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });

    res.json(notes);
  } catch (err) {
    console.error("Get notes error:", err.message);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

// ==========================================
// GET PATIENT'S OWN APPROVED NOTES (Patient dashboard)
// ==========================================
export const getMyPatientNotes = async (req, res) => {
  try {
    const userId = req.headers.userid;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    // Find the patient record for this user
    const patient = await prisma.patient.findUnique({
      where: { userId: Number(userId) },
    });

    if (!patient) {
      return res.json([]); // Patient not found, return empty
    }

    const notes = await prisma.consultationNote.findMany({
      where: {
        patientId: patient.id,
        status: "APPROVED",
        patientNote: { not: null },
      },
      include: {
        doctor: {
          select: { name: true, specialty: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(notes);
  } catch (err) {
    console.error("Get patient notes error:", err.message);
    res.status(500).json({ error: "Failed to fetch your notes" });
  }
};
