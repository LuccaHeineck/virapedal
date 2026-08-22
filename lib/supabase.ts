import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Convenção para toda chamada de insert/update/delete feita com este cliente:
// encadear `.select()` (e `.single()` quando exatamente uma linha é esperada) e
// verificar explicitamente o `error` retornado antes de confiar em `data` - rejeições
// do RLS aparecem como `error`, não como exceções, e sem `.select()`
// uma gravação bem-sucedida ainda retorna `data: null`. Todo erro ignorado
// intencionalmente precisa de um comentário de uma linha explicando o porquê
// (veja a chamada `getSession()` na inicialização do AuthContext como exemplo).

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
