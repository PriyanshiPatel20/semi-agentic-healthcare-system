import { useEffect, useState } from "react";
import API from "../api";
import "../styles/reminderChat.css";
import { FaBell } from "react-icons/fa";

export default function ReminderChatBox() {

  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState([]);

  const fetchReminders = async () => {

    try {

      const user = JSON.parse(localStorage.getItem("user"));

      const res = await API.get(
        "/reminders/my-reminders",
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
                >
                  <p>{r.message}</p>

                  <small>
                    Doctor: {r.appointment.doctor.name}
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