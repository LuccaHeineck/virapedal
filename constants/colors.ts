export const colors = {
  primary: '#2f6feb',
  error: '#c0392b',
  success: '#2a8a4a',
  border: '#d0d0d0',
  background: '#fff',
  placeholder: '#eee',
};

// Escala neutra introduzida nas telas de Rotas. O restante do app ainda usa
// os cinzas avulsos (#666, #888, #f0f0f0) espalhados pelos estilos -- esta
// escala é o ponto de partida para unificá-los na revisão de cores do app
// inteiro, e por isso vive separada de `colors` até lá.
//
// Nas Rotas, colors.primary tem um único papel: sinalizar "gravando agora".
// Ele não pinta mais ícones, textos ou divisórias por ali -- quando o azul
// aparece, significa uma coisa só.
export const neutrals = {
  ink: '#12161c',
  slate: '#48505c',
  mute: '#858d99',
  hairline: '#e6e8ec',
  paper: '#fbfbfc',
};
