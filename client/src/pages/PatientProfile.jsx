import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import "../styles/patientProfile.css";
import {
  FaUserInjured, FaPhone, FaEnvelope, FaTint, FaEdit, FaSave, FaTimes,
  FaSignOutAlt, FaCalendarCheck, FaCalendarPlus, FaClock, FaUserMd,
  FaHospital, FaNotesMedical, FaShieldAlt, FaArrowRight, FaCheckCircle,
  FaFileMedical, FaAward, FaHeartbeat, FaCalendarAlt, FaIdCard
} from "react-icons/fa";
import { BsShieldLock, BsActivity, BsFileEarmarkTextFill, BsCheckCircleFill } from "react-icons/bs";
import { toast } from "react-toastify";

export default function PatientProfile() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [consultationNotes, setConsultationNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    contact: "",
    bloodGroup: "",
    medicalNotes: ""
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      if (!user?.id) return;

      // 1. Fetch Profile
      const resProfile = await API.get("/patients/profile", {
        headers: {
          userid: user.id,
          role: user.role,
        },
      });
      setPatient(resProfile.data);
      setForm({
        name: resProfile.data.name || "",
        age: resProfile.data.age !== undefined && resProfile.data.age !== null ? String(resProfile.data.age) : "",
        gender: resProfile.data.gender || "",
        contact: resProfile.data.contact || "",
        bloodGroup: resProfile.data.bloodGroup || "",
        medicalNotes: resProfile.data.medicalNotes || ""
      });

      // 2. Fetch My Booked Appointments
      try {
        const resAppts = await API.get("/patient-appointments/my", {
          headers: {
            userid: user.id,
            role: user.role,
          },
        });
        if (Array.isArray(resAppts.data)) {
          setAppointments(resAppts.data);
        }
      } catch (err) {
        console.warn("Could not fetch patient appointments:", err);
      }

      // 3. Fetch My Consultation Notes
      try {
        const resNotes = await API.get("/consultation-notes/my-notes", {
          headers: {
            userid: user.id,
            role: user.role,
          },
        });
        if (Array.isArray(resNotes.data)) {
          setConsultationNotes(resNotes.data);
        }
      } catch (err) {
        console.warn("Could not fetch consultation notes:", err);
      }

    } catch (error) {
      console.log("Profile fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      const res = await API.put(
        "/patients/profile",
        {
          name: form.name.trim(),
          age: form.age ? Number(form.age) : patient?.age,
          gender: form.gender,
          contact: form.contact.trim(),
          bloodGroup: form.bloodGroup || null,
          medicalNotes: form.medicalNotes.trim() || null
        },
        {
          headers: {
            role: user.role,
            userid: user.id,
          },
        }
      );

      setPatient(res.data);
      if (form.name.trim() && user.name !== form.name.trim()) {
        const updatedUser = { ...user, name: form.name.trim() };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setIsEditing(false);
      toast.success("Profile details updated successfully!");
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error(err.response?.data?.error || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    toast(
      ({ closeToast }) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#1e293b" }}>
            Are you sure you want to sign out of HealthRay?
          </span>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button
              onClick={closeToast}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                closeToast();
                localStorage.removeItem("user");
                toast.success("Logged out successfully");
                navigate("/");
              }}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "none",
                background: "#ef4444",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      ),
      {
        autoClose: 5000,
        closeOnClick: false,
        draggable: false,
        position: "top-center",
      }
    );
  };

  if (loading) {
    return (
      <div className="patient-profile-wrapper" style={{ textAlign: "center", padding: "100px 20px" }}>
        <BsActivity className="loading-spinner-icon" style={{ fontSize: "40px", color: "#0284c7" }} />
        <h2 style={{ marginTop: "16px", color: "#0f172a", fontSize: "22px" }}>Loading Medical Profile...</h2>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="patient-profile-wrapper" style={{ textAlign: "center", padding: "100px 20px" }}>
        <h2>No patient record found.</h2>
        <Link to="/" style={{ color: "#0284c7", fontWeight: "700" }}>Return to Home</Link>
      </div>
    );
  }

  // Derived stats
  const uniqueDoctorsCount = new Set(appointments.map((a) => a.doctorId || a.doctor?.id).filter(Boolean)).size;

  return (
    <div className="patient-profile-wrapper">
      {/* ── HERO BANNER ── */}
      <div className="pp-hero-card">
        <div className="pp-hero-inner">
          <div className="pp-hero-left">
            <div className="pp-avatar-badge-wrap">
              <div className="pp-avatar-box">
                {patient.name?.[0]?.toUpperCase() || "P"}
              </div>
              <div className="pp-avatar-online-dot" title="Active Patient Profile" />
            </div>

            <div className="pp-hero-info">
              <div className="pp-hero-name-row">
                <h1 className="pp-hero-name">{patient.name}</h1>
                <span className="pp-verified-badge">
                  <BsCheckCircleFill /> Verified Patient
                </span>
                <span className="pp-ehr-badge">#PAT-{patient.id}</span>
              </div>

              <div className="pp-hero-meta-row">
                <span className="pp-meta-item">
                  <FaEnvelope /> {patient.user?.email || user?.email || "No email on record"}
                </span>
                <span className="pp-meta-divider">•</span>
                <span className="pp-meta-item">
                  <FaPhone /> {patient.contact || "No phone provided"}
                </span>
                {patient.bloodGroup && (
                  <>
                    <span className="pp-meta-divider">•</span>
                    <span className="pp-meta-item" style={{ color: "#f87171" }}>
                      <FaTint /> Blood Group: {patient.bloodGroup}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Hero Action Buttons */}
          <div className="pp-hero-actions">
            <button
              type="button"
              className="pp-btn-edit"
              onClick={() => setIsEditing(true)}
            >
              <FaEdit />
              <span>Edit Profile</span>
            </button>

            <Link to="/patient-doctors" className="pp-btn-edit" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <FaCalendarPlus />
              <span>Book Appointment</span>
            </Link>

            <button
              type="button"
              className="pp-btn-logout"
              onClick={handleLogout}
              title="Sign Out of Portal"
            >
              <FaSignOutAlt />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS METRIC GRID ── */}
      <div className="pp-stats-grid">
        <div className="pp-stat-card">
          <div className="pp-stat-icon-wrap green">
            <FaCalendarCheck />
          </div>
          <div className="pp-stat-info">
            <span className="pp-stat-val">{appointments.length}</span>
            <span className="pp-stat-lbl">Booked Appointments</span>
          </div>
        </div>

        <div className="pp-stat-card">
          <div className="pp-stat-icon-wrap blue">
            <FaUserMd />
          </div>
          <div className="pp-stat-info">
            <span className="pp-stat-val">{uniqueDoctorsCount || (appointments.length > 0 ? 1 : 0)}</span>
            <span className="pp-stat-lbl">Doctors Consulted</span>
          </div>
        </div>

        <div className="pp-stat-card">
          <div className="pp-stat-icon-wrap purple">
            <FaNotesMedical />
          </div>
          <div className="pp-stat-info">
            <span className="pp-stat-val">{consultationNotes.length}</span>
            <span className="pp-stat-lbl">Clinical EHR Records</span>
          </div>
        </div>

        <div className="pp-stat-card">
          <div className="pp-stat-icon-wrap red">
            <FaTint />
          </div>
          <div className="pp-stat-info">
            <span className="pp-stat-val">{patient.bloodGroup || "N/A"}</span>
            <span className="pp-stat-lbl">Blood Group Status</span>
          </div>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN PROFILE CONTENT ── */}
      <div className="pp-content-layout">
        {/* LEFT COLUMN: DEMOGRAPHICS & CLINICAL VITALS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Demographic Information Card */}
          <div className="pp-card">
            <div className="pp-card-header">
              <div className="pp-card-title-group">
                <div className="pp-card-icon-badge">
                  <FaUserInjured />
                </div>
                <h3 className="pp-card-title">Demographic Information</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                style={{ background: "none", border: "none", color: "#0284c7", fontWeight: "700", fontSize: "13px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <FaEdit /> Edit
              </button>
            </div>

            <div className="pp-data-list">
              <div className="pp-data-row">
                <span className="pp-data-label">Full Name</span>
                <span className="pp-data-value">{patient.name}</span>
              </div>

              <div className="pp-data-row">
                <span className="pp-data-label">Age</span>
                <span className="pp-data-value">{patient.age ? `${patient.age} Years` : "Not Provided"}</span>
              </div>

              <div className="pp-data-row">
                <span className="pp-data-label">Biological Sex</span>
                <span className="pp-data-value">{patient.gender || "Not Provided"}</span>
              </div>

              <div className="pp-data-row">
                <span className="pp-data-label">Contact Phone</span>
                <span className="pp-data-value">{patient.contact || "Not Provided"}</span>
              </div>

              <div className="pp-data-row">
                <span className="pp-data-label">Registered Email</span>
                <span className="pp-data-value">{patient.user?.email || user?.email || "Not Provided"}</span>
              </div>

              <div className="pp-data-row">
                <span className="pp-data-label">Account Role</span>
                <span className="pp-data-value" style={{ textTransform: "capitalize", color: "#0284c7" }}>
                  {user?.role || "Patient"} Portal Member
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Health & Vitals Card */}
          <div className="pp-card">
            <div className="pp-card-header">
              <div className="pp-card-title-group">
                <div className="pp-card-icon-badge">
                  <BsActivity />
                </div>
                <h3 className="pp-card-title">Clinical Health &amp; Observations</h3>
              </div>
            </div>

            <div className="pp-data-list" style={{ marginBottom: "16px" }}>
              <div className="pp-data-row">
                <span className="pp-data-label">Blood Group</span>
                <span className="pp-blood-badge">{patient.bloodGroup || "Not Specified"}</span>
              </div>

              <div className="pp-data-row">
                <span className="pp-data-label">EHR Identifier</span>
                <span className="pp-data-value" style={{ color: "#0284c7" }}>#PAT-{patient.id}</span>
              </div>
            </div>

            <div>
              <span style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                Medical History, Drug Allergies &amp; Notes
              </span>
              <div className="pp-notes-box">
                {patient.medicalNotes ? (
                  <p style={{ margin: 0 }}>{patient.medicalNotes}</p>
                ) : (
                  <p className="pp-notes-empty">
                    No active drug allergies or chronic medical conditions recorded. Click "Edit Profile" to document any conditions or medications.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: APPOINTMENTS & CONSULTATION RECORDS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* Booked Appointments Card */}
          <div className="pp-card">
            <div className="pp-card-header">
              <div className="pp-card-title-group">
                <div className="pp-card-icon-badge">
                  <FaCalendarAlt />
                </div>
                <h3 className="pp-card-title">My Booked Appointments</h3>
              </div>
              <Link to="/patient-doctors" className="pp-card-action-link">
                <span>Book New</span> <FaArrowRight />
              </Link>
            </div>

            {appointments.length === 0 ? (
              <div className="pp-empty-box">
                <FaCalendarCheck className="pp-empty-icon" />
                <h4 className="pp-empty-title">No Booked Appointments</h4>
                <p className="pp-empty-desc">You have no upcoming doctor consultations scheduled.</p>
                <Link to="/patient-doctors" className="pp-btn-book-primary">
                  <FaCalendarPlus /> <span>Find &amp; Book Doctor</span>
                </Link>
              </div>
            ) : (
              <div className="pp-appt-list">
                {appointments.slice(0, 4).map((appt, idx) => {
                  const doc = appt.doctor;
                  const dateStr = appt.date ? new Date(appt.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-";
                  const timeStr = appt.time ? (appt.time.includes("T") ? new Date(appt.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : appt.time.slice(0, 5)) : "-";

                  return (
                    <div key={idx} className="pp-appt-item">
                      <div className="pp-appt-left">
                        <div className="pp-appt-doc-avatar">
                          {doc?.name?.[0]?.toUpperCase() || "D"}
                        </div>
                        <div className="pp-appt-details">
                          <h4 className="pp-appt-doc-name">Dr. {doc?.name || `Doctor #${appt.doctorId}`}</h4>
                          <span className="pp-appt-spec">{doc?.specialty || "Specialist Physician"}</span>
                          <div className="pp-appt-time-meta">
                            <span><FaCalendarAlt /> {dateStr}</span>
                            <span>•</span>
                            <span><FaClock /> {timeStr}</span>
                          </div>
                        </div>
                      </div>

                      <span className="pp-appt-badge">
                        ✓ Confirmed
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Consultation Notes / EHR Summary Card */}
          <div className="pp-card">
            <div className="pp-card-header">
              <div className="pp-card-title-group">
                <div className="pp-card-icon-badge">
                  <FaFileMedical />
                </div>
                <h3 className="pp-card-title">Official Consultation Notes</h3>
              </div>
              <Link to="/patient-notes" className="pp-card-action-link">
                <span>View All Notes</span> <FaArrowRight />
              </Link>
            </div>

            {consultationNotes.length === 0 ? (
              <div className="pp-empty-box">
                <FaNotesMedical className="pp-empty-icon" />
                <h4 className="pp-empty-title">No Medical Notes Yet</h4>
                <p className="pp-empty-desc">Approved physician consultation notes and prescription summaries will appear here.</p>
              </div>
            ) : (
              <div className="pp-appt-list">
                {consultationNotes.slice(0, 3).map((note) => (
                  <div key={note.id} className="pp-appt-item" style={{ borderLeft: "4px solid #0284c7" }}>
                    <div className="pp-appt-left">
                      <div className="pp-appt-details">
                        <h4 className="pp-appt-doc-name">Dr. {note.doctor?.name || "Attending Doctor"}</h4>
                        <span className="pp-appt-spec">{note.doctor?.specialty || "Clinical Consultation"}</span>
                        <span style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                          {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/patient-notes"
                      style={{
                        padding: "6px 14px",
                        background: "#f0f9ff",
                        color: "#0284c7",
                        borderRadius: "8px",
                        fontWeight: "700",
                        fontSize: "12.5px",
                        textDecoration: "none",
                        border: "1px solid #bae6fd",
                        whiteSpace: "nowrap"
                      }}
                    >
                      View Summary
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── EDIT PROFILE MODAL ── */}
      {isEditing && (
        <div className="pp-modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="pp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pp-modal-header">
              <h3>Edit Patient Medical Profile</h3>
              <button
                type="button"
                className="pp-modal-close-btn"
                onClick={() => setIsEditing(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="pp-modal-body">
                <div className="pp-form-grid">
                  <div className="pp-form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      className="pp-form-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>

                  <div className="pp-form-group">
                    <label>Age (Years)</label>
                    <input
                      type="number"
                      min="1"
                      max="125"
                      required
                      className="pp-form-input"
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: e.target.value })}
                    />
                  </div>

                  <div className="pp-form-group">
                    <label>Biological Sex</label>
                    <select
                      className="pp-form-select"
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="pp-form-group">
                    <label>Contact Phone</label>
                    <input
                      type="text"
                      required
                      className="pp-form-input"
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    />
                  </div>

                  <div className="pp-form-group" style={{ gridColumn: "span 2" }}>
                    <label>Blood Group</label>
                    <select
                      className="pp-form-select"
                      value={form.bloodGroup}
                      onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                    >
                      <option value="">Not Specified</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div className="pp-form-group">
                  <label>Medical History, Drug Allergies &amp; Chronic Notes</label>
                  <textarea
                    rows="4"
                    className="pp-form-textarea"
                    placeholder="Document any chronic conditions (e.g. hypertension, asthma, diabetes), known drug allergies, or ongoing medications..."
                    value={form.medicalNotes}
                    onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
                  />
                </div>
              </div>

              <div className="pp-modal-footer">
                <button
                  type="button"
                  className="pp-btn-cancel"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="pp-btn-save"
                >
                  <FaSave />
                  <span>{saving ? "Saving Changes..." : "Save Profile Details"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SECURITY & HIPAA COMPLIANCE FOOTER ── */}
      <div className="pp-security-banner">
        <FaShieldAlt className="pp-security-icon" />
        <span>
          <strong>Confidential Electronic Health Record (EHR)</strong> • Protected by 256-Bit Military Grade Encryption and Healthcare Compliance Protocols
        </span>
      </div>
    </div>
  );
}