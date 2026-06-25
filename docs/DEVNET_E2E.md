# Devnet E2E — escrow + rake

Pré-requisitos: `docs/secrets.local.env` preenchido, wallet com SOL devnet, Solana CLI + Anchor.

## 1. Deploy + init

```bash
npm run launch:deploy
# ou explicitamente:
node scripts/launch-deploy.mjs devnet
```

Isso executa `anchor build`, `anchor deploy --provider.cluster devnet`, e `init-escrow`.

## 2. Server local

Copie `apps/server/.env.example` → `apps/server/.env` e configure:

- `MOCK_ESCROW=false`
- `PROGRAM_ID=AcNc9UMC...` (ou o ID retornado pelo deploy)
- `FEE_RECIPIENT_WALLET=<sua carteira de taxas>`
- `AUTHORITY_KEYPAIR_PATH=<caminho authority>`

```bash
npm run dev:game
```

## 3. Smoke test (API)

```bash
npm run smoke:escrow
```

Todos os checks devem estar OK antes de testar partidas pagas.

## 4. Teste manual de rake

1. Abra o jogo (devnet no header em modo dev)
2. Crie mesa Ranked 0.1 SOL
3. Segundo jogador entra e funda vault
4. Jogue até fim → settle on-chain
5. Confirme rake em `FEE_RECIPIENT_WALLET` no [Solana Explorer](https://explorer.solana.com/?cluster=devnet)

## 5. Admin checklist

Admin → aba **Escrow** — todos os pills verdes, incluindo **Rede alinhada**.

Quando devnet E2E passar, avance para mainnet:

```bash
npm run launch:deploy:mainnet
```
