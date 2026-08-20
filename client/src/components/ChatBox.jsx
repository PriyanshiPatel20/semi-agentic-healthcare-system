import { useState, useEffect } from "react";
import API from "../api";
import "../styles/chatbox.css";
import { FaComment } from "react-icons/fa";
import { toast } from "react-toastify";

export default function ChatBox() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [activeDoctorId, setActiveDoctorId] = useState(null);

  const sendMessage = async () => {
    if (!message.trim()) return;
    const user = JSON.parse(localStorage.getItem("user"));
    const userMsg = { type: "user", text: message };
    setChat((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await API.post(
        "/chat",
        { message },
        {
          headers: { role: "patient", userid: user.id, },
        }
      );

      const botMsg = {
        type: "bot",
        text: res.data.reply,
        doctor: res.data.doctor,
        askBooking: !!res.data.doctor,
      };

      setChat((prev) => [...prev, botMsg]);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        { type: "bot", text: "Something went wrong..." },
      ]);
    }

    setLoading(false);
  };

  const handleBookFromChat = async (doctorId, date, time) => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) {
        alert("Login first");
        return;
      }

      if (!date) {
        alert("Please select date");
        return;
      }

      if (!time) {
        alert("Please select time");
        return;
      }

      await API.post(
        "/patient-appointments/book",
        {
          doctorId,
          date,
          time,
        },
        {
          headers: {
            role: user.role,
            userid: user.id,
          },
        }
      );

      toast.success("Appointment booked successfully!");
      setChat((prev) => [
        ...prev,
        { type: "bot", text: " Appointment booked successfully!" },
      ]);

      // sync with doctor page
      window.dispatchEvent(
        new CustomEvent("appointmentBooked", { detail: doctorId })
      );

      setActiveDoctorId(null);
      setSelectedDate("");
      setSelectedTime("");
    } catch (err) {
      const errMsg =
        err.response?.data?.error || "Booking failed. Please try again.";
      toast.error(errMsg);
    }
  };
  const fetchChats = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;

      const res = await API.get("/chat", {
        headers: {
          role: "patient",
          userid: user.id,
        },
      });

      const formattedChats = [];

      res.data.reverse().forEach((c) => {
        formattedChats.push({
          type: "user",
          text: c.message,
        });

        formattedChats.push({
          type: "bot",
          text: c.reply,
        });
      });

      setChat(formattedChats);
    } catch (err) {
      console.log(err);
    }
  };

  const clearChatHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your chat history?")) return;
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;

      await API.delete("/chat", {
        headers: {
          role: "patient",
          userid: user.id,
        },
      });
      setChat([]);
      toast.success("Chat history cleared! ");
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear chat history.");
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  return (
    <>
      {/* Floating Chat Icon */}
      <div className="chat-icon" onClick={() => setIsOpen(!isOpen)}>
        
  <FaComment />
      </div>

      {/* Chatbox */}
      {isOpen && (
        <div className="chatbox">
          <div className="doctor-ai-header">
            <span>AI Assistant</span>
            {chat.length > 0 && (
              <button className="clear-chat-btn" onClick={clearChatHistory}>Clear Chat</button>
            )}
          </div>
          <div className="messages">
            {chat.map((c, i) => (
              <div key={i} className={`msg ${c.type}`}>
                <p>{c.text}</p>

                {c.type === "bot" && c.doctor && (
                  <div className="doctor-card">
                    <strong>Suggested Doctor:</strong>
                    <p>Name: {c.doctor.name}</p>
                    <p>Specialty: {c.doctor.specialty}</p>
                    <p>Mobile: {c.doctor.mobile}</p>
                    <p>Experience: {c.doctor.experience}</p>

                    {c.askBooking && (
                      <div className="booking-actions">
                        <p className="booking-text">Do you want to book appointment?</p>

                        <div className="booking-buttons">
                          <button
                            className="btn-yes"
                            onClick={() => setActiveDoctorId(c.doctor.id)}
                          >
                            Yes
                          </button>

                          <button
                            className="btn-no"
                            onClick={() => {
                              setActiveDoctorId(null);
                              setChat((prev) => [
                                ...prev,
                                { type: "bot", text: "Okay " },
                              ]);
                            }}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}

                    {/*  DATE + TIME PICKER */}
                    {activeDoctorId === c.doctor.id && (
                      <div className="date-picker">
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) =>
                            setSelectedDate(e.target.value)
                          }
                        />

                        <input
                          type="time"
                          value={selectedTime}
                          onChange={(e) =>
                            setSelectedTime(e.target.value)
                          }
                        />

                        <button
                          onClick={() =>
                            handleBookFromChat(
                              c.doctor.id,
                              selectedDate,
                              selectedTime
                            )
                          }
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && <div className="msg bot">Typing...</div>}
          </div>

          <div className="input-area">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your symptoms..."
              onKeyDown={(e) =>
                e.key === "Enter" && sendMessage()
              }
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}