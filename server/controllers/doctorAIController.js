import prisma from "../prisma/client.js";
import axios from "axios";

/**
 * AI CHAT + MEMORY
 */
export const doctorAIChat = async (req, res) => {
  try {
    const { message, patient } = req.body;
    const userId = req.headers.userid;

    let doctorId = null;

    if (userId) {
      const doctor = await prisma.doctor.findUnique({
        where: { userId: Number(userId) },
      });
      doctorId = doctor?.id || null;
    }

    // CHAT MEMORY
    const oldChats = await prisma.doctorChat.findMany({
      where: { patientId: patient?.id },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const history = oldChats.flatMap((c) => [
      { role: "user", content: c.message },
      { role: "assistant", content: c.reply },
    ]);

    // GET MEDICAL RECORD
    const record = await prisma.medicalRecord.findFirst({
      where: { patientId: patient?.id },
      orderBy: { createdAt: "desc" },
    });

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3.1-8b-instruct",
        messages: [
          {
            role: "system",
            content: `
              You are a senior clinical doctor assistant helping real doctors.

              STRICT RESPONSE RULES:

              - Respond like an experienced doctor
              - NEVER say:
                - "unknown"
                - "cannot assess"
                - "insufficient information"
                - "medical history unavailable"
                - "possible hidden condition"
                - "consult physician"
                - "seek professional advice"

              - NEVER sound like an AI system
              - NEVER explain limitations
              - NEVER use robotic analysis language

              - Always give:
                - clinical observations
                - likely concerns
                - practical recommendations
                - preventive advice
                - follow-up suggestions

              STYLE RULES:

              - Use clean markdown
              - Use professional medical formatting
              - Keep response concise but informative
              - Sound confident and clinically useful
              - Write as if a real doctor is reviewing the patient

              FORMAT:

              ## Clinical Assessment
              Short professional assessment.

              ## Observations
              - Point
              - Point

              ## Recommendations
              - Point
              - Point

              ## Follow-up
              - Point
              - Point

              IMPORTANT:
              - Infer reasonable clinical observations from age, gender, status, symptoms, blood group, and records.
              - If information is limited, provide preventive and wellness-oriented guidance instead of mentioning missing data.
              - Avoid generic filler text.
              `,
          },

          ...history,

          {
            role: "user",
            content: `
              Doctor Message: ${message}

              Patient Info:
              Name: ${patient?.name}
              Age: ${patient?.age}
              Gender: ${patient?.gender}
              Blood Group: ${patient?.bloodGroup}
              Status: ${patient?.status}

              Medical Record:
              ${record ? JSON.stringify(record) : "No medical record available"}

              Provide a professional doctor-style clinical assessment with:
- observations
- likely health considerations
- preventive recommendations
- follow-up advice

Avoid mentioning missing information or AI limitations.
                          `,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.choices[0].message.content;

    await prisma.doctorChat.create({
      data: {
        message,
        reply,
        doctorId,
        patientId: patient?.id,
      },
    });

    res.json({ reply });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "AI failed" });
  }
};


/**
 * GET CHAT HISTORY
 */
export const getDoctorChats = async (req, res) => {
  try {
    const patientId = Number(req.query.patientId);

    const chats = await prisma.doctorChat.findMany({
      where: { patientId },
      orderBy: { createdAt: "asc" },
    });

    res.json(chats);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
};
/**
 * store medical record in DB
 */
// export const generateMedicalRecordFromChat = async (req, res) => {
//   try {
//     const { patient } = req.body;

//     if (!patient?.id) {
//       return res.status(400).json({ error: "Patient is required" });
//     }

//     // 1. Fetch chat history
//     const chats = await prisma.doctorChat.findMany({
//       where: { patientId: patient.id },
//       orderBy: { createdAt: "asc" },
//       take: 20,
//     });

//     const conversation = chats
//       .map((c) => `Doctor: ${c.message}\nAI: ${c.reply}`)
//       .join("\n\n");

//     // 2. Call AI
//     const response = await axios.post(
//       "https://openrouter.ai/api/v1/chat/completions",
//       {
//         model: "meta-llama/llama-3.1-8b-instruct",
//         messages: [
//           {
//             role: "system",
//             content: `
// You are a senior clinical assistant doctor.

// CRITICAL RULES:
// - Return ONLY valid JSON
// - NO markdown, NO explanation, NO text before or after JSON
// - NEVER leave fields empty
// - NEVER use "unknown" or "unclear"

// You MUST output in this format:

// {
//   "symptoms": "string",
//   "diagnosis": "most likely medical condition (be specific)",
//   "vitals": "string",
//   "prescription": "string",
//   "notes": "string"
// }

// Guidelines:
// - diagnosis must be a real medical condition (e.g. "Acute bronchitis", "Hypertension")
// - infer from conversation if needed
// - be clinically accurate and concise
//             `,
//           },
//           {
//             role: "user",
//             content: `
// Patient Information:
// Name: ${patient.name}
// Age: ${patient.age}
// Gender: ${patient.gender}

// Chat History:
// ${conversation || "No chat history available"}
//             `,
//           },
//         ],
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     // 3. Clean AI response safely
//     let raw = response.data.choices[0].message.content;

//     // remove markdown if any
//     raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

//     // extract JSON block safely
//     const start = raw.indexOf("{");
//     const end = raw.lastIndexOf("}");

//     if (start === -1 || end === -1) {
//       console.log("Invalid AI output:", raw);
//       return res.status(500).json({ error: "Invalid AI response format" });
//     }

//     const jsonString = raw.substring(start, end + 1);

//     let record;
//     try {
//       record = JSON.parse(jsonString);
//     } catch (err) {
//       console.log("JSON parse error:", jsonString);
//       return res.status(500).json({ error: "Failed to parse AI response" });
//     }

//     // 4. Fallback safety (VERY IMPORTANT)
//     const safeRecord = {
//       symptoms: record.symptoms || "Not clearly identified",
//       diagnosis: record.diagnosis || "Requires clinical evaluation",
//       vitals: record.vitals || "Not available",
//       prescription: record.prescription || "To be decided by doctor",
//       notes: record.notes || "AI-generated medical summary",
//     };

//     // 5. Return result
//     res.json(safeRecord);
//   } catch (err) {
//     console.log("Generate Medical Record Error:", err);
//     res.status(500).json({ error: "Failed to generate medical record" });
//   }
// };

/**
 *Medical Report PDF  
 */

export const generatePDFMedicalReport = async (req, res) => {
  try {
    const { patient } = req.body;

    if (!patient?.id) {
      return res.status(400).json({
        error: "Patient required",
      });
    }

    // GET CHAT HISTORY
    const chats = await prisma.doctorChat.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "asc" },
      take: 30,
    });

    const conversation = chats
      .map(
        (c) =>
          `Doctor: ${c.message}\nAI: ${c.reply}`
      )
      .join("\n\n");

    // AI CALL
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3.1-8b-instruct",
        messages: [
          {
            role: "system",
            content: `
You are a senior clinical assistant doctor.

CRITICAL RULES:
- Return ONLY valid JSON
- NO markdown
- NO explanation
- NO text outside JSON
- NEVER leave fields empty
- NEVER use "unknown"
- Use medically accurate clinical language

You MUST return:

{
  "symptoms": "string",
  "diagnosis": "string",
  "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "vitals": "string",
  "prescription": "string",
  "red_flags": ["string"],
  "recommendations": "string",
  "notes": "string"
}

Rules:
- diagnosis must be specific
- risk_level depends on symptoms + patient status
- use patient blood group and status
- infer probable vitals if not available
- recommendations must be actionable
- red_flags must contain serious warning signs
- NEVER return empty arrays or empty strings
`,
          },
          {
            role: "user",
            content: `
Patient:
Name: ${patient.name}
Age: ${patient.age}
Gender: ${patient.gender}
Blood Group: ${patient.bloodGroup}

Chat History:
${conversation || "No chat history"}
            `,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // CLEAN AI RESPONSE
    let raw =
      response.data.choices[0].message.content;

    raw = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    const report = JSON.parse(
      raw.substring(start, end + 1)
    );

    // SAVE INTO DATABASE
    await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        symptoms: report.symptoms,
        diagnosis: report.diagnosis,
        vitals: report.vitals,
        prescription: report.prescription,
        notes: report.notes,
        riskLevel: report.risk_level,
        redFlags: JSON.stringify(report.red_flags),
        recommendations: report.recommendations,
      },
    });

    // RETURN SAME REPORT
    res.json(report);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "AI report generation failed",
    });
  }
};