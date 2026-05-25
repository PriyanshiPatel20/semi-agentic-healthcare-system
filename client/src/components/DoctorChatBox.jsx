import { useState, useEffect } from "react";
import API from "../api";
import "../styles/chatbox.css";
import ReactMarkdown from "react-markdown";
import { FaSave, FaFilePdf } from "react-icons/fa";
import { FaUserDoctor } from "react-icons/fa6";

export default function DoctorChatBox({ patient }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // =========================
  // FETCH OLD CHATS
  // =========================

  const fetchDoctorChats = async () => {
    try {
      if (!patient?.id) return;

      const user = JSON.parse(localStorage.getItem("user"));

      const res = await API.get(
        `/chat/doctor?patientId=${patient.id}`,
        {
          headers: {
            role: "doctor",
            userid: user.id,
          },
        }
      );

      const formattedChats = [];

      res.data.forEach((c) => {
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

      // AUTO ANALYZE FIRST TIME
      if (res.data.length === 0) {
        autoAnalyzePatient();
      }

    } catch (err) {
      console.log(err);
    }
  };

  // =========================
  // SEND MESSAGE
  // =========================

  const sendMessage = async () => {
    if (!message.trim()) return;

    const user = JSON.parse(localStorage.getItem("user"));

    const currentMessage = message;

    // INSTANT UI UPDATE
    setChat((prev) => [
      ...prev,
      {
        type: "user",
        text: currentMessage,
      },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const res = await API.post(
        "/chat/doctor",
        {
          message: currentMessage,
          patient,
        },
        {
          headers: {
            role: "doctor",
            userid: user.id,
          },
        }
      );

      setChat((prev) => [
        ...prev,
        {
          type: "bot",
          text: res.data.reply,
        },
      ]);

    } catch (err) {
      console.log(err);

      setChat((prev) => [
        ...prev,
        {
          type: "bot",
          text: "AI failed...",
        },
      ]);
    }

    setLoading(false);
  };

  // =========================
  // AUTO PATIENT ANALYSIS
  // =========================

  const autoAnalyzePatient = async () => {
    if (!patient?.id) return;

    const user = JSON.parse(localStorage.getItem("user"));

    setLoading(true);

    setChat((prev) => [
      ...prev,
      {
        type: "user",
        text: `Analyze patient: ${patient.name}`,
      },
    ]);

    try {
      const res = await API.post(
        "/chat/doctor",
        {
          message: `
Provide a professional clinical assessment for this patient.
Include observations, preventive advice, risk evaluation, and follow-up recommendations.
Avoid mentioning missing information.
`,
          patient,
        },
        {
          headers: {
            role: "doctor",
            userid: user.id,
          },
        }
      );

      setChat((prev) => [
        ...prev,
        {
          type: "bot",
          text: res.data.reply,
        },
      ]);

    } catch (err) {
      console.log(err);

      setChat((prev) => [
        ...prev,
        {
          type: "bot",
          text: "AI analysis failed...",
        },
      ]);
    }

    setLoading(false);
  };

  // =========================
  // SAVE MEDICAL RECORD
  // =========================

  const saveMedicalRecord = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      await API.post(
        "/chat/doctor/PDF-report",
        { patient },
        {
          headers: {
            role: "doctor",
            userid: user.id,
          },
        }
      );

      alert("Medical Record Saved");

    } catch (err) {
      console.log(err);

      alert("Failed to save medical record");
    }
  };

  // =========================
  // GENERATE PDF REPORT
  // =========================

  const generateReport = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));

      // STEP 1: GET AI REPORT
      const reportRes = await API.post(
        "/chat/doctor/PDF-report",
        { patient },
        {
          headers: {
            role: "doctor",
            userid: user.id,
          },
        }
      );

      // STEP 2: ADD PATIENT INFO
      const report = {
        ...reportRes.data,

        patientName: patient.name,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup,
        status: patient.status,
      };

      // STEP 3: GENERATE PDF
      const pdfRes = await API.post(
        "/medical-records/doctor/report/pdf",
        report,
        {
          responseType: "blob",
        }
      );

      // STEP 4: DOWNLOAD PDF
      const url = window.URL.createObjectURL(
        new Blob([pdfRes.data])
      );

      const link = document.createElement("a");

      link.href = url;

      link.setAttribute(
        "download",
        `medical-report-${patient.name}.pdf`
      );

      document.body.appendChild(link);

      link.click();

      link.remove();

    } catch (err) {
      console.log(err);

      alert("Failed to generate PDF report");
    }
  };

  // =========================
  // LOAD CHATS
  // =========================

  useEffect(() => {
    if (patient?.id) {
      setIsOpen(true);

      fetchDoctorChats();
    }
  }, [patient?.id]);

  return (
    <>
      {/* FLOATING ICON */}

      <div
        className="chat-icon"
        onClick={() => setIsOpen(!isOpen)}
      >
          <FaUserDoctor />
      </div>

      {/* CHATBOX */}

      {isOpen && (
        <div className="chatbox">

          {/* HEADER */}

          <div className="doctor-ai-header">
            Doctor AI Assistant
          </div>

          {/* ACTION BUTTONS */}

          <div className="action-buttons">
            <button
              className="action-btn save-btn"
              onClick={saveMedicalRecord}
            >
              <FaSave /> Save Record
            </button>

            <button
              className="action-btn pdf-btn"
              onClick={generateReport}
            >
              <FaFilePdf /> Save PDF

            </button>
          </div>

          {/* MESSAGES */}

          <div className="messages">
            {chat.map((c, i) => (
              <div
                key={i}
                className={`msg ${c.type}`}
              >
                <ReactMarkdown>
                  {c.text}
                </ReactMarkdown>
              </div>
            ))}

            {loading && (
              <div className="msg bot">
                Analyzing patient...
              </div>
            )}
          </div>

          {/* INPUT AREA */}

          <div className="input-area">
            <input
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              placeholder="Ask AI about patient..."
              onKeyDown={(e) =>
                e.key === "Enter" && sendMessage()
              }
            />

            <button onClick={sendMessage}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}