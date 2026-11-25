# Virapedal

App para organizar pedais em grupo: crie ou entre em grupos de ciclismo, marque pedais com data, horário e ponto de encontro, e grave o trajeto por GPS durante o passeio.

Feito com **Expo (React Native)** e **Supabase**. Roda no Android, no iOS e na web.

## Funcionalidades

- **Conta**: cadastro e login com e-mail e senha ou com Google, recuperação de senha, perfil com foto.
- **Grupos**: grupos públicos (qualquer um entra) ou privados (entrada por pedido aprovado por um admin), com capa, lista de membros e administradores. Se o último admin sair, outro membro assume.
- **Pedais**: eventos do grupo com data, horário, ponto de encontro e descrição do percurso. A tela inicial mostra os próximos pedais de que você participa.
- **Gravação de rotas**: registra o trajeto pelo GPS, inclusive com a tela bloqueada, com pausar e retomar. Calcula distância, tempo em movimento e ganho de elevação.
- **Envio resistente a sinal ruim**: os pontos do GPS ficam numa fila local e sobem ao banco em lotes. Se um lote for reenviado, ele não duplica o traçado.
- **Fotos do pedal**: fotos anexadas às rotas gravadas.
- **Rota base**: depois do pedal, o evento mostra um traçado "oficial", escolhido entre as rotas dos participantes (primeiro a do organizador, depois a de um admin, depois a de qualquer participante).
- **Mapa**: Leaflet com tiles do OpenStreetMap, exibido num WebView no celular e num iframe na web.

## Tecnologias

| Camada | Ferramentas |
| --- | --- |
| App | Expo 57, React Native 0.86, React 19, TypeScript, Expo Router |
| Localização | expo-location, expo-task-manager (gravação em segundo plano) |
| Mapa | Leaflet + OpenStreetMap via react-native-webview |
| Backend | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Login social | Google, via expo-auth-session e Supabase Auth |

## Estrutura do projeto

```
app/                 Telas (rotas do Expo Router)
  (auth)/            Login, cadastro e recuperação de senha
  (app)/             Área logada: pedais, grupos, rotas e perfil
components/          Componentes visuais reutilizáveis (inclui o RouteMap)
hooks/               Hooks de dados (consultas e mutações no Supabase)
lib/                 Cliente do Supabase, login com Google, upload de imagens
  routeTracking/     Gravação de rotas: task em segundo plano, fila e cálculos
context/             AuthContext (sessão do usuário)
constants/           Cores e tema
supabase/
  schema.sql         Esquema base do banco (tabelas, funções, RLS)
  migrations/        Alterações aplicadas depois do esquema base
scripts/
  simular-pedal.js   Simulador de GPS para testar a gravação na web
```

## Como rodar

### Pré-requisitos

- Node.js e npm
- Um projeto no [Supabase](https://supabase.com)
- Para Android ou iOS: Android Studio ou Xcode (o app usa um *development build*, veja abaixo)

### 1. Instalar as dependências

```bash
npm install
```

### 2. Configurar as variáveis de ambiente

Copie o arquivo de exemplo e preencha com a URL e a chave anônima do seu projeto Supabase:

```bash
cp .env.local.example .env.local
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

O login com Google não precisa de variável no app: o Client ID e o Secret do Google Cloud ficam configurados no provider Google do Supabase.

### 3. Preparar o banco

1. Rode `supabase/schema.sql` no SQL Editor do projeto, para criar as tabelas, funções e políticas base.
2. Aplique as migrações em `supabase/migrations/`, em ordem:

```bash
npx supabase link --project-ref <id-do-projeto>
npx supabase db push
```

### 4. Iniciar o app

```bash
npm run web       # navegador
npm run android   # compila e abre no Android
npm run ios       # compila e abre no iOS
npm start         # só o servidor do Expo
```

O app não roda no Expo Go. A gravação de rotas em segundo plano depende de permissões e serviços nativos, então `npm run android` e `npm run ios` geram um *development build* com o `expo-dev-client`.

## Testando a gravação de rotas sem sair de casa

O script `scripts/simular-pedal.js` troca o GPS do navegador por uma volta de cerca de 4 km em torno do Parque Ibirapuera:

1. Rode `npm run web`, abra `http://localhost:8081` e recarregue a página (Ctrl+Shift+R).
2. Abra o DevTools (F12), vá até a aba Console, cole o conteúdo do script e aperte Enter.
3. No app, inicie uma rota. O trajeto começa a ser percorrido.
4. Quando o Console avisar que o pedal terminou, finalize a rota.

Para desligar o simulador, rode `pararPedalSimulado()` no Console ou recarregue a página. Para simular outro percurso, troque os pontos de `WAYPOINTS` no início do script.

## Licença

Projeto pessoal, sem licença definida.
