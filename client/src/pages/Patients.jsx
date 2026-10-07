import { useEffect, useState } from "react";
import API from "../api";
import "../styles/patient.css";
import "../styles/chatbox.css";
import ChatBox from "../components/ChatBox.jsx";
import { useNavigate } from "react-router-dom";
import { FaUserInjured, FaArrowLeft, FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { BsThreeDotsVertical, BsInbox } from "react-icons/bs";
import { toast } from "react-toastify";

export default function Patients() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    contact: "",
    email: "",
    password: "",
    bloodGroup: "",
    status: "",
    medicalNotes: "",
  });

  const getUserRole = () => {
    return JSON.parse(localStorage.getItem("user"))?.role;
  };

  const fetchPatients = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const res = await API.get("/patients", {
        headers: {
          role: user?.role,
          userid: user?.id,
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

  // Validation
  const validate = () => {
    let newErrors = {};

    if (!form.name) newErrors.name = "Name is required";
    if (!form.age) newErrors.age = "Age is required";
    if (!form.gender) newErrors.gender = "Gender is required";
    if (!form.contact) newErrors.contact = "Contact is required";
    if (!form.bloodGroup) newErrors.bloodGroup = "Blood group is required";
    if (!form.status) newErrors.status = "Status is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create
  const handleCreate = async () => {
    try {
      if (!validate()) return;

      const user = JSON.parse(localStorage.getItem("user"));

      await API.post("/patients", form, {
        headers: { role: user?.role },
      });

      toast.success("Patient created successfully!");
      fetchPatients();
      resetForm();
      setCurrentPage(1); // reset page
    } catch (err) {
      toast.error(err.response?.data?.error || "Error creating patient");
    }
  };

  // Edit
  const handleEdit = (patient) => {
    setForm({
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      contact: patient.contact,
      email: patient.user?.email || "",
      password: "",
      bloodGroup: patient.bloodGroup || "",
      status: patient.status || "",
      medicalNotes: patient.medicalNotes || "",
    });
    setEditingId(patient.id);
  };

  // Update
  const handleUpdate = async () => {
    try {
      if (!validate()) return;

      const user = JSON.parse(localStorage.getItem("user"));

      await API.put(`/patients/${editingId}`, form, {
        headers: { role: user?.role },
      });

      toast.success("Patient updated successfully!");
      fetchPatients();
      resetForm();
      setCurrentPage(1);
    } catch (err) {
      toast.error(err.response?.data?.error || "Error updating patient");
    }
  };

  // Delete
  const handleDelete = (id) => {
    toast(
      ({ closeToast }) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#1e293b" }}>
            Are you sure you want to delete this patient profile?
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
              onClick={async () => {
                closeToast();
                try {
                  const user = JSON.parse(localStorage.getItem("user"));
                  await API.delete(`/patients/${id}`, {
                    headers: { role: user?.role },
                  });

                  toast.success("Patient deleted successfully!");
                  fetchPatients();
                  setCurrentPage(1);
                } catch (err) {
                  toast.error(err.response?.data?.error || "Error deleting patient");
                }
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
              Delete
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

  // Reset Form
  const resetForm = () => {
    setForm({
      name: "",
      age: "",
      gender: "",
      contact: "",
      email: "",
      password: "",
      bloodGroup: "",
      status: "",
      medicalNotes: "",
    });
    setEditingId(null);
    setErrors({});
  };

  return (
    <div className="patients-page">
      {/* Header */}
      <div className="header">
        <div className="header-title-group">
          <button
            className="back-btn"
            onClick={() => navigate(-1)}
            title="Go back"
          >
            <FaArrowLeft />
            <span>Back</span>
          </button>
          <h2>
            <FaUserInjured className="header-icon" />
            <span>Patient Management</span>
          </h2>
        </div>
        <span className="header-badge">{patients.length} Records</span>
      </div>

      {/* Form Panel */}
      <div className="form">
        <div className="form-group">
          <label className="form-label">Patient Name</label>
          <input
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              setErrors({ ...errors, name: "" });
            }}
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Age</label>
          <input
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={(e) => {
              setForm({ ...form, age: e.target.value });
              setErrors({ ...errors, age: "" });
            }}
          />
          {errors.age && <span className="error">{errors.age}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => {
              setForm({ ...form, gender: e.target.value });
              setErrors({ ...errors, gender: "" });
            }}
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.gender && <span className="error">{errors.gender}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Contact Phone</label>
          <input
            placeholder="Contact phone"
            value={form.contact}
            onChange={(e) => {
              setForm({ ...form, contact: e.target.value });
              setErrors({ ...errors, contact: "" });
            }}
          />
          {errors.contact && <span className="error">{errors.contact}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Blood Group</label>
          <select
            value={form.bloodGroup}
            onChange={(e) => {
              setForm({ ...form, bloodGroup: e.target.value });
              setErrors({ ...errors, bloodGroup: "" });
            }}
          >
            <option value="">Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
          {errors.bloodGroup && <span className="error">{errors.bloodGroup}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Clinical Status</label>
          <select
            value={form.status}
            onChange={(e) => {
              setForm({ ...form, status: e.target.value });
              setErrors({ ...errors, status: "" });
            }}
          >
            <option value="">Select Status</option>
            <option value="ACTIVE">Active</option>
            <option value="CRITICAL">Critical</option>
            <option value="DISCHARGED">Discharged</option>
          </select>
          {errors.status && <span className="error">{errors.status}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            placeholder="patient@mail.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Medical Notes</label>
          <input
            placeholder="e.g. Allergy, hypertension history"
            value={form.medicalNotes}
            onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password {editingId && "(Leave blank to keep)"}</label>
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <div className="form-actions-row">
          {editingId ? (
            <>
              <button className="update-btn" onClick={handleUpdate}>
                <FaCheck />
                <span>Save Changes</span>
              </button>
              <button className="cancel-btn" onClick={resetForm}>
                <FaTimes />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <button className="add-btn" onClick={handleCreate}>
              <FaPlus />
              <span>Register Patient</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {patients.length === 0 ? (
          <div className="empty">
            <BsInbox size={28} style={{ marginBottom: "8px", opacity: 0.5 }} />
            <p>No patient records registered</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age / Sex</th>
                  <th>Contact</th>
                  <th>Blood</th>
                  <th>Clinical Status</th>
                  <th>Email</th>
                  <th>Medical Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {currentPatients.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-cell-bold">{p.name}</div>
                    </td>
                    <td>
                      <span>{p.age} yrs • {p.gender}</span>
                    </td>
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
                      <span className="table-cell-muted">{p.user?.email || "—"}</span>
                    </td>
                    <td>
                      <span className="notes-snippet">{p.medicalNotes || "—"}</span>
                    </td>
                    <td>
                      <div className="action-menu">
                        <button className="dots-btn" title="Actions">
                          <BsThreeDotsVertical />
                        </button>

                        <div className="dropdown">
                          <button onClick={() => handleEdit(p)}>
                            <FaEdit /> Edit
                          </button>
                          <button className="delete-opt" onClick={() => handleDelete(p.id)}>
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </div>
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
          </>
        )}
      </div>

      <ChatBox />
    </div>
  );
}