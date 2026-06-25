# Plano de lançamento — SOL TTT

Objetivo: colocar o jogo na web com **escrow real** e **rake automático** para `FEE_RECIPIENT_WALLET`.

Este documento separa o que o agente pode fazer **sozinho** (com os acessos certos) do que exige **uma ação sua única** (dinheiro, domínio, contas).

---

## Estado atual

| Área | Status |
|------|--------|
| Jogo + WebSocket | ✅ Funcional em dev |
| Admin (3 etapas + path secreto Vercel) | ✅ Funcional |
| Mainnet-ready (código) | ✅ Escrow habilitado devnet + mainnet |
| Escrow on-chain | ⚠️ Deploy via `npm run launch:deploy` |
| Infra produção | ⚠️ Dockerfile + render.yaml prontos — deploy pendente |
| Mainnet go-live | 📋 Ver `docs/GO_LIVE_CHECKLIST.md` |

---

## Fases do plano

### Fase 0 — Preparação (você: 30–60 min, uma vez)

Entregar os acessos listados em [SECRETS_CHECKLIST.md](./SECRETS_CHECKLIST.md) (arquivo `docs/secrets.local.env` gitignored).

**Bloqueio:** sem esse arquivo, o agente para na Fase 1.

---

### Fase 1 — Repositório e CI (agente, automático)

- [ ] GitHub Actions: `build`, `test` (se houver), lint
- [ ] Workflow de deploy condicional (devnet staging / produção)
- [ ] Branch `staging` + proteção de `main`
- [ ] Secrets no GitHub Actions (mesmas vars de `secrets.local.env`)

**Acessos:** `GITHUB_TOKEN` ou PAT com `repo` + `actions`.

---

### Fase 2 — Contrato Solana (agente + wallet financiada)

**Devnet (teste público):**

1. `anchor build` + `anchor deploy --provider.cluster devnet`
2. Atualizar `PROGRAM_ID` em server + web
3. `FEE_RECIPIENT_WALLET=<sua carteira>` + `npm run init-escrow -w @sol-tictactoe/server`
4. `MOCK_ESCROW=false` no server
5. Partida de teste ponta a ponta; confirmar rake na carteira de taxas

**Mainnet (dinheiro real — só após devnet OK):**

1. Deploy mainnet-beta (mesmo fluxo)
2. Authority com SOL mainnet para gas
3. RPC mainnet pago (Helius/QuickNode)

**Acessos:** keypair Solana com SOL (devnet e depois mainnet), `RPC_URL` com API key.

**Não automatizável sem você:** enviar SOL para a wallet de deploy/authority.

---

### Fase 3 — Backend em produção (agente)

- [ ] Dockerfile ou deploy Railway/Fly/Render
- [ ] Variáveis de ambiente de produção
- [ ] `MONGODB_URI` configurado (local e produção)
- [ ] WebSocket (`/socket.io`) no mesmo host ou sticky sessions
- [ ] `CORS_ORIGIN` com URLs finais do jogo e admin
- [ ] Health check `/health`

**Acessos:** token do provedor (Railway/Fly/Render), `MONGODB_URI`.

---

### Fase 4 — Frontend + Admin (agente)

| App | Host sugerido | URL exemplo |
|-----|---------------|-------------|
| Jogo (`apps/web`) | Vercel / Cloudflare Pages | `https://chess.seudominio.com` |
| Admin (`apps/admin`) | Mesmo ou subdomínio | `https://admin.seudominio.com` |

- [ ] Build com `VITE_API_URL=https://api.seudominio.com`
- [ ] `VITE_PROGRAM_ID`, `VITE_RPC_URL` (mainnet quando for a vez)
- [ ] Google OAuth: origens de produção no Client ID
- [ ] `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` (mesmo valor)

**Acessos:** Vercel/Cloudflare token, domínio (ou API Cloudflare para DNS).

---

### Fase 5 — DNS e TLS (agente, se Cloudflare API)

- [ ] `api.` → servidor
- [ ] `chess.` ou apex → web
- [ ] `admin.` → admin
- [ ] HTTPS automático

**Acessos:** `CLOUDFLARE_API_TOKEN` + `ZONE_ID` ou registrar domínio e apontar NS.

---

### Fase 6 — Segurança e go-live (misto)

| Item | Quem |
|------|------|
| Authority keypair em secret manager (não arquivo no disco) | Agente configura; você aprova provedor |
| `ADMIN_SECRET` forte, rotação | Agente |
| Rate limit / WAF (Cloudflare) | Agente |
| Auditoria do programa Anchor | **Você** (firma externa) — recomendado antes de mainnet |
| Termos de uso / privacidade | **Você** (jurídico) |
| Regulatório apostas no seu país | **Você** |

---

### Fase 7 — Lançamento e rake

Checklist final (admin → aba **Escrow**):

- [ ] `mockEscrowOff`
- [ ] `feeRecipientSet`
- [ ] `programDeployed`
- [ ] `globalConfigInitialized`
- [ ] `authorityFunded`

Quando todos verdes: cada partida com aposta gera rake em `FEE_RECIPIENT_WALLET` (ex.: 5% do pote).

---

## O que o agente faz sozinho (com acessos)

1. Scripts de deploy (`anchor`, env, init-escrow)
2. CI/CD GitHub Actions
3. Docker / config Railway ou Fly
4. Deploy web + admin
5. DNS (se Cloudflare token)
6. Atualizar OAuth origins (se GCP service account ou Client ID já criado)
7. Migrar settings para MongoDB
8. Smoke tests pós-deploy
9. Documentar URLs e variáveis finais

## O que ainda exige você (mínimo manual)

1. **Criar contas** nos provedores (ou convidar o agente — raro)
2. **Preencher** `docs/secrets.local.env` uma vez
3. **Financiar** wallet Solana (devnet faucet / mainnet SOL)
4. **Registrar domínio** (se ainda não tiver)
5. **Aprovar** deploy mainnet e auditoria
6. **Assinar** termos legais do produto

---

## Ordem de execução (quando você voltar)

```
secrets.local.env preenchido
    → Fase 1 CI
    → Fase 2 devnet + init-escrow + teste rake
    → Fase 3 server prod
    → Fase 4 web + admin
    → Fase 5 DNS
    → Smoke test completo
    → (opcional) Fase 2 mainnet + marketing
```

---

## Economia (lembrete)

- Pote = 2 × aposta
- Rake padrão = 5% (`HOUSE_RAKE_BPS=500`)
- Ex.: 0,1 SOL × 2 → pote 0,2 SOL → rake 0,01 SOL → vencedor 0,19 SOL

---

## Contato / handoff

Quando `docs/secrets.local.env` estiver pronto, diga no chat:

> "Secrets prontos — executa o plano de lançamento até devnet público"

ou

> "Secrets prontos — executa até mainnet"

O agente segue as fases sem pedir confirmação em cada passo técnico, exceto mainnet e gastos.
