# Acessos necessários para automação completa

Copie o template abaixo para **`docs/secrets.local.env`** (já está no `.gitignore`).  
Preencha os valores e salve. O agente usa esse arquivo para deploy sem te interromper.

---

## Template — `docs/secrets.local.env`

```env
# =============================================================================
# SOL TTT — SECRETS DE LANÇAMENTO (NÃO COMMITAR)
# =============================================================================

# --- Escolha de ambiente alvo ---
# devnet | mainnet-beta
LAUNCH_CLUSTER=devnet

# --- Domínio (produção) ---
DOMAIN=sol-ttt.xyz
API_DOMAIN=api.sol-ttt.xyz
VITE_ADMIN_BASE_PATH=/r8n4x2k7m9p3/

# --- Solana ---
# RPC com API key (Helius, QuickNode, etc.)
RPC_URL=https://mainnet.helius-rpc.com/?api-key=SEU_KEY
# ou devnet: https://devnet.helius-rpc.com/?api-key=...

# Carteira que RECEBE as taxas (rake) — só endereço público
FEE_RECIPIENT_WALLET=

# Keypair da authority (base58 ou caminho absoluto para JSON)
# Usada para deploy, init-escrow e settle on-chain
# Opção A: caminho no seu PC
AUTHORITY_KEYPAIR_PATH=C:\Users\Gusta\.config\solana\id.json
# Opção B: secret inline (array JSON em uma linha) — preferir secret manager em prod
# AUTHORITY_KEYPAIR_JSON=[1,2,3,...]

# Após deploy, o agente preenche; ou cole se já deployou
PROGRAM_ID=

# Rake on-chain global (300 = 3%). Por modo: ranked 2%, custom/torneio 3%.
HOUSE_RAKE_BPS=300

# --- Escrow ---
MOCK_ESCROW=false
TRUST_PROXY=true

# --- Banco de dados (MongoDB — local + produção) ---
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/sol-ttt

# --- GitHub (deploy / CI) ---
GITHUB_REPO=hgustavo98/sol-ttt
# Personal Access Token: repo, workflow, read:org se org
GITHUB_TOKEN=ghp_xxxxxxxx

# --- Hospedagem API + WebSocket (escolha UM provedor e preencha) ---

# Railway
RAILWAY_TOKEN=
RAILWAY_PROJECT_ID=

# OU Fly.io
FLY_API_TOKEN=
FLY_APP_NAME=sol-ttt-api

# OU Render
RENDER_API_KEY=
RENDER_SERVICE_ID=

# --- Frontend (escolha UM) ---

# Vercel
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_WEB=
VERCEL_PROJECT_ADMIN=

# OU Cloudflare Pages
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_PAGES_PROJECT_WEB=
CLOUDFLARE_PAGES_PROJECT_ADMIN=

# --- DNS (opcional — automatiza SSL e registros) ---
CLOUDFLARE_ZONE_ID=

# --- Google OAuth (admin login etapa 2) ---
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
# Se tiver Client Secret (não obrigatório para @react-oauth/google no browser)
# GOOGLE_CLIENT_SECRET=

# --- Admin gate (já configurado localmente — confirme produção) ---
ADMIN_GATE_EMAIL=
ADMIN_GATE_GOOGLE_EMAIL=
ADMIN_GATE_WALLET=
ADMIN_SECRET=gere-uma-string-longa-aleatoria

# --- CORS (agente pode gerar a partir dos domínios) ---
# CORS_ORIGIN=https://chess.exemplo.com,https://admin.exemplo.com

# --- WalletConnect (opcional — mais carteiras no modal) ---
# VITE_WALLETCONNECT_PROJECT_ID=
```

---

## Tabela resumida — o que cada acesso permite

| Secret | Para quê | Obrigatório |
|--------|----------|-------------|
| `AUTHORITY_KEYPAIR_*` | Deploy Anchor, init-escrow, settle | ✅ Sim |
| `FEE_RECIPIENT_WALLET` | Receber rake | ✅ Sim |
| `RPC_URL` (com API key) | RPC estável em produção | ✅ Sim |
| `MONGODB_URI` | Dados persistentes (partidas, ledger) | ✅ Sim (prod) |
| `GITHUB_TOKEN` | CI/CD, secrets, releases | ✅ Sim |
| `RAILWAY_TOKEN` / `FLY_*` / `RENDER_*` | Host do server + WS | ✅ Sim (um) |
| `VERCEL_TOKEN` / `CLOUDFLARE_*` | Host web + admin | ✅ Sim (um) |
| `DOMAIN` + `CLOUDFLARE_ZONE_ID` | DNS automático | ⚠️ Recomendado |
| `GOOGLE_CLIENT_ID` | Login admin em produção | ✅ Se usar admin |
| `LAUNCH_CLUSTER` | devnet vs mainnet | ✅ Sim |
| SOL na authority | Gas deploy/settle | ✅ Você envia SOL |
| `PROGRAM_ID` | Após 1º deploy | Agente preenche |

---

## Contas a criar (você, ~1h total)

1. **RPC:** [Helius](https://helius.dev) ou [QuickNode](https://quicknode.com) — plano free/dev ok para começar  
2. **MongoDB:** [Atlas](https://www.mongodb.com/atlas) — cluster M0 free  
3. **API host:** [Railway](https://railway.app) ou [Fly.io](https://fly.io) — suporta WebSocket  
4. **Frontend:** [Vercel](https://vercel.com) ou Cloudflare Pages  
5. **DNS:** [Cloudflare](https://cloudflare.com) — se tiver domínio  
6. **Google Cloud:** OAuth Client ID com origens de produção no admin  
7. **GitHub:** PAT em Settings → Developer settings → Tokens  

---

## O que NÃO colocar no arquivo

- Seed phrase / frase de recuperação da Phantom pessoal  
- Chave da carteira que só faz login admin (`ADMIN_GATE_WALLET`) — só precisa assinar no browser  
- Senhas de e-mail  

A `AUTHORITY_KEYPAIR` é uma **hot wallet de servidor** — use uma carteira dedicada só para o programa, não sua Phantom principal.

---

## Níveis de automação

| Nível | Você entrega | Agente entrega |
|-------|----------------|----------------|
| **A — Devnet público** | secrets + SOL devnet na authority | API + web + admin + deploy devnet + teste rake |
| **B — Produção mainnet** | Nível A + domínio + SOL mainnet | DNS + mainnet deploy + monitoring básico |
| **C — Escala** | Auditoria contrato + legal | Redis, métricas, alertas |

Recomendação: começar com **Nível A**, validar rake em devnet, depois **B**.

---

## Comando quando estiver pronto

```
Secrets em docs/secrets.local.env — executa Nível A do LAUNCH_PLAN
```
