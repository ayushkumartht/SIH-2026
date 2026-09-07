import LabDoctor from '../models/LabDoctor.js';

const attachLabDoctor = async (req, res, next) => {
  try {
    const labDoctor = await LabDoctor.findById(req.user.id).select('-password');
    if (!labDoctor) {
      return res.status(404).json({
        success: false,
        message: 'Lab Doctor not found'
      });
    }

    req.doctorId = String(req.user.id);
    req.labDoctor = labDoctor;

    next();
  } catch (error) {
    console.error('Error in attachLabDoctor middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while loading lab doctor',
      error: error.message
    });
  }
};

export {
  attachLabDoctor
};
