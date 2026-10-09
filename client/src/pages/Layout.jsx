import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "../styles/layout.css";
import "../styles/patientWebsite.css";
import "../styles/doctorWebsite.css";
import { BsHospital, BsCalendar2Check, BsPeople, BsActivity, BsShieldLock, BsFileEarmarkMedical, BsCheckCircleFill } from "react-icons/bs";
import { FaUserMd, FaUserInjured, FaSignOutAlt, FaBell, FaPhoneAlt, FaMapMarkerAlt, FaLock, FaShieldAlt, FaStethoscope } from "react-icons/fa";
import API from "../api";
import ChatBox from "../components/ChatBox";

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

  // Reusable reminder alerts component
  const renderReminderBell = (isWebsite = false) => (
    <div 
      className={isWebsite ? "patient-web-bell" : "notification-bell"}
      title="Alerts"
      onClick={() => {
        const newOpen = !remindersOpen;
        setRemindersOpen(newOpen);
        if (newOpen && reminders.length > 0) {
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
  );

  // ─────────────────────────────────────────────────────────────
  // 1. PATIENT VIEW: PRACTO-STYLE CONSUMER HEALTHCARE WEBSITE
  // ─────────────────────────────────────────────────────────────
  if (user?.role === "patient") {
    return (
      <div className="patient-website-root">
    

        {/* Ultra-Modern Glassmorphic Header & Navbar */}
        <header className="practo-navbar">
          <div className="practo-navbar-container">
            {/* 1. Left: Brand Logo */}
            <div className="practo-brand" onClick={() => navigate("/dashboard")} title="HealthRay Home">
              <div className="practo-brand-icon-box">
                <BsHospital />
                <span className="brand-glow-ring"></span>
              </div>
              <div className="practo-brand-text">
                <div className="practo-brand-title">
                  <span className="brand-main-practo">HealthRay</span>
                  <span className="brand-badge-super">+ CARE</span>
                </div>
                <span className="brand-sub-practo">Modern Healthcare Portal</span>
              </div>
            </div>

            {/* 2. Center Pillar: Clinic Selector & Navigation Capsule */}
            <div className="practo-header-center" style={{ display: "flex", alignItems: "center", gap: "16px", margin: "0 auto" }}>
              <div className="practo-location-pill" onClick={() => navigate("/patient-doctors")} title="HealthRay Main Clinic (In-Clinic & Online)">
                <div className="location-pin-wrap">
                  <FaMapMarkerAlt className="location-icon-pin" />
                  <span className="location-pulse-dot"></span>
                </div>
                <div className="location-text-meta">
                  <span className="location-clinic-name">HealthRay Central Clinic</span>
                  <span className="location-clinic-sub">Online &amp; In-Clinic Available</span>
                </div>
              </div>

              {/* Creative Segmented Nav Capsule */}
              <nav className="practo-nav-menu">
                <NavLink 
                  to="/patient-notes" 
                  className={({ isActive }) => isActive ? "practo-nav-link active" : "practo-nav-link"}
                >
                  <BsFileEarmarkMedical className="nav-icon" />
                  <span>Consultation Notes</span>
                </NavLink>

                <NavLink 
                  to="/patient-profile" 
                  className={({ isActive }) => isActive ? "practo-nav-link active" : "practo-nav-link"}
                >
                  <BsActivity className="nav-icon" />
                  <span>Health Records</span>
                </NavLink>
              </nav>
            </div>

            {/* 3. Right: Header User Controls */}
            <div className="practo-nav-actions">
              {renderReminderBell(true)}

              <div 
                className="practo-user-pill" 
                onClick={() => navigate("/patient-profile")}
                title="View your patient medical records & profile"
              >
                <div className="practo-user-avatar">
                  {user?.name?.[0]?.toUpperCase() || "P"}
                  <span className="user-online-dot"></span>
                </div>
                <div className="practo-user-meta">
                  <span className="practo-user-name">{user?.name || "Patient"}</span>
                  <span className="practo-user-badge">
                    <BsCheckCircleFill className="verified-icon" /> Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="patient-web-main">
          <Outlet />
        </main>

        {/* Practo-Style Consumer Footer */}
        <footer className="practo-footer">
          <div className="practo-footer-container">
            <div className="practo-footer-col">
              <h4>HealthRay Health</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#94a3b8", marginBottom: "16px" }}>
                Leading the transformation of digital healthcare. Connect with verified medical experts, book seamless clinic visits, and keep your health notes organized safely.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px", color: "#cbd5e1" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaLock style={{ color: "#38bdf8", fontSize: "12px" }} /> ISO 27001 &amp; HIPAA Compliant
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaShieldAlt style={{ color: "#10b981", fontSize: "12px" }} /> 256-Bit Encrypted Medical Vault
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaUserMd style={{ color: "#a855f7", fontSize: "13px" }} /> 100% Board-Certified Doctors
                </span>
              </div>
            </div>

            <div className="practo-footer-col">
              <h4>For Patients</h4>
              <ul className="practo-footer-links">
                <li><NavLink to="/dashboard">Search Doctors</NavLink></li>
                <li><NavLink to="/patient-doctors">Book In-Clinic Slots</NavLink></li>
                <li><NavLink to="/patient-notes">Doctor Clinical Notes</NavLink></li>
                <li><NavLink to="/patient-profile">Health Records & EHR</NavLink></li>
              </ul>
            </div>

            <div className="practo-footer-col">
              <h4>Top Specialties</h4>
              <ul className="practo-footer-links">
                <li><span>General Doctor</span></li>
                <li><span>Cardiologist</span></li>
                <li><span>Pediatrician</span></li>
                <li><span>Dermatologist</span></li>
                <li><span>Orthopedist</span></li>
                <li><span>Neurologist</span></li>
              </ul>
            </div>

            <div className="practo-footer-col">
              <h4>More</h4>
              <ul className="practo-footer-links">
                <li><span>Help Center</span></li>
                <li><span>Privacy Policy</span></li>
                <li><span>Terms & Conditions</span></li>
                <li><span>Healthcare Directory</span></li>
              </ul>
            </div>

            <div className="practo-footer-col">
              <h4>24/7 Helpline</h4>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "10px" }}>
                Need emergency assistance or help with doctor bookings?
              </p>
              <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Emergency Desk</div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#14bef0", margin: "2px 0" }}>1800-HEALTH-RAY</div>
                <div style={{ fontSize: "12px", color: "#cbd5e1" }}>care@healthray.com</div>
              </div>
            </div>
          </div>

          <div className="practo-footer-bottom">
            <p>© {new Date().getFullYear()} HealthRay Care Technologies. Practo-inspired compassionate digital care. All rights reserved.</p>
          </div>
        </footer>

        {/* Floating AI Healthcare ChatBot */}
        <ChatBox />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DOCTOR VIEW: PRACTO PRO & NEXOPD HEALTHCARE WEBSITE
  // ─────────────────────────────────────────────────────────────
  if (user?.role === "doctor") {
    return (
      <div className="doctor-website-root">
        {/* Practo Pro & NexOPD-inspired Glassmorphic Header & Navbar */}
        <header className="doctor-navbar">
          <div className="doctor-navbar-container">
            {/* Brand Logo */}
            <div className="doctor-brand" onClick={() => navigate("/dashboard")} title="HealthRay Practice Home">
              <div className="doctor-brand-icon-box">
                <BsHospital />
                <span className="brand-glow-ring"></span>
              </div>
              <div className="doctor-brand-text">
                <div className="doctor-brand-title">
                  <span className="brand-main-practo">HealthRay</span>
                  <span className="brand-badge-doc">DOCTOR PRO</span>
                </div>
                <span className="brand-sub-practo">Clinical OPD &amp; Practice Management</span>
              </div>
            </div>

            {/* Doctor Navigation Menu */}
            <nav className="doctor-nav-menu">
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => isActive ? "doctor-nav-link active" : "doctor-nav-link"}
              >
                <BsActivity className="nav-icon" />
                <span>Practice Home</span>
              </NavLink>

              <NavLink 
                to="/appointments" 
                className={({ isActive }) => isActive ? "doctor-nav-link active" : "doctor-nav-link"}
              >
                <BsCalendar2Check className="nav-icon" />
                <span>Appointments</span>
              </NavLink>

              <NavLink 
                to="/patients-details" 
                className={({ isActive }) => isActive ? "doctor-nav-link active" : "doctor-nav-link"}
              >
                <FaUserInjured className="nav-icon" />
                <span>Patient EHR &amp; Analysis</span>
              </NavLink>
            </nav>

            {/* Right Actions: Reminders Bell, Doctor Profile Pill & Sign Out */}
            <div className="doctor-nav-actions">
              {renderReminderBell(true)}

              <div 
                className="doctor-user-pill" 
                onClick={() => navigate("/doctor-profile")}
                title={`Doctor Practice Profile: Dr. ${user?.name}`}
              >
                <div className="doctor-user-avatar">
                  {user?.name?.[0]?.toUpperCase() || "D"}
                  <span className="user-online-dot"></span>
                </div>
                <div className="doctor-user-meta">
                  <span className="doctor-user-name">Dr. {user?.name || "Doctor"}</span>
                  <span className="doctor-user-badge">
                    <BsCheckCircleFill className="verified-icon" /> Verified Specialist
                  </span>
                </div>
              </div>

              <button className="doctor-logout-btn" onClick={logout} title="Log Out of Portal">
                <FaSignOutAlt />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Viewport for Doctor */}
        <main className="doctor-web-main">
          <Outlet />
        </main>

        {/* Modern Doctor Website Footer */}
        <footer className="doctor-footer">
          <div className="doctor-footer-container">
            <div className="doctor-footer-col">
              <h4>HealthRay Doctor Pro</h4>
              <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#94a3b8", marginBottom: "16px" }}>
                Empowering medical Specialists with smart OPD management, digital EHR records, AI consultation note generation, and seamless patient care workflows.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px", color: "#cbd5e1" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaLock style={{ color: "#38bdf8", fontSize: "12px" }} /> HIPAA &amp; ISO 27001 Certified Clinical Data Standard
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaShieldAlt style={{ color: "#10b981", fontSize: "12px" }} /> 256-Bit Encrypted Electronic Health Records
                </span>
              </div>
            </div>

            <div className="doctor-footer-col">
              <h4>Practice Hub</h4>
              <ul className="doctor-footer-links">
                <li><NavLink to="/dashboard">Practice Overview &amp; KPIs</NavLink></li>
                <li><NavLink to="/appointments">Consultation Schedule &amp; Slots</NavLink></li>
                <li><NavLink to="/patients-details">Patient EHR Directory</NavLink></li>
                <li><NavLink to="/patients-details">AI Clinical SOAP Notes</NavLink></li>
              </ul>
            </div>

            <div className="doctor-footer-col">
              <h4>Clinical Standards</h4>
              <ul className="doctor-footer-links">
                <li><span>OPD Consultation Workflow</span></li>
                <li><span>Tele-medicine Protocols</span></li>
                <li><span>ICD-10 Diagnostic Guidance</span></li>
                <li><span>Prescription Security</span></li>
              </ul>
            </div>

            <div className="doctor-footer-col">
              <h4>Doctor Desk Hotline</h4>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "10px" }}>
                Dedicated technical &amp; clinical support desk for attending doctors.
              </p>
              <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "14px" }}>
                <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Doctor Emergency Line</div>
                <div style={{ fontSize: "16px", fontWeight: "800", color: "#38bdf8", margin: "2px 0" }}>1800-HEALTH-DOC</div>
                <div style={{ fontSize: "12px", color: "#cbd5e1" }}>doctorsupport@healthray.com</div>
              </div>
            </div>
          </div>

          <div className="doctor-footer-bottom">
            <p>© {new Date().getFullYear()} HealthRay Care Technologies. Practo Pro &amp; NexOPD-inspired Doctor Practice Portal. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ADMIN VIEW: DASHBOARD WORKSPACE (UNCHANGED)
  // ─────────────────────────────────────────────────────────────
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
              <NavLink to="/find-clinics" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <BsHospital className="link-icon" />
                <span>Find Clinics by City</span>
              </NavLink>
              <NavLink to="/patient-profile" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <BsShieldLock className="link-icon" />
                <span>My Health Profile</span>
              </NavLink>
              <NavLink to="/patient-doctors" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <FaUserMd className="link-icon" />
                <span>Find & Book Doctor</span>
              </NavLink>
              <NavLink to="/patient-notes" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
                <BsFileEarmarkMedical className="link-icon" />
                <span>Consultation Notes</span>
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
            <span className="topbar-status-indicator">
              <span className="pulse-dot"></span>
              <span>HMS Operational • Clinical Services</span>
            </span>
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