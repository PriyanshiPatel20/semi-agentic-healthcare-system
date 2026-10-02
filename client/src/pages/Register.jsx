import { useState } from "react";
import API from "../api";
import "../styles/auth.css";
import { BsHospital, BsShieldLock } from "react-icons/bs";
import { FaUserPlus, FaUserMd, FaUserInjured, FaUserShield } from "react-icons/fa";
import { Link } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient",
    age: "",
    gender: "",
    contact: "",
    specialty: "",
    experience: "",
    mobile: ""
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      if (!form.name || !form.email || !form.password) {
        alert("Please fill in all required primary fields");
        return;
      }
      setLoading(false);
      await API.post("/auth/register", form);
      alert("Registration successful. Please sign in.");
      window.location.href = "/";
    } catch (error) {
      alert(error.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        {/* Medical Brand Header */}
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <BsHospital />
          </div>
          <div>
            <h1 className="auth-brand-title">HealthRay</h1>
            <span className="auth-brand-badge">HMS Portal</span>
          </div>
        </div>

        <div className="auth-header-text">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Register for patient care or medical provider access</p>
        </div>

        <div className="form-group">
          <label className="auth-label">Account Role</label>
          <div className="role-selector-pills">
            <button
              type="button"
              className={`role-pill ${form.role === "patient" ? "active" : ""}`}
              onClick={() => setForm({ ...form, role: "patient" })}
            >
              <FaUserInjured /> Patient
            </button>
            <button
              type="button"
              className={`role-pill ${form.role === "doctor" ? "active" : ""}`}
              onClick={() => setForm({ ...form, role: "doctor" })}
            >
              <FaUserMd /> Doctor
            </button>
            <button
              type="button"
              className={`role-pill ${form.role === "admin" ? "active" : ""}`}
              onClick={() => setForm({ ...form, role: "admin" })}
            >
              <FaUserShield /> Admin
            </button>
          </div>
        </div>

        <div className="form-grid-two">
          <div className="form-group">
            <label className="auth-label">Full Name</label>
            <input
              placeholder="e.g. Dr. Sarah Jenkins or John Doe"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="auth-label">Email Address</label>
            <input
              type="email"
              placeholder="name@healthcare.org"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="auth-label">Password</label>
          <input
            type="password"
            placeholder="Create strong account password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {/* PATIENT FIELDS */}
        {form.role === "patient" && (
          <div className="form-grid-three">
            <div className="form-group">
              <label className="auth-label">Age</label>
              <input
                placeholder="Age"
                type="number"
                value={form.age}
                onChange={e => setForm({ ...form, age: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="auth-label">Gender</label>
              <input
                placeholder="Gender"
                value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="auth-label">Emergency Contact</label>
              <input
                placeholder="Phone number"
                value={form.contact}
                onChange={e => setForm({ ...form, contact: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* DOCTOR FIELDS */}
        {form.role === "doctor" && (
          <div className="form-grid-three">
            <div className="form-group">
              <label className="auth-label">Medical Specialty</label>
              <input
                placeholder="e.g. Cardiology, Neurology"
                value={form.specialty}
                onChange={e => setForm({ ...form, specialty: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="auth-label">Experience (Years)</label>
              <input
                placeholder="e.g. 8"
                type="text"
                value={form.experience}
                onChange={e => setForm({ ...form, experience: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="auth-label">Direct Mobile</label>
              <input
                placeholder="Mobile number"
                value={form.mobile}
                onChange={e => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
          </div>
        )}

        <button 
          className="auth-submit-btn" 
          onClick={handleRegister}
          disabled={loading}
        >
          <FaUserPlus />
          <span>{loading ? "Registering..." : "Complete Registration"}</span>
        </button>

        <div className="auth-footer-nav">
          <p>
            Already registered? <Link to="/">Return to Sign In</Link>
          </p>
        </div>

        <div className="auth-security-note">
          <BsShieldLock />
          <span>HIPAA Compliant • Encrypted Medical Directory</span>
        </div>
      </div>
    </div>
  );
}