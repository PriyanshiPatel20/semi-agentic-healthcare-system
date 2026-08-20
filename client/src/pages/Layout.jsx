import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../styles/layout.css";
import { BsHospital, BsCalendar2Check, BsPeople, BsActivity, BsShieldLock } from "react-icons/bs";
import { FaUserMd, FaUserInjured, FaSignOutAlt, FaBell } from "react-icons/fa";
import API from "../api";

export default function Layout() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [seenReminderIds, setSeenReminderIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`seenReminders_${user?.id}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (!user || (user.role !== "patient" && user.role !== "doctor")) return;

    const fetchReminders = async () => {
      try {
        const endpoint = user.role === "patient" ? "/reminders/patient-reminders" : "/reminders/doctor-reminders";
        const res = await API.get(endpoint, {
          headers: {
            role: user.role,
            userid: user.id,
          },
        });
        setReminders(res.data);
      } catch (error) {
        console.error("Failed to fetch reminders in layout:", error);
      }
    };

    fetchReminders();
    const interval = setInterval(fetchReminders, 15000);
    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="clinic-workspace">
      
      {/* ── LEFT CLINIC SIDEBAR ── */}
      <aside className="clinic-sidebar">
        {/* Brand Logo */}
        <div className="sidebar-brand" onClick={() => navigate("/dashboard")}>
          <div className="brand-icon-box">
            <BsHospital />
          </div>
          <div className="brand-name-box">
            <span className="brand-company">HealthRay</span>
            <span className="brand-dept">HMS Portal</span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-group-label">General</div>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
            <BsActivity className="link-icon" />
            <span>Workspace</span>
          </NavLink>

          {user?.role === "admin" && (
            <>
              <div className="nav-group-label">Management</div>
              <NavLink to="/patients" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <FaUserInjured className="link-icon" />
                <span>Patients Directory</span>
              </NavLink>
              <NavLink to="/doctors" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <FaUserMd className="link-icon" />
                <span>Medical Staff</span>
              </NavLink>
              <NavLink to="/appointments" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <BsCalendar2Check className="link-icon" />
                <span>Appointments</span>
              </NavLink>
              <NavLink to="/patients-details" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <BsPeople className="link-icon" />
                <span>Analysis</span>
              </NavLink>
            </>
          )}

          {user?.role === "doctor" && (
            <>
              <div className="nav-group-label">Clinical</div>
              <NavLink to="/appointments" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <BsCalendar2Check className="link-icon" />
                <span>Schedule Calendar</span>
              </NavLink>
              <NavLink to="/patients-details" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <FaUserInjured className="link-icon" />
                <span>My Patient List</span>
              </NavLink>
            </>
          )}

          {user?.role === "patient" && (
            <>
              <div className="nav-group-label">Patient Desk</div>
              <NavLink to="/patient-profile" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <BsShieldLock className="link-icon" />
                <span>My Health Profile</span>
              </NavLink>
              <NavLink to="/patient-doctors" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <FaUserMd className="link-icon" />
                <span>Find & Book Doctor</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Sidebar User Profile Footer */}
        <div className="sidebar-profile-footer">
          <div className="user-profile-summary">
            <div className="user-avatar-initial">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="user-profile-meta">
              <span className="user-profile-name">{user?.name || "User"}</span>
              <span className="user-profile-role">{user?.role}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── RIGHT VIEWPORT ── */}
      <div className="clinic-viewport">
        
        {/* Top Header Bar */}
        <header className="clinic-topbar">
          <div className="topbar-search-bar">
            <span className="topbar-status-indicator">HMS Operational</span>
          </div>

          <div className="topbar-actions">
            {(user?.role === "patient" || user?.role === "doctor") && (
              <div 
                className="notification-bell" 
                title="Alerts"
                onClick={() => {
                  const newOpen = !remindersOpen;
                  setRemindersOpen(newOpen);
                  if (newOpen && reminders.length > 0) {
                    // Mark all current reminders as seen
                    const allIds = reminders.map((r) => r.id);
                    const updatedSeen = new Set([...seenReminderIds, ...allIds]);
                    setSeenReminderIds(updatedSeen);
                    localStorage.setItem(
                      `seenReminders_${user?.id}`,
                      JSON.stringify([...updatedSeen])
                    );
                  }
                }}
              >
                <FaBell />
                {reminders.filter((r) => !seenReminderIds.has(r.id)).length > 0 && (
                  <span className="notification-badge">
                    {reminders.filter((r) => !seenReminderIds.has(r.id)).length}
                  </span>
                )}
                
                {remindersOpen && (
                  <div className="layout-reminders-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="dropdown-header">
                      <h3>Reminders</h3>
                      {reminders.filter((r) => !seenReminderIds.has(r.id)).length > 0 && (
                        <span className="count-badge">
                          {reminders.filter((r) => !seenReminderIds.has(r.id)).length} New
                        </span>
                      )}
                    </div>
                    <div className="dropdown-body">
                      {reminders.length === 0 ? (
                        <div className="no-reminders">No new reminders</div>
                      ) : (
                        reminders.map((rem) => (
                          <div key={rem.id} className="dropdown-item">
                            <div className="item-icon"><FaBell size={13} /></div>
                            <div className="item-content">
                              <p className="item-message">{rem.message}</p>
                              <span className="item-meta">
                                {user.role === "patient" 
                                  ? `Doctor: ${rem.appointment?.doctor?.name || "N/A"}`
                                  : `Patient: ${rem.appointment?.patient?.name || "N/A"}`}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button className="topbar-logout-btn" onClick={logout}>
              <FaSignOutAlt />
              <span>Log out</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="clinic-main-content">
          <Outlet />
        </main>
      </div>

    </div>
  );
}