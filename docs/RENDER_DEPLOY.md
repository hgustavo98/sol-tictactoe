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
CORS_ORIGIN=https://sol-tictactoe.vercel.app,https://sol-tictactoe.vercel.app
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

Aponte `sol-ttt-api.onrender.com` (CNAME) para o host Render, ou use a URL `.onrender.com` em `VITE_API_URL` no Vercel.

## 5. Verificar

```bash
curl https://sol-ttt-api.onrender.com/health
curl https://sol-ttt-api.onrender.com/config
npm run smoke:escrow  # API_URL=https://sol-ttt-api.onrender.com
```

## WebSocket

Socket.io usa o mesmo host — clientes conectam em `wss://sol-ttt-api.onrender.com/socket.io`.
