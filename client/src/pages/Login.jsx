import { useState } from "react";
import API from "../api";
import "../styles/auth.css";
import { BsHospital, BsShieldLock } from "react-icons/bs";
import { FaLock, FaEnvelope, FaSignInAlt } from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

export default function Login() {
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let newErrors = {};

    if (!form.email) {
      newErrors.email = "Email is required";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    try {
      if (!validate()) return;
      setLoading(true);
      const res = await API.post("/auth/login", form);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setErrors({});
      toast.success("Login successful!");
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error(error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
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
          <h2>Clinical Sign In</h2>
          <p className="auth-subtitle">Access your electronic health records & clinic workspace</p>
        </div>

        <div className="form-group">
          <label className="auth-label">
            <FaEnvelope className="auth-label-icon" /> Email Address
          </label>
          <input
            type="email"
            placeholder="doctor@hospital.com or patient@mail.com"
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              setErrors({ ...errors, email: "" });
            }}
          />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label className="auth-label">
            <FaLock className="auth-label-icon" /> Password
          </label>
          <input
            type="password"
            placeholder="Enter secure password"
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              setErrors({ ...errors, password: "" });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />
          {errors.password && <span className="error">{errors.password}</span>}
        </div>

        <button 
          className="auth-submit-btn" 
          onClick={handleLogin}
          disabled={loading}
        >
          <FaSignInAlt />
          <span>{loading ? "Signing In..." : "Sign In to Portal"}</span>
        </button>

        <div className="auth-footer-nav">
          <p>
            Don't have an account? <Link to="/register">Create Clinical Account</Link>
          </p>
        </div>

        <div className="auth-security-note">
          <BsShieldLock />
        </div>
      </div>
    </div>
  );
}