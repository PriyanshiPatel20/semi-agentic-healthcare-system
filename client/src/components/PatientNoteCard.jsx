import { useState, useEffect } from "react";
import API from "../api";
import "./patientNote.css";
import {
  FaClipboardList, FaHospital, FaTimesCircle,
  FaCheckCircle, FaArrowRight, FaPills,
} from "react-icons/fa";
import { MdLocalHospital } from "react-icons/md";

export default function PatientNoteCard() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => { fetchMyNotes(); }, []);

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

  if (loading) return null;
  if (notes.length === 0) return null;

  return (
    <>
      {/* NOTES SECTION */}
      <div className="pnc-wrapper">
        <div className="pnc-header">
          <span className="pnc-header-icon"><FaClipboardList /></span>
          <div>
            <h3 className="pnc-title">Your Health Notes</h3>
            <p className="pnc-subtitle">Notes from your doctors after your consultations</p>
          </div>
        </div>

        <div className="pnc-list">
          {notes.map((note) => (
            <div key={note.id} className="pnc-card" onClick={() => setSelectedNote(note)}>
              <div className="pnc-card-left">
                <div className="pnc-doctor-avatar">
                  {note.doctor?.name?.[0] || "D"}
                </div>
                <div>
                  <div className="pnc-doctor-name">{note.doctor?.name || "Your Doctor"}</div>
                  <div className="pnc-doctor-specialty">{note.doctor?.specialty || "Specialist"}</div>
                  <div className="pnc-date">
                    {new Date(note.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </div>
                </div>
              </div>
              <div className="pnc-card-right">
                <span className="pnc-approved-badge">
                  <FaCheckCircle style={{ marginRight: 4 }} /> Approved
                </span>
                <button className="pnc-view-btn">
                  View Note <FaArrowRight style={{ marginLeft: 4 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NOTE MODAL */}
      {selectedNote && (
        <div
          className="pnc-overlay"
          onClick={(e) => e.target === e.currentTarget && setSelectedNote(null)}
        >
          <div className="pnc-modal">
            {/* Modal Header */}
            <div className="pnc-modal-header">
              <div className="pnc-modal-header-left">
                <div className="pnc-modal-icon"><MdLocalHospital /></div>
                <div>
                  <h2 className="pnc-modal-title">Your Health Note</h2>
                  <p className="pnc-modal-doctor">
                    From: <strong>{selectedNote.doctor?.name || "Your Doctor"}</strong>
                    {selectedNote.doctor?.specialty && ` · ${selectedNote.doctor.specialty}`}
                  </p>
                  <p className="pnc-modal-date">
                    {new Date(selectedNote.updatedAt).toLocaleDateString("en-IN", {
                      weekday: "long", day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <button className="pnc-modal-close" onClick={() => setSelectedNote(null)}>
                <FaTimesCircle />
              </button>
            </div>

            {/* Note Content */}
            <div className="pnc-modal-body">
              <div className="pnc-note-content">
                {selectedNote.patientNote
                  ?.split("\n")
                  .map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <br key={i} />;
                    if (i === 0) return <div key={i} className="pnc-note-from">{trimmed}</div>;
                    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
                      return (
                        <div key={i} className="pnc-note-bullet">
                          <span className="pnc-bullet-dot">•</span>
                          <span>{trimmed.replace(/^[•\-\*]\s*/, "")}</span>
                        </div>
                      );
                    }
                    if (/^\d+\./.test(trimmed)) {
                      const [num, ...rest] = trimmed.split(". ");
                      return (
                        <div key={i} className="pnc-note-numbered">
                          <span className="pnc-num-badge">{num}</span>
                          <span>{rest.join(". ")}</span>
                        </div>
                      );
                    }
                    if (trimmed.length < 60 && !trimmed.endsWith(".")) {
                      return <div key={i} className="pnc-note-section">{trimmed}</div>;
                    }
                    return <p key={i} className="pnc-note-para">{trimmed}</p>;
                  })}
              </div>

              {/* Footer */}
              <div className="pnc-modal-footer">
                <div className="pnc-footer-tip">
                  <FaPills style={{ marginRight: 6 }} />
                  Follow your doctor's instructions and take medicines as prescribed.
                  If you have any questions, contact your doctor.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
