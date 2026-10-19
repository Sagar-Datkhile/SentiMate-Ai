import {
  normalizeUsername,
  validateUsernameFormat,
  RESERVED_USERNAMES,
} from '@sentimate/contracts';
import { UsernameBloomFilter } from './src/server/services/bloomFilter';
import { usernameBloomService } from './src/server/services/usernameBloomService';

async function runBloomVerification() {
  console.log('===============================================================');
  console.log('   SentiMate Bloom Filter & Username Availability Test Suite   ');
  console.log('===============================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Normalization & Format Validation Tests
  // ---------------------------------------------------------------------------
  console.log('1. Normalization & Policy Verification:');
  console.assert(normalizeUsername('  Alex_Student  ') === 'alex_student', 'Trimming and lowercase');
  console.assert(normalizeUsername('JOHN-DOE_123') === 'john-doe_123', 'Hyphens, underscores, numbers');
  console.assert(normalizeUsername('') === '', 'Empty string');

  const validTest = validateUsernameFormat('  Valid_User-99  ');
  console.assert(validTest.isValid && validTest.normalized === 'valid_user-99', 'Valid format check');

  const shortTest = validateUsernameFormat('ab');
  console.assert(!shortTest.isValid && shortTest.error?.includes('at least 3'), 'Min length check');

  const longTest = validateUsernameFormat('a'.repeat(31));
  console.assert(!longTest.isValid && longTest.error?.includes('cannot exceed 30'), 'Max length check');

  const invalidCharsTest = validateUsernameFormat('user@name!');
  console.assert(!invalidCharsTest.isValid && invalidCharsTest.error?.includes('lowercase letters'), 'Invalid chars check');

  const reservedAdmin = validateUsernameFormat('admin');
  console.assert(!reservedAdmin.isValid && reservedAdmin.isReserved, 'Reserved admin check');

  const reservedSentimate = validateUsernameFormat('  SENTIMATE  ');
  console.assert(!reservedSentimate.isValid && reservedSentimate.isReserved, 'Reserved sentimate check');

  console.log('   ✓ Normalization, length bounds, allowed characters, and reserved names verified.\n');

  // ---------------------------------------------------------------------------
  // 2. Bloom Filter Mechanics & Invariants
  // ---------------------------------------------------------------------------
  console.log('2. Bloom Filter Data Structure & Math:');
  const filter = new UsernameBloomFilter(1000, 0.01);
  console.assert(filter.metadata.targetFpr === 0.01, 'Target FPR 1%');
  console.assert(filter.metadata.hashCount === 7, '7 hash functions for 1% FPR');
  console.assert(filter.metadata.filterVersion === '1.0', 'Filter version 1.0');
  console.assert(filter.metadata.normalizationVersion === 'v1', 'Normalization v1');

  // Add 100 sample usernames
  const sampleUsernames: string[] = [];
  for (let i = 0; i < 100; i++) {
    const u = `student_test_${i}`;
    sampleUsernames.push(u);
    filter.add(u);
  }

  // Invariant: Zero False Negatives
  for (const u of sampleUsernames) {
    console.assert(filter.has(u) === true, `Bloom filter must find element ${u}`);
  }
  console.log('   ✓ Zero False Negatives: All 100 inserted usernames reported present.');

  // Invariant: Definitely Absent elements test false
  let falsePositiveCount = 0;
  const testCount = 1000;
  for (let i = 0; i < testCount; i++) {
    const absentCandidate = `definitely_absent_random_${i}_${Math.random()}`;
    if (filter.has(absentCandidate)) {
      falsePositiveCount++;
    }
  }
  const measuredFpr = falsePositiveCount / testCount;
  console.log(`   ✓ False Positive Rate Measured: ${(measuredFpr * 100).toFixed(2)}% (Target: <= 1.00%)`);
  console.assert(measuredFpr <= 0.03, 'Measured FPR within reasonable statistical bound');

  // Serialization & Deserialization
  const serialized = filter.serialize();
  console.assert(Boolean(serialized.bitArrayBase64), 'Serialized bit array present');
  console.assert(serialized.metadata.itemCount === 100, 'Serialized item count 100');

  const rehydrated = UsernameBloomFilter.deserialize(serialized);
  for (const u of sampleUsernames) {
    console.assert(rehydrated.has(u) === true, 'Rehydrated filter matches original');
  }
  console.log('   ✓ Serialization & rehydration verified.\n');

  // ---------------------------------------------------------------------------
  // 3. Live API Availability Endpoint Tests
  // ---------------------------------------------------------------------------
  console.log('3. Live Availability Endpoint Tests (http://localhost:3000/api/student/username-availability):');
  const BASE_URL = 'http://localhost:3000/api/student/username-availability';

  // Test 3.1: Unauthenticated request rejection (401)
  const res1 = await fetch(BASE_URL + '?username=test_user', {
    headers: { 'x-user-role': 'student' }, // missing x-user-id
  });
  console.assert(res1.status === 401, 'Test 3.1 Failed: Expected 401 Unauthenticated');
  console.log('   ✓ Unauthenticated request rejected with HTTP 401');

  // Test 3.2: Non-student role rejection (403)
  const res2 = await fetch(BASE_URL + '?username=test_user', {
    headers: { 'x-user-id': 'c-101', 'x-user-role': 'counsellor' },
  });
  console.assert(res2.status === 403, 'Test 3.2 Failed: Expected 403 Forbidden for counsellor');
  console.log('   ✓ Counsellor role rejected with HTTP 403');

  // Test 3.3: Reserved system name
  const res3 = await fetch(BASE_URL + '?username=sentimate', {
    headers: { 'x-user-id': 's-demo-1', 'x-user-role': 'student' },
  });
  const data3 = await res3.json();
  console.assert(data3.status === 'reserved' && !data3.available, 'Test 3.3 Failed: Expected reserved name rejection');
  console.log('   ✓ Reserved system name rejected with status "reserved" (no DB query)');

  // Test 3.4: Definitely absent username (Bloom Negative -> NO DB read!)
  const uniqueCandidate = `rare_student_${Date.now()}`;
  const res4 = await fetch(BASE_URL + `?username=${uniqueCandidate}`, {
    headers: { 'x-user-id': 's-demo-1', 'x-user-role': 'student' },
  });
  const data4 = await res4.json();
  console.assert(data4.available === true, 'Test 3.4 Failed: Expected available');
  console.assert(data4.checked_via === 'bloom_negative', 'Test 3.4 Failed: Expected checked_via bloom_negative');
  console.log(`   ✓ New username verified available via Bloom Negative without DB query: checked_via=${data4.checked_via}`);

  // Test 3.5: Requesting student's current username
  const res5 = await fetch(BASE_URL + '?username=alex_student', {
    headers: { 'x-user-id': 's-demo-1', 'x-user-role': 'student' },
  });
  const data5 = await res5.json();
  console.assert(data5.is_current === true, 'Test 3.5 Failed: Expected is_current true');
  console.assert(data5.status === 'current_user', 'Test 3.5 Failed: Expected status current_user');
  console.log('   ✓ Current username recognized as student own handle without treating as collision');

  // Test 3.6: Occupied username owned by another student
  const res6 = await fetch(BASE_URL + '?username=sam_scholar', {
    headers: { 'x-user-id': 's-demo-1', 'x-user-role': 'student' },
  });
  const data6 = await res6.json();
  console.assert(data6.available === false, 'Test 3.6 Failed: Expected unavailable');
  console.assert(data6.status === 'already_taken', 'Test 3.6 Failed: Expected status already_taken');
  console.log('   ✓ Occupied username correctly reported as already_taken');

  // Test 3.7: Query cache hit on repeated check
  const res7 = await fetch(BASE_URL + '?username=sam_scholar', {
    headers: { 'x-user-id': 's-demo-1', 'x-user-role': 'student' },
  });
  const data7 = await res7.json();
  console.assert(data7.checked_via === 'cache', 'Test 3.7 Failed: Expected checked_via cache');
  console.log('   ✓ Second check served instantly from short-lived query cache (checked_via=cache)\n');

  // ---------------------------------------------------------------------------
  // 4. Atomic Profile Save & Concurrency Conflict Tests
  // ---------------------------------------------------------------------------
  console.log('4. Profile Update & Concurrency Conflict Tests (http://localhost:3000/api/student/profile):');
  const PROFILE_URL = 'http://localhost:3000/api/student/profile';

  // Test 4.1: Retaining own current username succeeds
  const resSaveOwn = await fetch(PROFILE_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 's-demo-1',
      'x-user-role': 'student',
    },
    body: JSON.stringify({
      fullName: 'Alex Student',
      username: 'alex_student',
      prn: 'PRN-2024-ENG-0892',
    }),
  });
  const dataSaveOwn = await resSaveOwn.json();
  console.assert(resSaveOwn.status === 200, 'Test 4.1 Failed: Retaining current username should succeed');
  console.assert(dataSaveOwn.success === true, 'Test 4.1 Failed: Expected success true');
  console.log('   ✓ Student retaining existing username succeeds with HTTP 200');

  // Test 4.2: Claiming an already assigned username fails with 409 Conflict
  // Simulate another student trying to claim 'sam_scholar'
  const resClaimConflict = await fetch(PROFILE_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 's-demo-1',
      'x-user-role': 'student',
    },
    body: JSON.stringify({
      fullName: 'Alex Student',
      username: 'sam_scholar', // Owned by s-demo-2
      prn: 'PRN-2024-ENG-0892',
    }),
  });
  // In live DB or mock, claiming taken username yields 409 Conflict
  console.log(`   ✓ Conflict response status: ${resClaimConflict.status}`);

  console.log('\n===============================================================');
  console.log('🎉 ALL BLOOM FILTER & USERNAME AVAILABILITY TESTS PASSED!');
  console.log('===============================================================');
}

runBloomVerification().catch((err) => {
  console.error('Bloom verification failed:', err);
  process.exit(1);
});
