# Segurança — SOL TTT (mainnet)

Documento interno com modelo de ameaças, controlos implementados e checklist operacional.

## Modelo de confiança

| Componente | Quem confia em quem |
|------------|---------------------|
| Resultado da partida | Servidor (Stockfish + regras) — **não** verificado on-chain |
| Liquidação SOL | Programa Anchor `match-escrow` — assinado pela **authority** do servidor |
| Admin | Gate 3 passos (email + Google + wallet) + sessão MongoDB |
| Jogadores (prod) | Sign-In With Solana (SIWS) — sessão obrigatória |

**Compromisso da keypair `AUTHORITY_KEYPAIR_JSON` = controlo total do escrow.** Guardar em secret manager, nunca no repositório.

## Controlos implementados no código

### API e autenticação

- `runProductionStartupChecks()` — bloqueia arranque com config insegura
- `REQUIRE_PLAYER_AUTH=true` em produção
- `MOCK_ESCROW=false` em produção
- Admin legacy desativado em produção; gate obrigatório
- Rate limit HTTP (Mongo `rate_limits`, fallback memória)
- Rate limit sockets (`socket:*` keys no Mongo)
- `/api/receipts/mine` exige sessão de jogador
- `/api/config` pública mínima (sem RPC keys)
- Players API sanitizada (`toPublicPlayerProfile`)

### Escrow

- Validação PDA + `verifyMatchFunded` antes de `startGame`
- Rake no lobby validado server-side vs economics
- Join não sobrescreve `onChainAddress` do host
- Guests bloqueados em mesas pagas

### Hardening (2026)

- Regex Mongo escapado em `getClientsWithStats` e `searchPlayers`
- Sessões guest em MongoDB (`guest_sessions`, TTL) — multi-instância
- Erros admin sanitizados em produção (`safeApiError`)
- `/health` mínimo em produção
- `TRUST_PROXY` configurável; IP real só com proxy confiável
- CSP + headers em `vercel.json` (web combinado e `apps/web`)
- Guest auth: 20 req / 15 min por IP

## Pendente / externo

- [ ] **Auditoria Anchor externa** — ver [ANCHOR_AUDIT.md](./ANCHOR_AUDIT.md)
- [ ] Constraint on-chain `rake_bps <= house_rake_bps` (melhoria pós-audit)
- [ ] Multisig / HSM para authority (roadmap)
- [ ] Alertas operacionais (saldo authority, falhas settle, 429)

## Variáveis de ambiente (produção)

```env
NODE_ENV=production
MOCK_ESCROW=false
REQUIRE_PLAYER_AUTH=true
TRUST_PROXY=true
MONGODB_URI=...
AUTHORITY_KEYPAIR_JSON=[...]
FEE_RECIPIENT_WALLET=...
ADMIN_GATE_EMAIL=...
ADMIN_GATE_GOOGLE_EMAIL=...
ADMIN_GATE_WALLET=...
GOOGLE_CLIENT_ID=...
CORS_ORIGIN=https://sol-ttt.xyz,https://www.sol-ttt.xyz
ADMIN_LEGACY_AUTH=false
# Secrets fortes — nunca valores dev
ADMIN_SECRET=...
ADMIN_API_KEY=...
```

## Vercel (frontend)

- `VITE_ADMIN_BASE_PATH` — path longo e aleatório (obscuridade, não substitui auth)
- Não commitar `.env` com secrets

## Resposta a incidentes

1. Rotacionar `ADMIN_SECRET`, sessões admin, Mongo credentials
2. Se authority comprometida: pausar deploy, migrar programa / authority nova (plano de contingência)
3. Revisar `admin_audit` e `bank_ledger` no Mongo

## Referências

- [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md)
- [SECRETS_CHECKLIST.md](./SECRETS_CHECKLIST.md)
- [ANCHOR_AUDIT.md](./ANCHOR_AUDIT.md)
