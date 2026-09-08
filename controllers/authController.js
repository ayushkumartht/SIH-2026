import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Staff from '../models/Staff.js';
import Doctor from '../models/doctor.js';
import LabDoctor from '../models/LabDoctor.js';
import Patient from '../models/patient.js';
import Driver from '../models/Driver.js';

function signToken(id, role, email) {
  return jwt.sign({ id, role, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
}

function patientResponse(patient) {
  return {
    id: patient._id,
    name: patient.name,
    email: patient.email,
    role: 'patient',
    age: patient.age,
    gender: patient.gender,
    contact: patient.contact,
    doctor: patient.doctor,
    createdAt: patient.createdAt,
  };
}

export const patientSignup = async (req, res, next) => {
  try {
    const { name, email, password, age, gender, contact } = req.body;
    if (!name || !email || !password || !age || !gender || !contact) {
      return res.status(400).json({ success: false, error: 'Name, email, password, age, gender, and contact are required' });
    }
    if (!['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ success: false, error: 'Gender must be male, female, or other' });
    }
    const existingPatient = await Patient.findOne({ email: email.toLowerCase() });
    if (existingPatient) return res.status(409).json({ success: false, error: 'A patient with this email already exists' });
    const patient = await Patient.create({
      name: name.trim(), email: email.toLowerCase(), password: await bcrypt.hash(password, 10),
      age: Number(age), gender, contact: contact.trim(), doctor: null,
    });
    const token = signToken(patient._id, 'patient', patient.email);
    res.status(201).json({ success: true, data: { token, user: patientResponse(patient) } });
  } catch (error) { next(error); }
};

export const patientLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });
    const patient = await Patient.findOne({ email: email.toLowerCase() }).select('+password');
    if (!patient || !patient.password || !(await bcrypt.compare(password, patient.password))) {
      return res.status(401).json({ success: false, error: 'Invalid patient credentials' });
    }
    const token = signToken(patient._id, 'patient', patient.email);
    res.json({ success: true, data: { token, user: patientResponse(patient) } });
  } catch (error) { next(error); }
};

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, role, mobile, specialization } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, password, and role are required',
        statusCode: 400
      });
    }

    if ((role === 'doctor' || role === 'lab') && !mobile) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number is required for doctor and lab roles',
        statusCode: 400
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === 'doctor') {
      const existingDoctor = await Doctor.findOne({ $or: [{ email: email.toLowerCase() }, { mobile }] });
      if (existingDoctor) {
        return res.status(400).json({
          success: false,
          error: 'Doctor with this email or mobile already exists',
          statusCode: 400
        });
      }

      const user = await Doctor.create({
        name,
        email: email.toLowerCase(),
        mobile,
        password: hashedPassword,
        specialization: specialization || 'General Physician',
        availability: true,
        status: 'active'
      });

      const token = signToken(user._id, 'doctor', user.email);

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            role: 'doctor',
            email: user.email,
            mobile: user.mobile,
            specialization: user.specialization,
            createdAt: user.createdAt
          }
        }
      });
    }

    if (role === 'lab') {
      const existingLabDoctor = await LabDoctor.findOne({ $or: [{ email: email.toLowerCase() }, { mobile }] });
      if (existingLabDoctor) {
        return res.status(400).json({
          success: false,
          error: 'Lab Doctor with this email or mobile already exists',
          statusCode: 400
        });
      }

      const user = await LabDoctor.create({
        name,
        email: email.toLowerCase(),
        mobile,
        password: hashedPassword,
        specialization: specialization || 'Lab Doctor'
      });

      const token = signToken(user._id, 'lab', user.email);

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            role: 'lab',
            email: user.email,
            mobile: user.mobile,
            specialization: user.specialization,
            createdAt: user.createdAt
          }
        }
      });
    }

    // admin, receptionist, asha
    const existingStaff = await Staff.findOne({ email: email.toLowerCase() });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
        statusCode: 400
      });
    }

    const user = await Staff.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role
    });

    const token = signToken(user._id, user.role, user.email);

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email,
          createdAt: user.createdAt
        }
      }
    });
  } catch (e) {
    next(e);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        statusCode: 400
      });
    }

    const lowerEmail = email.toLowerCase();
    let user = await Doctor.findOne({ email: lowerEmail });
    let role = user ? 'doctor' : null;

    if (!user) {
      user = await LabDoctor.findOne({ email: lowerEmail });
      if (user) role = 'lab';
    }

    if (!user) {
      user = await Staff.findOne({ email: lowerEmail });
      if (user) role = user.role;
    }

    if (!user) {
      user = await Driver.findOne({ email: lowerEmail }).select('+password');
      if (user) role = 'driver';
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        statusCode: 401
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        statusCode: 401
      });
    }

    const token = signToken(user._id, role, user.email);

    let userData;
    if (role === 'doctor' || role === 'lab') {
      userData = {
        id: user._id,
        name: user.name,
        role,
        email: user.email,
        mobile: user.mobile,
        specialization: user.specialization,
        createdAt: user.createdAt
      };
    } else if (role === 'driver') {
      userData = {
        id: user._id,
        name: user.name,
        role,
        email: user.email,
        phone: user.phone,
        licenseNo: user.licenseNo,
        createdAt: user.createdAt
      };
    } else {
      userData = {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        createdAt: user.createdAt
      };
    }

    return res.json({
      success: true,
      data: {
        token,
        user: userData
      }
    });
  } catch (e) {
    next(e);
  }
};
