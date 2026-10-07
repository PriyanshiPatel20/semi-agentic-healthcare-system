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
  FaClock, FaUserMd, FaUndo, FaAward, FaSearchMinus
} from "react-icons/fa";

const SYMPTOM_SPECIALTY_MAP = {
  general: {
    id: "General",
    specialty: "General Doctor",
    keywords: ["fever", "cold", "cough", "flu", "weakness", "infection", "headache", "viral", "stomach", "vomiting", "diarrhea", "nausea", "fatigue", "body pain", "chills", "dengue", "malaria", "typhoid", "general"],
    treats: ["Fever & Chills", "Common Cold", "Flu", "Digestive Health", "Diabetes & BP"],
    recommendation: "Consult a General Doctor for viral fever, cold, weakness, seasonal infections, and common ailments."
  },
  cardio: {
    id: "Cardio",
    specialty: "Cardiologist",
    keywords: ["heart", "chest pain", "bp", "blood pressure", "hypertension", "palpitation", "breathlessness", "cardiac", "cholesterol", "angina", "pulse", "arrhythmia", "shortness of breath", "cardio"],
    treats: ["Chest Discomfort", "Hypertension", "Heart Palpitations", "ECG Evaluation", "Cholesterol"],
    recommendation: "Consult a Cardiologist for chest pain, heart health evaluations, high blood pressure, and cardiovascular checkups."
  },
  pedia: {
    id: "Pedia",
    specialty: "Pediatrician",
    keywords: ["child", "infant", "kid", "baby", "pediatric", "vaccination", "newborn", "growth", "toddler", "measles", "chickenpox", "pedia"],
    treats: ["Childhood Illness", "Newborn Care", "Vaccination", "Growth & Nutrition", "Infant Fever"],
    recommendation: "Consult a Pediatrician for newborn checkups, infant growth tracking, vaccinations, and childhood illnesses."
  },
  derma: {
    id: "Derma",
    specialty: "Dermatologist",
    keywords: ["skin", "acne", "pimple", "rash", "hair", "hairfall", "eczema", "allergy", "itching", "pigmentation", "dandruff", "psoriasis", "fungal", "derma", "glow"],
    treats: ["Acne & Pimples", "Skin Rashes", "Hair Fall", "Eczema & Allergies", "Fungal Infections"],
    recommendation: "Consult a Dermatologist for acne breakouts, persistent rashes, hair loss, and skin allergy management."
  },
  ortho: {
    id: "Ortho",
    specialty: "Orthopedist",
    keywords: ["bone", "joint", "fracture", "knee", "back pain", "arthritis", "spine", "ortho", "shoulder", "muscle", "sprain", "ligament", "cervical", "sciatica", "neck pain"],
    treats: ["Knee Pain", "Back & Spine Care", "Joint Arthritis", "Fractures & Sprains", "Muscle Injury"],
    recommendation: "Consult an Orthopedist for back pain, knee arthritis, joint stiffness, fractures, and bone health."
  },
  neuro: {
    id: "Neuro",
    specialty: "Neurologist",
    keywords: ["migraine", "nerve", "brain", "paralysis", "seizure", "numbness", "stroke", "neuro", "dizziness", "vertigo", "epilepsy", "memory", "tremor", "neuropathy"],
    treats: ["Chronic Migraines", "Nerve Disorders", "Dizziness & Vertigo", "Memory Care", "Seizures"],
    recommendation: "Consult a Neurologist for chronic migraines, nerve numbness, brain health, and neurological evaluation."
  },
  gyne: {
    id: "Gyne",
    specialty: "Gynecologist",
    keywords: ["period", "pregnancy", "gyne", "menstrual", "pcod", "pcos", "fertility", "female", "uterus", "cramps", "vagina", "irregular periods", "prenatal", "maternity", "women"],
    treats: ["Pregnancy Care", "Menstrual Health", "PCOD / PCOS", "Reproductive Health", "Fertility"],
    recommendation: "Consult a Gynecologist for pregnancy guidance, irregular periods, PCOD management, and women's health."
  },
  dental: {
    id: "Dental",
    specialty: "Dentist",
    keywords: ["tooth", "teeth", "dental", "cavity", "gum", "toothache", "dentist", "bleeding gums", "root canal", "braces", "bad breath", "wisdom tooth"],
    treats: ["Toothache & Cavities", "Root Canal", "Teeth Cleaning", "Gum Bleeding", "Dental Checkup"],
    recommendation: "Consult a Dentist for toothache relief, cavity fillings, gum care, and oral hygiene."
  },
  psych: {
    id: "Psych",
    specialty: "Psychiatrist",
    keywords: ["stress", "depression", "anxiety", "sleep", "insomnia", "panic", "psychiatrist", "mental", "therapy", "mood", "adhd", "bipolar", "mental health"],
    treats: ["Stress & Anxiety", "Depression", "Sleep & Insomnia", "Mental Wellness", "Counseling"],
    recommendation: "Consult a Mental Health Specialist for anxiety management, insomnia, stress counseling, and psychological well-being."
  }
};

const specialtyCategories = [
  { id: "All", label: "All Specialties", icon: FaThLarge },
  { id: "General", label: "General", icon: FaStethoscope },
  { id: "Cardio", label: "Cardio", icon: FaHeartbeat },
  { id: "Pedia", label: "Pedia", icon: FaBaby },
  { id: "Derma", label: "Derma", icon: FaPumpSoap },
  { id: "Ortho", label: "Ortho", icon: FaBone },
  { id: "Neuro", label: "Neuro", icon: FaBrain },
];

export default function PatientDoctors() {

  const navigate = useNavigate();
  const location = useLocation();
  const searchParam = new URLSearchParams(location.search).get("search") || "";

  const [doctors, setDoctors] = useState([]);

  const [bookedDoctors, setBookedDoctors] = useState([]);

  const [selectedDates, setSelectedDates] = useState({});

  const [selectedTimes, setSelectedTimes] = useState({});

  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [viewMode, setViewMode] = useState("cards"); // Practo cards view by default

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

  // DETECT SYMPTOM FROM SEARCH TERM
  const termLower = (searchTerm || "").trim().toLowerCase();
  const detectedSymptomCategory = termLower
    ? Object.values(SYMPTOM_SPECIALTY_MAP).find((category) =>
        category.keywords.some((k) => termLower.includes(k) || k.includes(termLower))
      )
    : null;

  // GET CONDITIONS TREATED BY A DOCTOR
  const getDoctorTreats = (doc) => {
    const spec = (doc.specialty || "").toLowerCase();
    for (const item of Object.values(SYMPTOM_SPECIALTY_MAP)) {
      if (spec.includes(item.id.toLowerCase()) || spec.includes(item.specialty.toLowerCase())) {
        return item.treats;
      }
    }
    return ["General Health", "Clinical Triage", "Preventive Care", "Follow-up"];
  };

  // CHECK IF DOCTOR IS A SPECIALIST MATCH FOR CURRENT SEARCH
  const isDoctorMatch = (doc) => {
    if (!termLower) return false;
    const spec = (doc.specialty || "").toLowerCase();
    const name = (doc.name || "").toLowerCase();

    if (detectedSymptomCategory) {
      if (spec.includes(detectedSymptomCategory.id.toLowerCase()) || spec.includes(detectedSymptomCategory.specialty.toLowerCase())) {
        return true;
      }
    }
    return spec.includes(termLower) || name.includes(termLower);
  };

  // FILTERED DOCTORS (NAME, SPECIALTY, SYMPTOMS, AND KEYWORDS)
  const filteredDoctors = doctors.filter((doc) => {
    if (!termLower && selectedSpecialty === "All") return true;

    const spec = (doc.specialty || "").toLowerCase();
    const name = (doc.name || "").toLowerCase();
    const mobile = (doc.mobile || "");

    // 1. Direct search match
    let matchesSearch = !termLower || name.includes(termLower) || spec.includes(termLower) || mobile.includes(termLower);

    // 2. Symptom keyword match
    if (!matchesSearch && termLower) {
      if (detectedSymptomCategory) {
        if (spec.includes(detectedSymptomCategory.id.toLowerCase()) || spec.includes(detectedSymptomCategory.specialty.toLowerCase())) {
          matchesSearch = true;
        }
      }
      Object.entries(SYMPTOM_SPECIALTY_MAP).forEach(([key, val]) => {
        if (spec.includes(key) || spec.includes(val.specialty.toLowerCase())) {
          if (val.keywords.some((k) => termLower.includes(k) || k.includes(termLower))) {
            matchesSearch = true;
          }
        }
      });
    }

    // 3. Specialty filter pill match
    const matchesSpecialty =
      selectedSpecialty === "All" ||
      spec.includes(selectedSpecialty.toLowerCase());

    return matchesSearch && matchesSpecialty;
  });

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

      {/* PRACTO SEARCH & VIEW FILTER BAR */}
      <div className="practo-filter-bar">
        {/* Search Box with Clear Option */}
        <div className="practo-filter-search-box">
          <FaSearch className="practo-search-lens" />
          <input
            type="text"
            placeholder="Search by symptoms (e.g. fever, chest pain, acne, toothache) or doctor name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className="practo-search-clear-btn"
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              title="Clear search"
            >
              <FaTimes />
            </button>
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

      {/* SMART SYMPTOM & SPECIALIST GUIDANCE BANNER */}
      {detectedSymptomCategory && (
        <div className="symptom-recommendation-banner">
          <div className="symptom-recommendation-left">
            <div className="symptom-icon-badge">
              <FaLightbulb />
            </div>
            <div className="symptom-recommendation-content">
              <div className="symptom-recommendation-title">
                <span>Matching specialty for symptoms <strong>"{searchTerm}"</strong>:</span>
                <span className="symptom-spec-highlight">{detectedSymptomCategory.specialty}</span>
              </div>
              <p className="symptom-recommendation-desc">
                {detectedSymptomCategory.recommendation}
              </p>
              <div className="symptom-treats-row">
                <strong>Conditions typically treated:</strong> {detectedSymptomCategory.treats.join(" • ")}
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="symptom-filter-apply-btn"
              onClick={() => {
                setSelectedSpecialty(detectedSymptomCategory.id);
                setCurrentPage(1);
              }}
            >
              Filter {detectedSymptomCategory.specialty}s ({filteredDoctors.length})
            </button>
          </div>
        </div>
      )}

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
                        HealthRay Multispecialty Clinic
                      </span>
                      <span className="doc-meta-divider">•</span>
                      <span className="doc-meta-item">
                        <FaPhoneAlt className="doc-meta-icon" />
                        {d.mobile || "Direct Contact"}
                      </span>
                    </div>

                    <div className="doc-rating-badge">
                      <span className="doc-rating-stars">
                        <FaStar /> 4.9
                      </span>
                      <span className="doc-rating-sep">|</span>
                      <span className="doc-satisfaction">98% Patient Satisfaction</span>
                      <span className="doc-stories-count">(42 Stories)</span>
                    </div>

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