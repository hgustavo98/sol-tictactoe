# Go-live Mainnet — checklist

Use após deploy Render + Vercel + Anchor mainnet.

## On-chain

- [ ] `npm run launch:deploy:mainnet` concluído (ou deploy manual)
- [ ] `PROGRAM_ID` igual em Render, Vercel e `anchor.toml`
- [ ] `init-escrow` executado na mainnet
- [ ] Authority com ≥ 0.05 SOL mainnet para gas

## API (Render)

- [ ] `GET /health` → `{ ok: true }`
- [ ] Rate limits e guest sessions usam Mongo (`rate_limits`, `guest_sessions`) — ver [SECURITY.md](./SECURITY.md)
- [ ] `TRUST_PROXY=true` no Render (atrás de proxy)
- [ ] `npm run smoke:escrow` com `API_URL=https://sol-ttt-api.onrender.com` passa
- [ ] `npm run smoke:escrow:mainnet` com `API_URL=https://sol-ttt-api.onrender.com` passa (após deploy mainnet)
- [ ] `MOCK_ESCROW=false`
- [ ] `MONGODB_URI` configurado (local e produção)
- [ ] Servidor valida `rake_bps` on-chain antes de iniciar partidas pagas (deploy recente)

## Frontend (Vercel)

- [ ] `https://sol-tictactoe.vercel.app` e `https://sol-tictactoe.vercel.app` carregam o jogo
- [ ] WebSocket conecta (sem erros no console)
- [ ] Carteira conecta na mainnet (toggle oculto em prod)
- [ ] Admin acessível só via URL secreta
- [ ] Headers CSP ativos (ver `vercel.json`)

## Admin → Escrow (todos verdes)

- [ ] Mock desligado
- [ ] Carteira de taxas
- [ ] Programa deployado
- [ ] GlobalConfig
- [ ] Rede alinhada (frontend ↔ server)

## Teste de receita

- [ ] Partida Ranked 0.1 SOL ponta a ponta
- [ ] Rake creditado em `FEE_RECIPIENT_WALLET` ([Solscan](https://solscan.io))
- [ ] Vencedor recebe pote − rake

## Monitoramento

- [ ] Alerta se authority < 0.05 SOL
- [ ] Logs Render sem erros de settle
- [ ] Backup MongoDB Atlas ativo

## Auditoria Anchor (recomendado)

- [ ] Ler [ANCHOR_AUDIT.md](./ANCHOR_AUDIT.md) e congelar commit para revisão
- [ ] Contratar auditor externo ou peer review especializado em Solana/Anchor
- [ ] Remediar achados Critical/High antes de stakes elevados
- [ ] Tag `audit-YYYY-MM-DD` no commit aprovado

## Legal (sua responsabilidade)

- [ ] Termos de uso publicados
- [ ] Política de privacidade
- [ ] Conformidade regulatória para apostas no seu país
