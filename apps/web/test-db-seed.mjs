import { createClient } from '@supabase/supabase-js';

const url = 'https://xqwtyrqugbenocnemdvs.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxd3R5cnF1Z2Jlbm9jbmVtZHZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjM5MTM0NCwiZXhwIjoyMTA3OTY3MzQ0fQ.mpihe2R5AcFICMIYSO8xpsJjFXp1Rgp6ULPwOyVKDCc';

const supabase = createClient(url, key);

async function run() {
  console.log('Testing select...');
  const { data: insts, error: e1 } = await supabase.from('institutions').select('*');
  console.log('Institutions before:', insts, e1);
}

run();
