// Um pedal e considerado concluido quando a data dele ja passou. O campo
// events.status no banco nunca vira 'completed' sozinho -- fica 'scheduled'
// ate alguem editar o pedal --, entao a conclusao e derivada da data na hora
// de exibir.
//
// A comparacao e feita direto em texto no formato 'AAAA-MM-DD', que ordena
// igual a propria data (nao precisa converter para Date), usando o dia local
// do dispositivo.

export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Apenas a data conta: um pedal marcado para hoje ainda nao e considerado
// concluido, mesmo que o horario de saida ja tenha passado.
export function isPastEventDate(eventDate: string): boolean {
  return eventDate < todayDateString();
}
