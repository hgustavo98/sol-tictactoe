# SOL TTT — Revisão Econômica e Regras Oficiais (v2)

## Objetivos

- Manter o rake competitivo.
- Aumentar a receita média por jogador sem elevar as porcentagens cobradas.
- Incentivar progressão natural entre os modos.
- Reduzir o custo operacional de partidas gratuitas.
- Melhorar a qualidade dos torneios sem aumentar excessivamente sua duração.

---

## Rake

### 1v1

| Modo   | Rake |
| ------ | ---- |
| Casual | 0%   |
| Ranked | 2%   |
| Custom | 3%   |

### Torneios

| Tipo | Rake |
| ---- | ---- |
| T4   | 3%   |
| T6   | 3%   |
| T8   | 3%   |
| T12  | 3%   |

Constantes:

```ts
CASUAL_RAKE_BPS = 0
RANKED_RAKE_BPS = 200
CUSTOM_RAKE_BPS = 300
TOURNAMENT_RAKE_BPS = 300
```

---

## Apostas 1v1

### Casual

- Entrada: 0 SOL
- Rake: 0%
- Premiação: nenhuma

### Ranked

Faixa permitida: **0,10 SOL — 10 SOL**  
Valor padrão: **0,10 SOL**

**UI:** dois cards separados no carousel:

- **Ranqueado · aposta fixa** (`rankedPresets1v1`) — sempre **0,10 SOL**, botão **Jogar** inicia pareamento ELO
- **Ranqueado · aposta livre** (`rankedStake1v1`) — input 0,10–10 SOL, **Abrir mesa ranqueada** (pareia por aposta + ELO nas mesas abertas)

Sem “abrir mesa” nem link extra de busca — ranked sempre entra na fila de matchmaking.

Exemplo padrão (0,10 SOL):

- Pote: 0,20 SOL · Rake: 0,004 SOL · Prêmio: **0,196 SOL**

Exemplo high stake (1 SOL):

- Pote: 2 SOL · Rake: 0,04 SOL · Prêmio: **1,96 SOL**

### Custom

Faixa: **0,10 — 10 SOL**  
Exemplo mínimo: pote 0,20 · rake 0,006 · prêmio **0,194 SOL**  
Exemplo máximo: pote 20 · rake 0,60 · prêmio **19,40 SOL**

---

## Torneios

| Torneio | Jogadores | Entrada | Pote   | Rake (3%) | Prêmio    | Tempo              |
| ------- | --------- | ------- | ------ | --------- | --------- | ------------------ |
| T4      | 4         | 0,15    | 0,60   | 0,018     | 0,582     | 5 min + 2 s/lance  |
| T6      | 6         | 0,25    | 1,50   | 0,045     | 1,455     | 6 min + 2 s/lance  |
| T8      | 8         | 0,50    | 4,00   | 0,12      | 3,88      | 8 min + 1 s/lance  |
| T12     | 12        | 1,00    | 12,00  | 0,36      | 11,64     | 10 min · sem incr. |

---

## Controle de tempo

| Modo              | Tempo   | Incremento   |
| ----------------- | ------- | ------------ |
| Casual            | 3 min   | +2 s/lance   |
| Ranked / Custom   | 10 min  | nenhum       |

---

## ELO

| Parâmetro        | Valor |
| ---------------- | ----- |
| Rating inicial   | 500   |
| Rating mínimo    | 100   |
| K (<10 partidas) | 48    |
| K (10+ partidas) | 32    |

**Multiplicador stake (ranked):** base 0,10 SOL = 1× · máx 4×

| Torneio | Multiplicador |
| ------- | ------------- |
| T4      | 1,0×          |
| T6      | 1,15×         |
| T8      | 1,30×         |
| T12     | 1,60×         |

---

## Matchmaking

- Raio inicial: ±50
- Expansão: +25 a cada 8 s
- Raio máximo: ±250
- Mesa equilibrada: gap ≤ 50
- Entrar em mesa aberta: gap ≤ 350

---

## Regras operacionais

- Reconexão: **90 s**
- Cancelamento fila/mesa waiting: **60 s**
- Rake máximo on-chain: **20%**
- Taxa estimada tx: ~**0,00005 SOL**

---

## Progressão recomendada

Casual (3+2) → Ranked 0,10 → Ranked 0,25 → Ranked 1 → T8 → T12

---

## Fórmulas

```text
pote = aposta × 2
rake = pote × (rake_bps / 10000)
premio = pote - rake
reembolso_empate = (pote - rake) / 2
```
