import prisma from "../prisma/client.js";
import bcrypt from "bcrypt";

// Create doctor
export const createDoctor = async (req, res) => {
  try {
    const { name, specialty, experience, mobile, email, password } = req.body;

     if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
        const hashedPassword = await bcrypt.hash(password, 10);

    // Create user first
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "doctor", 
      },
    });
    const doctor = await prisma.doctor.create({
      data: {
        name,
        specialty,
        userId: user.id,
        experience,
        mobile,

      },
    });

    res.status(201).json(doctor);
  } catch (error) {
    console.log(error);
  
    res.status(500).json({ error: "Failed to create doctor" });
  }
};
// Get all doctors
  export const getDoctors = async (req, res) => {
    try {
      const doctors = await prisma.doctor.findMany({
        include:{
          user:true
        }
      });
      res.status(200).json(doctors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  };

//update doctor

export const updateDoctor = async (req, res) => {
  try{
    const {id} = req.params;
    const { name, specialty, experience, mobile , email, password} = req.body;
      // find doctor
          const doctor = await prisma.doctor.findUnique({
            where: { id: Number(id) },
          });

          if (!doctor) {
            return res.status(404).json({ error: "Doctor not found" });
        }
    const updateDoctor = await prisma.doctor.update({
      where: { id: Number(id) },
      data: {
        name,
        specialty,
        experience,
        mobile,
      },
    });
     // prepare user update
    let userData = {
      name,
      email,
    };

    // hash password only if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      userData.password = hashedPassword;
    }

    // update user
    if (doctor.userId) {
      await prisma.user.update({
        where: { id: doctor.userId },
        data: userData,
      });
    }


    res.status(200).json(updateDoctor);

  }catch(error){
    res.status(500).json({ error: "Failed to update doctor" });
  }
};

//delete doctor

export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    //  Find doctor FIRST
    const doctor = await prisma.doctor.findUnique({
      where: { id: Number(id) },
    });

    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }

    //  Delete doctor
    await prisma.doctor.delete({
      where: { id: Number(id) },
    });

    //  Delete user
    if (doctor.userId) {
      await prisma.user.delete({
        where: { id: doctor.userId },
      });
    }

    res.status(200).json({ message: "Doctor deleted successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to delete doctor" });
  }
};
 