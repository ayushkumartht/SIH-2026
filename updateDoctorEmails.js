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
    // Get the Doctor model
    const Doctor = mongoose.model('Doctor', new mongoose.Schema({}), 'doctors');
    
    // Find all doctors without email field
    const doctorsWithoutEmail = await Doctor.find({ email: { $exists: false } });
    console.log(`Found ${doctorsWithoutEmail.length} doctors without email field`);
    
    // Update each doctor to add email field
    for (const doctor of doctorsWithoutEmail) {
      // Create a dummy email based on name and mobile
      const email = `${(doctor.name || 'doctor').replace(/\s+/g, '.').toLowerCase()}@hospital.com`;
      console.log(`Updating doctor ${doctor.name} with email ${email}`);
      
      await Doctor.updateOne(
        { _id: doctor._id },
        { $set: { email: email, password: '$2b$10$examplePasswordHash' } }
      );
    }
    
    console.log('All doctors updated with email fields');
    
    // Also update LabDoctor collection
    const LabDoctor = mongoose.model('LabDoctor', new mongoose.Schema({}), 'labdoctors');
    const labDoctorsWithoutEmail = await LabDoctor.find({ email: { $exists: false } });
    console.log(`Found ${labDoctorsWithoutEmail.length} lab doctors without email field`);
    
    for (const labDoctor of labDoctorsWithoutEmail) {
      const email = `${(labDoctor.name || 'labdoctor').replace(/\s+/g, '.').toLowerCase()}@lab.hospital.com`;
      console.log(`Updating lab doctor ${labDoctor.name} with email ${email}`);
      
      await LabDoctor.updateOne(
        { _id: labDoctor._id },
        { $set: { email: email, password: '$2b$10$examplePasswordHash' } }
      );
    }
    
    console.log('All lab doctors updated with email fields');
    
  } catch (error) {
    console.error('Error updating documents:', error);
  } finally {
    mongoose.connection.close();
  }
});