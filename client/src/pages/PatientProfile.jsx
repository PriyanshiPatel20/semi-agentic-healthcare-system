import { useEffect, useState } from "react";
import API from "../api";
import "../styles/patientProfile.css";
import { FaUserCircle, FaUserInjured, FaPhone, FaEnvelope, FaTint } from "react-icons/fa";
import { BsShieldLock, BsActivity, BsFileEarmarkTextFill, BsCheckCircleFill } from "react-icons/bs";

export default function PatientProfile() {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await API.get("/patients/profile", {
        headers: {
          userid: user.id,
          role: user.role,
        },
      });
      setPatient(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading-state">
        <BsActivity className="loading-spinner-icon" />
        <h2>Loading Clinical Profile...</h2>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="profile-loading-state">
        <h2>No patient profile record found.</h2>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* HEADER HERO */}
      <div className="profile-header">
        <div className="profile-avatar-box">
          <FaUserCircle className="profile-avatar-icon" />
        </div>

        <div className="profile-header-meta">
          <div className="profile-header-title-row">
            <h1>{patient.name}</h1>
            <span className="profile-verified-badge">
              <BsCheckCircleFill /> Verified Patient
            </span>
          </div>
          <p className="profile-email">
            <FaEnvelope className="inline-meta-icon" /> {patient.user?.email || "No email on record"}
          </p>
        </div>
      </div>

      {/* GRID CARDS */}
      <div className="profile-grid">
        {/* PERSONAL CARD */}
        <div className="info-card">
          <div className="info-card-header">
            <FaUserInjured className="info-card-icon" />
            <h3>Demographic Information</h3>
          </div>

          <div className="info-row">
            <span className="label">Full Age</span>
            <span className="value">{patient.age} Years</span>
          </div>

          <div className="info-row">
            <span className="label">Biological Sex</span>
            <span className="value">{patient.gender}</span>
          </div>

          <div className="info-row">
            <span className="label">Contact Phone</span>
            <span className="value">
              <FaPhone className="inline-meta-icon" /> {patient.contact}
            </span>
          </div>
        </div>

        {/* MEDICAL CARD */}
        <div className="info-card">
          <div className="info-card-header">
            <BsActivity className="info-card-icon" />
            <h3>Clinical Status & Vitals</h3>
          </div>

          <div className="info-row">
            <span className="label">Blood Group</span>
            <span className="value blood-highlight">
              <FaTint className="inline-meta-icon" /> {patient.bloodGroup || "Not Specified"}
            </span>
          </div>

          <div className="info-row">
            <span className="label">Clinical Triage</span>
            <span className={`status status-${patient.status?.toLowerCase()}`}>
              <span className="status-dot"></span>
              {patient.status || "ACTIVE"}
            </span>
          </div>
        </div>

        {/* NOTES CARD */}
        <div className="info-card info-card-full">
          <div className="info-card-header">
            <BsFileEarmarkTextFill className="info-card-icon" />
            <h3>Medical History & Clinical Observations</h3>
          </div>

          <div className="notes-box">
            {patient.medicalNotes ? (
              <p>{patient.medicalNotes}</p>
            ) : (
              <p className="empty-notes-text">No active medical restrictions or notes recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* COMPLIANCE FOOTER */}
      <div className="profile-compliance-banner">
        <BsShieldLock />
        <span>Confidential Electronic Health Record (EHR) • Access restricted to authorized medical staff and patient</span>
      </div>
    </div>
  );
}