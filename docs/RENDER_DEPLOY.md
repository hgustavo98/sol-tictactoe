# Deploy Render — SOL TTT API

## 1. Criar Web Service

- **Repository:** este repo
- **Runtime:** Docker (`Dockerfile` na raiz)
- **Health check:** `/health`
- **Plan:** Free (cold start ~30–60s) ou Starter para produção

## 2. Secret Files (Render Dashboard → Secret Files)

| Mount path | Arquivo |
|------------|---------|
| `/etc/secrets/authority.json` | Keypair da authority (array JSON Solana) |
| `/etc/secrets/fee-wallet.json` | Keypair da carteira de taxas (saques admin) |

## 3. Environment Variables

```env
NODE_ENV=production
TRUST_PROXY=true
LAUNCH_CLUSTER=mainnet-beta
MOCK_ESCROW=false
RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
PROGRAM_ID=AcNc9UMCBBzuN8Yb54gspKEZ5h6zT1pFZCd4L89mHx2h
FEE_RECIPIENT_WALLET=<pubkey>
MONGODB_URI=mongodb+srv://...
DATABASE_PROVIDER=mongodb
CORS_ORIGIN=https://sol-ttt.xyz,https://www.sol-ttt.xyz
HOUSE_RAKE_BPS=300
AUTHORITY_KEYPAIR_PATH=/etc/secrets/authority.json
FEE_WALLET_KEYPAIR_PATH=/etc/secrets/fee-wallet.json
ADMIN_GATE_EMAIL=...
ADMIN_GATE_GOOGLE_EMAIL=...
ADMIN_GATE_WALLET=...
GOOGLE_CLIENT_ID=...
ADMIN_SECRET=<forte>
REQUIRE_PLAYER_AUTH=true
```

## 4. DNS

Aponte `api.sol-ttt.xyz` (CNAME) para o host Render, ou use a URL `.onrender.com` em `VITE_API_URL` no Vercel.

## 5. Verificar

```bash
curl https://api.sol-ttt.xyz/health
curl https://api.sol-ttt.xyz/config
npm run smoke:escrow  # API_URL=https://api.sol-ttt.xyz
```

## WebSocket

Socket.io usa o mesmo host — clientes conectam em `wss://api.sol-ttt.xyz/socket.io`.
