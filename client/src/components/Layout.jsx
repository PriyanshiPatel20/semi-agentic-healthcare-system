import { Link, Outlet, useNavigate } from "react-router-dom";
import "../styles/layout.css";

export default function Layout() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="layout">

      {/* SIDEBAR */}
      <div className="sidebar">
        <h2>🏥 Health System</h2>

        <div className="menu">
          <Link to="/dashboard">Dashboard</Link>

          {user?.role === "admin" && (
            <>
              <Link to="/patients">Patients</Link>
              <Link to="/doctors">Doctors</Link>
              <Link to="/appointments">Appointments</Link>
            </>
          )}

          {user?.role === "doctor" && (
            <Link to="/appointments">Appointments</Link>
          )}

          {user?.role === "patient" && (
            <Link to="/appointments">Book Appointment</Link>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="content">

        {/* TOP BAR */}
        <div className="topbar">
          <h1>Welcome, {user?.name}</h1>
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>

        {/* PAGE CONTENT */}
        <Outlet />
      </div>

    </div>
  );
}