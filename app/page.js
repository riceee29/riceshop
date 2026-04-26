import { createClient } from '@supabase/supabase-js'

// 내 Supabase 정보로 교체하세요
const supabaseUrl = 'sb_publishable_sapn_dVp800y206hbGaiPA_Cfpc1dYR'
const supabaseAnonKey = '여기에_내_ANON_KEY_넣기'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
