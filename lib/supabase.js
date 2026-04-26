import { createClient } from '@supabase/supabase-js'

// process.env가 제대로 안 읽힐 경우를 대비해 변수를 확인합니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("환경 변수가 설정되지 않았습니다. Netlify 설정을 확인하세요.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
