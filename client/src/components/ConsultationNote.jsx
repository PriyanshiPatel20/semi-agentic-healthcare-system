import { useState, useEffect, useRef } from "react";
import API from "../api";
import "../styles/consultation.css";
import {
  FaMicrophone, FaStop, FaUpload, FaFileAlt, FaStethoscope,
  FaPills, FaCalendarAlt, FaEye, FaLightbulb, FaExclamationTriangle,
  FaCheckCircle, FaTimes, FaRedo, FaClipboardList, FaHistory,
  FaPlus, FaStar, FaCommentMedical, FaUserMd, FaEdit,
  FaUser, FaTrash, FaExchangeAlt, FaComments,
} from "react-icons/fa";
import { BsFileEarmarkTextFill } from "react-icons/bs";
import { MdRecordVoiceOver, MdOutlineSummarize } from "react-icons/md";
import { HiOutlineSparkles } from "react-icons/hi";
import { toast } from "react-toastify";

// ==========================================
// STEP DEFINITIONS
// ==========================================
const STEPS = [
  { id: 1, label: "Record / Audio" },
  { id: 2, label: "Transcript" },
  { id: 3, label: "SOAP Note" },
  { id: 4, label: "Approved" },
];

// ==========================================
// SOAP NOTE CARD (Structured Visual Renderer)
// ==========================================
function SoapNoteCard({ data, editable, onChange }) {
  if (!data) return null;

  const fields = [
    { key: "what_patient_said",  Icon: FaCommentMedical, label: "What the Patient Said",   color: "blue"   },
    { key: "what_was_observed",  Icon: FaEye,            label: "What Was Observed",        color: "purple" },
    { key: "likely_diagnosis",   Icon: FaStethoscope,    label: "Likely Diagnosis",         color: "teal"   },
    { key: "treatment_plan",     Icon: FaClipboardList,  label: "Treatment Plan",           color: "green"  },
    { key: "medications",        Icon: FaPills,          label: "Medicines Prescribed",     color: "indigo" },
    { key: "follow_up",          Icon: FaCalendarAlt,    label: "Follow-up",                color: "amber"  },
  ];

  return (
    <div className="soap-card-view">
      {/* Patient Banner */}
      {data._patient && (
        <div className="soap-patient-banner">
          <div className="soap-patient-avatar">{data._patient.name?.[0] || "P"}</div>
          <div className="soap-patient-info">
            <div className="soap-patient-name">{data._patient.name}</div>
            <div className="soap-patient-meta">
              Age {data._patient.age} · {data._patient.gender} · Blood Group {data._patient.bloodGroup}
            </div>
          </div>
          <div className="soap-note-badge">AI SOAP Note</div>
        </div>
      )}

      {/* Quick Summary strip */}
      {data.quick_summary && (
        <div className="soap-summary-strip">
          <MdOutlineSummarize className="soap-summary-icon" />
          <p>{data.quick_summary}</p>
        </div>
      )}

      {/* Core Fields Grid */}
      <div className="soap-fields-grid">
        {fields.map(({ key, Icon, label, color }) => (
          <div key={key} className={`soap-field-card soap-field-${color}`}>
            <div className="soap-field-header">
              <Icon className="soap-field-icon" />
              <span className="soap-field-label">{label}</span>
            </div>
            {editable ? (
              <textarea
                className="soap-field-textarea"
                value={data[key] || ""}
                onChange={(e) => onChange(key, e.target.value)}
                rows={3}
              />
            ) : (
              <p className="soap-field-value">{data[key] || "—"}</p>
            )}
          </div>
        ))}
      </div>

      {/* Warning Signs */}
      {(data.warning_signs || []).length > 0 && (
        <div className="soap-warnings-section">
          <div className="soap-section-header">
            <FaExclamationTriangle style={{ color: "var(--danger, #ef4444)" }} />
            <strong>Come Back Immediately If</strong>
          </div>
          <ul className="soap-warnings-list">
            {data.warning_signs.map((w, i) => (
              <li key={i} className="soap-warning-item">
                <span className="soap-warning-dot" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Questions */}
      {(data.suggested_questions || []).length > 0 && (
        <div className="soap-questions-section">
          <div className="soap-section-header">
            <FaLightbulb style={{ color: "#16a34a" }} />
            <strong>Suggested Questions for the Patient</strong>
          </div>
          <ul className="soap-questions-list">
            {data.suggested_questions.map((q, i) => (
              <li key={i} className="soap-question-item">
                <FaCommentMedical className="question-icon" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN COMPONENT: CONSULTATION NOTE
// ==========================================
export default function ConsultationNote({ patient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("new");
  const [currentStep, setCurrentStep] = useState(1);

  // Recording & Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [includeSystemAudio, setIncludeSystemAudio] = useState(false);

  // AI & Note State
  const [transcript, setTranscript] = useState("");
  const [dialogueTurns, setDialogueTurns] = useState([]);
  const [transcriptView, setTranscriptView] = useState("cards"); // 'cards' | 'raw'
  const [soapData, setSoapData] = useState(null);
  const [soapNote, setSoapNote] = useState("");
  const [editedData, setEditedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [approved, setApproved] = useState(false);

  // Past Notes
  const [pastNotes, setPastNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Media references
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Keep Audio Object URL synced
  useEffect(() => {
    if (!audioBlob) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    console.log(`[AI Note Writer] Audio URL created: ${url} (Blob size: ${(audioBlob.size / 1024).toFixed(1)} KB)`);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [audioBlob]);

  // ── MODAL CONTROLS ──
  const openModal = () => {
    console.log(" [AI Note Writer] Opening modal for patient:", patient?.name);
    resetAll();
    setIsOpen(true);
    fetchPastNotes();
  };

  const closeModal = () => {
    console.log(" [AI Note Writer] Closing modal");
    if (isRecording) stopRecording();
    setIsOpen(false);
  };

  const resetAll = () => {
    console.log(" [AI Note Writer] Resetting state to Step 1");
    setCurrentStep(1);
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setUploadedFileName("");
    setTranscript("");
    setDialogueTurns([]);
    setTranscriptView("cards");
    setSoapData(null);
    setSoapNote("");
    setEditedData(null);
    setLoading(false);
    setLoadingMsg("");
    setSavedNoteId(null);
    setApproved(false);
    chunksRef.current = [];
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── FILE UPLOAD ──
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log(` [AI Note Writer] Selected file: "${file.name}" | Size: ${(file.size / 1024).toFixed(1)} KB | Type: "${file.type}"`);

    const validAudio =
      file.type.startsWith("audio/") ||
      /\.(mp3|wav|webm|ogg|m4a|aac|mp4)$/i.test(file.name);

    if (!validAudio) {
      toast.warning("Please upload a valid audio file (MP3, WAV, WEBM, OGG, M4A).");
      return;
    }

    setAudioBlob(file);
    setUploadedFileName(file.name);
    // Keep user on Step 1 so they can review the file & click "Transcribe Audio"
    setCurrentStep(1);
  };

  const formatTime = (secs) =>
    `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  // ── RECORDING CONTROLS ──
  const startRecording = async () => {
    try {
      console.log(" [AI Note Writer] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let combinedStream = stream;

      // Optional: system / tab audio
      if (includeSystemAudio) {
        try {
          console.log("🖥️ [AI Note Writer] Requesting screen/tab audio...");
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1, height: 1, frameRate: 1 },
            audio: true,
          });
          displayStreamRef.current = displayStream;

          if (displayStream.getAudioTracks().length > 0) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioCtx();
            if (audioCtx.state === "suspended") await audioCtx.resume();
            audioContextRef.current = audioCtx;

            const micSource = audioCtx.createMediaStreamSource(stream);
            const tabSource = audioCtx.createMediaStreamSource(displayStream);
            const destination = audioCtx.createMediaStreamDestination();

            micSource.connect(destination);
            tabSource.connect(destination);
            combinedStream = destination.stream;
            console.log(" [AI Note Writer] Combined microphone and tab audio into one stream");
          } else {
            console.warn(" [AI Note Writer] No audio track detected in display media");
            toast.warning("No audio track detected in the shared screen/tab. Please make sure to check 'Share tab audio' in the browser sharing prompt.");
          }
        } catch (err) {
          console.warn(" [AI Note Writer] Display audio recording skipped or denied:", err.message);
        }
      }

      // Detect supported mimeType
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported("audio/webm")) mimeType = "audio/webm";
        else if (MediaRecorder.isTypeSupported("audio/ogg")) mimeType = "audio/ogg";
        else if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
        else mimeType = "";
      }

      console.log(`🎙️ [AI Note Writer] Initializing MediaRecorder with mimeType: "${mimeType || "default"}"`);
      const recorder = mimeType
        ? new MediaRecorder(combinedStream, { mimeType })
        : new MediaRecorder(combinedStream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const outMime = recorder.mimeType || "audio/webm";
        const recordedBlob = new Blob(chunksRef.current, { type: outMime });
        console.log(` [AI Note Writer] Recording stopped. Final blob size: ${(recordedBlob.size / 1024).toFixed(1)} KB, type: "${recordedBlob.type}"`);
        setAudioBlob(recordedBlob);
        setUploadedFileName("Recorded Consultation.webm");
        setIsRecording(false);
        clearInterval(timerRef.current);
      };

      recorder.start(250); // collect 250ms chunks
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      console.log("[AI Note Writer] Recording started successfully!");
    } catch (err) {
      console.error(" [AI Note Writer] Microphone access error:", err);
      toast.error(`Microphone error: ${err.message || "Access denied"}. Please allow microphone permissions in your browser.`);
    }
  };

  const stopRecording = () => {
    console.log(" [AI Note Writer] Stop recording requested");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  // ── STEP 1 → 2: TRANSCRIBE AUDIO ──
  const transcribeAudio = async () => {
    if (!audioBlob) {
      toast.warning("No audio recorded or selected yet.");
      return;
    }

    console.log(` [AI Note Writer] Transcribing audio blob: ${(audioBlob.size / 1024).toFixed(1)} KB...`);
    setLoading(true);
    setLoadingMsg("Transcribing audio with Gemini AI...");

    try {
      const fd = new FormData();
      if (audioBlob instanceof File) {
        fd.append("audio", audioBlob, audioBlob.name);
      } else {
        fd.append("audio", audioBlob, uploadedFileName || "consultation.webm");
      }

      const res = await API.post("/consultation-notes/transcribe", fd, {
        headers: {
          role: user.role || "doctor",
          userid: user.id,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log(" [AI Note Writer] Transcription received:", res.data);
      const formatted = res.data.transcript || "";
      setTranscript(formatted);

      if (Array.isArray(res.data.dialogue) && res.data.dialogue.length > 0) {
        setDialogueTurns(res.data.dialogue);
      } else {
        setDialogueTurns(parseTranscriptDialogue(formatted));
      }

      setTranscriptView("cards");
      toast.success("Audio transcribed successfully!");
      // Move to Step 2 (Review Transcript)
      setCurrentStep(2);
    } catch (err) {
      const serverMsg = err?.response?.data?.error || err?.response?.data?.detail || err.message;
      console.error(" [AI Note Writer] Transcription failed:", {
        error: err,
        serverMsg,
        response: err.response?.data,
      });

      toast.error(`Transcription Error: ${serverMsg}. You can type the transcript manually on Step 2.`);
      // Still allow doctor to proceed to Step 2 to type manually
      setCurrentStep(2);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  // ── DIALOGUE / SPEAKER CONVERSATION HELPERS ──
  const serializeDialogue = (turns) => {
    return turns
      .filter((t) => t.text && t.text.trim())
      .map((t) => `${t.speaker}: "${t.text.replace(/^["']|["']$/g, "").trim()}"`)
      .join("\n\n");
  };

  const parseTranscriptDialogue = (raw) => {
    if (!raw || !raw.trim()) return [];

    const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    // 1. Try parsing JSON array directly: [ { "speaker": "Doctor", "text": "..." }, ... ]
    try {
      const arrayStart = clean.indexOf("[");
      const arrayEnd = clean.lastIndexOf("]");
      if (arrayStart !== -1 && arrayEnd > arrayStart) {
        const parsedArray = JSON.parse(clean.substring(arrayStart, arrayEnd + 1));
        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          const turns = parsedArray
            .map((item) => ({
              speaker: (item.speaker || "").toLowerCase().includes("pat")
                ? "Patient"
                : (item.speaker || "").toLowerCase().includes("care")
                ? "Caregiver"
                : "Doctor",
              text: (item.text || "").replace(/^["']|["']$/g, "").trim(),
            }))
            .filter((t) => t.text.length > 0);
          if (turns.length > 0) return turns;
        }
      }

      // 2. Try parsing JSON object: { "dialogue": [ ... ] } or { "turns": [ ... ] }
      const objStart = clean.indexOf("{");
      const objEnd = clean.lastIndexOf("}");
      if (objStart !== -1 && objEnd > objStart) {
        const parsedObj = JSON.parse(clean.substring(objStart, objEnd + 1));
        const arr = parsedObj.dialogue || parsedObj.conversation || parsedObj.turns;
        if (Array.isArray(arr) && arr.length > 0) {
          const turns = arr
            .map((item) => ({
              speaker: (item.speaker || "").toLowerCase().includes("pat")
                ? "Patient"
                : (item.speaker || "").toLowerCase().includes("care")
                ? "Caregiver"
                : "Doctor",
              text: (item.text || "").replace(/^["']|["']$/g, "").trim(),
            }))
            .filter((t) => t.text.length > 0);
          if (turns.length > 0) return turns;
        }
      }
    } catch (e) {
      // Continue to line and delimiter parser
    }

    // 3. Line-by-line speaker tag parser (handles **Doctor:**, **Doctor**: , Doctor:, [Doctor]:, etc.)
    const lines = clean.split(/\r?\n/);
    const turns = [];
    let currentSpeaker = null;
    let currentText = "";

    const speakerLineRegex = /^\s*(?:\*{1,2}|#{1,4}|\[)?\s*(Doctor|Dr\.?|Patient|Pt\.?|Caregiver|Nurse)\s*(?:\*{1,2}|\])?\s*[:\-–—]?\s*(?:\*{1,2})?\s*[:\-–—]?\s*(.*)$/i;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(speakerLineRegex);
      if (match) {
        const rawSp = match[1].toLowerCase();
        const nextSpeaker = rawSp.startsWith("dr") || rawSp.startsWith("doc")
          ? "Doctor"
          : rawSp.startsWith("pt") || rawSp.startsWith("pat")
          ? "Patient"
          : "Caregiver";
        const lineContent = (match[2] || "").replace(/^["']|["']$/g, "").trim();

        if (currentSpeaker && currentText.trim()) {
          turns.push({ speaker: currentSpeaker, text: currentText.trim() });
        }
        currentSpeaker = nextSpeaker;
        currentText = lineContent;
      } else {
        if (currentSpeaker) {
          currentText = currentText ? `${currentText} ${trimmed}` : trimmed;
        } else {
          currentText = currentText ? `${currentText} ${trimmed}` : trimmed;
        }
      }
    }

    if (currentSpeaker && currentText.trim()) {
      turns.push({ speaker: currentSpeaker, text: currentText.trim() });
    }

    if (turns.length > 1) {
      return turns;
    }

    // 4. Segment parser for inline markers
    const inlineMarkerRegex = /(?:\*{1,2}|#{1,4}|\[)?\s*(Doctor|Dr\.?|Patient|Pt\.?|Caregiver|Nurse)\s*(?:\*{1,2}|\])?\s*[:\-–—]\s*(?:\*{1,2})?/gi;
    const inlineMatches = [...clean.matchAll(inlineMarkerRegex)];
    if (inlineMatches.length > 1) {
      const segmentTurns = [];
      for (let i = 0; i < inlineMatches.length; i++) {
        const m = inlineMatches[i];
        const speakerRaw = m[1].toLowerCase();
        const speaker = speakerRaw.startsWith("dr") || speakerRaw.startsWith("doc")
          ? "Doctor"
          : speakerRaw.startsWith("pt") || speakerRaw.startsWith("pat")
          ? "Patient"
          : "Caregiver";
        const startIndex = m.index + m[0].length;
        const endIndex = i < inlineMatches.length - 1 ? inlineMatches[i + 1].index : clean.length;
        const segmentText = clean.substring(startIndex, endIndex).replace(/^["']|["']$/g, "").trim();
        if (segmentText) {
          segmentTurns.push({ speaker, text: segmentText });
        }
      }
      if (segmentTurns.length > 1) return segmentTurns;
    }

    // 5. Intelligent Clinical Sentence-level Dialogue Separator:
    // When text is raw continuous consultation speech without explicit speaker tags,
    // split into individual sentences and determine who is speaking (Doctor vs Patient)
    const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [clean];
    if (sentences.length > 1) {
      const separatedTurns = [];
      let curSpeaker = null;
      let curText = "";

      for (const sentStr of sentences) {
        const s = sentStr.trim();
        if (!s) continue;

        const lower = s.toLowerCase();

        // Clinical questions, examinations, directives, instructions & advice -> DOCTOR
        const isDoc =
          /\b(how are you|how do you|how long|what is|what seems|what brings|where does|have you|do you|did you|are you|can you|let me|open your|breathe|lie down|bp|blood pressure|temperature|keep a|take each|take this|take the|prescribe|prescribed|dosage|dose|twice daily|once daily|after meals|before food|with water|do not change|do not combine|check with your doctor|apply the|avoid)\b/i.test(lower) ||
          s.endsWith("?");

        // Patient symptoms, complaints, answers, and disclosures -> PATIENT
        const isPat =
          /\b(i take|i have|i feel|i get|i forget|i sometimes|i am also|i'm also|i am taking|i'm taking|prescribed by my doctors|prescribed by my doctor|my knees|my knee|my head|my back|my chest|my stomach|pain|hurts|cough|fever|headache|thank you|thanks)\b/i.test(lower);

        let speaker;
        if (isDoc && !isPat) {
          speaker = "Doctor";
        } else if (isPat) {
          speaker = "Patient";
        } else if (s.endsWith("?")) {
          speaker = "Doctor";
        } else {
          // If ambiguous, alternate speaker from previous turn
          speaker = curSpeaker === "Doctor" ? "Patient" : "Doctor";
        }

        if (curSpeaker && speaker !== curSpeaker && curText.trim()) {
          separatedTurns.push({ speaker: curSpeaker, text: curText.trim() });
          curSpeaker = speaker;
          curText = s;
        } else {
          curSpeaker = speaker;
          curText = curText ? `${curText} ${s}` : s;
        }
      }

      if (curSpeaker && curText.trim()) {
        separatedTurns.push({ speaker: curSpeaker, text: curText.trim() });
      }

      if (separatedTurns.length > 1) {
        return separatedTurns;
      }
    }

    // Single turn fallback if only one sentence exists
    return turns.length > 0 ? turns : [{ speaker: "Doctor", text: clean }];
  };

  const handleUpdateTurnText = (index, newText) => {
    setDialogueTurns((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], text: newText };
      }
      setTranscript(serializeDialogue(updated));
      return updated;
    });
  };

  const handleToggleSpeaker = (index) => {
    setDialogueTurns((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        const nextSpeaker = updated[index].speaker === "Doctor" ? "Patient" : "Doctor";
        updated[index] = { ...updated[index], speaker: nextSpeaker };
      }
      setTranscript(serializeDialogue(updated));
      return updated;
    });
  };

  const handleDeleteTurn = (index) => {
    setDialogueTurns((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      setTranscript(serializeDialogue(updated));
      return updated;
    });
  };

  const handleAddTurn = (speaker, afterIndex = null) => {
    setDialogueTurns((prev) => {
      const newTurn = { speaker, text: "" };
      let updated;
      if (afterIndex !== null && afterIndex >= 0 && afterIndex < prev.length) {
        updated = [...prev.slice(0, afterIndex + 1), newTurn, ...prev.slice(afterIndex + 1)];
      } else {
        updated = [...prev, newTurn];
      }
      setTranscript(serializeDialogue(updated));
      return updated;
    });
    setTranscriptView("cards");
  };

  const handleAutoFormatDialogue = async () => {
    const textToFormat = (transcript && transcript.trim()) 
      || (dialogueTurns && dialogueTurns.length > 0 ? serializeDialogue(dialogueTurns) : "");

    if (!textToFormat) {
      toast.warning("Please enter or transcribe a consultation dialogue before formatting.");
      return;
    }

    // 1. Immediately apply clinical dialogue separation to the cards
    const immediateTurns = parseTranscriptDialogue(textToFormat);
    if (immediateTurns.length > 0) {
      setDialogueTurns(immediateTurns);
      setTranscript(serializeDialogue(immediateTurns));
      setTranscriptView("cards");
    }

    setLoading(true);
    setLoadingMsg("AI is identifying who said what (Doctor vs Patient)...");
    try {
      const res = await API.post(
        "/consultation-notes/format-dialogue",
        { transcript: textToFormat, patient },
        { headers: { role: user.role || "doctor", userid: user.id } }
      );
      if (res.data?.dialogue && res.data.dialogue.length > 0) {
        setDialogueTurns(res.data.dialogue);
      } else if (res.data?.formattedTranscript) {
        setDialogueTurns(parseTranscriptDialogue(res.data.formattedTranscript));
      }
      if (res.data?.formattedTranscript) {
        setTranscript(res.data.formattedTranscript);
      }
      setTranscriptView("cards");
      toast.success("Dialogue formatted successfully!");
    } catch (err) {
      console.warn("⚠️ [ConsultationNote] Format API error (kept local separation):", err);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleRawTextChange = (newVal) => {
    setTranscript(newVal);
    setDialogueTurns(parseTranscriptDialogue(newVal));
  };

  // ── STEP 2 → 3: GENERATE SOAP NOTE ──
  const generateSOAPNote = async () => {
    if (!transcript.trim()) {
      toast.warning("Please enter or transcribe a consultation dialogue before generating the note.");
      return;
    }

    console.log(` [AI Note Writer] Requesting SOAP Note for patient: "${patient?.name}" | Transcript length: ${transcript.length}`);
    setLoading(true);
    setLoadingMsg("Gemini AI is analyzing transcript and generating SOAP note...");

    try {
      const res = await API.post(
        "/consultation-notes/generate-soap",
        { transcript, patient },
        { headers: { role: user.role || "doctor", userid: user.id } }
      );

      console.log(" [AI Note Writer] SOAP Note generated successfully:", res.data);
      setSoapData(res.data.soapData);
      setSoapNote(res.data.soapNote);
      setEditedData(JSON.parse(JSON.stringify(res.data.soapData)));

      // Auto-save draft
      console.log(" [AI Note Writer] Auto-saving note draft to database...");
      const dr = await API.post(
        "/consultation-notes/save-draft",
        { patientId: patient.id, transcript, soapNote: res.data.soapNote },
        { headers: { role: user.role || "doctor", userid: user.id } }
      );

      console.log(" [AI Note Writer] Draft note saved with ID:", dr.data?.note?.id);
      setSavedNoteId(dr.data.note.id);
      toast.success("SOAP Note generated and draft saved!");
      // Move to Step 3 (Review & Edit SOAP Note)
      setCurrentStep(3);
    } catch (err) {
      const serverMsg = err?.response?.data?.detail
        ? `${err?.response?.data?.error || "Error"}: ${err?.response?.data?.detail}`
        : (err?.response?.data?.error || err.message);
      console.error(" [AI Note Writer] SOAP generation failed:", {
        error: err,
        serverMsg,
        response: err.response?.data,
      });
      toast.error(`Clinical Note Generation Failed: ${serverMsg}`);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const handleFieldEdit = (key, value) => {
    setEditedData((prev) => ({ ...prev, [key]: value }));
  };

  // ── STEP 3 → 4: APPROVE & SAVE NOTE ──
  const approveNote = async () => {
    if (!savedNoteId) {
      toast.warning("No draft note ID found. Please regenerate or re-save the draft.");
      return;
    }

    console.log(`🚀 [AI Note Writer] Approving consultation note ID: ${savedNoteId}...`);
    setLoading(true);
    setLoadingMsg("Generating patient-friendly summary and approving note...");

    try {
      const res = await API.post(
        "/consultation-notes/approve",
        { noteId: savedNoteId, finalNote: JSON.stringify(editedData) },
        { headers: { role: user.role || "doctor", userid: user.id } }
      );

      console.log("✅ [AI Note Writer] Consultation note approved and saved:", res.data);
      setApproved(true);
      toast.success("Consultation note approved and saved successfully!");
      setCurrentStep(4);
      fetchPastNotes();
    } catch (err) {
      const serverMsg = err?.response?.data?.error || err?.response?.data?.detail || err.message;
      console.error("❌ [AI Note Writer] Approve failed:", {
        error: err,
        serverMsg,
        response: err.response?.data,
      });
      toast.error(`Failed to approve consultation note: ${serverMsg}`);
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  // ── PAST NOTES ──
  const fetchPastNotes = async () => {
    if (!patient?.id) return;
    console.log(`📋 [AI Note Writer] Fetching past consultation notes for patient ID: ${patient.id}...`);
    setLoadingNotes(true);
    try {
      const res = await API.get(`/consultation-notes?patientId=${patient.id}`, {
        headers: { role: user.role || "doctor", userid: user.id },
      });
      console.log(`✅ [AI Note Writer] Loaded ${res.data?.length || 0} past notes for ${patient.name}`);
      setPastNotes(res.data || []);
    } catch (err) {
      console.error("❌ [AI Note Writer] Failed to fetch past notes:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const parseNote = (note) => {
    try {
      return JSON.parse(note);
    } catch {
      return null;
    }
  };

  // Cleanup media tracks on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (!patient) return null;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <>
      {/* TRIGGER BUTTON */}
      <button className="consult-trigger-btn" onClick={openModal} id="consult-note-btn">
        <BsFileEarmarkTextFill />
        AI Note Writer
      </button>

      {/* MODAL */}
      {isOpen && (
        <div
          className="consult-overlay"
          onClick={(e) => e.target === e.currentTarget && !isRecording && closeModal()}
        >
          <div className="consult-modal">
            {/* HEADER */}
            <div className="consult-header">
              <div className="consult-header-left">
                <div className="consult-header-icon">
                  <FaStethoscope />
                </div>
                <div className="consult-header-text">
                  <h2>AI Note Writer</h2>
                  <p>Audio / Speech → Transcript → Clinical SOAP Note → Approve</p>
                  {patient && (
                    <div className="patient-badge">
                      <FaUserMd style={{ marginRight: 5 }} />
                      {patient.name} · {patient.age}y · {patient.gender} · Blood Group: {patient.bloodGroup || "N/A"}
                    </div>
                  )}
                </div>
              </div>
              <button className="consult-close-btn" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            {/* TABS */}
            <div className="consult-tabs">
              <button
                className={`consult-tab ${activeTab === "new" ? "active" : ""}`}
                onClick={() => setActiveTab("new")}
              >
                <HiOutlineSparkles style={{ marginRight: 6 }} /> New Consultation
              </button>
              <button
                className={`consult-tab ${activeTab === "history" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("history");
                  fetchPastNotes();
                }}
              >
                <FaHistory style={{ marginRight: 6 }} /> Past Notes ({pastNotes.length})
              </button>
            </div>

            {/* ── TAB: NEW CONSULTATION ── */}
            {activeTab === "new" && (
              <>
                {/* STEPPER */}
                <div className="consult-steps">
                  {STEPS.map((step, i) => (
                    <div
                      key={step.id}
                      className="step-wrapper"
                      style={{ flex: i < STEPS.length - 1 ? 1 : "none" }}
                    >
                      <div
                        className={`step-item ${
                          currentStep === step.id
                            ? "active"
                            : currentStep > step.id
                            ? "done"
                            : ""
                        }`}
                      >
                        <div className="step-circle">
                          {currentStep > step.id ? <FaCheckCircle size={12} /> : step.id}
                        </div>
                        <span className="step-label">{step.label}</span>
                      </div>
                      {i < STEPS.length - 1 && <div className="step-divider" />}
                    </div>
                  ))}
                </div>

                <div className="consult-body">
                  {/* LOADING OVERLAY */}
                  {loading && (
                    <div className="ai-loading">
                      <div className="loading-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                      {loadingMsg}
                    </div>
                  )}

                  {/* ──────────────────────────────────────────
                      STEP 1: RECORD OR UPLOAD AUDIO
                  ────────────────────────────────────────── */}
                  {currentStep === 1 && (
                    <div className="consult-section">
                      <div className="section-title">
                        <FaMicrophone className="section-title-icon" />
                        Step 1 — Record Audio or Upload Consultation File
                      </div>

                      <div className={`recording-zone ${isRecording ? "recording" : ""}`}>
                        {/* RECORD BUTTON */}
                        <button
                          id="record-toggle-btn"
                          className={`record-btn ${isRecording ? "active" : "idle"}`}
                          onClick={isRecording ? stopRecording : startRecording}
                          title={isRecording ? "Stop Recording" : "Start Recording"}
                        >
                          {isRecording ? <FaStop /> : <FaMicrophone />}
                        </button>

                        {/* RECORDING TIMER & WAVE ANIMATION */}
                        {isRecording && (
                          <>
                            <div className="record-timer">{formatTime(recordingTime)}</div>
                            <div className="audio-wave">
                              <span className="wave-bar bar-1" />
                              <span className="wave-bar bar-2" />
                              <span className="wave-bar bar-3" />
                              <span className="wave-bar bar-4" />
                              <span className="wave-bar bar-5" />
                            </div>
                          </>
                        )}

                        {/* STATUS MESSAGE */}
                        <div className={`record-status ${isRecording ? "recording" : ""}`}>
                          {isRecording
                            ? "Recording in progress — speak clearly into your mic..."
                            : audioBlob
                            ? `Audio ready (${uploadedFileName || "recorded"}). Listen below or click Transcribe.`
                            : "Click the microphone above to start recording, or upload an audio file below."}
                        </div>

                        {/* AUDIO PLAYER PREVIEW */}
                        {!isRecording && audioBlob && audioUrl && (
                          <div style={{ marginTop: "14px", width: "100%", maxWidth: "420px", textAlign: "center" }}>
                            <audio
                              controls
                              src={audioUrl}
                              style={{ width: "100%", borderRadius: "8px", outline: "none" }}
                            />
                            {uploadedFileName && (
                              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                                📁 {uploadedFileName} ({(audioBlob.size / 1024).toFixed(1)} KB)
                              </div>
                            )}
                          </div>
                        )}

                        {/* OPTIONAL TAB AUDIO TOGGLE */}
                        {!isRecording && !audioBlob && (
                          <div className="system-audio-toggle">
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={includeSystemAudio}
                                onChange={(e) => setIncludeSystemAudio(e.target.checked)}
                              />
                              <span className="slider round"></span>
                            </label>
                            <span className="toggle-label">
                              Record system/tab audio along with microphone
                            </span>
                          </div>
                        )}

                        {!isRecording && !audioBlob && includeSystemAudio && (
                          <div className="system-audio-tip">
                            💡 <strong>Tip:</strong> In the browser sharing dialog, select the tab/screen playing audio and check <strong>"Share tab audio"</strong>.
                          </div>
                        )}
                      </div>

                      {/* ACTIONS WHEN AUDIO IS READY */}
                      {audioBlob && !isRecording && (
                        <div className="consult-actions" style={{ marginTop: "18px" }}>
                          <button
                            id="transcribe-btn"
                            className="consult-btn btn-primary"
                            onClick={transcribeAudio}
                            disabled={loading}
                          >
                            <MdRecordVoiceOver style={{ marginRight: 6 }} /> Transcribe Audio with Gemini AI
                          </button>
                          <button
                            className="consult-btn btn-outline"
                            onClick={() => {
                              setAudioBlob(null);
                              setUploadedFileName("");
                              setRecordingTime(0);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                          >
                            <FaTimes style={{ marginRight: 6 }} /> Clear / Re-record
                          </button>
                          <button
                            className="consult-btn btn-outline"
                            onClick={() => {
                              if (dialogueTurns.length === 0 && transcript) {
                                setDialogueTurns(parseTranscriptDialogue(transcript));
                              }
                              setCurrentStep(2);
                            }}
                            title="Skip audio and type transcript manually"
                          >
                            <FaEdit style={{ marginRight: 6 }} /> Type Manually Instead
                          </button>
                        </div>
                      )}

                      {/* UPLOAD FILE OR SKIP TO TEXT */}
                      {!audioBlob && !isRecording && (
                        <>
                          <div className="or-divider">
                            <span>or upload recording file</span>
                          </div>

                          <div className="upload-box">
                            <div className="upload-info">
                              <div className="upload-info-title">
                                <FaUpload style={{ marginRight: 7 }} /> Upload a recorded consultation audio file
                              </div>
                              <div className="upload-info-subtitle">Supported formats: MP3, WAV, WEBM, OGG, M4A</div>
                            </div>
                            <button
                              id="upload-audio-btn"
                              className="consult-btn btn-outline"
                              onClick={() => fileInputRef.current?.click()}
                              style={{ flexShrink: 0 }}
                            >
                              <FaUpload style={{ marginRight: 6 }} /> Choose File
                            </button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="audio/*,.mp3,.wav,.webm,.ogg,.m4a,.aac,.mp4"
                              style={{ display: "none" }}
                              onChange={handleFileUpload}
                            />
                          </div>

                          <div style={{ textAlign: "center", marginTop: "16px" }}>
                            <button
                              className="consult-btn btn-outline"
                              style={{ fontSize: "13px" }}
                              onClick={() => {
                                if (dialogueTurns.length === 0 && transcript) {
                                  setDialogueTurns(parseTranscriptDialogue(transcript));
                                }
                                setCurrentStep(2);
                              }}
                            >
                              <FaEdit style={{ marginRight: 6 }} /> Write / Paste Consultation Transcript Manually
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ──────────────────────────────────────────
                      STEP 2: REVIEW & EDIT TRANSCRIPT
                  ────────────────────────────────────────── */}
                  {currentStep === 2 && (
                    <div className="consult-section">
                      <div className="section-title">
                        <FaFileAlt className="section-title-icon" />
                        Step 2 — Doctor &amp; Patient Conversation Stream
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                        AI has identified who is speaking. Review the dialogue below. You can edit any sentence, switch speaker, or add new statements before generating the note.
                      </p>

                      {/* DIALOGUE TOOLBAR */}
                      <div className="dialogue-toolbar">
                        <div className="dialogue-view-toggle">
                          <button
                            type="button"
                            className={`dialogue-toggle-btn ${transcriptView === "cards" ? "active" : ""}`}
                            onClick={() => setTranscriptView("cards")}
                          >
                            <FaComments /> Dialogue Cards ({dialogueTurns.length})
                          </button>
                          <button
                            type="button"
                            className={`dialogue-toggle-btn ${transcriptView === "raw" ? "active" : ""}`}
                            onClick={() => setTranscriptView("raw")}
                          >
                            <FaEdit /> Raw Text
                          </button>
                        </div>

                        <div className="dialogue-quick-actions">
                          <button
                            type="button"
                            className="speaker-badge-btn speaker-btn-doctor"
                            onClick={() => handleAddTurn("Doctor")}
                            title="Add a Doctor dialogue statement"
                          >
                            <FaPlus size={10} /> <FaUserMd /> Doctor Says
                          </button>
                          <button
                            type="button"
                            className="speaker-badge-btn speaker-btn-patient"
                            onClick={() => handleAddTurn("Patient")}
                            title="Add a Patient dialogue statement"
                          >
                            <FaPlus size={10} /> <FaUser /> Patient Says
                          </button>
                          {/* <button
                            type="button"
                            className="speaker-badge-btn speaker-btn-ai"
                            onClick={handleAutoFormatDialogue}
                            disabled={loading || (!transcript.trim() && dialogueTurns.length === 0)}
                            title="Let AI identify and separate Doctor vs Patient statements"
                          >
                            <HiOutlineSparkles /> Re-identify with AI
                          </button> */}
                        </div>
                      </div>

                      {/* VIEW 1: DIALOGUE CARDS STREAM */}
                      {transcriptView === "cards" && (
                        <div className="dialogue-cards-list">
                          {dialogueTurns.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "32px 16px", color: "#94a3b8" }}>
                              <p>No dialogue recorded yet. Click <strong>+ Doctor Says</strong> or <strong>+ Patient Says</strong>, or switch to <strong>Raw Text</strong> to paste dialogue.</p>
                            </div>
                          ) : (
                            dialogueTurns.map((turn, idx) => {
                              const isDoc = turn.speaker === "Doctor";
                              const isPat = turn.speaker === "Patient";
                              return (
                                <div
                                  key={idx}
                                  className={`dialogue-turn-card ${
                                    isDoc ? "doctor-card" : isPat ? "patient-card" : "caregiver-card"
                                  }`}
                                >
                                  <div className="dialogue-card-header">
                                    <div className="dialogue-speaker-identity">
                                      <div
                                        className={`dialogue-avatar-circle ${
                                          isDoc ? "avatar-doctor" : isPat ? "avatar-patient" : "avatar-caregiver"
                                        }`}
                                      >
                                        {isDoc ? <FaUserMd /> : <FaUser />}
                                      </div>
                                      <div>
                                        <span
                                          className={`dialogue-speaker-name ${
                                            isDoc
                                              ? "speaker-name-doctor"
                                              : isPat
                                              ? "speaker-name-patient"
                                              : "speaker-name-caregiver"
                                          }`}
                                        >
                                          {isDoc ? "Doctor Says:" : isPat ? "Patient Says:" : "Caregiver Says:"}
                                        </span>
                                        <span className="dialogue-turn-badge">
                                          {isDoc ? "(Attending Doctor)" : `(${patient?.name || "Patient"})`}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="dialogue-turn-actions">
                                      <button
                                        type="button"
                                        className="turn-action-btn"
                                        onClick={() => handleToggleSpeaker(idx)}
                                        title="Switch speaker between Doctor and Patient"
                                      >
                                        <FaExchangeAlt size={10} /> Switch to {isDoc ? "Patient" : "Doctor"}
                                      </button>
                                      <button
                                        type="button"
                                        className="turn-action-btn"
                                        onClick={() => handleAddTurn(isDoc ? "Patient" : "Doctor", idx)}
                                        title={`Insert ${isDoc ? "Patient" : "Doctor"} reply directly after this`}
                                      >
                                        <FaPlus size={10} /> {isDoc ? "Patient Reply" : "Doctor Reply"}
                                      </button>
                                      <button
                                        type="button"
                                        className="turn-action-btn delete-btn"
                                        onClick={() => handleDeleteTurn(idx)}
                                        title="Delete this turn"
                                      >
                                        <FaTrash size={10} />
                                      </button>
                                    </div>
                                  </div>

                                  <textarea
                                    className="dialogue-turn-textarea"
                                    value={turn.text}
                                    onChange={(e) => handleUpdateTurnText(idx, e.target.value)}
                                    placeholder={isDoc ? "Enter what the doctor said..." : "Enter what the patient said..."}
                                    rows={Math.max(2, Math.ceil((turn.text?.length || 0) / 75))}
                                  />
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* VIEW 2: RAW TEXT EDITOR */}
                      {transcriptView === "raw" && (
                        <textarea
                          className="transcript-box"
                          value={transcript}
                          onChange={(e) => handleRawTextChange(e.target.value)}
                          placeholder="Doctor: &quot;What symptoms are you having today?&quot;&#10;Patient: &quot;I have had a high fever and sore throat for 3 days.&quot;&#10;Doctor: &quot;Let me examine your throat.&quot;"
                          rows={12}
                        />
                      )}

                      <div className="consult-actions" style={{ marginTop: "16px" }}>
                        <button
                          id="generate-soap-btn"
                          className="consult-btn btn-primary"
                          onClick={generateSOAPNote}
                          disabled={loading || (!transcript.trim() && dialogueTurns.length === 0)}
                        >
                          <HiOutlineSparkles style={{ marginRight: 6 }} /> Generate Clinical SOAP Note
                        </button>
                        <button className="consult-btn btn-outline" onClick={() => setCurrentStep(1)}>
                          ← Back to Audio
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ──────────────────────────────────────────
                      STEP 3: REVIEW & EDIT SOAP NOTE
                  ────────────────────────────────────────── */}
                  {currentStep === 3 && editedData && (
                    <>
                      {/* COLLAPSIBLE TRANSCRIPT */}
                      <details className="transcript-collapsible">
                        <summary>
                          <FaFileAlt style={{ marginRight: 6 }} /> View Original Consultation Transcript
                        </summary>
                        <textarea
                          className="transcript-box"
                          value={transcript}
                          onChange={(e) => setTranscript(e.target.value)}
                          rows={6}
                          style={{ marginTop: "12px" }}
                        />
                      </details>

                      {/* EDITABLE SOAP NOTE CARDS */}
                      <div
                        className="consult-section"
                        style={{
                          padding: 0,
                          border: "none",
                          background: "transparent",
                          boxShadow: "none",
                        }}
                      >
                        <SoapNoteCard
                          data={editedData}
                          editable={true}
                          onChange={handleFieldEdit}
                        />
                      </div>

                      {/* ACTION BUTTONS */}
                      <div
                        className="consult-actions"
                        style={{
                          marginTop: "18px",
                          justifyContent: "space-between",
                          borderTop: "1px solid #e2e8f0",
                          paddingTop: "14px",
                        }}
                      >
                        <button className="consult-btn btn-outline" onClick={() => setCurrentStep(2)}>
                          ← Back to Transcript
                        </button>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            className="consult-btn btn-outline"
                            onClick={() => {
                              console.log("🔄 [AI Note Writer] Resetting fields to original AI draft");
                              setEditedData(JSON.parse(JSON.stringify(soapData)));
                            }}
                          >
                            <FaRedo style={{ marginRight: 6 }} /> Reset to AI Draft
                          </button>

                          <button
                            id="approve-note-btn"
                            className="consult-btn btn-success"
                            onClick={approveNote}
                            disabled={loading}
                          >
                            <FaCheckCircle style={{ marginRight: 6 }} /> Approve &amp; Save Note
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ──────────────────────────────────────────
                      STEP 4: COMPLETE & APPROVED
                  ────────────────────────────────────────── */}
                  {currentStep === 4 && (
                    <div className="consult-complete">
                      <div className="complete-icon">
                        <FaStar size={48} color="#f59e0b" />
                      </div>
                      <div className="complete-title">Consultation Note Approved &amp; Saved!</div>
                      <div className="complete-subtitle">
                        The note has been officially added to <strong>{patient.name}</strong>'s medical record. A patient-friendly summary has also been generated for their portal.
                      </div>
                      <div
                        className="consult-actions"
                        style={{ justifyContent: "center", marginTop: "24px" }}
                      >
                        <button
                          className="consult-btn btn-primary"
                          onClick={() => {
                            resetAll();
                            setActiveTab("history");
                            fetchPastNotes();
                          }}
                        >
                          <FaHistory style={{ marginRight: 6 }} /> View Past Notes
                        </button>
                        <button className="consult-btn btn-outline" onClick={resetAll}>
                          <FaPlus style={{ marginRight: 6 }} /> New Consultation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── TAB: PAST NOTES HISTORY ── */}
            {activeTab === "history" && (
              <div className="consult-body">
                {loadingNotes ? (
                  <div className="ai-loading">
                    <div className="loading-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    Loading past notes...
                  </div>
                ) : pastNotes.length === 0 ? (
                  <div className="empty-notes">
                    <div className="empty-notes-icon">
                      <FaClipboardList size={48} />
                    </div>
                    <div>No consultation notes found for {patient.name}.</div>
                    <div style={{ fontSize: "12px", marginTop: "6px", color: "#64748b" }}>
                      Click "New Consultation" above to create an AI clinical note.
                    </div>
                  </div>
                ) : (
                  <div className="past-notes-list">
                    {pastNotes.map((note) => {
                      const parsed = parseNote(note.finalNote || note.soapNote);
                      const isApproved = note.status === "APPROVED";
                      return (
                        <div key={note.id} className="past-note-card">
                          <div className="past-note-meta">
                            <span className="past-note-date">
                              {" "}
                              {new Date(note.createdAt).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {note.doctor?.name && ` · Dr. ${note.doctor.name}`}
                            </span>
                            <span className={`note-status-badge ${isApproved ? "approved" : "draft"}`}>
                              {isApproved ? (
                                <>
                                  <FaCheckCircle style={{ marginRight: 4 }} /> Approved
                                </>
                              ) : (
                                <>
                                  <FaFileAlt style={{ marginRight: 4 }} /> Draft
                                </>
                              )}
                            </span>
                          </div>

                          {parsed ? (
                            <SoapNoteCard data={parsed} editable={false} onChange={() => {}} />
                          ) : (
                            <div className="past-note-preview">
                              {note.finalNote || note.soapNote || "No note content recorded."}
                            </div>
                          )}

                          {note.patientNote && (
                            <div
                              style={{
                                marginTop: "12px",
                                padding: "12px 14px",
                                backgroundColor: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                borderRadius: "8px",
                                fontSize: "13px",
                                color: "#166534",
                                whiteSpace: "pre-line",
                              }}
                            >
                              <strong>Patient Summary:</strong>
                              <div style={{ marginTop: "4px" }}>{note.patientNote}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
