import { useState } from "react";
import API from "../api";
import "../styles/auth.css";

export default function Login() {
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ email: "", password: "" });
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
  }

  const handleLogin = async () => {
    try {
      if (!validate()) return;
      const res = await API.post("/auth/login", form);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setErrors({});

        window.location.href = "/dashboard";
    } catch (error) {
      alert(error.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back </h2>
        <div className="form-group">
        <input
          placeholder="Email"
          onChange={(e) => {
            setForm ({ ...form, email: e.target.value});
            setErrors({ ...setErrors, email: ""})
          }}
        />
        {errors.email && <span className="error">{errors.email}</span>}
        </div>
        <div className="form-group">
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => {
            setForm({ ...form, password: e.target.value})
            setErrors({ ...errors, password: ""})
          }}
        />
        {errors.password && <span className="error">{errors.password}</span>}
        </div>
        <button onClick={handleLogin}>Login</button>

        <p>
          Don't have an account? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
}