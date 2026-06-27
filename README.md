# Sistema de Agendamento de Clinica

Aplicacao web em React, TypeScript e Vite para gestao de uma clinica, rodando apenas no frontend.

## Funcionalidades

- Login local com contas de demonstracao
- Perfis de recepcao e medico
- Rotas protegidas
- Dashboard com dados salvos no navegador
- Pacientes, medicos, servicos e convenios
- Agendamentos, consultas e prontuarios
- Perfil do usuario com menu no header
- Notificacoes no header
- Assistente virtual local com respostas sobre o sistema

## Dados locais

O sistema usa `localStorage`, entao nao precisa de backend, banco remoto ou variaveis de ambiente. Os dados ficam no navegador usado para acessar o app.

Contas de teste:

- `recepcao@clinica.com` / `Clinica@123456`
- `teste@clinica.com` / `Clinica@123456`
- `ana.ribeiro@clinica.com` / `Clinica@123456`
- `bruno.matos@clinica.com` / `Clinica@123456`

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Assistente virtual

O assistente virtual fica integrado nas telas logadas e responde duvidas sobre o uso do sistema em modo local.

## Deploy

Rode `npm run build` e hospede a pasta `dist` na Vercel, Netlify, GitHub Pages ou qualquer hospedagem estatica.
