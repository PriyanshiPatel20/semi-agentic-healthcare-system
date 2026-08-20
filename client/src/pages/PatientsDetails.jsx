import { useEffect, useState } from "react";
import API from "../api";
import "../styles/patient.css";
import "../styles/chatbox.css";
import "../styles/consultation.css";
import DoctorChatBox from "../components/DoctorChatBox.jsx";
import ConsultationNote from "../components/ConsultationNote.jsx";
import { useNavigate } from "react-router-dom";

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  //Pagination state
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
        <h2>Patients Analysis</h2>
         <button
      className="back-btn"
      onClick={() => navigate(-1)}
    >
       Back
    </button>
        <span>{patients.length} records</span>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Contact</th>
              <th>Blood Group</th>
              <th>Status</th>
              <th>Medical Notes</th>
              <th>Email</th>
              <th>AI Action</th>
            </tr>
          </thead>

          <tbody>
            {currentPatients.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.age}</td>
                <td>{p.gender}</td>
                <td>{p.contact}</td>
                <td>{p.bloodGroup || "N/A"}</td>
                <td>
                  <span className={`status ${p.status?.toLowerCase()}`}>
                    {p.status || "N/A"}
                  </span>
                </td>
                <td>{p.medicalNotes || "N/A"}</td>
                <td>{p.user?.email || "N/A"}</td>
                <td>
                  <button
                    className="analyze-btn"
                    onClick={() => setSelectedPatient(p)}
                  >
                    Analyze
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination UI */}
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Prev
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              className={currentPage === i + 1 ? "active" : ""}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
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