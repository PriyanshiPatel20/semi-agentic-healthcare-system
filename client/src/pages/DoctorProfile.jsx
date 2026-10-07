import { useState, useEffect } from "react";
import API from "../api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  FaUserMd,
  FaEdit,
  FaSave,
  FaSignOutAlt,
  FaHospital,
  FaMapMarkerAlt,
  FaClock,
  FaPhoneAlt,
  FaEnvelope,
  FaAward,
  FaTimes,
  FaCheckCircle,
  FaShieldAlt
} from "react-icons/fa";
import "../styles/doctorWebsite.css";

export default function DoctorProfile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [doctorId, setDoctorId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    specialty: "",
    experience: "",
    mobile: "",
    email: "",
    clinicName: "",
    city: "",
    state: "",
    address: "",
    timing: ""
  });

  const fetchDoctorProfile = async () => {
    if (!user || (user.role?.toLowerCase() !== "doctor" && user.role?.toLowerCase() !== "admin")) {
      toast.error("Access denied. Doctor profile is only accessible to logged-in doctors.", { toastId: "doctor-profile-access-error" });
      navigate("/");
      return;
    }

    const doctorIdToFetch = user.id || user.userId || 1;

    try {
      setLoading(true);
      const res = await API.get(`/doctors/profile/${doctorIdToFetch}`, {
        headers: {
          role: user.role,
          userid: doctorIdToFetch
        }
      });
      const doc = res.data;

      setDoctorId(doc.id);
      setForm({
        name: doc.name || user.name || "",
        specialty: doc.specialty || "",
        experience: doc.experience || "",
        mobile: doc.mobile || "",
        email: doc.user?.email || user.email || "",
        clinicName: doc.clinicName || "",
        city: doc.city || "",
        state: doc.state || "",
        address: doc.address || "",
        timing: doc.timing || ""
      });
    } catch (error) {
      console.error("Failed to load doctor profile:", error);
      toast.error(error.response?.data?.error || "Could not fetch doctor profile details.", { toastId: "doctor-profile-error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorProfile();
  }, []);

  const handleSave = async () => {
    if (!doctorId) {
      toast.error("Doctor profile ID not found.");
      return;
    }

    try {
      setSaving(true);
      await API.put(`/doctors/${doctorId}`, form, {
        headers: { role: user.role }
      });

      // Update localStorage user name if changed
      if (form.name && user) {
        const updatedUser = { ...user, name: form.name };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      toast.success("Doctor practice profile updated successfully!");
      setEditing(false);
      fetchDoctorProfile();
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error(error.response?.data?.error || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    toast.info("Logged out successfully");
    navigate("/");
  };

  if (loading) {
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", color: "#64748b" }}>
        <h3>Loading Doctor Practice Profile...</h3>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "36px 24px 64px 24px" }}>
      {/* ── PROFILE HEADER BANNER ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
          borderRadius: "24px",
          padding: "32px",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "24px",
          boxShadow: "0 10px 30px rgba(2, 132, 199, 0.25)",
          marginBottom: "32px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: "900",
              border: "2px solid rgba(255, 255, 255, 0.4)"
            }}
          >
            {form.name?.[0]?.toUpperCase() || "D"}
          </div>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "900", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
              Dr. {form.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13.5px", opacity: 0.9 }}>
              <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 12px", borderRadius: "12px", fontWeight: "700" }}>
                {form.specialty || "General Medicine"}
              </span>
              <span>•</span>
              <span>{form.experience || "5+"} Practice Experience</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#ffffff",
                color: "#0284c7",
                border: "none",
                padding: "11px 22px",
                borderRadius: "12px",
                fontSize: "13.5px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                transition: "all 0.2s"
              }}
            >
              <FaEdit /> Edit Practice Profile
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#10b981",
                  color: "#ffffff",
                  border: "none",
                  padding: "11px 22px",
                  borderRadius: "12px",
                  fontSize: "13.5px",
                  fontWeight: "800",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15)"
                }}
              >
                <FaSave /> {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.2)",
                  color: "#ffffff",
                  border: "1px solid rgba(255,255,255,0.4)",
                  padding: "11px 18px",
                  borderRadius: "12px",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                <FaTimes /> Cancel
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#ef4444",
              color: "#ffffff",
              border: "none",
              padding: "11px 20px",
              borderRadius: "12px",
              fontSize: "13.5px",
              fontWeight: "800",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(239, 68, 68, 0.3)"
            }}
          >
            <FaSignOutAlt /> Log Out
          </button>
        </div>
      </div>

      {/* ── PROFILE DETAILS FORM & VIEW ── */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.03)"
        }}
      >
        <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", marginTop: 0, marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
          <FaHospital style={{ color: "#0284c7" }} /> Clinical OPD &amp; Practice Details
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
          {/* Doctor Name */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              Doctor Full Name
            </label>
            <input
              disabled={!editing}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: editing ? "#ffffff" : "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Specialty */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              Medical Specialty
            </label>
            <input
              disabled={!editing}
              placeholder="e.g. Diabetology & Endocrinology"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: editing ? "#ffffff" : "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Clinic Name */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              Clinic / Hospital Name
            </label>
            <input
              disabled={!editing}
              placeholder="e.g. ABC CLINIC"
              value={form.clinicName}
              onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: editing ? "#ffffff" : "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Experience */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              Experience (Years)
            </label>
            <input
              disabled={!editing}
              placeholder="e.g. 12+"
              value={form.experience}
              onChange={(e) => setForm({ ...form, experience: e.target.value })}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: editing ? "#ffffff" : "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* City */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              City
            </label>
            <input
              disabled={!editing}
              placeholder="e.g. Betul or Ahmedabad"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: editing ? "#ffffff" : "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* State */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              State
            </label>
            <input
              disabled={!editing}
              placeholder="e.g. Madhya Pradesh or Gujarat"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: editing ? "#ffffff" : "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Mobile */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              Contact Mobile
            </label>
            <input
              disabled={!editing}
              placeholder="+91 98765 43210"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: editing ? "#ffffff" : "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              Account Email
            </label>
            <input
              disabled={!editing}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: editing ? "#ffffff" : "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Address */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              Full Clinic Address
            </label>
            <input
              disabled={!editing}
              placeholder="e.g. Khedi Road, Near Civil Lines"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: editing ? "#ffffff" : "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* OPD Timings */}
          <div>
            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              OPD Consultation Timings
            </label>
            <input
              disabled={!editing}
              placeholder="e.g. 09:00 AM - 08:00 PM"
              value={form.timing}
              onChange={(e) => setForm({ ...form, timing: e.target.value })}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: editing ? "#ffffff" : "#f8fafc",
                fontSize: "14px",
                fontWeight: "700",
                color: "#0f172a",
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>

        {editing && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
            <button
              type="button"
              onClick={() => setEditing(false)}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "13.5px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                background: "#0284c7",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)"
              }}
            >
              {saving ? "Saving..." : "Save Profile Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
