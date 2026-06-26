import axios from 'axios';

async function debug() {
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'buyer@gmail.com',
      password: '123456'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.log('Error Status:', err.response?.status);
    console.log('Error Data:', err.response?.data);
    console.log('Error Message:', err.message);
  }
}
debug();
