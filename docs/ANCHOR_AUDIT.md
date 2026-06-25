# Auditoria externa — programa Anchor `match-escrow`

Recomendado antes de escalar stakes na mainnet. O modelo atual confia na **authority do servidor** para declarar o vencedor on-chain; a auditoria deve validar custódia, constraints e ausência de drenagem não autorizada.

## Escopo mínimo para o auditor

| Área | Ficheiros / instruções |
|------|------------------------|
| Programa | `programs/match-escrow/src/lib.rs` |
| IDL | `apps/server/src/idl/match_escrow.json` |
| Integração servidor | `apps/server/src/escrow-client.ts`, `socket-handlers.ts` |
| Deploy | `docs/MAINNET_DEPLOY.md`, `Anchor.toml` |

## Instruções on-chain a rever

1. **create_match** — PDA seeds, `rake_bps` cap (≤ 2000), `bet_amount` mínimo, mint opcional.
2. **join_match** — impede self-join, valida status `Waiting`, financiamento do vault.
3. **settle_match / claim_timeout** — `has_one = authority` em `global_config`; distribuição rake/vencedor; anti double-settle.
4. **cancel_match / close_waiting_match** — regras de forfeit 90s, devolução ao host.
5. **update_config / withdraw_treasury** — quem pode alterar `fee_recipient`, `allowed_mints`, treasury.
6. Overflow — uso de `checked_*` em lamports e rake.

## Correções já aplicadas no repo (validar no binário deployado)

- `SettleMatch` e `ClaimTimeout` com `has_one = authority` no `global_config`.
- Servidor valida `rake_bps` e `bet_lamports` on-chain antes de `startGame` (`verifyMatchFunded`).
- Joiner não pode sobrescrever `onChainAddress` no lobby.
- `mockEscrow` bloqueado via admin em produção.
- `/api/receipts` público removido; histórico exige sessão (`/api/receipts/mine`).
- RPC com API keys não exposto em `/api/config`.

## Riscos fora do programa (documentar, não “auditar” como bug)

- Resultado da partida é decidido off-chain (Stockfish + servidor). Authority honesta é pressuposto.
- Compromisso da keypair `AUTHORITY_KEYPAIR_PATH` = controlo total do escrow.
- Reinício do servidor com jogos em memória pode exigir intervenção manual on-chain.

## Entregáveis esperados do auditor

1. Relatório com severidade (Critical / High / Medium / Low).
2. PoC ou passos de reprodução para achados Critical/High.
3. Hash do `.so` deployado e `programId` mainnet verificados.
4. Sign-off explícito para mainnet com SOL real ou lista de blockers.

## Checklist pré-auditoria (equipa interna)

- [ ] `anchor build` limpo; testes locais passam.
- [ ] Programa deployado em devnet com IDL alinhado.
- [ ] `npm run smoke:escrow` passa contra API de staging/devnet.
- [ ] `SMOKE_PROFILE=mainnet npm run smoke:escrow` passa **após** deploy mainnet.
- [ ] Partida ranked 0,1 SOL E2E com rake visível no Solscan.
- [ ] Secrets rotacionados (Helius, admin, MongoDB) se alguma vez commitados.
- [ ] `escrowDiagnostics.rpcUrl` sanitizado na API pública (sem API keys).
- [ ] Rate limit em sockets (`LOBBY_CREATE`, `JOIN`, `MOVE`, `SYNC`) — Mongo-backed
- [ ] Sessões guest em Mongo com TTL (`guest_sessions`)
- [ ] `programId` / `activeCluster` bloqueados em runtime na produção.
- [ ] Repositório/tag congelado para o commit auditado (`git tag audit-YYYY-MM-DD`).

## Processo sugerido

1. Congelar commit + deploy devnet de referência.
2. Partilhar repo (privado) + IDL + endereços (`programId`, `GlobalConfig`, `fee_recipient`).
3. Janela de perguntas (1–2 semanas).
4. Remediar Critical/High; redeploy se necessário.
5. Re-review apenas do diff de remediação.
6. Go-live mainnet com monitorização de authority balance e settles.

## Referências internas

- [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) — smoke + E2E manual
- [MAINNET_DEPLOY.md](./MAINNET_DEPLOY.md) — deploy e init escrow
- [ECONOMICS.md](./ECONOMICS.md) — rake por modo de jogo
