import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
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
    
    // Find all doctors
    const doctors = await Doctor.find({});
    console.log(`Found ${doctors.length} doctors`);
    
    // Update each doctor to fix email field
    for (const doctor of doctors) {
      if (doctor.email && doctor.email.includes('..')) {
        // Fix double dots in email
        const fixedEmail = doctor.email.replace(/\.{2,}/g, '.');
        console.log(`Fixing email for doctor ${doctor.name}: ${doctor.email} -> ${fixedEmail}`);
        
        await Doctor.updateOne(
          { _id: doctor._id },
          { $set: { email: fixedEmail } }
        );
      }
    }
    
    console.log('All doctor emails fixed');
    
    // Also fix LabDoctor collection
    const labDoctorSchema = new mongoose.Schema({
      name: String,
      email: String,
      mobile: String,
      specialization: String,
      password: String
    });
    
    const LabDoctor = mongoose.model('LabDoctor', labDoctorSchema, 'labdoctors');
    const labDoctors = await LabDoctor.find({});
    console.log(`Found ${labDoctors.length} lab doctors`);
    
    for (const labDoctor of labDoctors) {
      if (labDoctor.email && labDoctor.email.includes('..')) {
        // Fix double dots in email
        const fixedEmail = labDoctor.email.replace(/\.{2,}/g, '.');
        console.log(`Fixing email for lab doctor ${labDoctor.name}: ${labDoctor.email} -> ${fixedEmail}`);
        
        await LabDoctor.updateOne(
          { _id: labDoctor._id },
          { $set: { email: fixedEmail } }
        );
      }
    }
    
    console.log('All lab doctor emails fixed');
    
  } catch (error) {
    console.error('Error fixing emails:', error);
  } finally {
    mongoose.connection.close();
  }
});