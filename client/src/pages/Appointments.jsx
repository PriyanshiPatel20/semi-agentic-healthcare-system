import { useEffect, useState } from "react";
import API from "../api";
import "../styles/appointment.css";
import { useNavigate } from "react-router-dom";

export default function Appointments() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [appointments, setAppointments] = useState([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;

  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    date: "",
  });

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
      console.log(error);
    }
  };

  const fetchDoctors = async () => {
    const res = await API.get("/doctors");
    setDoctors(res.data);
  };

  const fetchAppointments = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const res = await API.get(
        `/appointments?page=${page}&limit=${limit}`,
        {
          headers: {
            role: user.role,
            userid: user.id,
          },
        }
      );

      setAppointments(res.data.data);
      setTotalPages(res.data.totalPages);

    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchAppointments(); // refetch when page changes
  }, [page]);

  const validate = () => {
    let newErrors = {};

    if (!form.patientId) newErrors.patientId = "Patient is required";
    if (!form.doctorId) newErrors.doctorId = "Doctor is required";
    if (!form.date) newErrors.date = "Date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    try {
      if (!validate()) return;

      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        alert("Please login first");
        return;
      }

      await API.post("/appointments", form, {
        headers: { role: user.role },
      });

      fetchAppointments();
      setForm({ patientId: "", doctorId: "", date: "" });
      setErrors({});
    } catch (error) {
      console.log("CREATE APPOINTMENT ERROR:", error);
      alert(error.response?.data?.error || "Failed to book appointment");
    }
  };

  return (
    <div className="appointment-page">
      {/* Header */}
      <div className="header">
        <h2>Appointment Management</h2>
         <button
      className="back-btn"
      onClick={() => navigate(-1)}
    >
       Back
    </button>
        <span>Page {page} of {totalPages}</span>
      </div>

      {/* Form */}
      <div className="form">
        <div className="form-group">
          <select
            value={form.patientId}
            onChange={(e) => {
              setForm({ ...form, patientId: e.target.value });
              setErrors({ ...errors, patientId: "" });
            }}
          >
            <option value="">Select Patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.patientId && <span className="error">{errors.patientId}</span>}
        </div>

        <div className="form-group">
          <select
            value={form.doctorId}
            onChange={(e) => {
              setForm({ ...form, doctorId: e.target.value });
              setErrors({ ...errors, doctorId: "" });
            }}
          >
            <option value="">Select Doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.specialty})
              </option>
            ))}
          </select>
          {errors.doctorId && <span className="error">{errors.doctorId}</span>}
        </div>

        <div className="form-group">
          <input
            type="date"
            value={form.date}
            onChange={(e) => {
              setForm({ ...form, date: e.target.value });
              setErrors({ ...errors, date: "" });
            }}
          />
          {errors.date && <span className="error">{errors.date}</span>}
        </div>

        <button onClick={handleCreate}>Book</button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {appointments.length === 0 ? (
          <div className="empty">No appointments found</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Email</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>{a.patient?.name}</td>
                  <td>{a.patient?.user?.email}</td>
                  <td>
                    {a.doctor?.name} ({a.doctor?.specialty})
                  </td>
                  <td>{new Date(a.date).toDateString()}</td>
                  <td>
                    <span className="status">Scheduled</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/*  Pagination Controls */}
      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Prev
        </button>

        <span>{page}</span>

        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}