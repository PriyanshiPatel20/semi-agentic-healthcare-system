import { useEffect, useState } from "react";
import API from "../api";
import "../styles/doctor.css";
import { useNavigate } from "react-router-dom";

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

  //  Pagination logic
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

      fetchDoctors();
      resetForm();
      setCurrentPage(1); // reset page
    } catch (error) {
      alert(error.response?.data?.error || "Failed to create doctor");
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

      fetchDoctors();
      resetForm();
      setCurrentPage(1);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to update doctor");
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;

    try {
      await API.delete(`/doctors/${id}`, {
        headers: { role: getUserRole() },
      });

      fetchDoctors();
      setCurrentPage(1);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to delete doctor");
    }
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
        <h2>Doctor Management</h2>
        <button
      className="back-btn"
      onClick={() => navigate(-1)}
    >
       Back
    </button>
        <span>{doctors.length} records</span>
      </div>

      {/* Form */}
      <div className="form">
        <div className="form-group">
          <input
            placeholder="Doctor Name"
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              setErrors({ ...errors, name: "" });
            }}
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <input
            placeholder="Specialty"
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
          <input
            placeholder="Experience (years)"
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
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => {
              setForm({ ...form, email: e.target.value });
              setErrors({ ...errors, email: "" });
            }}
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => {
              setForm({ ...form, password: e.target.value });
              setErrors({ ...errors, password: "" });
            }}
          />
        </div>

        <div className="form-group">
          <input
            placeholder="Mobile"
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

        {editingId ? (
          <button onClick={handleUpdate}>Update</button>
        ) : (
          <button onClick={handleCreate}>Add</button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {doctors.length === 0 ? (
          <div className="empty">No doctors found</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Specialty</th>
                  <th>Experience</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {currentDoctors.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{d.specialty}</td>
                    <td>{d.experience}</td>
                    <td>{d.mobile}</td>
                    <td>{d.user?.email}</td>
                    <td>
                      <div className="action-menu">
                        <span className="dots">⋮</span>

                        <div className="dropdown">
                          <button onClick={() => handleEdit(d)}>Edit</button>
                          <button onClick={() => handleDelete(d.id)}>
                            Delete
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
          </>
        )}
      </div>
    </div>
  );
}