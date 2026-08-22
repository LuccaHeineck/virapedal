import { AuthError } from '@supabase/supabase-js';

export function getAuthErrorMessage(error: AuthError): string {
  const message = error.message || 'Algo deu errado. Tente novamente.';

  switch (error.code) {
    case 'weak_password':
      return `Sua senha não é forte o suficiente: ${message}`;
    case 'user_already_exists':
    case 'email_exists':
      return `Já existe uma conta com este e-mail: ${message}`;
    case 'email_address_invalid':
      return `Isso não parece ser um e-mail válido: ${message}`;
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.';
  }

  const lower = message.toLowerCase();
  if (lower.includes('password')) {
    return `Sua senha não é forte o suficiente: ${message}`;
  }
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return `Já existe uma conta com este e-mail: ${message}`;
  }
  if (lower.includes('invalid') && lower.includes('email')) {
    return `Isso não parece ser um e-mail válido: ${message}`;
  }
  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }

  return message;
}
