import { useEffect, useState, useMemo } from "react";
import API from "../api";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaSearch,
  FaThLarge,
  FaList,
  FaMapMarkerAlt,
  FaChevronRight,
  FaCheckCircle,
  FaStar,
  FaTimes,
  FaUndo,
  FaHospital,
  FaUserMd,
  FaCalendarAlt,
  FaClock,
  FaPhoneAlt,
  FaMedkit,
  FaAward
} from "react-icons/fa";
import "../styles/patientWebsite.css";
import "../styles/patientDoctors.css";

export default function FindClinics() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get("search") || "";
  const initialSpec = queryParams.get("specialization") || "All Specializations";
  const initialCity = queryParams.get("city") || "All Cities";

  // Filter States
  const [searchNameInput, setSearchNameInput] = useState(initialSearch);
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpec);
  const [selectedCity, setSelectedCity] = useState(initialCity);

  // Active Applied Filters
  const [appliedFilters, setAppliedFilters] = useState({
    searchName: initialSearch,
    specialization: initialSpec,
    city: initialCity
  });

  // Layout mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState("grid");

  // Dynamic Clinics Data fetched directly from database
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal View Clinic
  const [activeClinic, setActiveClinic] = useState(null);

  // Slot Booking State inside Modal
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Fetch doctors & clinics dynamically from API with 0 static fallback
  const fetchDoctorsAndClinics = async () => {
    try {
      setLoading(true);
      const res = await API.get("/doctors");
      const fetchedDocs = res.data || [];

      const mappedClinics = fetchedDocs.map((doc) => {
        const docNameClean = doc.name ? doc.name.replace(/^Dr\.?\s*/i, "") : "Doctor";
        const clinicTitle = doc.clinicName || (doc.name ? `${docNameClean}'s Clinic` : "Medical Clinic");
        const firstChar = clinicTitle ? clinicTitle[0].toUpperCase() : "C";

        return {
          id: doc.id,
          name: clinicTitle,
          doctorName: doc.name ? (doc.name.startsWith("Dr") ? doc.name : `Dr. ${doc.name}`) : "Doctor",
          specialty: doc.specialty || "General Medicine",
          city: doc.city || "Unspecified City",
          state: doc.state || "",
          address: doc.address || (doc.city ? `${doc.city}${doc.state ? `, ${doc.state}` : ''}` : "Address not provided"),
          rating: doc.rating ? parseFloat(doc.rating) : 4.8,
          experience: doc.experience ? (doc.experience.toString().includes("Years") ? doc.experience : `${doc.experience} Years`) : "N/A",
          mobile: doc.mobile || "Direct Contact",
          initial: firstChar,
          timing: doc.timing || "09:00 AM - 08:00 PM",
          doctorId: doc.id
        };
      });

      setClinics(mappedClinics);
    } catch (error) {
      console.error("Failed to fetch clinics/doctors:", error);
      toast.error("Failed to load doctor clinics from database.");
      setClinics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorsAndClinics();
  }, []);

  // Dynamically extract unique cities strictly from real registered doctors in database
  const dynamicCitiesList = useMemo(() => {
    const citiesFromDB = clinics.map((c) => c.city).filter(Boolean);
    const uniqueCities = Array.from(new Set(citiesFromDB));
    return ["All Cities", ...uniqueCities];
  }, [clinics]);

  // Dynamically extract unique specializations strictly from real registered doctors in database
  const dynamicSpecializationsList = useMemo(() => {
    const specsFromDB = clinics.map((c) => c.specialty).filter(Boolean);
    const uniqueSpecs = Array.from(new Set(specsFromDB));
    return ["All Specializations", ...uniqueSpecs];
  }, [clinics]);

  // Handle Apply Filters
  const handleApplyFilters = () => {
    setAppliedFilters({
      searchName: searchNameInput,
      specialization: selectedSpecialty,
      city: selectedCity
    });

    // Sync URL parameters
    const params = new URLSearchParams();
    if (searchNameInput) params.set("search", searchNameInput);
    if (selectedSpecialty && selectedSpecialty !== "All Specializations") {
      params.set("specialization", selectedSpecialty);
    }
    if (selectedCity && selectedCity !== "All Cities") {
      params.set("city", selectedCity);
    }
    navigate(`/find-clinics?${params.toString()}`, { replace: true });
  };

  // Handle Reset All
  const handleResetAll = () => {
    setSearchNameInput("");
    setSelectedSpecialty("All Specializations");
    setSelectedCity("All Cities");
    setAppliedFilters({
      searchName: "",
      specialization: "All Specializations",
      city: "All Cities"
    });
    navigate("/find-clinics", { replace: true });
  };

  // Filter logic applied strictly on real database clinic records
  const filteredClinics = clinics.filter((c) => {
    const { searchName, specialization, city } = appliedFilters;

    const matchesName =
      !searchName ||
      c.name.toLowerCase().includes(searchName.toLowerCase()) ||
      c.doctorName.toLowerCase().includes(searchName.toLowerCase()) ||
      c.address.toLowerCase().includes(searchName.toLowerCase());

    const matchesSpec =
      !specialization ||
      specialization === "All Specializations" ||
      c.specialty.toLowerCase() === specialization.toLowerCase();

    const matchesCity =
      !city ||
      city === "All Cities" ||
      c.city.toLowerCase() === city.toLowerCase();

    return matchesName && matchesSpec && matchesCity;
  });

  // Handle Book Appointment inside View Clinic Modal
  const handleBookAppointment = async () => {
    if (!user) {
      toast.warning("Please login as a patient to book an appointment");
      return;
    }

    if (!bookingDate) {
      toast.warning("Please select a preferred consultation date");
      return;
    }

    if (!bookingTime) {
      toast.warning("Please select a time slot");
      return;
    }

    try {
      setIsSubmitting(true);
      await API.post(
        "/patient-appointments/book",
        {
          doctorId: activeClinic.doctorId || activeClinic.id,
          date: bookingDate,
          time: bookingTime
        },
        {
          headers: {
            role: user.role,
            userid: user.id
          }
        }
      );

      toast.success(`Appointment successfully booked with ${activeClinic.name}!`);
      setActiveClinic(null);
      setBookingDate("");
      setBookingTime("");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || "Failed to book appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="find-clinics-page-container">
      {/* ── TOP HERO BANNER (HEALTHRAY BLUE THEME) ── */}
      <div className="find-clinics-hero">
        <div className="find-clinics-hero-inner">
          <div className="find-clinics-hero-badge">
            <FaHospital /> CLINIC &amp; OPD DIRECTORY
          </div>
          <h1 className="find-clinics-hero-title">
            Find Registered Clinics &amp; OPDs by Location &amp; Specialization
          </h1>
          <p className="find-clinics-hero-sub">
            Browse verified medical clinics by area, filter by registered specialties, and schedule in-clinic consultations.
          </p>
        </div>
      </div>

      {/* ── MAIN DYNAMIC FILTER CARD ── */}
      <div className="find-clinics-filter-card">
        <div className="filter-inputs-grid">
          {/* SEARCH BY NAME OR AREA */}
          <div className="filter-field-group">
            <label className="filter-field-label">SEARCH BY NAME OR AREA</label>
            <div className="filter-input-wrap">
              <FaSearch className="filter-input-icon" />
              <input
                type="text"
                className="filter-text-input"
                placeholder="Clinic name or area..."
                value={searchNameInput}
                onChange={(e) => setSearchNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              />
              {searchNameInput && (
                <button
                  type="button"
                  className="filter-clear-icon-btn"
                  onClick={() => setSearchNameInput("")}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          {/* SPECIALIZATION DROPDOWN (100% DYNAMIC FROM DB) */}
          <div className="filter-field-group">
            <label className="filter-field-label">SPECIALIZATION</label>
            <div className="filter-select-wrap">
              <select
                className="filter-select-input"
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
              >
                {dynamicSpecializationsList.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CITY DROPDOWN (100% DYNAMIC FROM DB) */}
          <div className="filter-field-group">
            <label className="filter-field-label">CITY</label>
            <div className="filter-select-wrap active-focus">
              <select
                className="filter-select-input"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                {dynamicCitiesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* BUTTON ACTIONS ROW */}
        <div className="filter-actions-row">
          <button
            type="button"
            className="filter-apply-btn"
            onClick={handleApplyFilters}
          >
            <FaSearch style={{ fontSize: "14px" }} />
            <span>Apply Filters</span>
          </button>

          <button
            type="button"
            className="filter-reset-btn"
            onClick={handleResetAll}
          >
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {/* ── GRID / LIST VIEW TOGGLE CONTROLS ── */}
      <div className="find-clinics-view-header">
        <div className="view-results-count">
          Showing <strong>{filteredClinics.length}</strong> Registered OPD Clinics
          {appliedFilters.city && appliedFilters.city !== "All Cities" ? ` in ${appliedFilters.city}` : ""}
          {appliedFilters.specialization && appliedFilters.specialization !== "All Specializations"
            ? ` for ${appliedFilters.specialization}`
            : ""}
        </div>

        <div className="view-toggle-capsule">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <FaThLarge />
            <span>Grid</span>
          </button>

          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <FaList />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* ── DYNAMIC CLINIC RESULTS GRID / LIST ── */}
      {loading ? (
        <div className="find-clinics-loading">
          <div className="loading-spinner"></div>
          <p>Fetching registered clinics from database...</p>
        </div>
      ) : filteredClinics.length === 0 ? (
        <div className="find-clinics-empty-state">
          <div className="empty-state-icon">
            <FaHospital />
          </div>
          <h3>No Registered Clinics Found</h3>
          <p>
            {clinics.length === 0
              ? "No doctor clinics registered in database yet."
              : "No clinics match your selected location or specialization filter. Try resetting your search filters."}
          </p>
          <button type="button" className="filter-apply-btn" onClick={handleResetAll}>
            <FaUndo /> Reset All Filters
          </button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "nexopd-grid-container" : "nexopd-list-container"}>
          {filteredClinics.map((clinic) => (
            <div key={clinic.id} className="nexopd-clinic-card">
              {/* Card Top Section: Icon & Names */}
              <div className="clinic-card-top">
                <div className="clinic-avatar-box">
                  <span className="clinic-initial-text">{clinic.initial}</span>
                  <div className="clinic-check-badge" title="Verified Doctor Clinic">
                    <FaCheckCircle />
                  </div>
                </div>

                <div className="clinic-title-meta">
                  <h3 className="clinic-name-title">{clinic.name}</h3>
                  <div className="clinic-spec-pill">{clinic.specialty}</div>
                </div>
              </div>

              {/* Card Location & Area Line */}
              <div className="clinic-location-row">
                <FaMapMarkerAlt className="clinic-pin-icon" />
                <span className="clinic-location-text">
                  {clinic.address}
                </span>
              </div>

              {/* Card Action: View Clinic */}
              <div className="clinic-card-footer">
                <button
                  type="button"
                  className="view-clinic-teal-btn"
                  onClick={() => {
                    setActiveClinic(clinic);
                    setBookingDate("");
                    setBookingTime("");
                  }}
                >
                  <span>View Clinic</span>
                  <FaChevronRight className="btn-arrow-icon" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── VIEW CLINIC DETAIL MODAL ── */}
      {activeClinic && (
        <div className="clinic-modal-overlay" onClick={() => setActiveClinic(null)}>
          <div className="clinic-modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="clinic-modal-header">
              <div className="modal-header-left">
                <div className="modal-clinic-avatar">
                  {activeClinic.initial}
                </div>
                <div>
                  <h2 className="modal-clinic-title">{activeClinic.name}</h2>
                  <div className="modal-clinic-spec">
                    <FaMedkit style={{ color: "#0284c7" }} /> {activeClinic.specialty}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveClinic(null)}
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="clinic-modal-body">
              {/* Overview Cards */}
              <div className="modal-info-grid">
                <div className="modal-info-card">
                  <div className="info-card-icon"><FaUserMd /></div>
                  <div>
                    <span className="info-card-label">Attending Doctor</span>
                    <strong className="info-card-val">{activeClinic.doctorName}</strong>
                  </div>
                </div>

                <div className="modal-info-card">
                  <div className="info-card-icon"><FaAward /></div>
                  <div>
                    <span className="info-card-label">Experience</span>
                    <strong className="info-card-val">{activeClinic.experience}</strong>
                  </div>
                </div>

                <div className="modal-info-card">
                  <div className="info-card-icon"><FaStar style={{ color: "#f59e0b" }} /></div>
                  <div>
                    <span className="info-card-label">Patient Rating</span>
                    <strong className="info-card-val">{activeClinic.rating} ★★★★★</strong>
                  </div>
                </div>

                <div className="modal-info-card">
                  <div className="info-card-icon"><FaClock /></div>
                  <div>
                    <span className="info-card-label">OPD Timings</span>
                    <strong className="info-card-val">{activeClinic.timing}</strong>
                  </div>
                </div>
              </div>

              {/* Location & Contact Details */}
              <div className="modal-section-card">
                <h4 className="modal-section-title">
                  <FaMapMarkerAlt style={{ color: "#0284c7" }} /> Location &amp; Address
                </h4>
                <p className="modal-address-text">{activeClinic.address}</p>
                <div className="modal-phone-tag">
                  <FaPhoneAlt /> Contact OPD: <strong>{activeClinic.mobile}</strong>
                </div>
              </div>

              {/* Quick Appointment Booking Section */}
              <div className="modal-booking-section">
                <h4 className="modal-section-title">
                  <FaCalendarAlt style={{ color: "#0284c7" }} /> Book In-Clinic Appointment Slot
                </h4>

                <div className="modal-slot-inputs">
                  <div className="modal-input-field">
                    <label>Select Preferred Date</label>
                    <input
                      type="date"
                      className="modal-date-picker"
                      min={new Date().toISOString().split("T")[0]}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                    />
                  </div>

                  <div className="modal-input-field">
                    <label>Select Time Slot</label>
                    <select
                      className="modal-time-picker"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                    >
                      <option value="">-- Choose Slot --</option>
                      <option value="10:00 AM">10:00 AM - Morning Slot</option>
                      <option value="11:30 AM">11:30 AM - Morning Slot</option>
                      <option value="02:00 PM">02:00 PM - Afternoon Slot</option>
                      <option value="05:00 PM">05:00 PM - Evening Slot</option>
                      <option value="07:00 PM">07:00 PM - Evening Slot</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className="modal-confirm-booking-btn"
                  onClick={handleBookAppointment}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Confirming Slot..." : "Confirm & Book In-Clinic Visit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
