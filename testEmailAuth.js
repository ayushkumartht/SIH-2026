import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.48:5000/api/auth';

// Test data for different user types
const testUsers = {
  doctor: {
    name: 'Dr. Test Smith',
    email: 'doctor_test@test.com',
    password: 'password123',
    mobile: '9876543230',
    specialization: 'Cardiologist',
    role: 'doctor'
  },
  lab: {
    name: 'Dr. Test Doe',
    email: 'lab_test@test.com',
    password: 'password123',
    mobile: '9876543231',
    specialization: 'Pathologist',
    role: 'lab'
  },
  admin: {
    name: 'Admin Test',
    email: 'admin_test@test.com',
    password: 'password123',
    role: 'admin'
  },
  receptionist: {
    name: 'Receptionist Test',
    email: 'reception_test@test.com',
    password: 'password123',
    role: 'receptionist'
  }
};

async function testAuthFlows() {
  console.log('Testing email-based authentication flows...\n');
  
  try {
    // Test Doctor Signup
    console.log('Testing doctor signup...');
    const doctorSignupResponse = await axios.post(`${API_BASE_URL}/signup`, testUsers.doctor);
    console.log('Doctor Signup Response:', JSON.stringify(doctorSignupResponse.data, null, 2));
    
    // Test Doctor Login
    console.log('\nTesting doctor login...');
    const doctorLoginResponse = await axios.post(`${API_BASE_URL}/login`, {
      email: testUsers.doctor.email,
      password: testUsers.doctor.password
    });
    console.log('Doctor Login Response:', JSON.stringify(doctorLoginResponse.data, null, 2));
    
    // Test Lab Doctor Signup
    console.log('\nTesting lab doctor signup...');
    const labSignupResponse = await axios.post(`${API_BASE_URL}/signup`, testUsers.lab);
    console.log('Lab Doctor Signup Response:', JSON.stringify(labSignupResponse.data, null, 2));
    
    // Test Lab Doctor Login
    console.log('\nTesting lab doctor login...');
    const labLoginResponse = await axios.post(`${API_BASE_URL}/login`, {
      email: testUsers.lab.email,
      password: testUsers.lab.password
    });
    console.log('Lab Doctor Login Response:', JSON.stringify(labLoginResponse.data, null, 2));
    
    // Test Admin Signup
    console.log('\nTesting admin signup...');
    const adminSignupResponse = await axios.post(`${API_BASE_URL}/signup`, testUsers.admin);
    console.log('Admin Signup Response:', JSON.stringify(adminSignupResponse.data, null, 2));
    
    // Test Admin Login
    console.log('\nTesting admin login...');
    const adminLoginResponse = await axios.post(`${API_BASE_URL}/login`, {
      email: testUsers.admin.email,
      password: testUsers.admin.password
    });
    console.log('Admin Login Response:', JSON.stringify(adminLoginResponse.data, null, 2));
    
    // Test Receptionist Signup
    console.log('\nTesting receptionist signup...');
    const receptionistSignupResponse = await axios.post(`${API_BASE_URL}/signup`, testUsers.receptionist);
    console.log('Receptionist Signup Response:', JSON.stringify(receptionistSignupResponse.data, null, 2));
    
    // Test Receptionist Login
    console.log('\nTesting receptionist login...');
    const receptionistLoginResponse = await axios.post(`${API_BASE_URL}/login`, {
      email: testUsers.receptionist.email,
      password: testUsers.receptionist.password
    });
    console.log('Receptionist Login Response:', JSON.stringify(receptionistLoginResponse.data, null, 2));
    
    console.log('\n✅ All authentication flows tested successfully!');
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testAuthFlows();