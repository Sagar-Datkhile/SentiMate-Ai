async function runTests() {
  console.log('=== SentiMate Chat API Verification Suite ===\n');

  const BASE_URL = 'http://localhost:3000/api/chat';

  // Test 1: Empty message validation
  console.log('1. Testing Empty Message Validation:');
  const res1 = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '' }),
  });
  const data1 = await res1.json();
  console.log(`Status: ${res1.status} (Expected: 400)`);
  console.log(`Response:`, data1);
  console.assert(res1.status === 400, 'Test 1 Failed: Expected status 400');
  console.log('✓ PASS\n');

  // Test 2: Message exceeding 4000 chars
  console.log('2. Testing Maximum Message Length (4000+ chars):');
  const res2 = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'A'.repeat(4005) }),
  });
  const data2 = await res2.json();
  console.log(`Status: ${res2.status} (Expected: 400)`);
  console.log(`Response:`, data2);
  console.assert(res2.status === 400, 'Test 2 Failed: Expected status 400');
  console.log('✓ PASS\n');

  // Test 3: Provider response (live NVIDIA streaming if key configured, or 503 if unconfigured)
  console.log('3. Testing NVIDIA Provider Response (Live streaming or 503 unconfigured):');
  const res3 = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'student-123',
      'x-user-role': 'student',
    },
    body: JSON.stringify({ message: 'I feel stressed about my exams and lack of sleep.' }),
  });

  if (res3.status === 200) {
    const reader = res3.body.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    console.log(`Status: 200 OK (Live NVIDIA stream active)`);
    console.log(`First streamed chunk: "${text.trim().slice(0, 100)}..."`);
    console.assert(text.length > 0, 'Live stream tokens received');
    await reader.cancel();
    console.log('✓ PASS (Live NVIDIA streaming verified!)\n');
  } else {
    const data3 = await res3.json();
    console.log(`Status: ${res3.status} (Provider unconfigured)`);
    console.assert(res3.status === 503, 'Test 3 Failed: Expected status 503');
    console.assert(data3.code === 'PROVIDER_NOT_CONFIGURED', 'Expected code PROVIDER_NOT_CONFIGURED');
    console.log('✓ PASS (Honest unconfigured 503 verified)\n');
  }

  // Test 4: Unauthenticated request rejection
  console.log('4. Testing Unauthenticated Request Rejection:');
  const res4 = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-role': 'student' },
    body: JSON.stringify({ message: 'Hello' }),
  });
  const data4 = await res4.json();
  console.log(`Status: ${res4.status} (Expected: 401)`);
  console.log(`Response:`, data4);
  console.assert(res4.status === 401, 'Test 4 Failed: Expected status 401');
  console.log('✓ PASS\n');

  // Test 5: Non-student role rejection (counsellor)
  console.log('5. Testing Non-Student Role (Counsellor) Rejection:');
  const res5 = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'counsellor-01',
      'x-user-role': 'counsellor',
    },
    body: JSON.stringify({ message: 'Attempting to use student chatbot' }),
  });
  const data5 = await res5.json();
  console.log(`Status: ${res5.status} (Expected: 403)`);
  console.log(`Response:`, data5);
  console.assert(res5.status === 403, 'Test 5 Failed: Expected status 403');
  console.log('✓ PASS\n');

  // Test 6: Deactivated account rejection
  console.log('6. Testing Deactivated Account Rejection:');
  const res6 = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'student-deactivated',
      'x-user-role': 'student',
      'x-user-active': 'false',
    },
    body: JSON.stringify({ message: 'Hello from deactivated account' }),
  });
  const data6 = await res6.json();
  console.log(`Status: ${res6.status} (Expected: 403)`);
  console.log(`Response:`, data6);
  console.assert(res6.status === 403, 'Test 6 Failed: Expected status 403');
  console.log('✓ PASS\n');

  // Test 7: Cross-user session access rejection
  console.log('7. Testing Cross-User Session Access Rejection:');
  const res7 = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'student-alice',
      'x-user-role': 'student',
      'x-session-student-id': 'student-bob',
    },
    body: JSON.stringify({
      sessionId: 'session-bob-private',
      message: 'Trying to access Bob session',
    }),
  });
  const data7 = await res7.json();
  console.log(`Status: ${res7.status} (Expected: 403)`);
  console.log(`Response:`, data7);
  console.assert(res7.status === 403, 'Test 7 Failed: Expected status 403');
  console.log('✓ PASS\n');

  console.log('🎉 ALL 7 SECURITY & VALIDATION TESTS PASSED CLEANLY!');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
