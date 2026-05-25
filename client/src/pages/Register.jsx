import { useState } from "react";
import API from "../api";
import "../styles/auth.css";

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

  const handleRegister = async () => {
    try {
      await API.post("/auth/register", form);
      alert("Registration successful");
      window.location.href = "/";
    } catch (error) {
      alert(error.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>

        <input
          placeholder="Full Name"
          onChange={e => setForm({ ...form, name: e.target.value })}
        />

        <input
          placeholder="Email"
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        <input
          type="password"
          placeholder="Password"
          onChange={e => setForm({ ...form, password: e.target.value })}
        />

        {/* ROLE SELECT */}
        <select
          onChange={e => setForm({ ...form, role: e.target.value })}
        >
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
        </select>

        {/*  PATIENT FIELDS */}
        {form.role === "patient" && (
          <>
            <input
              placeholder="Age"
              type="number"
              onChange={e => setForm({ ...form, age: e.target.value })}
            />
            <input
              placeholder="Gender"
              onChange={e => setForm({ ...form, gender: e.target.value })}
            />
            <input
              placeholder="Contact"
              onChange={e => setForm({ ...form, contact: e.target.value })}
            />
          </>
        )}

        {/* DOCTOR FIELDS */}
        {form.role === "doctor" && (
          <>
          <input
            placeholder="Specialty"
            onChange={e => setForm({ ...form, specialty: e.target.value })}
          />

          <input
            placeholder="Experience (years)"
            type="text"
            onChange={e => setForm({ ...form, experience: e.target.value })}
          />

          <input
            placeholder="Mobile"
            onChange={e => setForm({ ...form, mobile: e.target.value })}
          />
          </>
        )}    

        <button onClick={handleRegister}>Register</button>
      </div>
    </div>
  );
}