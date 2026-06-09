import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabase = createClient(
  'https://bqlnsununvsyksvhczrm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbG5zdW51bnZzeWtzdmhjenJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTk3NzQsImV4cCI6MjA5NTI3NTc3NH0.bErfe3TrlHNGg1CT_7e9GkbPhuhFIp_y9fqp1kFL_8c',
  {
    auth: { persistSession: false },
    realtime: { transport: ws }
  }
);

async function run() {
  console.log('Querying Supabase users table...');
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log(`Fetched ${data.length} users:`);
    console.log(data.map(u => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role })));
  }
}

run();
