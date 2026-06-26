import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3000';

async function runTests() {
  console.log('=== STARTING ACCOUNT MANAGEMENT TEST CASES ===\n');
  let testCount = 0;
  let passedCount = 0;

  function report(name, status, details = '') {
    testCount++;
    if (status === 'PASSED') {
      passedCount++;
      console.log(`[PASSED] Test Case ${testCount}: ${name}`);
    } else {
      console.log(`[FAILED] Test Case ${testCount}: ${name}`);
      if (details) console.log(`         Detail: ${details}`);
    }
  }

  // Helper: Login
  async function login(email, password) {
    try {
      const res = await axios.post(`${GATEWAY_URL}/api/auth/login`, { email, password });
      return res.data.access_token;
    } catch (err) {
      return null;
    }
  }

  // --- TEST CASE 1: Fetch users without token (Unauthorized/Forbidden) ---
  try {
    await axios.get(`${GATEWAY_URL}/api/admin/users`);
    report('Fetch users without token', 'FAILED', 'Expected 403 Forbidden, but got 200 OK');
  } catch (err) {
    if (err.response?.status === 403) {
      report('Fetch users without token', 'PASSED');
    } else {
      report('Fetch users without token', 'FAILED', `Expected 403, got ${err.response?.status}`);
    }
  }

  // --- TEST CASE 2: Fetch users with buyer token (Forbidden) ---
  const buyerToken = await login('buyer@gmail.com', '123456');
  if (!buyerToken) {
    report('Login as buyer for test preparation', 'FAILED', 'Could not login as buyer@gmail.com');
  } else {
    try {
      await axios.get(`${GATEWAY_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${buyerToken}` }
      });
      report('Fetch users with buyer token', 'FAILED', 'Expected 403 Forbidden, but got 200 OK');
    } catch (err) {
      if (err.response?.status === 403) {
        report('Fetch users with buyer token', 'PASSED');
      } else {
        report('Fetch users with buyer token', 'FAILED', `Expected 403, got ${err.response?.status}`);
      }
    }
  }

  // --- TEST CASE 3: Fetch users with admin token (Success) ---
  const adminToken = await login('admin@gmail.com', '123456');
  let usersList = [];
  if (!adminToken) {
    report('Login as admin', 'FAILED', 'Could not login as admin@gmail.com');
  } else {
    try {
      const res = await axios.get(`${GATEWAY_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      usersList = res.data;
      if (Array.isArray(usersList)) {
        report('Fetch users with admin token', 'PASSED', `Fetched ${usersList.length} users`);
      } else {
        report('Fetch users with admin token', 'FAILED', 'Response data is not an array');
      }
    } catch (err) {
      report('Fetch users with admin token', 'FAILED', err.message);
    }
  }

  // --- TEST CASE 4: Search & Sort users (Success) ---
  if (adminToken) {
    try {
      const res = await axios.get(`${GATEWAY_URL}/api/admin/users?search=buyer&role=user`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const filtered = res.data;
      const allMatch = filtered.every(u => u.email.includes('buyer') || u.full_name?.toLowerCase().includes('buyer'));
      if (allMatch && filtered.length > 0) {
        report('Search and Filter users by query', 'PASSED');
      } else {
        report('Search and Filter users by query', 'FAILED', `Unexpected filter result count: ${filtered.length}`);
      }
    } catch (err) {
      report('Search and Filter users by query', 'FAILED', err.message);
    }
  }

  // --- TEST CASE 5: Suspend/Lock User Account ---
  let buyerUser = usersList.find(u => u.email === 'buyer@gmail.com');
  if (!buyerUser) {
    report('Find buyer user id', 'FAILED', 'Could not find buyer@gmail.com in user list');
  } else if (!adminToken) {
    report('Lock user account', 'FAILED', 'Admin token is missing');
  } else {
    try {
      // Suspend
      await axios.put(`${GATEWAY_URL}/api/admin/users/${buyerUser.id}/status`, 
        { status: 'suspended' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      report('Lock/Suspend user account', 'PASSED');
    } catch (err) {
      report('Lock/Suspend user account', 'FAILED', err.message);
    }
  }

  // --- TEST CASE 6: Verify Suspended User Cannot Login ---
  if (buyerUser) {
    try {
      await axios.post(`${GATEWAY_URL}/api/auth/login`, {
        email: 'buyer@gmail.com',
        password: '123456'
      });
      report('Verify suspended user cannot login', 'FAILED', 'Suspended user logged in successfully (should fail)');
    } catch (err) {
      if (err.response?.status === 403 && err.response.data?.message?.includes('đình chỉ')) {
        report('Verify suspended user cannot login', 'PASSED');
      } else {
        report('Verify suspended user cannot login', 'FAILED', `Expected 403 Forbidden with suspend message, got ${err.response?.status}: ${JSON.stringify(err.response?.data)}`);
      }
    }
  }

  // --- TEST CASE 7: Reactivate/Unlock User Account ---
  if (buyerUser && adminToken) {
    try {
      await axios.put(`${GATEWAY_URL}/api/admin/users/${buyerUser.id}/status`, 
        { status: 'active' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      report('Unlock/Reactivate user account', 'PASSED');
    } catch (err) {
      report('Unlock/Reactivate user account', 'FAILED', err.message);
    }
  }

  // --- TEST CASE 8: Verify User Can Login Again After Unlock ---
  if (buyerUser) {
    const newBuyerToken = await login('buyer@gmail.com', '123456');
    if (newBuyerToken) {
      report('Verify user can login again after unlock', 'PASSED');
    } else {
      report('Verify user can login again after unlock', 'FAILED', 'Could not login as buyer after unlocking');
    }
  }

  console.log('\n=== TEST RUN COMPLETED ===');
  console.log(`Summary: ${passedCount} / ${testCount} passed.`);
  if (passedCount === testCount) {
    console.log('STATUS: ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    console.log('STATUS: SOME TESTS FAILED. PLEASE CHECK.');
  }
}

runTests();
