import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  // List all collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  // Check if Doctor collection exists and has data
  try {
    const Doctor = mongoose.model('Doctor', new mongoose.Schema({}), 'doctors');
    const doctorCount = await Doctor.countDocuments();
    console.log(`Doctor collection has ${doctorCount} documents`);
    
    if (doctorCount > 0) {
      const doctors = await Doctor.find().limit(5);
      console.log('Sample doctors:', JSON.stringify(doctors, null, 2));
    }
  } catch (error) {
    console.log('Doctor collection error:', error.message);
  }
  
  // Check if LabDoctor collection exists and has data
  try {
    const LabDoctor = mongoose.model('LabDoctor', new mongoose.Schema({}), 'labdoctors');
    const labDoctorCount = await LabDoctor.countDocuments();
    console.log(`LabDoctor collection has ${labDoctorCount} documents`);
    
    if (labDoctorCount > 0) {
      const labDoctors = await LabDoctor.find().limit(5);
      console.log('Sample lab doctors:', JSON.stringify(labDoctors, null, 2));
    }
  } catch (error) {
    console.log('LabDoctor collection error:', error.message);
  }
  
  // Check if Staff collection exists and has data
  try {
    const Staff = mongoose.model('Staff', new mongoose.Schema({}), 'staffs');
    const staffCount = await Staff.countDocuments();
    console.log(`Staff collection has ${staffCount} documents`);
    
    if (staffCount > 0) {
      const staff = await Staff.find().limit(5);
      console.log('Sample staff:', JSON.stringify(staff, null, 2));
    }
  } catch (error) {
    console.log('Staff collection error:', error.message);
  }
  
  mongoose.connection.close();
});