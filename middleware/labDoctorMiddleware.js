import mongoose from 'mongoose';
import LabDoctor from '../models/LabDoctor.js';

const getLabDoctorIdFromParams = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Lab Doctor ID is required',
          details: 'doctorId parameter is missing from the request'
        }
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Lab Doctor ID format',
          details: 'doctorId must be a valid MongoDB ObjectId'
        }
      });
    }
    
    const labDoctor = await LabDoctor.findById(doctorId);
    if (!labDoctor) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Lab Doctor not found',
          details: `No lab doctor found with ID: ${doctorId}`
        }
      });
    }
    
    req.doctorId = doctorId;
    req.labDoctor = labDoctor;
    
    next();
  } catch (error) {
    console.error('Error in getLabDoctorIdFromParams middleware:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Server error while validating lab doctor ID',
        details: error.message
      }
    });
  }
};

export {
  getLabDoctorIdFromParams
};