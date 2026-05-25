import PDFDocument from "pdfkit";

export const generateMedicalPDFController = async (req, res) => {
  try {
    const report = req.body;

    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    // RESPONSE HEADERS
    res.setHeader("Content-Type", "application/pdf");

    const fileName = `medical-report-${report.patientName}.pdf`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}`
    );


    // PIPE PDF
    doc.pipe(res);

    // =========================
    // HEADER
    // =========================

    doc
      .fontSize(22)
      .text("AI DOCTOR PRO", {
        align: "center",
      });

    doc
      .fontSize(16)
      .text("Medical Report", {
        align: "center",
      });

    doc.moveDown(2);

    // =========================
    // PATIENT INFORMATION
    // =========================

    doc
      .fontSize(16)
      .text("Patient Information", {
        underline: true,
      });

    doc.moveDown(0.5);

    doc.fontSize(12);

    doc.text(`Patient Name: ${report.patientName || "N/A"}`);
    doc.text(`Age: ${report.age || "N/A"}`);
    doc.text(`Gender: ${report.gender || "N/A"}`);
    doc.text(`Blood Group: ${report.bloodGroup || "N/A"}`);
    doc.text(`Status: ${report.status || "ACTIVE"}`);

    doc.moveDown(1.5);

    // =========================
    // CLINICAL SUMMARY
    // =========================

    doc
      .fontSize(16)
      .text("Clinical Summary", {
        underline: true,
      });

    doc.moveDown(0.5);

    doc.fontSize(12);

    doc.text(
      `Diagnosis: ${report.diagnosis ||
      "General clinical evaluation required"
      }`
    );

    doc.text(
      `Risk Level: ${report.risk_level || "MEDIUM"
      }`
    );

    doc.moveDown(1.5);

    // =========================
    // SYMPTOMS
    // =========================

    doc
      .fontSize(16)
      .text("Symptoms", {
        underline: true,
      });

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .text(
        report.symptoms ||
        "No significant symptoms reported."
      );

    doc.moveDown(1.5);

    // =========================
    // VITALS
    // =========================

    doc
      .fontSize(16)
      .text("Vitals", {
        underline: true,
      });

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .text(
        report.vitals ||
        "Vitals stable at assessment."
      );

    doc.moveDown(1.5);

    // =========================
    // RED FLAGS
    // =========================

    doc
      .fontSize(16)
      .text("Red Flags", {
        underline: true,
      });

    doc.moveDown(0.5);

    doc.fontSize(12);

    if (
      report.red_flags &&
      report.red_flags.length > 0
    ) {
      report.red_flags.forEach((flag) => {
        doc.text(`• ${flag}`);
      });
    } else {
      doc.text(
        "No immediate critical warning signs identified."
      );
    }

    doc.moveDown(1.5);

    // =========================
    // PRESCRIPTION
    // =========================

    doc
      .fontSize(16)
      .text("Prescription", {
        underline: true,
      });

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .text(
        report.prescription ||
        "Clinical prescription not required currently."
      );

    doc.moveDown(1.5);

    // =========================
    // RECOMMENDATIONS
    // =========================

    doc
      .fontSize(16)
      .text("Recommendations", {
        underline: true,
      });

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .text(
        report.recommendations ||
        "Regular monitoring and follow-up advised."
      );

    doc.moveDown(1.5);

    // =========================
    // NOTES
    // =========================

    doc
      .fontSize(16)
      .text("Clinical Notes", {
        underline: true,
      });

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .text(
        report.notes ||
        "No additional clinical notes."
      );

    doc.moveDown(2);

    // =========================
    // FOOTER
    // =========================

    doc
      .fontSize(10)
      .text(
        `Generated on: ${new Date().toLocaleString()}`,
        {
          align: "right",
        }
      );

    // FINALIZE PDF
    doc.end();

  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "PDF generation failed",
    });
  }
};