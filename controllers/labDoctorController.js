export const getLabDoctorDetails = async (req, res) => {
  try {
    // Lab doctor is already validated by middleware and attached to req.labDoctor
    const labDoctor = req.labDoctor;
    
    res.status(200).json({
      success: true,
      labDoctor
    });
  } catch (error) {
    console.error("Error fetching lab doctor details:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching lab doctor details",
      error: error.message 
    });
  }
};

export const addLabPatient = async (req, res) => {
  try {
    // Lab doctor is already validated by middleware and attached to req.labDoctor
    const labDoctor = req.labDoctor;
    
    const { name, age, gender, contact, history } = req.body;
    const parsedAge = parseInt(age, 10);
    if (!name || !Number.isInteger(parsedAge) || !gender) {
      return res.status(400).json({
        success: false,
        message: "name, age and gender are required"
      });
    }

    // Create new patient object
    const newPatient = {
      name,
      age: parsedAge,
      gender,
      contact: contact || '',
      history: history || '',
      reports: []
    };

    // Add patient to lab doctor's patients array
    labDoctor.patients.push(newPatient);
    await labDoctor.save();

    res.status(201).json({
      success: true,
      message: "Patient added successfully",
      patient: newPatient
    });
  } catch (error) {
    console.error("Error adding patient:", error);
    res.status(500).json({ 
      success: false,
      message: "Error adding patient",
      error: error.message 
    });
  }
};

export const getLabPatients = async (req, res) => {
  try {
    // Lab doctor is already validated by middleware and attached to req.labDoctor
    const labDoctor = req.labDoctor;
    
    res.status(200).json({
      success: true,
      patients: labDoctor.patients || []
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching patients",
      error: error.message 
    });
  }
};

export const addLabReport = async (req, res) => {
  try {
    // Lab doctor is already validated by middleware and attached to req.labDoctor
    const labDoctor = req.labDoctor;
    const { patientId, title, description, fileUrl } = req.body;

    // Find patient in lab doctor's patients array
    const patientIndex = labDoctor.patients.findIndex(
      (patient) => patient._id.toString() === patientId
    );

    if (patientIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: "Patient not found" 
      });
    }

    // Create new report
    const newReport = {
      title,
      description: description || '',
      fileUrl: fileUrl || '',
      createdAt: new Date()
    };

    // Add report to patient's reports
    labDoctor.patients[patientIndex].reports.push(newReport);
    await labDoctor.save();

    res.status(201).json({
      success: true,
      message: "Report added successfully",
      report: newReport
    });
  } catch (error) {
    console.error("Error adding report:", error);
    res.status(500).json({ 
      success: false,
      message: "Error adding report",
      error: error.message 
    });
  }
};

export const getLabReports = async (req, res) => {
  try {
    // Lab doctor is already validated by middleware and attached to req.labDoctor
    const labDoctor = req.labDoctor;

    // Collect all reports from all patients
    const allReports = [];
    labDoctor.patients.forEach(patient => {
      if (patient.reports && patient.reports.length > 0) {
        patient.reports.forEach(report => {
          allReports.push({
            ...report,
            patientId: patient._id,
            patientName: patient.name
          });
        });
      }
    });

    res.status(200).json({
      success: true,
      reports: allReports
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ 
      success: false,
      message: "Error fetching reports",
      error: error.message 
    });
  }
};