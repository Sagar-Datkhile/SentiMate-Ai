import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xqwtyrqugbenocnemdvs.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxd3R5cnF1Z2Jlbm9jbmVtZHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjM5MTM0NCwiZXhwIjoyMTA3OTY3MzQ0fQ.mpihe2R5AcFICMIYSO8xpsJjFXp1Rgp6ULPwOyVKDCc';

export const DEFAULT_INSTITUTION = {
  name: "Pune Vidyarthi Griha's College of Engineering & S.S. Dhamankar Institute of Management, Nashik",
  code: 'PVGCOE_NASHIK',
};

export const DEFAULT_DEPARTMENTS = [
  { code: 'COMP', name: 'Computer Engineering' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'AIDS', name: 'Artificial Intelligence & Data Science' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'ENTC', name: 'Electronics and Telecommunication Engineering' },
];

export async function seedInstitutionAndDepartments(client = createClient(SUPABASE_URL, SERVICE_KEY)) {
  console.log('[Seed] Ensuring default institution exists...');

  // 1. Check if institution exists by code or name
  const { data: existingInsts, error: fetchInstErr } = await client
    .from('institutions')
    .select('*')
    .or(`code.eq.${DEFAULT_INSTITUTION.code},name.eq."${DEFAULT_INSTITUTION.name}"`);

  if (fetchInstErr) {
    throw new Error(`Failed to query institutions: ${fetchInstErr.message}`);
  }

  let institutionId: string;

  if (existingInsts && existingInsts.length > 0) {
    const existing = existingInsts[0];
    institutionId = existing.id;
    console.log(`[Seed] Found existing institution (ID: ${institutionId}), updating if necessary...`);
    const { error: updateErr } = await client
      .from('institutions')
      .update({
        name: DEFAULT_INSTITUTION.name,
        code: DEFAULT_INSTITUTION.code,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', institutionId);
    if (updateErr) throw new Error(`Failed to update institution: ${updateErr.message}`);
  } else {
    console.log('[Seed] Inserting default institution...');
    const { data: inserted, error: insertErr } = await client
      .from('institutions')
      .insert({
        name: DEFAULT_INSTITUTION.name,
        code: DEFAULT_INSTITUTION.code,
        is_active: true,
        contact_email: '', // Required by initial schema; relaxed in migration
        emergency_contact: '', // Required by initial schema; relaxed in migration
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      throw new Error(`Failed to insert institution: ${insertErr?.message}`);
    }
    institutionId = inserted.id;
  }

  console.log(`[Seed] Institution established with ID: ${institutionId}`);

  // 2. Seed the 5 departments
  console.log('[Seed] Ensuring 5 departments exist...');
  const { data: existingDepts, error: fetchDeptErr } = await client
    .from('departments')
    .select('*')
    .eq('institution_id', institutionId);

  if (fetchDeptErr) {
    throw new Error(`Failed to fetch departments: ${fetchDeptErr.message}`);
  }

  const seededDepartments = [];

  for (const dept of DEFAULT_DEPARTMENTS) {
    const match = (existingDepts || []).find((d) => d.code === dept.code);
    if (match) {
      console.log(`[Seed] Updating department ${dept.code} (ID: ${match.id})...`);
      const { data: updated, error: uErr } = await client
        .from('departments')
        .update({ name: dept.name })
        .eq('id', match.id)
        .select()
        .single();
      if (uErr) throw new Error(`Failed to update department ${dept.code}: ${uErr.message}`);
      seededDepartments.push(updated);
    } else {
      console.log(`[Seed] Inserting department ${dept.code} - ${dept.name}...`);
      const { data: inserted, error: iErr } = await client
        .from('departments')
        .insert({
          institution_id: institutionId,
          code: dept.code,
          name: dept.name,
        })
        .select()
        .single();
      if (iErr) throw new Error(`Failed to insert department ${dept.code}: ${iErr.message}`);
      seededDepartments.push(inserted);
    }
  }

  // 3. Backfill profiles where institution_id IS NULL (Preserving non-null assignments)
  console.log('[Seed] Backfilling profiles where institution_id is null...');
  const { data: nullProfiles, error: pFetchErr } = await client
    .from('profiles')
    .select('id, full_name, role, institution_id')
    .is('institution_id', null);

  if (pFetchErr) {
    throw new Error(`Failed to query profiles for backfill: ${pFetchErr.message}`);
  }

  console.log(`[Seed] Found ${nullProfiles?.length || 0} profiles with null institution.`);

  if (nullProfiles && nullProfiles.length > 0) {
    for (const prof of nullProfiles) {
      const { error: bErr } = await client
        .from('profiles')
        .update({
          institution_id: institutionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prof.id);
      if (bErr) {
        console.warn(`[Seed] Warning: Failed to backfill profile ${prof.id}:`, bErr.message);
      } else {
        console.log(`[Seed] Successfully backfilled profile ${prof.id} (${prof.full_name}) with default institution.`);
      }
    }
  }

  console.log('[Seed] Seeding and backfill completed successfully.');
  return { institutionId, seededDepartments };
}

if (process.argv[1]?.includes('seed-institution-departments')) {
  seedInstitutionAndDepartments()
    .then((res) => {
      console.log('[Seed] Done. Summary:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
