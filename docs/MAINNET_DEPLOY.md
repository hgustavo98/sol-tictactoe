# Mainnet deploy — SOL TTT

Pré-requisitos: devnet E2E validado ([DEVNET_E2E.md](./DEVNET_E2E.md)), SOL mainnet na wallet de deploy e authority.

## 1. Secrets

Em `docs/secrets.local.env`:

```env
LAUNCH_CLUSTER=mainnet-beta
RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
FEE_RECIPIENT_WALLET=<pubkey mainnet>
AUTHORITY_KEYPAIR_PATH=<caminho>
```

## 2. Deploy + init

```bash
npm run launch:deploy:mainnet
```

Se o program ID mudar, sincronize:

```bash
node scripts/sync-program-id.mjs <NOVO_PROGRAM_ID>
```

## 3. Atualizar produção

| Onde | Variável |
|------|----------|
| Render | `RPC_URL`, `PROGRAM_ID`, `LAUNCH_CLUSTER=mainnet-beta` |
| Vercel | `VITE_MAINNET_RPC_URL`, `VITE_PROGRAM_ID`, `VITE_DEFAULT_CLUSTER=mainnet-beta` |

## 4. Financiar authority

Envie ≥ 0.1 SOL mainnet para a pubkey da authority (gas de settle).

## 5. Verificar

```bash
API_URL=https://sol-ttt-api.onrender.com npm run smoke:escrow
API_URL=https://sol-ttt-api.onrender.com npm run smoke:escrow:mainnet
```

Siga [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) para o teste de receita (ranked 0,1 SOL E2E).

Antes de stakes elevados, veja [ANCHOR_AUDIT.md](./ANCHOR_AUDIT.md) para auditoria externa do programa.

**Nota:** Mainnet deploy gera um program ID **novo** se usar keypair diferente da devnet. Atualize Rust, IDL e env após deploy.
