# Sistema de Agendamento de Clinica

Aplicacao web em React, TypeScript, Vite e Supabase para gestao de uma clinica.

## Funcionalidades

- Login com Supabase Auth
- Perfis de recepcao e medico
- Rotas protegidas
- Dashboard com dados do Supabase
- Pacientes, medicos, servicos e convenios
- Agendamentos, consultas e prontuarios
- Perfil do usuario com menu no header
- Notificacoes no header
- Chatbot IA integrado com Supabase Edge Functions e Groq

## Variaveis de ambiente

Crie `.env` localmente e configure as mesmas variaveis na Vercel:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Chatbot IA

O assistente virtual fica integrado nas telas logadas e responde duvidas sobre o uso do sistema. Veja o guia completo em `CHATBOT_IA.md`.

## Deploy

Veja `VERCEL_DEPLOY.md`.
