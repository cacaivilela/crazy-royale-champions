# 🏆 Crazy Royale Champions

MOBA 3D de arena (estilo *Pokémon Unite*) do multiverso **Crazy Royale** — a franquia de
[cacaivilela.github.io/crazy-royale](https://cacaivilela.github.io/crazy-royale/).
Boilerplate completo e jogável: 3v3, campeões com habilidades + ultimate, selva com criaturas
neutras, chefão, baldões pra marcar tinta… e **live update** de balanceamento.

```
   você + 2 bots   ⚔️   3 bots
   colete tinta 🎨 → marque no baldão inimigo 🪣 → destrua o baldão final 🏆
```

## Rodando

Sem npm, sem build, sem instalação: é ES modules puro com o `three.js` vendorizado.

```bash
python3 dev.py          # http://localhost:8000  (com live reload)
```

Ou qualquer servidor estático (`python3 -m http.server`). Só não abra por `file://`
— módulos ES precisam de HTTP.

## Multijogador online 🌐

Sem servidor pra manter: WebRTC via broker público do PeerJS (`vendor/peerjs.min.js`).

1. **Criar sala** → você escolhe o código (ex.: `2610`; 3–8 letras/números, ou deixe em branco pra sortear)
2. Os amigos entram com esse código — até **6 humanos no mesmo time**
3. O botão **▶ COMEÇAR** libera assim que **1 pessoa entra**; as vagas que sobrarem viram **COMs**
4. Sempre **6 do seu time contra 6 COMs**, e no online o **estádio é 2x maior** (112×168)

O host simula a partida inteira e manda *snapshots* (15 Hz); os clientes mandam só o input (20 Hz) e
interpolam o resto — quem manda na vida, no placar e nos abates é sempre o host.

### 🕹️ Saguão: ninguém fica parado esperando

Enquanto a sala enche, o lobby vira uma **pracinha 3D**: cada um anda com o campeão que escolheu e
vê os outros da sala andando junto. <kbd>WASD</kbd>/setas (ou arrastar o dedo na tela) pra andar,
<kbd>Shift</kbd> corre, <kbd>Espaço</kbd> pula. Trocar de campeão troca o boneco na hora.

No lugar do emoji do campeão dá pra pôr **o seu rosto**: o botão **📷 ligar minha câmera** pede a
webcam do aparelho e desenha o vídeo num retrato redondo em cima do boneco. É **só na sua tela** —
o vídeo não vai pra rede, os outros continuam vendo o emoji. Precisa de `https` (ou `localhost`),
e trocar de campeão não desliga a câmera.

O painel da sala já entra **compacto e colado no topo** — inteiro, ele tapava justamente o meio da
tela, que é onde os bonecos andam. O botão **📋 ver a sala inteira** abre a lista de jogadores e os
outros botões; **🕹️ voltar pro saguão** encolhe de novo.

A posição viaja pela mesma sala, em mensagens `sag` (12 por segundo andando, 2 parado) que o host
repassa pra todo mundo; nada disso é simulado — é só enfeite, e some quando a partida começa.

| arquivo | papel |
|---|---|
| `src/net/transporte.js` | WebRTC (PeerJS) **ou** BroadcastChannel (`sala local`, pra testar em 2 abas) |
| `src/net/sala.js` | lobby, código, roster (humanos + COMs) e roteamento das mensagens |
| `src/game/saguao.js` | a pracinha 3D do lobby (cena própria, leve, sem combate) |
| `src/game/match.js` | `snapshot()`, `receberSnapshot()`, `receberComando()` |
| `src/game/boss.js` | o Baldão Supremo do modo boss e a IA dele |

### 🐍 Modo Boss online (12 x chefão)

Na criação da sala dá pra escolher **Modo Boss**: **12 jogadores no mesmo time** (as vagas que
sobrarem viram COMs) contra **um Baldão Supremo gigante**, num estádio **3x maior que o do online
normal** — 336×504, ou seja, 6x o offline.

- Vida do chefão escala com a galera: `9000 + 1200 por jogador`
- Ele persegue, dá **pancada em área** (raio 16) a cada 7s, **invoca capangas** a cada 22s
  e entra em **fúria** abaixo de 30% de vida
- Sem baldões: ou vocês derrubam o bicho antes dos 10 minutos, ou é derrota
- Barra de vida do chefão no topo da tela
- Ajustes em `CONFIG.boss` (`src/data/config.js`) — e como é config, dá pra mudar por patch ao vivo

## 🐍 Modo Boss normal (offline)

No menu, ao lado da Partida Rápida: **você + 5 COMs contra o Baldão Chefão** — a versão
menor do chefão do online.

| | Boss normal (offline) | Boss online |
|---|---|---|
| Time | você + 5 COMs | 12 (humanos + COMs) |
| Chefão | escala 4.2 · 8.400 de vida | escala 5.5 · 23.400 de vida (12 jogadores) |
| Pancada em área | 150 de dano, raio 12, a cada 8s | 220 de dano, raio 16, a cada 7s |
| Capangas | 2 a cada 25s | 3 a cada 22s |
| Estádio | 1,5x (84×126) | 6x (336×504) |
| Tempo | 99 min e 99 s | 99 min e 99 s |

Os dois usam o mesmo código (`src/game/boss.js`); o solo só sobrepõe números via
`CONFIG.bossSolo`. Os COMs aliados focam o chefão (e desviam pros capangas que chegam perto).

### Como o online se mantém em sincronia

O host é a única fonte de verdade: vida, placar, abates e fim de partida vêm dele.
Os clientes mandam input (20 Hz), recebem snapshots (15 Hz) e reproduzem localmente só o
visual — tiro básico, efeito de habilidade, barra de marcação. Quem sai no meio da partida
tem o campeão assumido por um COM.

## Cheats 🎃

Cada partida (ou sala) escolhe: **🚫 nenhum**, **⌨️ escritos** (aperte <kbd>T</kbd> e digite) ou
**🎤 de áudio** (fale o código; usa reconhecimento de voz do navegador, quando disponível).
No online o **host** é quem aplica — o cliente só manda o código.

Códigos: `tinta`, `vida`, `turbo`, `força`, `ulti`, `nível`, `gigante`, `mini`, `fantasma`, `chefe`.
Adicione os seus em `src/game/cheats.js`.

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Andar | `W` `A` `S` `D` | direcional na tela |
| Mirar | mouse | — |
| **Atacar** | `Espaço` (segurar) — 4 de dano, recarga de 1/3 ms | botão 🔫 |
| Habilidades | `Q` `E` | botões da direita |
| Ultimate (nível 5) | `R` | botão grande |
| Marcar tinta | `F` (ou ficar parado no baldão) | botão 🎨 |
| Voltar pra base | `B` | botão 🏠 |
| Pausar | `Esc` | botão ⏸ |
| Cheat escrito | `T` | — |

## Live update ⚡

O jogo relê `content/patch.json` de tempos em tempos. **Mudou a `versao`, o patch entra na
hora — sem recarregar, no meio da partida.** Serve pra balancear campeão, mudar regra da
partida e até **adicionar campeão novo**.

```jsonc
{
  "versao": "1.0.1",                       // <- mude isto para o patch ser aplicado
  "notas": ["Bananildo mais rápido", "Chefão nasce mais cedo"],
  "recarregar": false,                     // true = força reload da página
  "config": { "chefao": { "spawnEmSeg": 120 } },
  "campeoes": {
    "bananildo": {
      "stats": { "velocidade": 10.2 },
      "habilidades": { "Q": { "cooldown": 4.5, "dano": 70 } },
      "ultimate": { "cooldown": 45 }
    }
  },
  "novosCampeoes": [ /* objeto igual ao de src/data/champions.js */ ]
}
```

Onde isso acontece no código:

- `src/live/liveupdate.js` — busca o arquivo e compara a versão
- `src/data/runtime.js` — faz o merge em `CONFIG` / `CHAMPIONS` e emite `patch:aplicado`
- `src/game/match.js` — ouve o evento e recalcula os status de todo mundo na hora

No console do navegador dá pra testar sem editar arquivo:

```js
CRC.patch({ versao: '9.9.9', campeoes: { 'gato-ninja': { stats: { ataque: 200 } } } })
CRC.reset()      // volta pro balanceamento de src/data/
```

### Live reload de código (dev)

`dev.py` observa os arquivos e avisa o navegador por SSE (`/__live`):

- `.css` → troca a folha de estilo **sem perder a partida**
- `content/*.json` → reaplica o patch ao vivo
- `.js` / `.html` → recarrega a página

## Música 🎵

É a **mesma trilha do Crazy Royale** (progressão C–G–Am–F, o mesmo gancho, o mesmo groove
de baixo e a mesma bateria), só que **a 180 bpm** (o original é 140) e com a melodia saindo em
**power chord** — tônica + quinta + oitava passando por uma distorção, com cara de guitarra.
Tudo gerado na hora em WebAudio, nenhum arquivo de áudio. Faixas: `menu` (mais limpa),
`batalha`, `boss` (uma quinta abaixo e mais distorcida) e os jingles de `vitoria`/`derrota`,
que voltam sozinhos pra trilha anterior.
Liga/desliga no botão 🎵 (menu e jogo) ou na tecla <kbd>M</kbd> — a escolha fica salva.
As partituras estão em `src/core/music.js`, fáceis de trocar.

## Estrutura

```
index.html              casca da UI (menu + HUD + modais)
dev.py                  servidor de dev com live reload (SSE)
content/patch.json      🔴 patch ao vivo (balanceamento em produção)
vendor/three.module.js  three.js r169 vendorizado (zero build)
src/
  main.js               bootstrap: menu → partida → loop
  core/                 loop, input (teclado/mouse/joystick), eventos, rng
    audio.js            efeitos sonoros procedurais
    music.js            trilha chiptune (sequenciador)
  data/
    config.js           balanceamento base (partida, XP, selva, chefão, bots)
    champions.js        campeões, habilidades e ultimates (dados puros)
    runtime.js          CONFIG/CHAMPIONS mutáveis + merge de patch
  live/
    liveupdate.js       cliente do patch ao vivo
    hotreload.js        cliente do SSE de desenvolvimento
  net/
    transporte.js       WebRTC (PeerJS) + BroadcastChannel local
    sala.js             lobby online, código da sala, roster
  game/
    arena.js            campo, lanes, baldões, mato, obstáculos (escalável: 2x no online)
    shapes.js           modelos procedurais (cada campeão com o formato do que ele é)
    cheats.js           códigos malucos e o que cada um faz
    indicators.js       anéis de alcance, alvo, mira e seta do objetivo
    entity.js           unidade (campeão/selvagem): status, dano, níveis
    abilities.js        motor de habilidades dirigido por dados
    ai.js               IA dos bots (máquina de estados)
    wild.js             criaturas neutras + chefão
    scoring.js          marcação de tinta nos baldões
    effects.js          números de dano, ondas, splats de tinta
    camera.js           câmera isométrica que segue o campeão
    saguao.js           pracinha 3D do lobby online (andar enquanto a sala enche)
    match.js            regras da partida, times, fim de jogo
  ui/                   menu, HUD e minimapa
```

## Elenco

- **18 campeões** vindos do Crazy Royale original (Bananildo, Tank Tonho, Dino Rex…)
- **8 novatos exclusivos do Champions** (`src/data/novatos.js`): 🎸 Guitarrão, 🧊 Cubo Gelo,
  🧁 Dona Cupcake, ⚡ Raiozinho, 🪁 Pipa Voadora, 🧲 Ímã Ivan, 🚦 Sinal Fechado e 🪩 Globo Disco.
  Acabaram de chegar ao torneio: **os status são fraquinhos de propósito** (menos vida e dano,
  recarga maior), mas cada um tem um truque próprio. Aparecem numa seção separada do menu,
  com selo NOVATO.

## Criando conteúdo

**Campeão novo:** copie um objeto em `src/data/champions.js`. As habilidades são declarativas —
o `tipo` já vira comportamento em `src/game/abilities.js`:

| tipo | o que faz | campos úteis |
|---|---|---|
| `dash` | avança acertando quem estiver no caminho | `distancia`, `dano`, `escudo`, `empurrao`, `invisivel` |
| `projetil` | dispara tinta | `velocidade`, `alcance`, `raioExplosao`, `perfura`, `teleguiado` |
| `area` | zona no chão com ticks | `raio`, `ticks`, `intervalo`, `lentidao`, `curaAliado` |
| `cone` | golpes em leque à frente | `alcance`, `angulo`, `golpes`, `empurrao` |
| `buff` | fortalece você/aliados | `duracao`, `buffAtaque`, `buffVelocidade`, `escudo`, `roubaVida` |
| `cura` | cura em área | `raio`, `cura`, `curaNivel`, `buffVelocidade` |

**Regra nova de partida:** `src/data/config.js` (e o mesmo caminho vale no `patch.json`).

## Deploy

`.github/workflows/deploy.yml` publica no GitHub Pages **sem build** (sobe a pasta como está).
Depois do deploy, editar `content/patch.json` e dar push já muda o balanceamento de quem
estiver com o jogo aberto na próxima checagem — sem novo release.

## Créditos

Universo **Crazy Royale** — o battle royale de paintball 3D mais maluco do multiverso. 🎨
