import PatientNoteCard from "../components/PatientNoteCard";
import "../styles/patientDoctors.css";

export default function PatientNotesPage() {
  return (
    <div className="patient-notes-page" style={{ padding: "8px 4px 32px 4px" }}>
      <PatientNoteCard isDedicatedPage={true} />
    </div>
  );
}
