import { useEffect, useState } from "react";
import API from "../api";
import "../styles/patientDoctors.css";
import ChatBox from "../components/ChatBox";
import ReminderChatBox from "../components/ReminderChatBox";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useNavigate } from "react-router-dom";

export default function PatientDoctors() {

  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);

  const [bookedDoctors, setBookedDoctors] = useState([]);

  const [selectedDates, setSelectedDates] = useState({});

  const [selectedTimes, setSelectedTimes] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const doctorsPerPage = 5;

  const user = JSON.parse(localStorage.getItem("user"));

  // FETCH DOCTORS
  const fetchDoctors = async () => {

    try {

      const res = await API.get("/doctors");

      setDoctors(res.data);

    } catch (error) {

      console.log(error);

    }
  };

  // FETCH BOOKED APPOINTMENTS
  const fetchBookedDoctores = async () => {

    try {

      if (!user) return;

      const res = await API.get(
        "/patient-appointments/my",
        {
          headers: {
            role: user.role,
            userid: user.id,
          },
        }
      );

      setBookedDoctors(res.data);

    } catch (error) {

      console.log(error);

    }
  };

  useEffect(() => {

    fetchDoctors();

    fetchBookedDoctores();

    const handleAppointmentBooked = () => {

      fetchBookedDoctores();

    };

    window.addEventListener(
      "appointmentBooked",
      handleAppointmentBooked
    );

    return () => {

      window.removeEventListener(
        "appointmentBooked",
        handleAppointmentBooked
      );

    };

  }, []);

  // BOOK APPOINTMENT
  const handleBook = async (doctorId) => {

    try {

      if (!user) {

        alert("Please login first");

        return;
      }

      const selectedDate = selectedDates[doctorId];

      const selectedTime = selectedTimes[doctorId];

      if (!selectedDate) {

        alert("Please select appointment date");

        return;
      }

      if (!selectedTime) {

        alert("Please select appointment time");

        return;
      }

      await API.post(
        "/patient-appointments/book",
        {
          doctorId,
          date: selectedDate,
          time: selectedTime,
        },
        {
          headers: {
            role: user.role,
            userid: user.id,
          },
        }
      );

      alert("Appointment booked successfully");

      setBookedDoctors((prev) => [
        ...prev,
        {
          doctorId,
          date: selectedDate,
          time: selectedTime,
        },
      ]);

    } catch (error) {

      console.log(error);

      alert(
        error.response?.data?.error ||
        "Booking failed"
      );
    }
  };

  // EXPORT EXCEL
  const exportToExcel = () => {

    const excelData = doctors.map((d) => {

      const bookedAppointment =
        bookedDoctors.find(
          (b) => b.doctorId === d.id
        );

      return {

        Name: d.name,

        Specialty: d.specialty,

        Experience: d.experience,

        Mobile: d.mobile,

        Status: bookedAppointment
          ? "Booked"
          : "Available",

        AppointmentDate: bookedAppointment
          ? bookedAppointment.date.split("T")[0]
          : "-",

        AppointmentTime: bookedAppointment?.time || "-",
      };
    });

    const worksheet =
      XLSX.utils.json_to_sheet(excelData);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Doctors"
    );

    const excelBuffer = XLSX.write(
      workbook,
      {
        bookType: "xlsx",
        type: "array",
      }
    );

    const fileData = new Blob(
      [excelBuffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      }
    );

    saveAs(
      fileData,
      "Doctors_List.xlsx"
    );
  };

  // EXPORT PDF
  const downloadPDF = () => {

    const doc = new jsPDF();

    doc.setFontSize(18);

    doc.text(
      "Doctors List",
      14,
      20
    );

    const tableColumn = [
      "Name",
      "Specialty",
      "Experience",
      "Mobile",
      "Status",
      "Date",
      "Time",
    ];

    const tableRows = doctors.map((d) => {

      const bookedAppointment =
        bookedDoctors.find(
          (b) => b.doctorId === d.id
        );

      return [

        d.name,

        d.specialty,

        d.experience,

        d.mobile,

        bookedAppointment
          ? "Booked"
          : "Available",

        bookedAppointment
          ? bookedAppointment.date.split("T")[0]
          : "-",

        bookedAppointment?.time || "-",
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save("Doctors_List.pdf");
  };

  // PAGINATION
  const indexOfLastDoctor =
    currentPage * doctorsPerPage;

  const indexOfFirstDoctor =
    indexOfLastDoctor - doctorsPerPage;

  const currentDoctors = doctors.slice(
    indexOfFirstDoctor,
    indexOfLastDoctor
  );

  const totalPages = Math.ceil(
    doctors.length / doctorsPerPage
  );

  return (
    <div className="page">

      {/* Reminder AI */}
      <ReminderChatBox />

      {/* HEADER */}
      <div className="header">

        <h2>
          Available Doctors
        </h2>

        <button
          className="back-btn"
          onClick={() => navigate(-1)}
        >
          Back
        </button>

        <button
          className="excel-btn"
          onClick={exportToExcel}
        >
          Excel
        </button>

        <button
          className="pdf-btn"
          onClick={downloadPDF}
        >
          PDF
        </button>

      </div>

      {/* TABLE */}
      <table className="table">

        <thead>

          <tr>

            <th>Name</th>

            <th>Specialty</th>

            <th>Experience</th>

            <th>Mobile</th>

            <th>Appointment</th>

          </tr>

        </thead>

        <tbody>

          {currentDoctors.map((d) => {

            const bookedAppointment =
              bookedDoctors.find(
                (b) => b.doctorId === d.id
              );

            const isBooked =
              !!bookedAppointment;

            return (

              <tr key={d.id}>

                <td>{d.name}</td>

                <td>{d.specialty}</td>

                <td>{d.experience}</td>

                <td>{d.mobile}</td>

                <td>

                  {/* DATE */}
                  <input
                    type="date"
                    value={
                      selectedDates[d.id] ||

                      (
                        bookedAppointment
                          ? bookedAppointment.date.split("T")[0]
                          : ""
                      )
                    }

                    min={
                      new Date()
                        .toISOString()
                        .split("T")[0]
                    }

                    onChange={(e) =>
                      setSelectedDates({
                        ...selectedDates,
                        [d.id]:
                          e.target.value,
                      })
                    }

                    disabled={isBooked}
                  />

                  {/* TIME */}
                  <input
                    type="time"
                    value={
                      selectedTimes[d.id] ||
                      (
                        bookedAppointment?.time
                          ? (
                            bookedAppointment.time.includes("T")
                              ? new Date(bookedAppointment.time)
                                .toTimeString()
                                .slice(0, 5)
                              : bookedAppointment.time.slice(0, 5)
                          )
                          : ""
                      )
                    }
                    onChange={(e) =>
                      setSelectedTimes({
                        ...selectedTimes,
                        [d.id]: e.target.value,
                      })
                    }
                    disabled={isBooked}
                  />

                  {/* BUTTON */}
                  <button
                    className={`btn ${isBooked
                      ? "booked"
                      : ""
                      }`}

                    onClick={() =>
                      handleBook(d.id)
                    }

                    disabled={isBooked}
                  >
                    {isBooked
                      ? "Booked"
                      : "Book"}
                  </button>

                </td>

              </tr>
            );
          })}

        </tbody>

      </table>

      {/* PAGINATION */}
      <div className="pagination">

        <button
          onClick={() =>
            setCurrentPage(
              currentPage - 1
            )
          }

          disabled={currentPage === 1}
        >
          Previous
        </button>

        <span>
          Page {currentPage} of{" "}
          {totalPages}
        </span>

        <button
          onClick={() =>
            setCurrentPage(
              currentPage + 1
            )
          }

          disabled={
            currentPage === totalPages
          }
        >
          Next
        </button>

      </div>

      {/* AI CHAT */}
      <div className="patients-page">
        <ChatBox />
      </div>

    </div>
  );
}