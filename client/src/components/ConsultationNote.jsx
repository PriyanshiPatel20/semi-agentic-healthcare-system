import { useState, useEffect, useRef } from "react";
import API from "../api";
import ReactMarkdown from "react-markdown";
import "../styles/consultation.css";

// ==========================================
// CONSTANTS
// ==========================================
const STEPS = [
  { id: 1, label: "Record" },
  { id: 2, label: "Transcribe" },
  { id: 3, label: "SOAP Note" },
  { id: 4, label: "Review" },
  { id: 5, label: "Approved" },
];

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ConsultationNote({ patient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("new"); // 'new' | 'history'
  const [currentStep, setCurrentStep] = useState(1);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);

  // AI state
  const [transcript, setTranscript] = useState("");
  const [soapNote, setSoapNote] = useState("");
  const [editedNote, setEditedNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [approved, setApproved] = useState(false);

  // Past notes
  const [pastNotes, setPastNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // ==========================================
  // OPEN / RESET
  // ==========================================
  const openModal = () => {
    resetAll();
    setIsOpen(true);
    fetchPastNotes();
  };

  const closeModal = () => {
    stopRecording();
    setIsOpen(false);
  };

  const resetAll = () => {
    setCurrentStep(1);
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setTranscript("");
    setSoapNote("");
    setEditedNote("");
    setLoading(false);
    setLoadingMsg("");
    setSavedNoteId(null);
    setApproved(false);
    chunksRef.current = [];
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ==========================================
  // HANDLE UPLOADED FILE
  // ==========================================
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm",
                     "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/m4a"];
    const isAllowed = allowed.some((t) => file.type.startsWith("audio/")) || file.name.match(/\.(mp3|wav|webm|ogg|m4a|mp4)$/i);

    if (!isAllowed) {
      alert("Please upload an audio file (mp3, wav, webm, ogg, m4a).");
      return;
    }

    setAudioBlob(file);   // File object works the same as Blob
    setCurrentStep(2);    // Jump to transcribe step
  };

  // ==========================================
  // TIMER
  // ==========================================
  const formatTime = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // ==========================================
  // RECORDING
  // ==========================================
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        // Stop all microphone tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
    setCurrentStep(2);
  };

  // ==========================================
  // STEP 2: TRANSCRIBE AUDIO
  // ==========================================
  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setLoading(true);
    setLoadingMsg("🎙️ Transcribing audio with Whisper AI...");

    try {
      const formData = new FormData();

      // If it's an uploaded File, use its original name; if recorded Blob, derive extension
      if (audioBlob instanceof File) {
        formData.append("audio", audioBlob, audioBlob.name);
      } else {
        const ext = audioBlob.type.includes("ogg") ? "ogg" : "webm";
        formData.append("audio", audioBlob, `consultation.${ext}`);
      }

      const res = await API.post("/consultation-notes/transcribe", formData, {
        headers: {
          role: "doctor",
          userid: user.id,
          "Content-Type": "multipart/form-data",
        },
      });

      setTranscript(res.data.transcript || "");
      setCurrentStep(3);
    } catch (err) {
      console.error(err);
      alert(
        "Transcription failed. Ensure GROQ_API_KEY is set in server .env.\n\nYou can also type the transcript manually below."
      );
    }

    setLoading(false);
    setLoadingMsg("");
  };


  // ==========================================
  // STEP 3: GENERATE SOAP NOTE
  // ==========================================
  const generateSOAPNote = async () => {
    if (!transcript.trim()) {
      alert("Transcript is empty. Please add transcript text first.");
      return;
    }

    setLoading(true);
    setLoadingMsg("🧠 AI is generating SOAP clinical note...");

    try {
      const res = await API.post(
        "/consultation-notes/generate-soap",
        { transcript, patient },
        {
          headers: {
            role: "doctor",
            userid: user.id,
          },
        }
      );

      setSoapNote(res.data.soapNote);
      setEditedNote(res.data.soapNote);

      // Auto-save as draft
      const draftRes = await API.post(
        "/consultation-notes/save-draft",
        {
          patientId: patient.id,
          transcript,
          soapNote: res.data.soapNote,
        },
        {
          headers: {
            role: "doctor",
            userid: user.id,
          },
        }
      );

      setSavedNoteId(draftRes.data.note.id);
      setCurrentStep(4);
    } catch (err) {
      console.error(err);
      alert("SOAP note generation failed. Please check your API key.");
    }

    setLoading(false);
    setLoadingMsg("");
  };

  // ==========================================
  // STEP 4 → 5: APPROVE NOTE
  // ==========================================
  const approveNote = async () => {
    if (!editedNote.trim()) {
      alert("Note is empty.");
      return;
    }

    setLoading(true);
    setLoadingMsg("✅ Saving approved note...");

    try {
      await API.post(
        "/consultation-notes/approve",
        {
          noteId: savedNoteId,
          finalNote: editedNote,
        },
        {
          headers: {
            role: "doctor",
            userid: user.id,
          },
        }
      );

      setApproved(true);
      setCurrentStep(5);
      fetchPastNotes();
    } catch (err) {
      console.error(err);
      alert("Failed to approve note.");
    }

    setLoading(false);
    setLoadingMsg("");
  };

  // ==========================================
  // FETCH PAST NOTES
  // ==========================================
  const fetchPastNotes = async () => {
    if (!patient?.id) return;

    setLoadingNotes(true);
    try {
      const res = await API.get(
        `/consultation-notes?patientId=${patient.id}`,
        {
          headers: {
            role: "doctor",
            userid: user.id,
          },
        }
      );
      setPastNotes(res.data || []);
    } catch (err) {
      console.error("Failed to load notes", err);
    }
    setLoadingNotes(false);
  };

  // ==========================================
  // CLEANUP
  // ==========================================
  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  if (!patient) return null;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <>
      {/* FLOATING TRIGGER */}
      <button className="consult-trigger-btn" onClick={openModal} id="consult-note-btn">
        <span className="btn-icon">📋</span>
        AI Note Writer
      </button>

      {/* MODAL */}
      {isOpen && (
        <div className="consult-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="consult-modal">

            {/* HEADER */}
            <div className="consult-header">
              <div className="consult-header-left">
                <div className="consult-header-icon">🩺</div>
                <div className="consult-header-text">
                  <h2>AI Consultation Note Writer</h2>
                  <p>Record → Transcribe → SOAP Note → Approve</p>
                  {patient && (
                    <div className="patient-badge">
                      👤 {patient.name} · {patient.age}y · {patient.gender}
                    </div>
                  )}
                </div>
              </div>
              <button className="consult-close-btn" onClick={closeModal}>✕</button>
            </div>

            {/* TABS */}
            <div className="consult-tabs">
              <button
                className={`consult-tab ${activeTab === "new" ? "active" : ""}`}
                onClick={() => setActiveTab("new")}
              >
                ✦ New Consultation
              </button>
              <button
                className={`consult-tab ${activeTab === "history" ? "active" : ""}`}
                onClick={() => { setActiveTab("history"); fetchPastNotes(); }}
              >
                📁 Past Notes ({pastNotes.length})
              </button>
            </div>

            {/* ======================== TAB: NEW ======================== */}
            {activeTab === "new" && (
              <>
                {/* STEP PROGRESS */}
                <div className="consult-steps">
                  {STEPS.map((step, i) => (
                    <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
                      <div className={`step-item ${currentStep === step.id ? "active" : currentStep > step.id ? "done" : ""}`}>
                        <div className="step-circle">
                          {currentStep > step.id ? "✓" : step.id}
                        </div>
                        <span className="step-label">{step.label}</span>
                      </div>
                      {i < STEPS.length - 1 && <div className="step-divider" />}
                    </div>
                  ))}
                </div>

                <div className="consult-body">

                  {/* APPROVED BANNER */}
                  {approved && (
                    <div className="approved-banner">
                      ✅ Consultation note approved and saved to patient record!
                    </div>
                  )}

                  {/* LOADING */}
                  {loading && (
                    <div className="ai-loading" style={{ marginBottom: "20px" }}>
                      <div className="loading-dots">
                        <span /><span /><span />
                      </div>
                      {loadingMsg}
                    </div>
                  )}

                  {/* ── STEP 1: RECORD ── */}
                  {currentStep === 1 && (
                    <div className="consult-section">
                      <div className="section-title">
                        <span className="section-title-icon">🎙️</span>
                        Step 1 — Record or Upload Consultation Audio
                      </div>

                      {/* LIVE RECORDING ZONE */}
                      <div className={`recording-zone ${isRecording ? "recording" : ""}`}>
                        <button
                          id="record-toggle-btn"
                          className={`record-btn ${isRecording ? "active" : "idle"}`}
                          onClick={isRecording ? stopRecording : startRecording}
                        >
                          {isRecording ? "⏹" : "🎤"}
                        </button>

                        {isRecording && (
                          <div className="record-timer">{formatTime(recordingTime)}</div>
                        )}

                        <div className={`record-status ${isRecording ? "recording" : ""}`}>
                          {isRecording
                            ? "Recording in progress — speak clearly"
                            : audioBlob
                            ? "Recording complete. Click below to transcribe."
                            : "Click the mic to start recording the consultation"
                          }
                        </div>

                        {!isRecording && audioBlob && (
                          <audio controls src={URL.createObjectURL(audioBlob)} style={{ borderRadius: "8px", maxWidth: "100%" }} />
                        )}
                      </div>

                      {audioBlob && !isRecording && (
                        <div className="consult-actions" style={{ marginTop: "16px" }}>
                          <button
                            id="transcribe-btn"
                            className="consult-btn btn-primary"
                            onClick={transcribeAudio}
                            disabled={loading}
                          >
                            🎙️ Transcribe Audio
                          </button>
                          <button
                            className="consult-btn btn-outline"
                            onClick={() => {
                              setAudioBlob(null);
                              setRecordingTime(0);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                          >
                            ✕ Clear
                          </button>
                        </div>
                      )}

                      {/* ── DIVIDER ── */}
                      {!audioBlob && !isRecording && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: "12px",
                          margin: "20px 0", color: "#475569", fontSize: "12px"
                        }}>
                          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                          <span>or</span>
                          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
                        </div>
                      )}

                      {/* ── UPLOAD OPTION ── */}
                      {!audioBlob && !isRecording && (
                        <div style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px dashed rgba(99,102,241,0.3)",
                          borderRadius: "12px",
                          padding: "18px 20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                          flexWrap: "wrap",
                        }}>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0", marginBottom: "4px" }}>
                              📁 Upload a recorded audio file
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                              Supported: mp3, wav, webm, ogg, m4a
                            </div>
                          </div>
                          <button
                            id="upload-audio-btn"
                            className="consult-btn btn-outline"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ flexShrink: 0 }}
                          >
                            ⬆️ Choose File
                          </button>
                          {/* Hidden file input */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*,.mp3,.wav,.webm,.ogg,.m4a"
                            style={{ display: "none" }}
                            onChange={handleFileUpload}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── STEP 2: TRANSCRIPT ── */}
                  {currentStep >= 2 && currentStep <= 2 && (
                    <div className="consult-section">
                      <div className="section-title">
                        <span className="section-title-icon">📝</span>
                        Step 2 — Transcript
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                        Review and edit the transcript if needed before generating the SOAP note.
                      </p>
                      <textarea
                        className="transcript-box"
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder="Transcript will appear here... or type/paste manually."
                        rows={6}
                      />
                      <div className="consult-actions" style={{ marginTop: "16px" }}>
                        <button
                          id="generate-soap-btn"
                          className="consult-btn btn-primary"
                          onClick={generateSOAPNote}
                          disabled={loading || !transcript.trim()}
                        >
                          🧠 Generate SOAP Note
                        </button>
                        <button
                          className="consult-btn btn-outline"
                          onClick={() => setCurrentStep(1)}
                        >
                          ← Back
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: SOAP GENERATED ── */}
                  {currentStep === 3 && (
                    <div className="consult-section">
                      <div className="section-title">
                        <span className="section-title-icon">📝</span>
                        Step 2 — Transcript
                      </div>
                      <div className="transcript-preview">{transcript}</div>
                      <div className="consult-actions" style={{ marginTop: "14px" }}>
                        <button className="consult-btn btn-primary" onClick={generateSOAPNote} disabled={loading}>
                          🧠 Generate SOAP Note
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 4: REVIEW & EDIT ── */}
                  {currentStep === 4 && (
                    <>
                      {/* Transcript preview */}
                      <div className="consult-section">
                        <div className="section-title">
                          <span className="section-title-icon">📝</span>
                          Consultation Transcript
                        </div>
                        <div className="transcript-preview">{transcript}</div>
                      </div>

                      {/* SOAP Editor */}
                      <div className="consult-section">
                        <div className="section-title">
                          <span className="section-title-icon">🩺</span>
                          Step 4 — Review & Edit SOAP Note
                        </div>
                        <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                          Review the AI-generated SOAP note below. Edit as needed before approving.
                        </p>
                        <textarea
                          className="soap-editor"
                          id="soap-editor"
                          value={editedNote}
                          onChange={(e) => setEditedNote(e.target.value)}
                          rows={14}
                        />
                        <div className="consult-actions" style={{ marginTop: "16px" }}>
                          <button
                            id="approve-note-btn"
                            className="consult-btn btn-success"
                            onClick={approveNote}
                            disabled={loading || !editedNote.trim()}
                          >
                            ✅ Approve & Save Note
                          </button>
                          <button
                            className="consult-btn btn-outline"
                            onClick={() => {
                              setEditedNote(soapNote);
                            }}
                          >
                            ↺ Reset to AI Draft
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── STEP 5: COMPLETE ── */}
                  {currentStep === 5 && (
                    <div className="consult-section">
                      <div className="section-title">
                        <span className="section-title-icon">✅</span>
                        Step 5 — Consultation Complete
                      </div>
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎉</div>
                        <div style={{ fontSize: "18px", fontWeight: "700", color: "#34d399", marginBottom: "8px" }}>
                          Note Approved & Saved!
                        </div>
                        <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "28px" }}>
                          The consultation note has been saved to {patient.name}'s record.
                        </div>
                        <div className="consult-actions" style={{ justifyContent: "center" }}>
                          <button
                            className="consult-btn btn-primary"
                            onClick={() => { resetAll(); setActiveTab("history"); fetchPastNotes(); }}
                          >
                            📁 View Past Notes
                          </button>
                          <button className="consult-btn btn-outline" onClick={resetAll}>
                            + New Consultation
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SOAP PREVIEW (read-only) under step 4 */}
                  {currentStep === 4 && soapNote && (
                    <div className="consult-section" style={{ opacity: 0.6 }}>
                      <div className="section-title" style={{ fontSize: "11px" }}>
                        <span>👁️</span> AI Draft Preview (read-only)
                      </div>
                      <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.7" }}>
                        <ReactMarkdown>{soapNote}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ======================== TAB: HISTORY ======================== */}
            {activeTab === "history" && (
              <div className="consult-body">
                {loadingNotes ? (
                  <div className="ai-loading">
                    <div className="loading-dots"><span /><span /><span /></div>
                    Loading past notes...
                  </div>
                ) : pastNotes.length === 0 ? (
                  <div className="empty-notes">
                    <div className="empty-notes-icon">📋</div>
                    <div>No consultation notes yet for {patient.name}.</div>
                    <div style={{ fontSize: "12px", marginTop: "6px" }}>Start a new consultation to create notes.</div>
                  </div>
                ) : (
                  <div className="past-notes-list">
                    {pastNotes.map((note) => (
                      <div key={note.id} className="past-note-card">
                        <div className="past-note-meta">
                          <span className="past-note-date">
                            {new Date(note.createdAt).toLocaleString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                          <span className={`note-status-badge ${note.status.toLowerCase()}`}>
                            {note.status === "APPROVED" ? "✅ Approved" : "✏️ Draft"}
                          </span>
                        </div>
                        <div className="past-note-preview">
                          {note.finalNote || note.soapNote || "No note content"}
                        </div>
                      </div>
                    ))}
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
