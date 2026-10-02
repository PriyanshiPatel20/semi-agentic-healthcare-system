import { useEffect, useState } from "react";
import API from "../api";
import "../styles/patient.css";
import "../styles/chatbox.css";
import "../styles/consultation.css";
import DoctorChatBox from "../components/DoctorChatBox.jsx";
import ConsultationNote from "../components/ConsultationNote.jsx";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaChevronLeft, FaChevronRight, FaUserInjured } from "react-icons/fa";
import { BsActivity, BsInbox } from "react-icons/bs";
import { HiOutlineSparkles } from "react-icons/hi";

export default function PatientsDetails() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const getUserRole = () => {
    return JSON.parse(localStorage.getItem("user"))?.role;
  };

  const fetchPatients = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const res = await API.get("/patients", {
        headers: {
          role: user.role,
          userid: user.id,
        },
      });
      setPatients(res.data);
    } catch (error) {
      console.error("Error fetching patients", error);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Pagination Logic
  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentPatients = patients.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(patients.length / recordsPerPage);

  return (
    <div className="patients-page">
      {/* Header */}
      <div className="header">
        <div className="header-title-group">
          <button className="back-btn" onClick={() => navigate(-1)} title="Go back">
            <FaArrowLeft />
            <span>Back</span>
          </button>
          <h2>
            <BsActivity className="header-icon" />
            <span>Patients Clinical Analysis</span>
          </h2>
        </div>
        <span className="header-badge">{patients.length} Registered Records</span>
      </div>

      {/* Selected Patient Banner if active */}
      {selectedPatient && (
        <div className="selected-patient-banner">
          <div className="selected-patient-meta">
            <div className="selected-avatar">
              <FaUserInjured />
            </div>
            <div>
              <h3>Active Analysis: {selectedPatient.name}</h3>
              <p>
                {selectedPatient.age} yrs • {selectedPatient.gender} • Blood: {selectedPatient.bloodGroup || "N/A"} • Status: <strong>{selectedPatient.status}</strong>
              </p>
            </div>
          </div>
          <button 
            className="clear-patient-btn" 
            onClick={() => setSelectedPatient(null)}
          >
            Close Analysis Workspace
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper">
        {patients.length === 0 ? (
          <div className="empty">
            <BsInbox size={28} style={{ marginBottom: "8px", opacity: 0.5 }} />
            <p>No patient clinical records available</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Age / Sex</th>
                <th>Contact</th>
                <th>Blood</th>
                <th>Status</th>
                <th>Clinical Notes</th>
                <th>Account Email</th>
                <th>AI Workspace</th>
              </tr>
            </thead>

            <tbody>
              {currentPatients.map((p) => {
                const isSelected = selectedPatient?.id === p.id;
                return (
                  <tr key={p.id} className={isSelected ? "row-selected" : ""}>
                    <td>
                      <div className="table-cell-bold">{p.name}</div>
                    </td>
                    <td>{p.age} yrs • {p.gender}</td>
                    <td>
                      <span className="table-cell-muted">{p.contact}</span>
                    </td>
                    <td>
                      <span className="blood-group-badge">{p.bloodGroup || "N/A"}</span>
                    </td>
                    <td>
                      <span className={`status status-${p.status?.toLowerCase()}`}>
                        <span className="status-dot"></span>
                        {p.status || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className="notes-snippet">{p.medicalNotes || "—"}</span>
                    </td>
                    <td>
                      <span className="table-cell-muted">{p.user?.email || "—"}</span>
                    </td>
                    <td>
                      <button
                        className={`analyze-btn ${isSelected ? "active" : ""}`}
                        onClick={() => setSelectedPatient(p)}
                      >
                        <HiOutlineSparkles />
                        <span>{isSelected ? "Analyzing" : "Analyze"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination UI */}
        {patients.length > 0 && (
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <FaChevronLeft />
              <span>Prev</span>
            </button>

            <span className="pagination-page-indicator">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <span>Next</span>
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {selectedPatient && (
        <div className="patient-actions-section">
          <ConsultationNote patient={selectedPatient} />
          <DoctorChatBox patient={selectedPatient} />
        </div>
      )}
    </div>
  );
}