# Deploy Vercel — sol-ttt.xyz (jogo + admin oculto)

## Projeto

- **Root:** repositório raiz
- **Config:** [`vercel.json`](../vercel.json)
- **Build:** `npm run build:vercel`
- **Output:** `apps/web/dist`

## Environment Variables (Production)

```env
VITE_API_URL=https://api.sol-ttt.xyz
VITE_MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
VITE_PROGRAM_ID=<mainnet_program_id>
VITE_PUBLIC_APP_URL=https://sol-ttt.xyz
# Aceita também sem https (ex.: sol-ttt.xyz) — o build normaliza automaticamente.
VITE_DEFAULT_CLUSTER=mainnet-beta
VITE_ADMIN_BASE_PATH=/r8n4x2k7m9p3/
VITE_GOOGLE_CLIENT_ID=<mesmo GOOGLE_CLIENT_ID do server>
VITE_ALLOWED_MINTS=
```

`VITE_ADMIN_BASE_PATH` deve coincidir com os rewrites em `vercel.json`.

## Domínio

- Apex `sol-ttt.xyz` e `www.sol-ttt.xyz` → Vercel (ambos servem o jogo)
- Admin: `https://sol-ttt.xyz/<path-secreto>/` (não linkar do jogo)

## Google OAuth

Erro **`origin_mismatch`** = falta registrar a **origin** (domínio) no Google Cloud Console.

O path secreto do admin (`/r8n4x2k7m9p3/`) **não** entra no Google — só o domínio.

1. Abra [Google Cloud → Credentials](https://console.cloud.google.com/apis/credentials)
2. Clique no OAuth 2.0 Client ID (mesmo valor de `GOOGLE_CLIENT_ID`)
3. Em **Authorized JavaScript origins**, adicione:
   - `https://sol-ttt.xyz`
   - `http://localhost:5173` (jogo dev)
   - `http://localhost:5174` (admin dev standalone)
4. Se acessar via `www`, adicione também `https://www.sol-ttt.xyz`
5. Salve e aguarde ~1 minuto; teste em `https://sol-ttt.xyz/r8n4x2k7m9p3/`

Lista automática no repo:

```bash
npm run google:oauth:origins
```

## Deploy manual

```bash
npm run build:vercel
# ou conecte o repo na Vercel — build automático via vercel.json
```
