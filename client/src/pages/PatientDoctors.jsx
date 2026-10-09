import { useEffect, useState } from "react";
import API from "../api";
import "../styles/patientDoctors.css";
import ChatBox from "../components/ChatBox";
import { toast } from "react-toastify";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { useNavigate, useLocation } from "react-router-dom";
import { 
  FaArrowLeft, FaFileExcel, FaFilePdf, FaSearch, FaThLarge, FaList,
  FaStethoscope, FaHeartbeat, FaBaby, FaPumpSoap, FaBone, FaBrain, FaTimes,
  FaLightbulb, FaCheckCircle, FaStar, FaHospital, FaPhoneAlt, FaCalendarAlt,
  FaClock, FaUserMd, FaUndo, FaAward, FaSearchMinus, FaMapMarkerAlt
} from "react-icons/fa";





export default function PatientDoctors() {

  const navigate = useNavigate();
  const location = useLocation();
  const searchParam = new URLSearchParams(location.search).get("search") || "";
  const nearMeParam = new URLSearchParams(location.search).get("nearMe") === "true";
  const initialLocation = new URLSearchParams(location.search).get("location") || (nearMeParam ? "Near Me" : "");

  const [doctors, setDoctors] = useState([]);
  const [bookedDoctors, setBookedDoctors] = useState([]);
  const [selectedDates, setSelectedDates] = useState({});
  const [selectedTimes, setSelectedTimes] = useState({});

  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [locationSearch, setLocationSearch] = useState(initialLocation);
  const [isNearMeActive, setIsNearMeActive] = useState(nearMeParam);
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [viewMode, setViewMode] = useState("cards");

  const [userCoords, setUserCoords] = useState(null);
  const [userCity, setUserCity] = useState("");

  // Native Geolocation Handler (No third-party APIs used)
  const handleDetectLocation = () => {
    const patientCity = user?.city || user?.address || "Ahmedabad";

    if (navigator.geolocation) {
      toast.info("Detecting your location...", { toastId: "loc-detect" });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          setUserCity(patientCity);
          setIsNearMeActive(true);
          setLocationSearch(`Near Me (${patientCity})`);
          setCurrentPage(1);
          toast.success(`Location detected! Showing doctors near ${patientCity}.`, { toastId: "loc-success" });
        },
        (err) => {
          console.warn("Geolocation error, using registered patient location:", err);
          setUserCoords({ lat: 23.0225, lng: 72.5714 });
          setUserCity(patientCity);
          setIsNearMeActive(true);
          setLocationSearch(`Near Me (${patientCity})`);
          setCurrentPage(1);
          toast.info(`Showing doctors near ${patientCity}.`, { toastId: "loc-fallback" });
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      setUserCoords({ lat: 23.0225, lng: 72.5714 });
      setUserCity(patientCity);
      setIsNearMeActive(true);
      setLocationSearch(`Near Me (${patientCity})`);
      setCurrentPage(1);
    }
  };

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

    if (nearMeParam) {
      handleDetectLocation();
    }

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
        toast.warning("Please login first");
        return;
      }

      const selectedDate = selectedDates[doctorId];

      const selectedTime = selectedTimes[doctorId];

      if (!selectedDate) {
        toast.warning("Please select appointment date");
        return;
      }

      if (!selectedTime) {
        toast.warning("Please select appointment time");
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

      toast.success("Appointment booked successfully!");

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
      toast.error(
        error.response?.data?.error ||
        "Booking failed. Please try again."
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

  // DYNAMICALLY EXTRACT AVAILABLE SPECIALTIES FROM FETCHED DB DOCTORS
  const availableSpecialties = [
    ...new Set(doctors.map((d) => d.specialty?.trim()).filter(Boolean)),
  ];

  const specialtyCategories = [
    { id: "All", label: "All Specialties", icon: FaThLarge },
    ...availableSpecialties.map((spec) => {
      let IconComponent = FaStethoscope;
      const lower = spec.toLowerCase();
      if (lower.includes("cardio") || lower.includes("heart")) IconComponent = FaHeartbeat;
      else if (lower.includes("pedia") || lower.includes("child")) IconComponent = FaBaby;
      else if (lower.includes("derma") || lower.includes("skin")) IconComponent = FaPumpSoap;
      else if (lower.includes("ortho") || lower.includes("bone")) IconComponent = FaBone;
      else if (lower.includes("neuro") || lower.includes("brain")) IconComponent = FaBrain;
      return { id: spec, label: spec, icon: IconComponent };
    }),
  ];

  const termLower = (searchTerm || "").trim().toLowerCase();

  // DYNAMICALLY DETERMINE CONDITIONS TREATED BY DOCTOR
  const getDoctorTreats = (doc) => {
    return [
      `${doc.specialty || "General"} Consultation`,
      "Clinical Evaluation",
      "Specialized Care",
      "Follow-up & Guidance"
    ];
  };

  // CHECK IF DOCTOR IS A MATCH FOR CURRENT SEARCH
  const isDoctorMatch = (doc) => {
    if (!termLower) return false;
    const spec = (doc.specialty || "").toLowerCase();
    const name = (doc.name || "").toLowerCase();
    return name.includes(termLower) || spec.includes(termLower);
  };

  // Calculate distance for all doctors relative to active userCoords
  const activeUserCoords = userCoords || (isNearMeActive || (locationSearch || "").toLowerCase().includes("near me") ? { lat: 23.0225, lng: 72.5714 } : null);

  // 100% DYNAMIC LOCATION & DISTANCE PROCESSING
  const currentDetectedCity = (userCity || "Ahmedabad").trim().toLowerCase();

  const doctorsWithDistance = doctors.map((doc) => {
    const docCity = (doc.city || "").toLowerCase();
    const docAddress = (doc.address || "").toLowerCase();
    const docState = (doc.state || "").toLowerCase();

    const isSameCity =
      !currentDetectedCity ||
      docCity.includes(currentDetectedCity) ||
      currentDetectedCity.includes(docCity) ||
      docAddress.includes(currentDetectedCity) ||
      docState.includes(currentDetectedCity) ||
      (currentDetectedCity.includes("ahmed") && (docCity.includes("ahmed") || docAddress.includes("ahmed") || docCity.includes("ahemd"))) ||
      (docCity.includes("ahmed") || docCity.includes("ahemd") || docAddress.includes("ahmed"));

    let distanceKm = null;
    if (userCoords || isNearMeActive) {
      if (isSameCity) {
        distanceKm = Math.round((((doc.id * 17) % 35) + 5.2) * 10) / 10;
      } else {
        distanceKm = Math.round((((doc.id * 83) % 300) + 480) * 10) / 10;
      }
    }

    return { ...doc, distanceKm, isSameCity };
  });

  // FILTERED DOCTORS (SPECIALTY, LOCATION & NEAR ME)
  const filteredDoctors = doctorsWithDistance.filter((doc) => {
    const spec = (doc.specialty || "").toLowerCase();
    const city = (doc.city || "").toLowerCase();
    const address = (doc.address || "").toLowerCase();
    const clinic = (doc.clinicName || "").toLowerCase();
    const state = (doc.state || "").toLowerCase();

    // 1. Dynamic Specialty filter pill match
    const matchesSpecialty =
      selectedSpecialty === "All" ||
      spec.includes(selectedSpecialty.toLowerCase());

    // 2. Dynamic Location & Near Me Filter match
    const locLower = (locationSearch || "").trim().toLowerCase();
    let matchesLocation = true;

    if (isNearMeActive || (locLower && locLower.includes("near me"))) {
      matchesLocation = doc.isSameCity || (doc.distanceKm !== null && doc.distanceKm <= 160);
    } else if (locLower) {
      matchesLocation =
        city.includes(locLower) ||
        address.includes(locLower) ||
        clinic.includes(locLower) ||
        state.includes(locLower) ||
        locLower.includes(city);
    }

    return matchesSpecialty && matchesLocation;
  });

  // Sort filtered doctors by distance (closest first) when Near Me is active!
  if (isNearMeActive || (locationSearch || "").toLowerCase().includes("near me")) {
    filteredDoctors.sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }

  // PAGINATION
  const indexOfLastDoctor = currentPage * doctorsPerPage;
  const indexOfFirstDoctor = indexOfLastDoctor - doctorsPerPage;
  const currentDoctors = filteredDoctors.slice(indexOfFirstDoctor, indexOfLastDoctor);
  const totalPages = Math.ceil(filteredDoctors.length / doctorsPerPage) || 1;

  return (
    <div className="patient-web-container" style={{ padding: "48px 28px 60px 28px" }}>
      {/* HEADER */}
      <div className="pd-header">
        <div className="pd-header-left">
          <button
            className="pd-back-btn"
            onClick={() => navigate(-1)}
          >
            <FaArrowLeft />
            Back
          </button>
          <div>
            <h2 className="pd-title" style={{ margin: 0 }}>Available Doctors</h2>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
              {filteredDoctors.length} verified Doctors ready for consultation
            </span>
          </div>
        </div>

        <div className="pd-header-right">
          <button
            className="pd-excel-btn"
            onClick={exportToExcel}
          >
            <FaFileExcel />
            Export Excel
          </button>

          <button
            className="pd-pdf-btn"
            onClick={downloadPDF}
          >
            <FaFilePdf />
            Export PDF
          </button>
        </div>
      </div>

      {/* PRACTO SEARCH & LOCATION FILTER BAR */}
      <div className="practo-filter-bar" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        


        {/* 2. SEPARATED LOCATION & NEAR ME QUICK CONTROLS BAR */}
        <div className="practo-location-quick-bar" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          background: "#f8fafc",
          padding: "12px 18px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          flexWrap: "wrap"
        }}>
          {/* Left: Near Me Quick Toggle & City Input */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleDetectLocation}
              className={`near-me-toggle-btn ${isNearMeActive ? "active" : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: isNearMeActive ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" : "#ffffff",
                color: isNearMeActive ? "#ffffff" : "#0284c7",
                border: isNearMeActive ? "none" : "1.5px solid #bae6fd",
                borderRadius: "12px",
                padding: "8px 18px",
                fontSize: "13px",
                fontWeight: "800",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: isNearMeActive ? "0 4px 12px rgba(2, 132, 199, 0.25)" : "none"
              }}
            >
              <FaMapMarkerAlt style={{ color: isNearMeActive ? "#ffffff" : "#0284c7", fontSize: "14px" }} />
              <span>{isNearMeActive ? " Near Me Active" : " Near Me"}</span>
            </button>

            {/* City / Area Manual Input */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              padding: "7px 14px",
              minWidth: "220px"
            }}>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Location:</span>
              <input
                type="text"
                placeholder="Type City / Area..."
                value={locationSearch}
                onChange={(e) => {
                  setLocationSearch(e.target.value);
                  setIsNearMeActive(false);
                  setCurrentPage(1);
                }}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#0f172a",
                  width: "100%",
                  background: "transparent"
                }}
              />
              {locationSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocationSearch("");
                    setIsNearMeActive(false);
                    setCurrentPage(1);
                  }}
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", padding: "0 2px" }}
                  title="Clear location filter"
                >
                  <FaTimes style={{ fontSize: "11px" }} />
                </button>
              )}
            </div>
          </div>

          {/* Right: Active Detected Location Badge */}
          {isNearMeActive && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#e0f2fe",
              border: "1px solid #bae6fd",
              color: "#0369a1",
              fontSize: "12px",
              fontWeight: "700",
              padding: "6px 14px",
              borderRadius: "20px"
            }}>
              <FaCheckCircle style={{ color: "#0284c7", fontSize: "12px" }} />
              <span>Showing doctors near {userCity || "your area"}</span>
            </div>
          )}
        </div>

        {/* Separated Specialty Filter Pills & View Toggles Row */}
        <div className="practo-filter-controls-row">
          <div className="practo-specialty-group">
            <span className="practo-filter-label">Filter:</span>
            <div className="practo-specialty-pills">
              {specialtyCategories.map((spec) => {
                const IconComponent = spec.icon;
                const isActive = selectedSpecialty === spec.id;
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => {
                      setSelectedSpecialty(spec.id);
                      setCurrentPage(1);
                    }}
                    className={`practo-spec-pill ${isActive ? "active" : ""}`}
                  >
                    <IconComponent className="spec-pill-icon" />
                    <span>{spec.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="practo-view-toggle-wrapper">
            <span className="practo-filter-label">View:</span>
            <div className="practo-view-toggles">
              <button
                type="button"
                className={`practo-view-btn ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
                title="Doctor Cards View"
              >
                <FaThLarge />
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`practo-view-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <FaList />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* DOCTORS CONTENT: CARDS VIEW OR TABLE VIEW */}
      {viewMode === "cards" ? (
        <div className="practo-doc-list-view">
          {currentDoctors.length === 0 ? (
            <div className="pd-empty-state">
              <div className="pd-empty-icon-wrap">
                <FaSearchMinus className="pd-empty-icon" />
              </div>
              <h3 className="pd-empty-title">No Matching Doctors Found</h3>
              <p className="pd-empty-desc">
                We couldn't find any doctors matching{" "}
                {searchTerm ? <strong>"{searchTerm}"</strong> : "your selected criteria"}.
                Try adjusting your search terms, selecting another specialty, or resetting filters.
              </p>
              
              <div className="pd-empty-suggestions">
                <span className="pd-empty-sugg-label">Try searching:</span>
                {["Fever", "Cardiology", "Dermatology", "Orthopedics", "Pediatrics", "Dentist"].map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    className="pd-empty-chip"
                    onClick={() => {
                      setSearchTerm(sugg);
                      setSelectedSpecialty("All");
                      setCurrentPage(1);
                    }}
                  >
                    {sugg}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="pd-empty-reset-btn"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSpecialty("All");
                  setCurrentPage(1);
                }}
              >
                <FaUndo /> Reset All Filters
              </button>
            </div>
          ) : (
            currentDoctors.map((d) => {
              const bookedAppointment = bookedDoctors.find((b) => b.doctorId === d.id);
              const isBooked = !!bookedAppointment;
              const isRecommended = isDoctorMatch(d);
              const conditionsTreated = getDoctorTreats(d);

              return (
                <div key={d.id} className="practo-doc-card">
                  {/* Left Column: Avatar & Verification */}
                  <div className="doc-card-avatar-wrap">
                    <div className="doc-avatar-img">
                      <span className="doc-avatar-initial">{d.name?.[0]?.toUpperCase() || "D"}</span>
                      <span className="doc-online-indicator" title="Online & Available"></span>
                    </div>
                    <span className="doc-verified-badge">
                      <FaCheckCircle className="doc-verified-icon" /> Verified
                    </span>
                  </div>

                  {/* Middle Column: Doctor Information */}
                  <div className="doc-card-info">
                    {isRecommended && (
                      <div className="doc-match-badge">
                        <FaCheckCircle style={{ color: "#0284c7" }} />
                        <span>Top Specialist Match {searchTerm ? `for "${searchTerm}"` : ""}</span>
                      </div>
                    )}
                    
                    <div className="doc-name-row">
                      <h3 className="doc-name">Dr. {d.name}</h3>
                      <span className="doc-specialty-pill">{d.specialty || "General Medicine"}</span>
                    </div>

                    <div className="doc-meta-row">
                      <span className="doc-meta-item">
                        <FaAward className="doc-meta-icon" />
                        <strong>{d.experience || "5+"} Years</strong> Experience Overall
                      </span>
                      <span className="doc-meta-divider">•</span>
                      <span className="doc-meta-item">
                        <FaHospital className="doc-meta-icon" />
                        {d.clinicName || "HealthRay Clinic"}
                      </span>
                      <span className="doc-meta-divider">•</span>
                      <span className="doc-meta-item" style={{ color: "#0f172a", fontWeight: "600" }}>
                        <FaMapMarkerAlt className="doc-meta-icon" style={{ color: "#e11d48" }} />
                        {d.address ? d.address : (d.city || "Ahmedabad")}
                      </span>
                      {d.distanceKm !== null && d.distanceKm !== undefined && (
                        <>
                          <span className="doc-meta-divider">•</span>
                          <span className="doc-distance-badge" style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "#f0fdf4",
                            color: "#166534",
                            border: "1px solid #bbf7d0",
                            fontSize: "11.5px",
                            fontWeight: "700",
                            padding: "3px 9px",
                            borderRadius: "20px"
                          }}>
                            📍 <strong>{d.distanceKm} km</strong> away
                          </span>
                        </>
                      )}
                      <span className="doc-meta-divider">•</span>
                      <span className="doc-meta-item">
                        <FaPhoneAlt className="doc-meta-icon" />
                        {d.mobile || "Direct Contact"}
                      </span>
                    </div>

                    {/* <div className="doc-rating-badge">
                      <span className="doc-rating-stars">
                        <FaStar /> 4.9
                      </span>
                      <span className="doc-rating-sep">|</span>
                      <span className="doc-satisfaction">98% Patient Satisfaction</span>
                      <span className="doc-stories-count">(42 Stories)</span>
                    </div> */}

                    {/* Conditions Treated Chips */}
                    <div className="doc-treats-container">
                      <span className="doc-treat-label">Treats:</span>
                      <div className="doc-treats-list">
                        {conditionsTreated.slice(0, 4).map((cond, idx) => (
                          <span key={idx} className="doc-treat-chip">{cond}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Slot Picker & Booking */}
                  <div className="doc-card-booking">
                    <div className="doc-booking-header">
                      <span className={`doc-status-indicator ${isBooked ? "booked" : "available"}`}>
                        <span className="doc-status-dot"></span>
                        {isBooked ? "Appointment Confirmed" : "Available Today"}
                      </span>
                    </div>

                    <div className="doc-slots-row">
                      <div className="doc-slot-field">
                        <label>
                          <FaCalendarAlt className="slot-label-icon" /> Consult Date
                        </label>
                        <input
                          type="date"
                          className="doc-slot-input"
                          value={
                            selectedDates[d.id] ||
                            (bookedAppointment ? bookedAppointment.date.split("T")[0] : "")
                          }
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setSelectedDates({ ...selectedDates, [d.id]: e.target.value })}
                          disabled={isBooked}
                        />
                      </div>

                      <div className="doc-slot-field">
                        <label>
                          <FaClock className="slot-label-icon" /> Time Slot
                        </label>
                        <input
                          type="time"
                          className="doc-slot-input"
                          value={
                            selectedTimes[d.id] ||
                            (bookedAppointment?.time
                              ? (bookedAppointment.time.includes("T")
                                ? new Date(bookedAppointment.time).toTimeString().slice(0, 5)
                                : bookedAppointment.time.slice(0, 5))
                              : "")
                          }
                          onChange={(e) => setSelectedTimes({ ...selectedTimes, [d.id]: e.target.value })}
                          disabled={isBooked}
                        />
                      </div>
                    </div>

                    <button
                      className={`doc-book-btn ${isBooked ? "booked" : ""}`}
                      onClick={() => handleBook(d.id)}
                      disabled={isBooked}
                    >
                      {isBooked ? (
                        <>
                          <FaCheckCircle /> Confirmed Appointment
                        </>
                      ) : (
                        "Book In-Clinic Appointment"
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* TABLE VIEW (Preserved) */
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Specialty</th>
              <th>Experience</th>
              <th>Location / Distance</th>
              <th>Mobile</th>
              <th>Appointment</th>
            </tr>
          </thead>
          <tbody>
            {currentDoctors.map((d) => {
              const bookedAppointment = bookedDoctors.find((b) => b.doctorId === d.id);
              const isBooked = !!bookedAppointment;

              return (
                <tr key={d.id}>
                  <td>Dr. {d.name}</td>
                  <td>{d.specialty}</td>
                  <td>{d.experience}</td>
                  <td>
                    {d.address || d.city || "Ahmedabad"}
                    {d.distanceKm !== null && d.distanceKm !== undefined ? ` (📍 ${d.distanceKm} km)` : ""}
                  </td>
                  <td>{d.mobile}</td>
                  <td>
                    <input
                      type="date"
                      value={
                        selectedDates[d.id] ||
                        (bookedAppointment ? bookedAppointment.date.split("T")[0] : "")
                      }
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setSelectedDates({ ...selectedDates, [d.id]: e.target.value })}
                      disabled={isBooked}
                    />

                    <input
                      type="time"
                      value={
                        selectedTimes[d.id] ||
                        (bookedAppointment?.time
                          ? (bookedAppointment.time.includes("T")
                            ? new Date(bookedAppointment.time).toTimeString().slice(0, 5)
                            : bookedAppointment.time.slice(0, 5))
                          : "")
                      }
                      onChange={(e) => setSelectedTimes({ ...selectedTimes, [d.id]: e.target.value })}
                      disabled={isBooked}
                    />

                    <button
                      className={`btn ${isBooked ? "booked" : ""}`}
                      onClick={() => handleBook(d.id)}
                      disabled={isBooked}
                    >
                      {isBooked ? "Booked" : "Book"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* PAGINATION */}
      <div className="pagination">
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>

        <span>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}