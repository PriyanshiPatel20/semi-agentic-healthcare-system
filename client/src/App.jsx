import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Register from "./pages/Register";
import Doctors from "./pages/Doctors";
import Appointments from "./pages/Appointments";
import PatientsDetails from "./pages/PatientsDetails";
import Layout from "./pages/Layout";
import "./index.css";
import PatientDoctors from "./pages/PatientDoctors";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PatientProfile from "./pages/PatientProfile";

function App() {
  return (
    
    <BrowserRouter>
          <ToastContainer />

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/patient-doctors" element={<PatientDoctors />} />
          <Route path="/patients-details" element={<PatientsDetails />} />
          <Route path="/patient-profile" element={<PatientProfile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;