import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Staff from '../models/Staff.js';
import Doctor from '../models/doctor.js';
import LabDoctor from '../models/LabDoctor.js';

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, role, mobile, specialization } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, email, password, and role are required',
        statusCode: 400 
      });
    }

    // Validate mobile for doctor and lab roles
    if ((role === 'doctor' || role === 'lab') && !mobile) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mobile number is required for doctor and lab roles',
        statusCode: 400 
      });
    }
    
    let user;
    let token;
    
    // Hash password for all user types
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Hashed password for', role, ':', hashedPassword);
    
    switch (role) {
      case 'doctor':
        // Check if doctor already exists
        const existingDoctor = await Doctor.findOne({ 
          $or: [
            { email: email.toLowerCase() },
            { mobile }
          ]
        });
        if (existingDoctor) {
          return res.status(400).json({ 
            success: false, 
            error: 'Doctor with this email or mobile already exists',
            statusCode: 400 
          });
        }
        
        // Create new doctor
        user = await Doctor.create({
          name,
          email: email.toLowerCase(),
          mobile,
          password: hashedPassword,
          specialization: specialization || 'General Physician',
          availability: true,
          status: 'active'
        });
        
        console.log('Created doctor user:', user.email, 'with id:', user._id);
        
        // Generate JWT token
        token = jwt.sign(
          { id: user._id, role: 'doctor', email: user.email }, 
          process.env.JWT_SECRET, 
          { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );
        
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
        
      case 'lab':
        // Check if lab doctor already exists
        const existingLabDoctor = await LabDoctor.findOne({ 
          $or: [
            { email: email.toLowerCase() },
            { mobile }
          ]
        });
        if (existingLabDoctor) {
          console.log('Lab doctor already exists with email:', email, 'or mobile:', mobile);
          return res.status(400).json({ 
            success: false, 
            error: 'Lab Doctor with this email or mobile already exists',
            statusCode: 400 
          });
        }
        
        console.log('Creating new lab doctor with:', { name, email: email.toLowerCase(), mobile, specialization });
        
        // Create new lab doctor
        try {
          user = await LabDoctor.create({
            name,
            email: email.toLowerCase(),
            mobile,
            password: hashedPassword,
            specialization: specialization || 'Lab Doctor'
          });
          
          console.log('Successfully created lab doctor user:', user.email, 'with id:', user._id);
          console.log('Lab doctor password hash:', user.password);
          
          // Verify that the user was actually saved
          const savedUser = await LabDoctor.findById(user._id);
          console.log('Verified saved user:', savedUser ? savedUser.email : 'Not found');
          if (savedUser) {
            console.log('Saved user password hash:', savedUser.password);
          }
        } catch (createError) {
          console.error('Error creating lab doctor:', createError);
          return res.status(500).json({ 
            success: false, 
            error: 'Error creating lab doctor: ' + createError.message,
            statusCode: 500 
          });
        }
        
        // Generate JWT token
        token = jwt.sign(
          { id: user._id, role: 'lab', email: user.email }, 
          process.env.JWT_SECRET, 
          { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );
        
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
        
      default: // admin, receptionist
        // Check if staff already exists
        const existingStaff = await Staff.findOne({ email: email.toLowerCase() });
        if (existingStaff) {
          return res.status(400).json({ 
            success: false, 
            error: 'User with this email already exists',
            statusCode: 400 
          });
        }
        
        // Create new staff member
        user = await Staff.create({
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role
        });
        
        console.log('Created staff user:', user.email, 'with id:', user._id);
        
        // Generate JWT token
        token = jwt.sign(
          { id: user._id, role: user.role, email: user.email }, 
          process.env.JWT_SECRET, 
          { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );
        
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
    }
  } catch (e) {
    console.error('Signup error:', e);
    next(e);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required',
        statusCode: 400 
      });
    }
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Email provided:', email);
    console.log('Password provided:', password);
    console.log('Email lowercased:', email.toLowerCase());
    
    // Try to find user in all collections
    let user = null;
    let role = null;
    
    // Check doctors first
    console.log('Searching for doctor...');
    user = await Doctor.findOne({ email: email.toLowerCase() });
    if (user) {
      role = 'doctor';
      console.log('Found doctor user:', user.email, 'with id:', user._id);
    } else {
      console.log('No doctor found with email:', email.toLowerCase());
    }
    
    // Check lab doctors if not found
    if (!user) {
      console.log('Searching for lab doctor...');
      // Try multiple search approaches
      user = await LabDoctor.findOne({ email: email.toLowerCase() });
      if (user) {
        role = 'lab';
        console.log('Found lab doctor user (lowercase search):', user.email, 'with id:', user._id);
      } else {
        console.log('No lab doctor found with lowercase email:', email.toLowerCase());
        // Try without lowercase conversion
        user = await LabDoctor.findOne({ email: email });
        if (user) {
          role = 'lab';
          console.log('Found lab doctor user (original case search):', user.email, 'with id:', user._id);
        } else {
          console.log('No lab doctor found with original case email:', email);
        }
      }
      
      // If still not found, let's list all lab doctors to see what's in the database
      if (!user) {
        console.log('Listing all lab doctors in database:');
        const allLabDoctors = await LabDoctor.find({}, 'email name');
        allLabDoctors.forEach(doc => {
          console.log('  -', doc.email, '(', doc.name, ')');
        });
      }
    }
    
    // Check staff if not found
    if (!user) {
      console.log('Searching for staff...');
      user = await Staff.findOne({ email: email.toLowerCase() });
      if (user) {
        role = user.role; // admin or receptionist
        console.log('Found staff user:', user.email, 'with id:', user._id, 'role:', role);
      } else {
        console.log('No staff user found with email:', email.toLowerCase());
      }
    }
    
    // If user not found in any collection
    if (!user) {
      console.log('!!! USER NOT FOUND IN ANY COLLECTION !!!');
      console.log('Requested email:', email);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials - User not found',
        statusCode: 401 
      });
    }
    
    console.log('=== PASSWORD COMPARISON ===');
    console.log('User found:', user.email, 'role:', role);
    console.log('Stored password hash:', user.password);
    console.log('Password length check - provided:', password.length, 'stored:', user.password.length);
    
    // Compare password
    console.log('Starting password comparison...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('!!! PASSWORD COMPARISON FAILED !!!');
      console.log('Provided password:', password);
      console.log('Stored hash:', user.password);
      
      // Test with a known hash to verify bcrypt is working
      try {
        const testResult = await bcrypt.compare('123456', '$2a$10$N.zmdr9k7uOCQb0bta/OauRxaOKSr.QhqyD2R5FKvMQjmHoLkm5Sy');
        console.log('Test comparison with known hash (should be false):', testResult);
      } catch (testError) {
        console.log('Test comparison error:', testError);
      }
      
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials - Password mismatch',
        statusCode: 401 
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
    
    // Return user data based on role
    let userData;
    switch (role) {
      case 'doctor':
        userData = {
          id: user._id,
          name: user.name,
          role: 'doctor',
          email: user.email,
          mobile: user.mobile,
          specialization: user.specialization,
          createdAt: user.createdAt
        };
        break;
      case 'lab':
        userData = {
          id: user._id,
          name: user.name,
          role: 'lab',
          email: user.email,
          mobile: user.mobile,
          specialization: user.specialization,
          createdAt: user.createdAt
        };
        break;
      default: // admin, receptionist
        userData = {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email,
          createdAt: user.createdAt
        };
    }
    
    console.log('Login successful for user:', user.email, 'role:', role);
    
    return res.json({ 
      success: true, 
      data: { 
        token, 
        user: userData
      } 
    });
  } catch (e) { 
    console.error('Login error:', e);
    next(e); 
  }
};