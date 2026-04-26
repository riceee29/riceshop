import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 열쇠가 없는 경우 사이트에 경고를 띄웁니다.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("환경 변수(URL 또는 KEY)가 없습니다! Netlify 설정을 확인하세요.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
)
