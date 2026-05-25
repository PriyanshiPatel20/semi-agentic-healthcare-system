import { useEffect, useState } from "react";
import API from "../api";
import "../styles/patientProfile.css";
import { FaUserCircle } from "react-icons/fa";

export default function PatientProfile() {

  const [patient, setPatient] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {

    try {

      const user = JSON.parse(localStorage.getItem("user"));

      const res = await API.get("/patients/profile", {
        headers: {
          userid: user.id,
          role: user.role
        }
      });

      setPatient(res.data);

    } catch (error) {
      console.log(error);
    }
  };

  if (!patient) {
    return <h2>Loading...</h2>;
  }

  return (
    <div className="profile-page">

      {/* HEADER */}

      <div className="profile-header">

        <div className="profile-avatar">
          <FaUserCircle />
        </div>

        <div>
          <h1>{patient.name}</h1>
          <p>{patient.user?.email}</p>
        </div>

      </div>

      {/* GRID */}

      <div className="profile-grid">

        {/* PERSONAL */}

        <div className="info-card">

          <h3>Personal Information</h3>

          <div className="info-row">
            <span className="label">Age</span>
            <span className="value">{patient.age}</span>
          </div>

          <div className="info-row">
            <span className="label">Gender</span>
            <span className="value">{patient.gender}</span>
          </div>

          <div className="info-row">
            <span className="label">Contact</span>
            <span className="value">{patient.contact}</span>
          </div>

        </div>

        {/* MEDICAL */}

        <div className="info-card">

          <h3>Medical Details</h3>

          <div className="info-row">
            <span className="label">Blood Group</span>
            <span className="value">
              {patient.bloodGroup || "N/A"}
            </span>
          </div>

          <div className="info-row">
            <span className="label">Status</span>

            <span className={`status ${patient.status}`}>
              {patient.status}
            </span>
          </div>

        </div>

        {/* NOTES */}

        <div className="info-card">

          <h3>Medical Notes</h3>

          <div className="notes-box">
            {patient.medicalNotes || "No medical notes available"}
          </div>

        </div>

      </div>

    </div>
  );
}