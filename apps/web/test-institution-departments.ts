import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xqwtyrqugbenocnemdvs.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxd3R5cnF1Z2Jlbm9jbmVtZHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjM5MTM0NCwiZXhwIjoyMTA3OTY3MzQ0fQ.mpihe2R5AcFICMIYSO8xpsJjFXp1Rgp6ULPwOyVKDCc';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const EXPECTED_INSTITUTION = "Pune Vidyarthi Griha's College of Engineering & S.S. Dhamankar Institute of Management, Nashik";
const EXPECTED_INSTITUTION_CODE = 'PVGCOE_NASHIK';

const EXPECTED_DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Mechanical Engineering',
  'Electronics and Telecommunication Engineering',
];

const EXPECTED_CODES = ['COMP', 'IT', 'AIDS', 'MECH', 'ENTC'];

async function runTests() {
  console.log('================================================================');
  console.log('SentiMate: Institution & Department Dropdown Verification Suite');
  console.log('================================================================\n');

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string) {
    if (condition) {
      console.log(`[PASS] ${label}`);
      passed++;
    } else {
      console.error(`[FAIL] ${label}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Database Seed Verification (Exact Institution and 5 Departments)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 1: Exact Institution Name and Department Labels in DB ---');
  const { data: instRecords, error: instErr } = await supabase
    .from('institutions')
    .select('*')
    .eq('code', EXPECTED_INSTITUTION_CODE);

  assert(!instErr && instRecords && instRecords.length === 1, 'Default institution exists in database by code');
  assert(instRecords?.[0]?.name === EXPECTED_INSTITUTION, `Exact institution name matches "${EXPECTED_INSTITUTION}"`);

  const instId = instRecords?.[0]?.id;

  const { data: deptRecords, error: deptErr } = await supabase
    .from('departments')
    .select('*')
    .eq('institution_id', instId);

  assert(!deptErr && deptRecords && deptRecords.length === 5, 'Exactly 5 departments seeded for this institution');

  for (const expDept of EXPECTED_DEPARTMENTS) {
    const found = deptRecords?.find((d) => d.name === expDept);
    assert(!!found, `Verified department label: "${expDept}"`);
  }

  for (const expCode of EXPECTED_CODES) {
    const found = deptRecords?.find((d) => d.code === expCode);
    assert(!!found, `Verified department code: "${expCode}"`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: GET /api/student/profile Reference Data Resolution
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: GET /api/student/profile Reference Data Resolution ---');
  const getRes = await fetch(`${BASE_URL}/api/student/profile`, {
    headers: {
      'x-user-id': '434bfcbb-0e2b-497c-9116-1e75cbd91c1c',
      'x-user-role': 'student',
    },
  });

  assert(getRes.status === 200, 'GET /api/student/profile returns HTTP 200 OK');
  const getData = await getRes.json();

  assert(getData.institution?.name === EXPECTED_INSTITUTION, 'API returns exact default institution name');
  assert(getData.institution?.code === EXPECTED_INSTITUTION_CODE, 'API returns exact default institution code');
  assert(Array.isArray(getData.departments) && getData.departments.length === 5, 'API returns all 5 department options');

  // --------------------------------------------------------------------------
  // TEST 3: Department Selection Persistence via PUT
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Department Selection Persistence & Idempotent Update ---');
  const aidsDept = deptRecords?.find((d) => d.code === 'AIDS');
  assert(!!aidsDept, 'Located target AIDS department ID');

  const putRes = await fetch(`${BASE_URL}/api/student/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '434bfcbb-0e2b-497c-9116-1e75cbd91c1c',
      'x-user-role': 'student',
    },
    body: JSON.stringify({
      prn: '72331517F',
      departmentId: aidsDept?.id,
    }),
  });

  assert(putRes.status === 200, 'PUT /api/student/profile with valid departmentId returns HTTP 200');

  // Verify persistence on subsequent GET
  const verifyGetRes = await fetch(`${BASE_URL}/api/student/profile`, {
    headers: {
      'x-user-id': '434bfcbb-0e2b-497c-9116-1e75cbd91c1c',
      'x-user-role': 'student',
    },
  });
  const verifyGetData = await verifyGetRes.json();
  assert(
    verifyGetData.departmentId === aidsDept?.id,
    'Saved department_id persisted and returned on profile reload'
  );

  // --------------------------------------------------------------------------
  // TEST 4: Optional Department Selection (Clearing to Null)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Optional Department Selection (Clearing / Deselecting) ---');
  const clearRes = await fetch(`${BASE_URL}/api/student/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '434bfcbb-0e2b-497c-9116-1e75cbd91c1c',
      'x-user-role': 'student',
    },
    body: JSON.stringify({
      prn: '72331517F',
      departmentId: null,
    }),
  });

  assert(clearRes.status === 200, 'PUT with null departmentId succeeds');
  const verifyClear = await (
    await fetch(`${BASE_URL}/api/student/profile`, {
      headers: {
        'x-user-id': '434bfcbb-0e2b-497c-9116-1e75cbd91c1c',
        'x-user-role': 'student',
      },
    })
  ).json();
  assert(verifyClear.departmentId === null, 'Department successfully cleared to null (optional field)');

  // Re-save AIDS department for standard profile state
  await fetch(`${BASE_URL}/api/student/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '434bfcbb-0e2b-497c-9116-1e75cbd91c1c',
      'x-user-role': 'student',
    },
    body: JSON.stringify({
      prn: '72331517F',
      departmentId: aidsDept?.id,
    }),
  });

  // --------------------------------------------------------------------------
  // TEST 5: Server-Side Validation - Reject Non-Existent or Foreign Department
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Server-Side Validation: Reject Non-Existent / Foreign Department ---');
  const fakeDeptId = '00000000-0000-0000-0000-000000000000';
  const invalidRes = await fetch(`${BASE_URL}/api/student/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '434bfcbb-0e2b-497c-9116-1e75cbd91c1c',
      'x-user-role': 'student',
    },
    body: JSON.stringify({
      prn: '72331517F',
      departmentId: fakeDeptId,
    }),
  });

  assert(invalidRes.status === 400, 'PUT with non-existent department returns HTTP 400 Bad Request');
  const invalidJson = await invalidRes.json();
  assert(
    invalidJson.code === 'INVALID_DEPARTMENT' || invalidJson.code === 'INVALID_DEPARTMENT_INSTITUTION',
    'Error response provides explicit invalid department rejection code'
  );

  // --------------------------------------------------------------------------
  // TEST 6: Client Cannot Tamper With institution_id
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Security Invariant: Client Cannot Modify institution_id ---');
  const tamperRes = await fetch(`${BASE_URL}/api/student/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': '434bfcbb-0e2b-497c-9116-1e75cbd91c1c',
      'x-user-role': 'student',
    },
    body: JSON.stringify({
      prn: '72331517F',
      institutionId: '11111111-1111-1111-1111-111111111111',
      institution: 'Fake University',
    }),
  });

  // Verify DB record directly: profile.institution_id MUST still be instId
  const { data: profCheck } = await supabase
    .from('profiles')
    .select('institution_id')
    .eq('id', '434bfcbb-0e2b-497c-9116-1e75cbd91c1c')
    .single();

  assert(
    profCheck?.institution_id === instId,
    'Client-supplied institutionId is strictly ignored; database institution_id unchanged'
  );

  // --------------------------------------------------------------------------
  // TEST 7: Role Authorization Enforcement
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Role Authorization & Public Signup Invariant ---');
  const counsellorRes = await fetch(`${BASE_URL}/api/student/profile`, {
    headers: {
      'x-user-id': 'c-demo-1',
      'x-user-role': 'counsellor',
    },
  });
  assert(counsellorRes.status === 403, 'Non-student roles forbidden from student profile endpoint (HTTP 403)');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[Unhandled Test Error]:', err);
  process.exit(1);
});
