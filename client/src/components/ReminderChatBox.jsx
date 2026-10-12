import { useEffect, useState } from "react";
import API from "../api";
import "../styles/reminderChat.css";
import { FaBell } from "react-icons/fa";

export default function ReminderChatBox() {

  const [open, setOpen] = useState(false);

  const [reminders, setReminders] = useState([]);

  const fetchReminders = async () => {

    try {

      const user =
        JSON.parse(localStorage.getItem("user"));

      const res = await API.get(
        "/reminders/patient-reminders",
        {
          headers: {
            role: user.role,
            userid: user.id,
          },
        }
      );

      setReminders(res.data);

    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/reminders/${id}`);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Failed to delete reminder", error);
    }
  };

  useEffect(() => {
    fetchReminders();

    const interval = setInterval(() => {
      fetchReminders();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div
        className="reminder-icon"
        onClick={() => setOpen(!open)}
      >
        <FaBell />
      </div>

      {open && (
        <div className="reminder-chatbox">
          <div className="reminder-header">
            Appointment Reminders
          </div>

          <div className="reminder-messages">
            {reminders.length === 0 ? (
              <p>No reminders today</p>
            ) : (
              reminders.map((r) => (
                <div
                  key={r.id}
                  className="reminder-card"
                  style={{ position: "relative" }}
                >
                  <button
                    onClick={() => handleDelete(r.id)}
                    title="Delete reminder"
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "8px",
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      fontSize: "14px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.target.style.color = "#ef4444")}
                    onMouseLeave={(e) => (e.target.style.color = "#94a3b8")}
                  >
                    ×
                  </button>

                  <p style={{ paddingRight: "16px" }}>{r.message}</p>

                  <small>
                    Doctor: {r.appointment?.doctor?.name}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}