import mongoose from 'mongoose';
import Doctor from '../models/doctor.js';
import Patient from '../models/patient.js';

const getDoctorAndPatientFromParams = async (req, res, next) => {
  try {
    const { doctorId, patientId } = req.params;
    
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Doctor ID is required',
          details: 'doctorId parameter is missing from the request'
        }
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Doctor ID format',
          details: 'doctorId must be a valid MongoDB ObjectId'
        }
      });
    }
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Doctor not found',
          details: `No doctor found with ID: ${doctorId}`
        }
      });
    }
    
    req.doctorId = doctorId;
    req.doctor = doctor;
    
    if (patientId) {
      if (!mongoose.Types.ObjectId.isValid(patientId)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid Patient ID format',
            details: 'patientId must be a valid MongoDB ObjectId'
          }
        });
      }
      
      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Patient not found',
            details: `No patient found with ID: ${patientId}`
          }
        });
      }
      
      if (patient.doctor.toString() !== doctorId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            details: 'Patient does not belong to the specified doctor'
          }
        });
      }
      
      req.patientId = patientId;
      req.patient = patient;
    }
    
    next();
  } catch (error) {
    console.error('Error in getDoctorAndPatientFromParams middleware:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Server error while validating IDs',
        details: error.message
      }
    });
  }
};
const getDoctorIdFromParams = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Doctor ID is required',
          details: 'doctorId parameter is missing from the request'
        }
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Doctor ID format',
          details: 'doctorId must be a valid MongoDB ObjectId'
        }
      });
    }
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Doctor not found',
          details: `No doctor found with ID: ${doctorId}`
        }
      });
    }
    
    req.doctorId = doctorId;
    req.doctor = doctor;
    
    next();
  } catch (error) {
    console.error('Error in getDoctorIdFromParams middleware:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Server error while validating doctor ID',
        details: error.message
      }
    });
  }
};

export {
  getDoctorIdFromParams,
  getDoctorAndPatientFromParams
};