# Domínios customizados — Hostinger + Vercel

## Vercel (já configurado)

| Domínio | Projeto Vercel |
|---------|----------------|
| `soltactoe.xyz` + `www` | `sol-ttt` |
| `solcheckers.xyz` + `www` | `sol-checkers` |

## Hostinger — DNS (faça em cada domínio)

No hPanel → **Domínios** → domínio → **DNS / Zona DNS** (ou botão **Configurar**):

### soltactoe.xyz

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| **A** | `@` | `76.76.21.21` | 3600 (ou padrão) |
| **A** | `www` | `76.76.21.21` | 3600 |

### solcheckers.xyz

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| **A** | `@` | `76.76.21.21` | 3600 |
| **A** | `www` | `76.76.21.21` | 3600 |

**Alternativa:** trocar nameservers para `ns1.vercel-dns.com` e `ns2.vercel-dns.com` (Vercel gerencia tudo).

Propagação: 5 min – 24 h. Verificar:

```bash
npx vercel domains verify soltactoe.xyz
npx vercel domains verify solcheckers.xyz
```

## URLs finais

- **SOL Tic Tac Toe:** https://soltactoe.xyz
- **SOL Checkers:** https://solcheckers.xyz
