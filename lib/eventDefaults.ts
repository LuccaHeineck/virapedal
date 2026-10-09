// Texto que já vem no campo "Observações" ao criar um pedal, a pedido dos
// usuários: os avisos de segurança se repetiam em todo pedal. Fica editável
// -- quem cria pode ajustar ou apagar. Usado pelas duas telas de criação
// (app/new-event.tsx e groups/[id]/events/new.tsx); a edição de um pedal
// existente não o aplica, para não sobrescrever o que já foi escrito.
export const DEFAULT_EVENT_NOTES = [
  '• Uso de capacete obrigatório.',
  '• Leve água e algo para comer.',
  '• Revise a bike antes de sair: pneus, freios e corrente.',
  '• Pedal à noite: use luz dianteira e traseira.',
  '• Respeite as leis de trânsito e as orientações de quem organiza.',
].join('\n');
