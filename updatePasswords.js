import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Hash a default password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Get the Doctor model with the correct schema
    const doctorSchema = new mongoose.Schema({
      name: String,
      email: String,
      mobile: String,
      specialization: String,
      availability: Boolean,
      status: String,
      password: String
    });
    
    const Doctor = mongoose.model('Doctor', doctorSchema, 'doctors');
    
    // Update all doctors with proper password
    const doctors = await Doctor.find({});
    console.log(`Found ${doctors.length} doctors to update`);
    
    for (const doctor of doctors) {
      console.log(`Updating password for doctor ${doctor.name} (${doctor.email})`);
      await Doctor.updateOne(
        { _id: doctor._id },
        { $set: { password: hashedPassword } }
      );
    }
    
    console.log('All doctors updated with proper passwords');
    
    // Also update LabDoctor collection
    const labDoctorSchema = new mongoose.Schema({
      name: String,
      email: String,
      mobile: String,
      specialization: String,
      password: String
    });
    
    const LabDoctor = mongoose.model('LabDoctor', labDoctorSchema, 'labdoctors');
    const labDoctors = await LabDoctor.find({});
    console.log(`Found ${labDoctors.length} lab doctors to update`);
    
    for (const labDoctor of labDoctors) {
      console.log(`Updating password for lab doctor ${labDoctor.name} (${labDoctor.email})`);
      await LabDoctor.updateOne(
        { _id: labDoctor._id },
        { $set: { password: hashedPassword } }
      );
    }
    
    console.log('All lab doctors updated with proper passwords');
    
    // Also update Staff collection
    const staffSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String
    });
    
    const Staff = mongoose.model('Staff', staffSchema, 'staffs');
    const staff = await Staff.find({});
    console.log(`Found ${staff.length} staff members to update`);
    
    for (const staffMember of staff) {
      console.log(`Updating password for staff ${staffMember.name} (${staffMember.email})`);
      await Staff.updateOne(
        { _id: staffMember._id },
        { $set: { password: hashedPassword } }
      );
    }
    
    console.log('All staff members updated with proper passwords');
    
  } catch (error) {
    console.error('Error updating passwords:', error);
  } finally {
    mongoose.connection.close();
  }
});