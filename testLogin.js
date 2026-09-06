import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.48:5000/api/auth';

async function testLogin() {
  console.log('Testing login with existing data...\n');
  
  try {
    // Try to login with existing doctor credentials
    console.log('Testing doctor login...');
    const doctorLoginResponse = await axios.post(`${API_BASE_URL}/login`, {
      email: 'dr.rohan.sharma@hospital.com',
      password: 'password123'
    });
    console.log('Doctor Login Response:', JSON.stringify(doctorLoginResponse.data, null, 2));
    
    console.log('\n✅ Login test completed successfully!');
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testLogin();