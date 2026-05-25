import prisma from "../prisma/client.js";
import bcrypt from "bcrypt"; 
// create patient
export const createPatient = async (req, res) => {
  try {
    const { name, age, gender, contact, email, password, bloodGroup, status, medicalNotes } = req.body;

    //required filed
        if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    //Check if user already exists
     const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    //hash Password

    const hashedPassword = await bcrypt.hash(password, 10);

    //Create User

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "patient",  
      }
    });

    const patient = await prisma.patient.create({
      data: { name, age: Number(age), gender, contact,  bloodGroup: bloodGroup || null,status: status ? status.toUpperCase() : undefined, userId: user.id, medicalNotes: medicalNotes || null }
    });

      res.status(201).json({
      message: "Patient + User created successfully",
      patient
    });
  } catch (error) {
    console.log("GET PATIENT ERROR:", error);
    res.status(500).json({ error: "Failed to create patient" });
  } 
};

// get patient
export const getPatients = async (req, res) => {
  try {

    const role = req.headers.role;
    const userId = Number(req.headers.userid);

    let patients;

    // ADMIN → all patients
    if (role === "admin") {

      patients = await prisma.patient.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            }
          }
        }
      });

    }

    // DOCTOR → only own patients
    else if (role === "doctor") {

      // find logged in doctor
      const doctor = await prisma.doctor.findUnique({
        where: { userId }
      });

      if (!doctor) {
        return res.status(404).json({
          error: "Doctor not found"
        });
      }
      
      patients = await prisma.patient.findMany({

        where: {
          appointments: {
            some: {
              doctorId: doctor.id
            }
          }
        },

        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            }
          }
        }
      });

    }

    else {
      return res.status(403).json({
        error: "Unauthorized"
      });
    }

    res.json(patients);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Failed to fetch patients"
    });
  }
};
// update patient

export const updatePatient = async (req, res) => {
  try{
   const {id} = req.params;
   const { name, age,gender,contact, email, bloodGroup, status, medicalNotes } = req.body;

   //check if patient exist
    const existingPatient = await prisma.patient.findUnique({
      where: { id: Number(id) },
      include: { user: true }
    });

    if (!existingPatient) {
      return res.status(404).json({ error: "Patient not found" });
    }

   const updatePatient = await prisma.patient.update ({
    where: { id: Number(id) },
    data: {
      name,
      age: Number(age),
      gender,
      contact,
      bloodGroup: bloodGroup || null,
      status: status ? status.toUpperCase() : undefined,
      medicalNotes: medicalNotes || null,
    },    
   });
     // 3. Update linked user (optional)
    if (email || name) {
      await prisma.user.update({
        where: { id: existingPatient.userId },
        data: {
          name: name || existingPatient.user.name,
          email: email || existingPatient.user.email
        }
      });
    }

   res.status(200).json(updatePatient);
  }catch(error){
    res.status(500).json({ error: "Failed to update patient" });
  }
};

//delete patient

export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    //  Find patient with user
    const patient = await prisma.patient.findUnique({
      where: { id: Number(id) },
      include: { user: true }
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    //  Delete patient
    await prisma.patient.delete({
      where: { id: Number(id) }
    });

    //  Delete linked user
    if (patient.userId) {
      await prisma.user.delete({
        where: { id: patient.userId }
      });
    }

    res.status(200).json({ message: "Patient + User deleted successfully" });

  } catch (error) {
    console.log("DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET LOGGED IN PATIENT PROFILE

export const getPatientProfile = async (req, res) => {
  try {

    const userId = Number(req.headers.userid);

    const patient = await prisma.patient.findUnique({
      where: {
        userId
      },

      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found"
      });
    }

    res.status(200).json(patient);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      error: "Failed to fetch profile"
    });

  }
};