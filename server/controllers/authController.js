  import bcrypt from "bcrypt";
  import prisma from "../prisma/client.js";

  // REGISTER
  export const registerUser = async (req, res) => {
    try {
      const { name, email, password, role, age, gender, contact, specialty, experience,mobile } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      //   Create User
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role
        }
      });

      //   Create related profile
      if (role === "patient") {
        await prisma.patient.create({
          data: {
            name,
            age: Number(age),
            gender,
            contact,
            userId: user.id
          }
        });
      }
      if (role === "doctor") {
        await prisma.doctor.create({
          data: {
            name,
            specialty,
            userId: user.id,
            experience,
            mobile, 
          }
        });
      }

      res.status(201).json({ message: "User registered successfully" });

    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Registration failed" });
    }
  };

  // LOGIN
  export const loginUser = async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log("Login attempt:", email);

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ error: "Invalid password" });
      }

      res.status(200).json({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      console.log("Login error:", error);
      res.status(500).json({ error: "Login failed", details: error.message });
    }
  };