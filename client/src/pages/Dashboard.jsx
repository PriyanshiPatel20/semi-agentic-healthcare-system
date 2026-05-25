import "../styles/dashboard.css";
import { FaUserInjured, FaUserMd, FaCalendarCheck, FaUserCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };
  const cards = {
    admin: [
      { title: "Patients", icon: <FaUserInjured />, link: "/patients", desc: "Manage patient records" },
      { title: "Doctors", icon: <FaUserMd />, link: "/doctors", desc: "Manage doctor profiles" },
      { title: "Appointments", icon: <FaCalendarCheck />, link: "/appointments", desc: "Track all bookings" },
      { title: "Patients-Analysis", icon: <FaUserInjured />, link: "/patients-details", desc: "Analyze patient data" },
    ],
    doctor: [
      { title: "Appointments", icon: <FaCalendarCheck />, link: "/appointments", desc: "View your schedule" },
      { title: "Patients", icon: <FaUserInjured />, link: "/patients-details", desc: "Manage patient records" },

    ],
    patient: [
     
      { title: "My Profile",icon: <FaUserCircle />,link: "/patient-profile",desc: "View your profile details"},
       { title: "Book Appointment", icon: <FaCalendarCheck />, link: "/patient-doctors", desc: "Find and book doctors" }
    ]
  };

  return (
    <div className="dashboard">
      <header className="dashboard-top">
        <div>
          <h3>Hello, {user?.name || "User"}</h3>
          <p className="role">{user?.role}</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <section className="cards">
        {cards[user?.role]?.map((item, index) => (
          <a key={index} href={item.link} className="card">
            <div className="icon">{item.icon}</div>
            <div className="card-content">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          </a>
        ))}
      </section>
    </div>
  );
}