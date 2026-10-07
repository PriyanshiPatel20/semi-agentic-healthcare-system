import { useEffect, useState } from "react";
import API from "../api";
import "../styles/appointment.css";
import { useNavigate } from "react-router-dom";
import { BsCalendar2Check, BsCalendarCheck, BsClock, BsInbox } from "react-icons/bs";
import { FaArrowLeft, FaChevronLeft, FaChevronRight, FaUserMd, FaUserInjured } from "react-icons/fa";
import { toast } from "react-toastify";

export default function Appointments() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (user?.role === "patient") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

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
    time: "",
  });

  const fetchPatients = async () => {
    try {
      if (!user) return;

      if (user.role === "patient") {
        const res = await API.get("/patients/profile", {
          headers: {
            role: user.role,
            userid: user.id,
          },
        });
        setForm((prev) => ({ ...prev, patientId: res.data.id }));
      } else {
        const res = await API.get("/patients", {
          headers: {
            role: user.role,
            userid: user.id,
          },
        });
        setPatients(res.data);
      }
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
      if (!user) return;

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
    if (!form.time) newErrors.time = "Time is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    try {
      if (!validate()) return;

      if (!user) {
        toast.warning("Please login first");
        return;
      }

      await API.post("/appointments", form, {
        headers: { role: user.role },
      });

      toast.success("Appointment booked successfully!");
      fetchAppointments();
      setForm({
        patientId: user.role === "patient" ? form.patientId : "",
        doctorId: "",
        date: "",
        time: "",
      });
      setErrors({});
    } catch (error) {
      console.log("CREATE APPOINTMENT ERROR:", error);
      toast.error(error.response?.data?.error || "Failed to book appointment");
    }
  };

  return (
    <div className="appointment-page">
      {/* Header */}
      <div className="header">
        <div className="header-title-group">
          <button className="back-btn" onClick={() => navigate(-1)} title="Go back">
            <FaArrowLeft />
            <span>Back</span>
          </button>
          <h2>
            <BsCalendar2Check className="header-icon" />
            <span>Appointment Management</span>
          </h2>
        </div>
        <span className="header-badge">Page {page} of {totalPages || 1}</span>
      </div>

      {/* Booking Form Panel */}
      <div className="form">
        {user?.role !== "patient" && (
          <div className="form-group">
            <label className="form-label">
              <FaUserInjured className="label-icon" /> Select Patient
            </label>
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
        )}

        <div className="form-group">
          <label className="form-label">
            <FaUserMd className="label-icon" /> Attending Doctor
          </label>
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
          <label className="form-label">
            <BsCalendarCheck className="label-icon" /> Consultation Date
          </label>
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

        <div className="form-group">
          <label className="form-label">
            <BsClock className="label-icon" /> Time Slot
          </label>
          <input
            type="time"
            value={form.time}
            onChange={(e) => {
              setForm({ ...form, time: e.target.value });
              setErrors({ ...errors, time: "" });
            }}
          />
          {errors.time && <span className="error">{errors.time}</span>}
        </div>

        <button className="book-btn" onClick={handleCreate}>
          <BsCalendarCheck />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {appointments.length === 0 ? (
          <div className="empty">
            <BsInbox size={28} style={{ marginBottom: "8px", opacity: 0.5 }} />
            <p>No appointments recorded for this criteria</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {user?.role !== "patient" && <th>Patient</th>}
                {user?.role !== "patient" && <th>Contact Email</th>}
                <th>Attending Doctor</th>
                <th>Scheduled Date</th>
                <th>Time Slot</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  {user?.role !== "patient" && (
                    <td>
                      <div className="table-cell-bold">{a.patient?.name || "N/A"}</div>
                    </td>
                  )}
                  {user?.role !== "patient" && (
                    <td>
                      <span className="table-cell-muted">{a.patient?.user?.email || "—"}</span>
                    </td>
                  )}
                  <td>
                    <div className="table-cell-bold">{a.doctor?.name}</div>
                    <span className="doctor-specialty-chip">{a.doctor?.specialty}</span>
                  </td>
                  <td>{new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td>{a.time || "—"}</td>
                  <td>
                    <span className="status status-scheduled">
                      <span className="status-dot"></span>
                      Scheduled
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          <FaChevronLeft />
          <span>Prev</span>
        </button>

        <span className="pagination-page-indicator">Page {page} of {totalPages || 1}</span>

        <button
          disabled={page === totalPages || totalPages === 0}
          onClick={() => setPage(page + 1)}
        >
          <span>Next</span>
          <FaChevronRight />
        </button>
      </div>
    </div>
  );
}