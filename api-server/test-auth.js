// native fetch

async function testAuth() {
  const API_URL = 'http://localhost:9000';
  const email = `testuser_${Date.now()}@example.com`;
  const password = 'testpassword123';
  
  console.log(`Testing auth endpoints...`);

  // 1. Test Signup
  console.log(`\n[1] Testing Signup with email: ${email}`);
  try {
    const signupRes = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email, password })
    });
    const signupData = await signupRes.json();
    console.log(`Signup Status: ${signupRes.status}`);
    console.log(`Signup Response:`, signupData);

    if (!signupRes.ok || signupData.status !== 'success') {
      console.error('❌ Signup failed!');
      return;
    }
    console.log('✅ Signup successful!');
  } catch (err) {
    console.error('❌ Signup error:', err.message);
    return;
  }

  // 2. Test Signin
  console.log(`\n[2] Testing Signin...`);
  let token = null;
  try {
    const signinRes = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const signinData = await signinRes.json();
    console.log(`Signin Status: ${signinRes.status}`);
    console.log(`Signin Response:`, signinData);

    if (!signinRes.ok || signinData.status !== 'success') {
      console.error('❌ Signin failed!');
      return;
    }
    token = signinData.data.token;
    console.log('✅ Signin successful! Token received.');
  } catch (err) {
    console.error('❌ Signin error:', err.message);
    return;
  }

  // 3. Test Me
  console.log(`\n[3] Testing /auth/me with token...`);
  try {
    const meRes = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meData = await meRes.json();
    console.log(`Me Status: ${meRes.status}`);
    console.log(`Me Response:`, meData);

    if (!meRes.ok || meData.status !== 'success') {
      console.error('❌ /auth/me failed!');
      return;
    }
    console.log('✅ /auth/me successful! User fetched securely.');
  } catch (err) {
    console.error('❌ /auth/me error:', err.message);
    return;
  }

  console.log(`\n🎉 All auth endpoints are working perfectly!`);
}

testAuth();
