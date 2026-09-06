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
    
    // Update each doctor to add email field
    for (const doctor of doctors) {
      if (!doctor.email) {
        // Create email based on name or use a default
        const baseName = doctor.name ? doctor.name.replace(/\s+/g, '.').toLowerCase().replace(/\.{2,}/g, '.') : `doctor${doctor._id}`;
        const email = `${baseName}@hospital.com`;
        console.log(`Updating doctor ${doctor.name} (${doctor._id}) with email ${email}`);
        
        await Doctor.updateOne(
          { _id: doctor._id },
          { $set: { email: email, password: '$2b$10$examplePasswordHash' } }
        );
      }
    }
    
    console.log('All doctors updated with email fields');
    
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
    console.log(`Found ${labDoctors.length} lab doctors`);
    
    for (const labDoctor of labDoctors) {
      if (!labDoctor.email) {
        const baseName = labDoctor.name ? labDoctor.name.replace(/\s+/g, '.').toLowerCase().replace(/\.{2,}/g, '.') : `labdoctor${labDoctor._id}`;
        const email = `${baseName}@lab.hospital.com`;
        console.log(`Updating lab doctor ${labDoctor.name} (${labDoctor._id}) with email ${email}`);
        
        await LabDoctor.updateOne(
          { _id: labDoctor._id },
          { $set: { email: email, password: '$2b$10$examplePasswordHash' } }
        );
      }
    }
    
    console.log('All lab doctors updated with email fields');
    
  } catch (error) {
    console.error('Error updating documents:', error);
  } finally {
    mongoose.connection.close();
  }
});