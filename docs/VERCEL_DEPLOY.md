# Deploy Vercel — domínio *.vercel.app (jogo + admin oculto)

Sem domínio customizado. Use a URL que a Vercel atribuir ao projeto (ex.: `https://sol-tictactoe.vercel.app`).

## Projeto

- **Root:** repositório raiz
- **Config:** [`vercel.json`](../vercel.json)
- **Build:** `npm run build:vercel`
- **Output:** `apps/web/dist`

## Environment Variables (Production)

Copie de [`vercel.production.env.example`](./vercel.production.env.example):

```env
VITE_API_URL=https://sol-ttt-api.onrender.com
VITE_MAINNET_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
VITE_PROGRAM_ID=<program_id>
VITE_PUBLIC_APP_URL=https://sol-tictactoe.vercel.app
VITE_DEFAULT_CLUSTER=mainnet-beta
VITE_ADMIN_BASE_PATH=/r8n4x2k7m9p3/
VITE_GOOGLE_CLIENT_ID=<mesmo GOOGLE_CLIENT_ID do server>
VITE_ALLOWED_MINTS=
```

`VITE_PUBLIC_APP_URL` deve ser a URL exata do deploy na Vercel (Settings → Domains).

`VITE_ADMIN_BASE_PATH` deve coincidir com os rewrites em `vercel.json`.

## Render (API)

No dashboard Render, defina `CORS_ORIGIN` com a mesma URL Vercel:

```env
CORS_ORIGIN=https://sol-tictactoe.vercel.app
```

Se usar um alias Vercel adicional, separe com vírgula.

## Admin oculto

- Jogo: `https://sol-tictactoe.vercel.app`
- Admin: `https://sol-tictactoe.vercel.app/<path-secreto>/` (não linkar do jogo)

## Google OAuth

Erro **`origin_mismatch`** = falta registrar a **origin** no Google Cloud Console.

1. Abra [Google Cloud → Credentials](https://console.cloud.google.com/apis/credentials)
2. Clique no OAuth 2.0 Client ID (mesmo valor de `GOOGLE_CLIENT_ID`)
3. Em **Authorized JavaScript origins**, adicione:
   - `https://sol-tictactoe.vercel.app` (ou sua URL Vercel)
   - `http://localhost:5173` (jogo dev)
   - `http://localhost:5174` (admin dev standalone)
4. Salve e aguarde ~1 minuto

Lista automática no repo:

```bash
npm run google:oauth:origins
```

## Deploy

Conecte o repo [hgustavo98/sol-tictactoe](https://github.com/hgustavo98/sol-tictactoe) na Vercel — o build usa `vercel.json` na raiz.

Deploy manual:

```bash
npm run build:vercel
```
