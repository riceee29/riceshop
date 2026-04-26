import { createClient } from '@supabase/supabase-js'

// 1. 여기에 내 Supabase 주소를 넣습니다. (이미 넣어두었습니다)
const supabaseUrl = 'https://dzhtolyjnufmxggjuydl.supabase.co'

// 2. 여기에 내 Supabase 'Publishable key'를 직접 복사해서 넣으세요!
// sb_publishable_... 로 시작하는 아주 긴 글자를 따옴표('') 안에 넣어야 합니다.
const supabaseAnonKey = 'sb_publishable_sapn_dVp800y206hbGaiPA_Cfpc1dYR'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
