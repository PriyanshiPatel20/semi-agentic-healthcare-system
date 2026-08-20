import { useEffect, useState } from "react";
import API from "../api";
import "../styles/patient.css";
import "../styles/chatbox.css"
import ChatBox from "../components/ChatBox.jsx";
import { useNavigate } from "react-router-dom";

export default function Patients() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [editingId, setEditingId] = useState(null);

  //Pagination state
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

      fetchPatients();
      resetForm();
      setCurrentPage(1); //reset page
    } catch (err) {
      alert("Error creating patient");
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

      await API.put(`/patients/${editingId}`, form, {
        headers: { role: getUserRole() },
      });

      fetchPatients();
      resetForm();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to update patient");
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete?")) return;

    try {
      await API.delete(`/patients/${id}`, {
        headers: { role: getUserRole() },
      });

      fetchPatients();
      setCurrentPage(1);
    } catch (error) {
      alert(error.response?.data?.error || "Failed to delete patient");
    }
  };

  // Reset form
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
        <h2>Patient Management</h2>
        <button
          className="back-btn"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <span>{patients.length} records</span>
      </div>

      {/* Form */}
      <div className="form">
        <div className="form-group">
          <input
            placeholder="Name"
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
          <select
            value={form.gender}
            onChange={(e) => {
              setForm({ ...form, gender: e.target.value });
              setErrors({ ...errors, gender: "" });
            }}
          >
            <option value="">Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {errors.gender && <span className="error">{errors.gender}</span>}
        </div>

        <div className="form-group">
          <input
            placeholder="Contact"
            value={form.contact}
            onChange={(e) => {
              setForm({ ...form, contact: e.target.value });
              setErrors({ ...errors, contact: "" });
            }}
          />
          {errors.contact && <span className="error">{errors.contact}</span>}
        </div>
        <div className="form-group">
          <select
            value={form.bloodGroup}
            onChange={(e) => {
              setForm({ ...form, bloodGroup: e.target.value });
              setErrors({ ...errors, bloodGroup: "" });
            }}
          >
            <option value="">Blood Group</option>
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
          <select
            value={form.status}
            onChange={(e) => {
              setForm({ ...form, status: e.target.value });
              setErrors({ ...errors, status: "" });
            }}
          >
            <option value="">Status</option>
            <option value="ACTIVE">Active</option>
            <option value="CRITICAL">Critical</option>
            <option value="DISCHARGED">Discharged</option>
          </select>
          {errors.status && <span className="error">{errors.status}</span>}
        </div>
        <div className="form-group">
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="form-group">
          <input
            placeholder="Medical Notes"
            value={form.medicalNotes}
            onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        {editingId ? (
          <button onClick={handleUpdate}>Update</button>
        ) : (
          <button onClick={handleCreate}>Add</button>
        )}
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
              <th>Email</th>
              <th>Medical Notes</th>
              <th>Actions</th>
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
                <td>{p.user?.email || "N/A"}</td>
                <td>{p.medicalNotes || "N/A"}</td>
                <td>
                  <div className="action-menu">
                    <span className="dots">⋮</span>

                    <div className="dropdown">
                      <button onClick={() => handleEdit(p)}>Edit</button>
                      <button onClick={() => handleDelete(p.id)}>
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
        <div className="patients-page">
          <ChatBox />
        </div>
      </div>
    </div>
  );

}