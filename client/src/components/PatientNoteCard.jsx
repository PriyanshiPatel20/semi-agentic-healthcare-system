import { useState, useEffect, useMemo } from "react";
import API from "../api";
import "./patientNote.css";
import {
  FaClipboardList, FaCheckCircle, FaArrowRight, FaPills,
  FaCalendarAlt, FaSearch, FaPrint, FaTimes, FaStethoscope,
  FaFileMedical, FaUserMd
} from "react-icons/fa";
import { MdLocalHospital, MdOutlineVerified } from "react-icons/md";
import { BsShieldCheck } from "react-icons/bs";

// Helper: generate consistent accent color palette per specialty
const getSpecialtyColor = (specialty = "") => {
  const s = specialty.toLowerCase();
  if (s.includes("cardio")) return { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3", gradient: "linear-gradient(135deg, #e11d48, #be123c)" };
  if (s.includes("neuro")) return { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe", gradient: "linear-gradient(135deg, #7c3aed, #6d28d9)" };
  if (s.includes("pedia")) return { bg: "#fffbeb", text: "#d97706", border: "#fde68a", gradient: "linear-gradient(135deg, #f59e0b, #d97706)" };
  if (s.includes("ortho")) return { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0", gradient: "linear-gradient(135deg, #10b981, #059669)" };
  if (s.includes("derma")) return { bg: "#fdf2f8", text: "#db2777", border: "#fbcfe8", gradient: "linear-gradient(135deg, #ec4899, #be185d)" };
  return { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", gradient: "linear-gradient(135deg, #0ea5e9, #2563eb)" };
};

// Helper: extract clinical snippet and check for medicines
const parseNotePreview = (rawText = "") => {
  if (!rawText) return { snippet: "Consultation summary recorded by doctor.", hasMeds: false };
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  
  // Find first substantive line that is not just "From: Dr..."
  let snippet = "";
  for (const line of lines) {
    const clean = line.replace(/^[•\-\*\d\.]+\s*/, "");
    if (!clean.toLowerCase().startsWith("from") && clean.length > 15) {
      snippet = clean;
      break;
    }
  }
  if (!snippet && lines.length > 0) snippet = lines[0];
  if (snippet.length > 130) snippet = snippet.slice(0, 130) + "...";

  const hasMeds = /tablet|capsule|syrup|drop|mg|dose|medicine|prescri|antibiotic/i.test(rawText);
  return { snippet: snippet || "Official clinical advice recorded.", hasMeds };
};

export default function PatientNoteCard({ isDedicatedPage = false }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchMyNotes();
  }, []);

  const fetchMyNotes = async () => {
    try {
      const res = await API.get("/consultation-notes/my-notes", {
        headers: { role: user.role, userid: user.id },
      });
      setNotes(res.data || []);
    } catch (err) {
      console.error("Failed to load notes", err);
    }
    setLoading(false);
  };

  // Specialties list for filter chips
  const specialties = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => {
      if (n.doctor?.specialty) set.add(n.doctor.specialty);
    });
    return ["All", ...Array.from(set)];
  }, [notes]);

  // Filtered notes based on search & specialty
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const docName = (n.doctor?.name || "").toLowerCase();
      const spec = (n.doctor?.specialty || "").toLowerCase();
      const noteText = (n.patientNote || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || docName.includes(q) || spec.includes(q) || noteText.includes(q);
      const matchesSpec = selectedSpecialty === "All" || n.doctor?.specialty === selectedSpecialty;

      return matchesSearch && matchesSpec;
    });
  }, [notes, searchQuery, selectedSpecialty]);

  // KPI Stats
  const stats = useMemo(() => {
    const total = notes.length;
    const docCount = new Set(notes.map((n) => n.doctor?.name).filter(Boolean)).size;
    const latestDate = notes[0]?.updatedAt
      ? new Date(notes[0].updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "None";
    return { total, docCount, latestDate };
  }, [notes]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="pnc-loading-state">
        <div className="pnc-spinner"></div>
        <p>Retrieving your health consultation records...</p>
      </div>
    );
  }

  // If not dedicated page and no notes, keep hidden
  if (notes.length === 0 && !isDedicatedPage) return null;

  // Dedicated page empty state
  if (notes.length === 0 && isDedicatedPage) {
    return (
      <div className="pnc-empty-screen">
        <div className="pnc-empty-icon-wrap">
          <FaFileMedical />
        </div>
        <h3>No Consultation Notes Yet</h3>
        <p>
          Once your doctor completes a consultation session, your official medical summary,
          lifestyle guidance, and prescriptions will appear here securely.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="pnc-redesign-container">
        {/* HERO / HEADER SECTION */}
        <div className="pnc-hero-card">
          <div className="pnc-hero-info">
            <div className="pnc-hero-icon-box">
              <FaClipboardList />
            </div>
            <div>
              <div className="pnc-hero-badge">
                <BsShieldCheck /> Medical Records Desk
              </div>
              <h2 className="pnc-hero-title">Consultation Health Notes</h2>
              <p className="pnc-hero-sub">
                Official clinical summaries, diagnosis notes, and medical guidance signed by your doctors.
              </p>
            </div>
          </div>

          {/* KPI STATS BAR */}
          <div className="pnc-kpi-bar">
            <div className="pnc-kpi-item">
              <span className="pnc-kpi-val">{stats.total}</span>
              <span className="pnc-kpi-lbl">Total Records</span>
            </div>
            <div className="pnc-kpi-divider" />
            <div className="pnc-kpi-item">
              <span className="pnc-kpi-val">{stats.docCount}</span>
              <span className="pnc-kpi-lbl">Doctors</span>
            </div>
            <div className="pnc-kpi-divider" />
            <div className="pnc-kpi-item">
              <span className="pnc-kpi-val">{stats.latestDate}</span>
              <span className="pnc-kpi-lbl">Latest Visit</span>
            </div>
          </div>
        </div>

        {/* CONTROLS: SEARCH & SPECIALTY FILTER CHIPS */}
        <div className="pnc-controls-strip">
          <div className="pnc-search-wrapper">
            <FaSearch className="pnc-search-icon" />
            <input
              type="text"
              className="pnc-search-input"
              placeholder="Search by doctor, specialty, medicine or note text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="pnc-search-clear" onClick={() => setSearchQuery("")}>
                <FaTimes />
              </button>
            )}
          </div>

          {specialties.length > 2 && (
            <div className="pnc-filter-chips">
              {specialties.map((spec) => (
                <button
                  key={spec}
                  className={`pnc-chip ${selectedSpecialty === spec ? "active" : ""}`}
                  onClick={() => setSelectedSpecialty(spec)}
                >
                  {spec}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RESULTS GRID */}
        {filteredNotes.length === 0 ? (
          <div className="pnc-no-results">
            <p>No health notes match &ldquo;{searchQuery}&rdquo;</p>
            <button
              className="pnc-reset-btn"
              onClick={() => {
                setSearchQuery("");
                setSelectedSpecialty("All");
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="pnc-grid-cards">
            {filteredNotes.map((note) => {
              const specStyle = getSpecialtyColor(note.doctor?.specialty);
              const { snippet, hasMeds } = parseNotePreview(note.patientNote);
              const formattedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={note.id}
                  className="pnc-smart-card"
                  onClick={() => setSelectedNote(note)}
                  style={{ "--card-accent": specStyle.text }}
                >
                  {/* Top Row: Doctor Info & Verification Status */}
                  <div className="pnc-smart-top">
                    <div className="pnc-doc-identity">
                      <div
                        className="pnc-avatar-stylish"
                        style={{ background: specStyle.gradient }}
                      >
                        {note.doctor?.name?.[0]?.toUpperCase() || "D"}
                      </div>
                      <div className="pnc-doc-details">
                        <h4 className="pnc-doc-name">{note.doctor?.name || "Attending Doctor"}</h4>
                        <div className="pnc-doc-tags">
                          <span
                            className="pnc-spec-pill"
                            style={{
                              backgroundColor: specStyle.bg,
                              color: specStyle.text,
                              borderColor: specStyle.border,
                            }}
                          >
                            <FaStethoscope style={{ fontSize: 10, marginRight: 4 }} />
                            {note.doctor?.specialty || "General Specialist"}
                          </span>
                          <span className="pnc-date-pill">
                            <FaCalendarAlt style={{ fontSize: 10, marginRight: 4 }} />
                            {formattedDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pnc-status-pill">
                      <span className="pnc-pulse-dot"></span>
                      <MdOutlineVerified style={{ fontSize: 13, marginRight: 3 }} />
                      Verified
                    </div>
                  </div>

                  {/* Middle Row: Clinical Excerpt Preview */}
                  <div className="pnc-preview-bubble">
                    <div className="pnc-preview-label">Doctor&apos;s Advice & Treatment:</div>
                    <p className="pnc-preview-text">&ldquo;{snippet}&rdquo;</p>
                  </div>

                  {/* Bottom Row: Tags & Action Button */}
                  <div className="pnc-smart-bottom">
                    <div className="pnc-badges-row">
                      {hasMeds && (
                        <span className="pnc-med-chip">
                          <FaPills style={{ marginRight: 4 }} /> Rx Prescribed
                        </span>
                      )}
                      <span className="pnc-verified-tag">
                        <BsShieldCheck style={{ marginRight: 3 }} /> Signed Note
                      </span>
                    </div>

                    <button
                      className="pnc-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNote(note);
                      }}
                    >
                      <span>View Note</span>
                      <FaArrowRight className="pnc-arrow-icon" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAILED NOTE MODAL / LETTERHEAD VIEW */}
      {selectedNote && (
        <div
          className="pnc-overlay"
          onClick={(e) => e.target === e.currentTarget && setSelectedNote(null)}
        >
          <div className="pnc-modal-sheet">
            {/* Modal Header Bar */}
            <div className="pnc-sheet-header">
              <div className="pnc-sheet-header-left">
                <div className="pnc-sheet-hospital-icon">
                  <MdLocalHospital />
                </div>
                <div>
                  <div className="pnc-sheet-title-badge">OFFICIAL CONSULTATION RECORD</div>
                  <h3 className="pnc-sheet-title">Doctor Consultation Summary</h3>
                </div>
              </div>
              <div className="pnc-sheet-header-actions">
                <button
                  type="button"
                  className="pnc-sheet-btn-print"
                  onClick={handlePrint}
                  title="Print Consultation Note"
                >
                  <FaPrint style={{ marginRight: 6 }} /> Print Note
                </button>
                <button
                  type="button"
                  className="pnc-sheet-btn-close"
                  onClick={() => setSelectedNote(null)}
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Doctor & Patient Metadata Row */}
            <div className="pnc-sheet-meta-bar">
              <div className="pnc-sheet-meta-doc">
                <div
                  className="pnc-sheet-doc-avatar"
                  style={{ background: getSpecialtyColor(selectedNote.doctor?.specialty).gradient }}
                >
                  {selectedNote.doctor?.name?.[0]?.toUpperCase() || "D"}
                </div>
                <div>
                  <div className="pnc-sheet-doc-name">
                    {selectedNote.doctor?.name || "Consulting Doctor"}
                  </div>
                  <div className="pnc-sheet-doc-spec">
                    {selectedNote.doctor?.specialty || "Medical Specialist"}
                  </div>
                </div>
              </div>

              <div className="pnc-sheet-meta-dates">
                <div className="pnc-sheet-date-item">
                  <span className="pnc-meta-lbl">Date of Consultation:</span>
                  <span className="pnc-meta-val">
                    {new Date(selectedNote.updatedAt || selectedNote.createdAt).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="pnc-sheet-date-item">
                  <span className="pnc-meta-lbl">Record Status:</span>
                  <span className="pnc-meta-status-approved">
                    <FaCheckCircle style={{ marginRight: 4 }} /> Signed & Approved
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body / Formatted Clinical Content */}
            <div className="pnc-sheet-body">
              <div className="pnc-clinical-letterhead">
                <div className="pnc-letterhead-watermark">CLINICAL NOTE</div>

                {selectedNote.patientNote
                  ?.split("\n")
                  .map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <div key={i} className="pnc-line-spacer" />;

                    if (i === 0 && (trimmed.toLowerCase().startsWith("from") || trimmed.toLowerCase().startsWith("note"))) {
                      return (
                        <div key={i} className="pnc-formatted-from-header">
                          <FaUserMd style={{ marginRight: 6 }} />
                          {trimmed}
                        </div>
                      );
                    }

                    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
                      return (
                        <div key={i} className="pnc-formatted-bullet">
                          <span className="pnc-bullet-sym">•</span>
                          <span>{trimmed.replace(/^[•\-\*]\s*/, "")}</span>
                        </div>
                      );
                    }

                    if (/^\d+\./.test(trimmed)) {
                      const [num, ...rest] = trimmed.split(". ");
                      return (
                        <div key={i} className="pnc-formatted-numbered">
                          <span className="pnc-num-circle">{num}</span>
                          <span>{rest.join(". ")}</span>
                        </div>
                      );
                    }

                    // Section Heading like "Prescription:" or "Advice:"
                    if ((trimmed.length < 50 && !trimmed.endsWith(".")) || trimmed.endsWith(":")) {
                      return (
                        <div key={i} className="pnc-formatted-section-head">
                          {trimmed}
                        </div>
                      );
                    }

                    return (
                      <p key={i} className="pnc-formatted-para">
                        {trimmed}
                      </p>
                    );
                  })}
              </div>

              {/* Safety Guidance Banner */}
              <div className="pnc-safety-card">
                <div className="pnc-safety-icon">
                  <FaPills />
                </div>
                <div className="pnc-safety-text">
                  <strong>Patient Instructions & Safety Reminder:</strong>
                  <p>
                    Follow the instructions and medication dosages carefully. Do not modify prescribed medications
                    without doctor supervision. In case of unexpected side effects, contact the hospital immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pnc-sheet-footer">
              <div className="pnc-footer-hospital-seal">
                <MdOutlineVerified style={{ color: "#10b981", fontSize: 16 }} />
                <span>Digitally signed official medical record</span>
              </div>
              <button
                type="button"
                className="pnc-close-btn-secondary"
                onClick={() => setSelectedNote(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
