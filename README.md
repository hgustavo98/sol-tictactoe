# SOL Tic Tac Toe

**Live:** [sol-ttt.vercel.app](https://sol-ttt.vercel.app)

**Bet SOL. Play Tic Tac Toe. Win the Pot.**

PvP tic tac toe with Solana wagers, real-time gameplay, and on-chain escrow with house rake.

## Features

- Neon 2D board with animated X/O marks
- Casual free games and custom SOL stakes (0.1–10 SOL)
- Multi-wallet support (Phantom, Solflare, etc.)
- Real-time PvP via WebSocket
- Anchor escrow program (`match-escrow`)
- Training mode vs CPU
- Tokenized match receipts (metadata)

## Quick Start

```bash
npm install --ignore-scripts
npm run build -w @sol-tictactoe/shared
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
npm run dev:game
```

- Web: http://localhost:5173
- Server: http://localhost:3000

**Mock escrow** (`MOCK_ESCROW=true`) lets you play without deploying Anchor.

## Deploy

| Serviço | URL |
|---------|-----|
| **Jogo (Vercel)** | [sol-ttt.vercel.app](https://sol-ttt.vercel.app) |
| **Repo GitHub** | [hgustavo98/sol-tictactoe](https://github.com/hgustavo98/sol-tictactoe) |
| **Projeto Vercel** | `sol-ttt` |
| **API (Render)** | `https://sol-ttt-api.onrender.com` |

## Game modes

| Mode | Bet | Rake |
|------|-----|------|
| Casual 1v1 | 0 SOL | 0% |
| Custom 1v1 | 0.1–10 SOL | 3% |

## License

Private — hgustavo98
