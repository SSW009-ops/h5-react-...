import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ikrphwlwtpoqbvugsvtb.supabase.co';
const supabaseKey = 'sb_publishable_ccMyWfBs1igQxBNtpHqw2A_5K39fV5Z';

export const supabase = createClient(supabaseUrl, supabaseKey);
