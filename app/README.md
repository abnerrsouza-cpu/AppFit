# Sem Desculpa (nome provisório)

App web (PWA) de cobrança para o mundo fitness. Foco: cobrar disciplina o dia inteiro,
com psicologia nas notificações e nas respostas.

## No ar

Publicado no GitHub Pages pelo workflow `.github/workflows/publicar.yml`:
a cada push e todo dia às 6h17 (Brasília), quando também busca vídeos novos dos canais.

Ativar uma única vez: GitHub > Settings > Pages > Source: **GitHub Actions**.
Endereço: https://abnerrsouza-cpu.github.io/AppFit/

Para trocar os canais de vídeo, edite `content/channels.json`.

## Rodar

```bash
npm install
npm run dev          # desenvolvimento
npm run build        # PWA de produção em dist/
npm run build:single # um único HTML, para pré-visualização
```

## O que já existe (MVP de front, dados no aparelho)

- **Início**: sequência de dias, ciclo de 90 dias, treinos, cardio, dieta, peso,
  termômetro da semana, gráficos de dieta e cardio, foco, antes x depois e carta de compromisso.
- **Seu dia**: semana navegável, linha do tempo da rotina (refeições, treino com ficha, check-in), tarefas marcáveis.
- **Prestação de contas** diária obrigatória com declaração de honestidade e resposta psicológica.
- **Evolução**: antes x depois com linha arrastável, check-in semanal (foto, peso, cintura, notas), gráfico de peso.
- **Cobranças**: ativar notificações, nível de dureza (Parceiro, Treinador, Sargento), agenda de cobranças do dia.
- **Menu**: perfil e medidas (IMC), rotina, carta, ficha de treino, plano alimentar, Google Agenda (link iCal), relógio (em breve), tema claro/escuro.
- **Onboarding** em 6 passos com carta de compromisso assinada.

Arquivos principais: `src/store.ts` (dados), `src/psych.ts` (motor de cobrança), `src/notify.ts` (notificações),
`src/photos.ts` (fotos no IndexedDB), `src/screens/*`.

## Próxima fase (servidor)

- Supabase: login, banco e fotos em bucket privado (LGPD).
- Web Push (VAPID) disparado por cron no servidor, para cobrar com o app fechado.
- Proxy para ler o .ics do Google Agenda (o navegador bloqueia por CORS).
- Strava OAuth para cardio automático.
- Pagamento (Kiwify/Hotmart/Stripe) liberando acesso por webhook.
