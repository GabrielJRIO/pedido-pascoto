import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://todeupahpgoopcxvfakt.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_cutkf2X1oE-6Jj-A6TGvtg_YlQeIFKp";

export const supabase = createClient(supabaseUrl, supabaseKey);
