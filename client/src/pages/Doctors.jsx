import { useEffect, useState } from "react";
import API from "../api";
import "../styles/doctor.css";
import { useNavigate } from "react-router-dom";
import { FaUserMd, FaArrowLeft, FaEdit, FaTrash, FaPlus, FaCheck, FaTimes, FaPhone, FaEnvelope, FaBriefcase, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { BsThreeDotsVertical, BsHospital, BsInbox } from "react-icons/bs";
import { toast } from "react-toastify";

export default function Doctors() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  const [form, setForm] = useState({
    name: "",
    specialty: "",
    experience: "",
    mobile: "",
    email: "",
    password: "",
  });

  const getUserRole = () => {
    return JSON.parse(localStorage.getItem("user"))?.role;
  };

  const fetchDoctors = async () => {
    try {
      const res = await API.get("/doctors");
      setDoctors(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  // Pagination logic
  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentDoctors = doctors.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(doctors.length / recordsPerPage);

  // Validation
  const validate = () => {
    let newErrors = {};

    if (!form.name) newErrors.name = "Name is required";
    if (!form.specialty) newErrors.specialty = "Specialty is required";
    if (!form.experience) newErrors.experience = "Experience is required";
    if (!form.mobile) newErrors.mobile = "Mobile is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create
  const handleCreate = async () => {
    try {
      if (!validate()) return;

      await API.post("/doctors", form, {
        headers: { role: getUserRole() },
      });

      toast.success("Doctor created successfully!");
      fetchDoctors();
      resetForm();
      setCurrentPage(1); // reset page
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create doctor");
    }
  };

  // Edit
  const handleEdit = (doctor) => {
    setForm({
      name: doctor.name,
      specialty: doctor.specialty,
      experience: doctor.experience,
      mobile: doctor.mobile,
      email: doctor.user?.email || "",
    });
    setEditingId(doctor.id);
  };

  // Update
  const handleUpdate = async () => {
    try {
      if (!validate()) return;

      await API.put(`/doctors/${editingId}`, form, {
        headers: { role: getUserRole() },
      });

      toast.success("Doctor updated successfully!");
      fetchDoctors();
      resetForm();
      setCurrentPage(1);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update doctor");
    }
  };

  // Delete
  const handleDelete = (id) => {
    toast(
      ({ closeToast }) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#1e293b" }}>
            Are you sure you want to delete this Doctor profile?
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
                  await API.delete(`/doctors/${id}`, {
                    headers: { role: getUserRole() },
                  });

                  toast.success("Doctor deleted successfully!");
                  fetchDoctors();
                  setCurrentPage(1);
                } catch (error) {
                  toast.error(error.response?.data?.error || "Failed to delete doctor");
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
      specialty: "",
      experience: "",
      mobile: "",
      email: "",
      password: "",
    });
    setEditingId(null);
    setErrors({});
  };

  return (
    <div className="doctor-page">
      {/* Header */}
      <div className="header">
        <div className="header-title-group">
          <button className="back-btn" onClick={() => navigate(-1)} title="Go back">
            <FaArrowLeft />
            <span>Back</span>
          </button>
          <h2>
            <FaUserMd className="header-icon" />
            <span>Medical Staff Management</span>
          </h2>
        </div>
        <span className="header-badge">{doctors.length} Records</span>
      </div>

      {/* Form Panel */}
      <div className="form">
        <div className="form-group">
          <label className="form-label">Doctor Full Name</label>
          <input
            placeholder="Dr. Full Name"
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              setErrors({ ...errors, name: "" });
            }}
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Medical Specialty</label>
          <input
            placeholder="e.g. Cardiology, Neurology"
            value={form.specialty}
            onChange={(e) => {
              setForm({ ...form, specialty: e.target.value });
              setErrors({ ...errors, specialty: "" });
            }}
          />
          {errors.specialty && (
            <span className="error">{errors.specialty}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Experience (Years)</label>
          <input
            placeholder="Years of practice"
            value={form.experience}
            onChange={(e) => {
              setForm({ ...form, experience: e.target.value });
              setErrors({ ...errors, experience: "" });
            }}
          />
          {errors.experience && (
            <span className="error">{errors.experience}</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Official Email</label>
          <input
            placeholder="doctor@hospital.org"
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              setErrors({ ...errors, email: "" });
            }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password {editingId && "(Leave blank to keep current)"}</label>
          <input
            type="password"
            placeholder="Secure password"
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              setErrors({ ...errors, password: "" });
            }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Direct Mobile</label>
          <input
            placeholder="3425678904"
            value={form.mobile}
            onChange={(e) => {
              setForm({ ...form, mobile: e.target.value });
              setErrors({ ...errors, mobile: "" });
            }}
          />
          {errors.mobile && (
            <span className="error">{errors.mobile}</span>
          )}
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
              <span>Add Doctor</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {doctors.length === 0 ? (
          <div className="empty">
            <BsInbox size={28} style={{ marginBottom: "8px", opacity: 0.5 }} />
            <p>No Doctor profiles recorded</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Clinical Specialty</th>
                  <th>Experience</th>
                  <th>Contact Mobile</th>
                  <th>Email Address</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {currentDoctors.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="table-cell-bold">{d.name}</div>
                    </td>
                    <td>
                      <span className="doctor-specialty-chip">{d.specialty}</span>
                    </td>
                    <td>
                      <span className="experience-badge">{d.experience} Years</span>
                    </td>
                    <td>
                      <span className="table-cell-muted">{d.mobile || "—"}</span>
                    </td>
                    <td>
                      <span className="table-cell-muted">{d.user?.email || "—"}</span>
                    </td>
                    <td>
                      <div className="action-menu">
                        <button className="dots-btn" title="Actions">
                          <BsThreeDotsVertical />
                        </button>

                        <div className="dropdown">
                          <button onClick={() => handleEdit(d)}>
                            <FaEdit /> Edit
                          </button>
                          <button className="delete-opt" onClick={() => handleDelete(d.id)}>
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
    </div>
  );
}