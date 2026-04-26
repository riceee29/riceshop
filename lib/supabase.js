import { createClient } from '@supabase/supabase-js'

// Netlify 설정에 넣은 주소와 키를 가져옵니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 연결 통로(Client)를 만듭니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
