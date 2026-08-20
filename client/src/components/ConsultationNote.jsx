import { useState, useEffect, useRef } from "react";
import API from "../api";
import "../styles/consultation.css";
import {
  FaMicrophone, FaStop, FaUpload, FaFileAlt, FaStethoscope,
  FaPills, FaCalendarAlt, FaEye, FaLightbulb, FaExclamationTriangle,
  FaCheckCircle, FaTimes, FaRedo, FaClipboardList, FaHistory,
  FaPlus, FaStar, FaCommentMedical, FaUserMd, FaSyringe,
} from "react-icons/fa";
import { BsFileEarmarkTextFill } from "react-icons/bs";
import { MdRecordVoiceOver, MdOutlineSummarize } from "react-icons/md";
import { HiOutlineSparkles } from "react-icons/hi";

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
            <FaExclamationTriangle style={{ color: "var(--danger)" }} />
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
              <li key={i} className="soap-question-item">{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ConsultationNote({ patient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("new");
  const [currentStep, setCurrentStep] = useState(1);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [includeSystemAudio, setIncludeSystemAudio] = useState(false);

  // AI state
  const [transcript, setTranscript] = useState("");
  const [soapData, setSoapData] = useState(null);
  const [soapNote, setSoapNote]   = useState("");
  const [editedData, setEditedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [approved, setApproved] = useState(false);

  // Past notes
  const [pastNotes, setPastNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const pcmBuffersRef = useRef([]);
  const recordingLengthRef = useRef(0);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // ── OPEN / RESET ──
  const openModal = () => { resetAll(); setIsOpen(true); fetchPastNotes(); };
  const closeModal = () => { stopRecording(); setIsOpen(false); };

  const resetAll = () => {
    setCurrentStep(1); setIsRecording(false); setRecordingTime(0); setAudioBlob(null);
    setTranscript(""); setSoapData(null); setSoapNote(""); setEditedData(null);
    setLoading(false); setLoadingMsg(""); setSavedNoteId(null); setApproved(false);
    pcmBuffersRef.current = [];
    recordingLengthRef.current = 0;
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach(t => t.stop());
      displayStreamRef.current = null;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── UPLOAD ──
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ok = ["audio/mpeg","audio/mp3","audio/wav","audio/webm","audio/ogg","audio/mp4","audio/x-m4a"]
      .some(t => file.type.startsWith("audio/")) || file.name.match(/\.(mp3|wav|webm|ogg|m4a|mp4)$/i);
    if (!ok) { alert("Please upload an audio file (mp3, wav, webm, ogg, m4a)."); return; }
    setAudioBlob(file);
    setCurrentStep(2);
  };

  const formatTime = (secs) => `${String(Math.floor(secs/60)).padStart(2,"0")}:${String(secs%60).padStart(2,"0")}`;

  // ── WAV ENCODER HELPERS ──
  const exportWAV = (buffers, length, sampleRate) => {
    const flattened = new Float32Array(length);
    let offset = 0;
    for (let i = 0; i < buffers.length; i++) {
      flattened.set(buffers[i], offset);
      offset += buffers[i].length;
    }

    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // Raw PCM
    view.setUint16(22, 1, true); // Mono channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); // 16 bits per sample
    writeString(view, 36, "data");
    view.setUint32(40, length * 2, true);

    let index = 44;
    for (let i = 0; i < flattened.length; i++) {
      let s = Math.max(-1, Math.min(1, flattened[i]));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      index += 2;
    }

    return new Blob([view], { type: "audio/wav" });
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // ── RECORDING ──
  const startRecording = async () => {
    try {
      // 1. Get user mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      pcmBuffersRef.current = [];
      recordingLengthRef.current = 0;

      // Connect mic stream to processor
      const micSource = audioContext.createMediaStreamSource(stream);
      micSource.connect(processor);

      // 2. Optional: get display media (tab/system audio) if enabled
      if (includeSystemAudio) {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: 1,
              height: 1,
              frameRate: 1
            },
            audio: true
          });
          displayStreamRef.current = displayStream;

          if (displayStream && displayStream.getAudioTracks().length > 0) {
            const displaySource = audioContext.createMediaStreamSource(displayStream);
            displaySource.connect(processor);
          } else {
            alert("No audio track detected in the shared screen/tab. Please make sure to check the 'Share tab audio' or 'Share system audio' option. Only microphone audio will be recorded.");
          }
        } catch (err) {
          console.warn("Display audio recording skipped or denied:", err);
          alert("Screen sharing for audio was cancelled or denied. Only microphone audio will be recorded.");
        }
      }

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        pcmBuffersRef.current.push(new Float32Array(inputData));
        recordingLengthRef.current += inputData.length;
      };

      processor.connect(audioContext.destination);

      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (!isRecording && !processorRef.current) return;
    setIsRecording(false);
    clearInterval(timerRef.current);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach(t => t.stop());
      displayStreamRef.current = null;
    }

    const sampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 44100;
    const wavBlob = exportWAV(pcmBuffersRef.current, recordingLengthRef.current, sampleRate);
    setAudioBlob(wavBlob);
    setCurrentStep(2);
  };

  // ── TRANSCRIBE ──
  const transcribeAudio = async () => {
    if (!audioBlob) return;
    setLoading(true); setLoadingMsg("Transcribing audio with Whisper AI...");
    try {
      const fd = new FormData();
      if (audioBlob instanceof File) fd.append("audio", audioBlob, audioBlob.name);
      else fd.append("audio", audioBlob, "consultation.wav");
      const res = await API.post("/consultation-notes/transcribe", fd, {
        headers: { role: "doctor", userid: user.id, "Content-Type": "multipart/form-data" },
      });
      setTranscript(res.data.transcript || ""); setCurrentStep(3);
    } catch (err) {
      // Show the server's specific error (e.g. "audio unclear") or a fallback
      const serverMsg = err?.response?.data?.error;
      alert(
        serverMsg
          ? `⚠️ ${serverMsg}\n\nTip: Speak clearly into the mic, avoid background noise, and record for at least 3 seconds.\n\nYou can also type the transcript manually below.`
          : "Transcription failed. Ensure GROQ_API_KEY is set.\n\nYou can type the transcript manually below."
      );
      // Still move to step 2 so user can type manually
      setCurrentStep(2);
    }
    setLoading(false); setLoadingMsg("");
  };

  // ── GENERATE SOAP ──
  const generateSOAPNote = async () => {
    if (!transcript.trim()) { alert("Transcript is empty."); return; }
    setLoading(true); setLoadingMsg("AI is generating the clinical note...");
    try {
      const res = await API.post("/consultation-notes/generate-soap", { transcript, patient },
        { headers: { role: "doctor", userid: user.id } });
      setSoapData(res.data.soapData); setSoapNote(res.data.soapNote);
      setEditedData(JSON.parse(JSON.stringify(res.data.soapData)));
      const dr = await API.post("/consultation-notes/save-draft",
        { patientId: patient.id, transcript, soapNote: res.data.soapNote },
        { headers: { role: "doctor", userid: user.id } });
      setSavedNoteId(dr.data.note.id); setCurrentStep(4);
    } catch { alert("SOAP note generation failed. Please check your API key."); }
    setLoading(false); setLoadingMsg("");
  };

  const handleFieldEdit = (key, value) => setEditedData(prev => ({ ...prev, [key]: value }));

  // ── APPROVE ──
  const approveNote = async () => {
    setLoading(true); setLoadingMsg("Saving approved note...");
    try {
      await API.post("/consultation-notes/approve",
        { noteId: savedNoteId, finalNote: JSON.stringify(editedData) },
        { headers: { role: "doctor", userid: user.id } });
      setApproved(true); setCurrentStep(5); fetchPastNotes();
    } catch { alert("Failed to approve note."); }
    setLoading(false); setLoadingMsg("");
  };

  // ── FETCH PAST NOTES ──
  const fetchPastNotes = async () => {
    if (!patient?.id) return;
    setLoadingNotes(true);
    try {
      const res = await API.get(`/consultation-notes?patientId=${patient.id}`,
        { headers: { role: "doctor", userid: user.id } });
      setPastNotes(res.data || []);
    } catch { console.error("Failed to load notes"); }
    setLoadingNotes(false);
  };

  const parseNote = (note) => { try { return JSON.parse(note); } catch { return null; } };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);
  if (!patient) return null;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <>
      {/* TRIGGER */}
      <button className="consult-trigger-btn" onClick={openModal} id="consult-note-btn">
        <BsFileEarmarkTextFill />
        AI Note Writer
      </button>

      {/* MODAL */}
      {isOpen && (
        <div className="consult-overlay" onClick={e => e.target === e.currentTarget && !isRecording && closeModal()}>
          <div className="consult-modal">

            {/* HEADER */}
            <div className="consult-header">
              <div className="consult-header-left">
                <div className="consult-header-icon"><FaStethoscope /></div>
                <div className="consult-header-text">
                  <h2>AI Note Writer</h2>
                  <p>Record → Transcribe → SOAP Note → Approve</p>
                  {patient && (
                    <div className="patient-badge">
                      <FaUserMd style={{ marginRight: 5 }} />
                      {patient.name} · {patient.age}y · {patient.gender}
                    </div>
                  )}
                </div>
              </div>
              <button className="consult-close-btn" onClick={closeModal}><FaTimes /></button>
            </div>

            {/* TABS */}
            <div className="consult-tabs">
              <button className={`consult-tab ${activeTab === "new" ? "active" : ""}`} onClick={() => setActiveTab("new")}>
                <HiOutlineSparkles style={{ marginRight: 6 }} /> New Consultation
              </button>
              <button className={`consult-tab ${activeTab === "history" ? "active" : ""}`} onClick={() => { setActiveTab("history"); fetchPastNotes(); }}>
                <FaHistory style={{ marginRight: 6 }} /> Past Notes ({pastNotes.length})
              </button>
            </div>

            {/* ── TAB: NEW ── */}
            {activeTab === "new" && (
              <>
                {/* STEPPER */}
                <div className="consult-steps">
                  {STEPS.map((step, i) => (
                    <div key={step.id} className="step-wrapper" style={{ flex: i < STEPS.length - 1 ? 1 : "none" }}>
                      <div className={`step-item ${currentStep === step.id ? "active" : currentStep > step.id ? "done" : ""}`}>
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

                  {/* LOADING */}
                  {loading && (
                    <div className="ai-loading">
                      <div className="loading-dots"><span /><span /><span /></div>
                      {loadingMsg}
                    </div>
                  )}

                  {/* ── STEP 1: RECORD ── */}
                  {currentStep === 1 && (
                    <div className="consult-section">
                      <div className="section-title">
                        <FaMicrophone className="section-title-icon" />
                        Step 1 — Record or Upload Consultation Audio
                      </div>
                      <div className={`recording-zone ${isRecording ? "recording" : ""}`}>
                        <button
                          id="record-toggle-btn"
                          className={`record-btn ${isRecording ? "active" : "idle"}`}
                          onClick={isRecording ? stopRecording : startRecording}
                        >
                          {isRecording ? <FaStop /> : <FaMicrophone />}
                        </button>
                        {isRecording && (
                          <>
                            <div className="record-timer">{formatTime(recordingTime)}</div>
                            <div className="audio-wave">
                              <span className="wave-bar bar-1" /><span className="wave-bar bar-2" />
                              <span className="wave-bar bar-3" /><span className="wave-bar bar-4" />
                              <span className="wave-bar bar-5" />
                            </div>
                          </>
                        )}
                        <div className={`record-status ${isRecording ? "recording" : ""}`}>
                          {isRecording ? "Recording in progress — speak clearly" : audioBlob ? "Recording complete. Click below to transcribe." : "Click the mic to start recording"}
                        </div>
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
                              Record system/tab audio (e.g., YouTube) along with mic
                            </span>
                          </div>
                        )}
                        {!isRecording && !audioBlob && includeSystemAudio && (
                          <div className="system-audio-tip">
                            💡 <strong>Tip:</strong> Choose the tab playing audio and check <strong>"Share tab audio"</strong> in the browser sharing prompt.
                          </div>
                        )}
                        {!isRecording && audioBlob && (
                          <audio controls src={URL.createObjectURL(audioBlob)} style={{ borderRadius: "8px", maxWidth: "100%" }} />
                        )}
                      </div>

                      {audioBlob && !isRecording && (
                        <div className="consult-actions" style={{ marginTop: "16px" }}>
                          <button id="transcribe-btn" className="consult-btn btn-primary" onClick={transcribeAudio} disabled={loading}>
                            <MdRecordVoiceOver style={{ marginRight: 6 }} /> Transcribe Audio
                          </button>
                          <button className="consult-btn btn-outline" onClick={() => { setAudioBlob(null); setRecordingTime(0); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                            <FaTimes style={{ marginRight: 6 }} /> Clear
                          </button>
                        </div>
                      )}

                      {!audioBlob && !isRecording && (
                        <>
                          <div className="or-divider"><span>or</span></div>
                          <div className="upload-box">
                            <div className="upload-info">
                              <div className="upload-info-title"><FaUpload style={{ marginRight: 7 }} /> Upload a recorded audio file</div>
                              <div className="upload-info-subtitle">Supported: mp3, wav, webm, ogg, m4a</div>
                            </div>
                            <button id="upload-audio-btn" className="consult-btn btn-outline" onClick={() => fileInputRef.current?.click()} style={{ flexShrink: 0 }}>
                              <FaUpload style={{ marginRight: 6 }} /> Choose File
                            </button>
                            <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.webm,.ogg,.m4a" style={{ display: "none" }} onChange={handleFileUpload} />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── STEP 2: TRANSCRIPT ── */}
                  {currentStep === 2 && (
                    <div className="consult-section">
                      <div className="section-title">
                        <FaFileAlt className="section-title-icon" />
                        Step 2 — Review Transcript
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                        Review and edit the transcript if needed before generating the note.
                      </p>
                      <textarea
                        className="transcript-box"
                        value={transcript}
                        onChange={e => setTranscript(e.target.value)}
                        placeholder="Transcript will appear here... or type/paste manually."
                        rows={6}
                      />
                      <div className="consult-actions" style={{ marginTop: "16px" }}>
                        <button id="generate-soap-btn" className="consult-btn btn-primary" onClick={generateSOAPNote} disabled={loading || !transcript.trim()}>
                          <HiOutlineSparkles style={{ marginRight: 6 }} /> Generate Clinical Note
                        </button>
                        <button className="consult-btn btn-outline" onClick={() => setCurrentStep(1)}>← Back</button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: TRANSCRIPT (post-transcribe) ── */}
                  {currentStep === 3 && (
                    <div className="consult-section">
                      <div className="section-title">
                        <FaFileAlt className="section-title-icon" />
                        Step 2 — Review Transcript
                      </div>
                      <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                        Review and edit the transcript if needed before generating the note.
                      </p>
                      <textarea
                        className="transcript-box"
                        value={transcript}
                        onChange={e => setTranscript(e.target.value)}
                        placeholder="Transcript will appear here..."
                        rows={8}
                      />
                      <div className="consult-actions" style={{ marginTop: "14px" }}>
                        <button className="consult-btn btn-primary" onClick={generateSOAPNote} disabled={loading}>
                          <HiOutlineSparkles style={{ marginRight: 6 }} /> Generate Clinical Note
                        </button>
                        <button className="consult-btn btn-outline" onClick={() => setCurrentStep(1)}>← Back</button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 4: REVIEW & EDIT ── */}
                  {currentStep === 4 && editedData && (
                    <>
                      <details className="transcript-collapsible">
                        <summary><FaFileAlt style={{ marginRight: 6 }} /> View Consultation Transcript</summary>
                        <textarea
                          className="transcript-box"
                          value={transcript}
                          onChange={e => setTranscript(e.target.value)}
                          rows={6}
                          style={{ marginTop: "12px" }}
                        />
                      </details>

                      <div className="consult-section" style={{ padding: 0, border: "none", background: "transparent", boxShadow: "none" }}>
                        <SoapNoteCard
                          data={editedData}
                          editable={true}
                          onChange={handleFieldEdit}
                        />
                      </div>

                      <div className="consult-actions" style={{ marginTop: "16px", justifyContent: "space-between" }}>
                        <button className="consult-btn btn-outline" onClick={() => setCurrentStep(3)}>← Back</button>
                        <div style={{ display: "flex", gap: "10px" }}>
                          {(user.role === "doctor" || user.role === "admin") && (
                            <button className="consult-btn btn-outline" onClick={() => setEditedData(JSON.parse(JSON.stringify(soapData)))}>
                              <FaRedo style={{ marginRight: 6 }} /> Reset to AI Draft
                            </button>
                          )}
                          {(user.role === "doctor" || user.role === "admin") && (
                            <button id="approve-note-btn" className="consult-btn btn-success" onClick={approveNote} disabled={loading}>
                              <FaCheckCircle style={{ marginRight: 6 }} /> Approve &amp; Save Note
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── STEP 5: COMPLETE ── */}
                  {currentStep === 5 && (
                    <div className="consult-complete">
                      <div className="complete-icon"><FaStar size={48} color="#f59e0b" /></div>
                      <div className="complete-title">Note Approved &amp; Saved!</div>
                      <div className="complete-subtitle">
                        The consultation note has been saved to {patient.name}'s record.
                      </div>
                      <div className="consult-actions" style={{ justifyContent: "center", marginTop: "24px" }}>
                        <button className="consult-btn btn-primary" onClick={() => { resetAll(); setActiveTab("history"); fetchPastNotes(); }}>
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

            {/* ── TAB: HISTORY ── */}
            {activeTab === "history" && (
              <div className="consult-body">
                {loadingNotes ? (
                  <div className="ai-loading">
                    <div className="loading-dots"><span /><span /><span /></div>
                    Loading past notes...
                  </div>
                ) : pastNotes.length === 0 ? (
                  <div className="empty-notes">
                    <div className="empty-notes-icon"><FaClipboardList size={48} /></div>
                    <div>No consultation notes yet for {patient.name}.</div>
                    <div style={{ fontSize: "12px", marginTop: "6px" }}>Start a new consultation to create notes.</div>
                  </div>
                ) : (
                  <div className="past-notes-list">
                    {pastNotes.map((note) => {
                      const parsed = parseNote(note.finalNote || note.soapNote);
                      return (
                        <div key={note.id} className="past-note-card">
                          <div className="past-note-meta">
                            <span className="past-note-date">
                              {new Date(note.createdAt).toLocaleString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                            <span className={`note-status-badge ${note.status.toLowerCase()}`}>
                              {note.status === "APPROVED"
                                ? <><FaCheckCircle style={{ marginRight: 4 }} /> Approved</>
                                : <><FaFileAlt style={{ marginRight: 4 }} /> Draft</>}
                            </span>
                          </div>
                          {parsed
                            ? <SoapNoteCard data={parsed} editable={false} onChange={() => {}} />
                            : <div className="past-note-preview">{note.finalNote || note.soapNote || "No note content"}</div>
                          }
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
