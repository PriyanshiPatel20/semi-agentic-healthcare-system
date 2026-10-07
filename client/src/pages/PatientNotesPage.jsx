import PatientNoteCard from "../components/PatientNoteCard";
import "../styles/patientDoctors.css";

export default function PatientNotesPage() {
  return (
    <div className="patient-web-container" style={{ padding: "48px 28px 60px 28px" }}>
      <PatientNoteCard isDedicatedPage={true} />
    </div>
  );
}
