// ============================================================
//  BALANCEAMENTO BASE — tudo aqui pode ser sobrescrito ao vivo
//  pelo arquivo content/patch.json (live update, sem recarregar).
// ============================================================
export const BASE_CONFIG = {
  versao: '1.0.0',

  partida: {
    duracaoSeg: 360,          // 6 minutos
    tempoFinalSeg: 60,        // último minuto vale dobro
    multiplicadorFinal: 2,
    jogadoresPorTime: 3,
    respawnBaseSeg: 6,
    respawnPorNivel: 1.2
  },

  arena: {
    largura: 56,              // eixo X
    comprimento: 84,          // eixo Z
    raioBase: 7,
    capacidadeLane: 80,       // tinta pra estourar um baldão de lane
    capacidadeBase: 140       // ...e o baldão final (estourou = vitória na hora)
  },

  jogador: {
    xpPorNivel: [0, 90, 210, 380, 600, 880, 1220, 1640, 2140],  // níveis 1..9
    nivelMax: 9,
    regenForaDeCombateSeg: 4, // tempo sem tomar dano para regenerar
    regenPorSeg: 0.06,        // fração da vida máxima
    velocidadeBase: 8.4,
    raioColeta: 2.2,
    maxTintaCarregada: 50,
    recallSeg: 2.5,            // tecla B: volta pra base canalizando
    protecaoSpawnSeg: 2,       // imunidade curtinha ao renascer
    xpAssistencia: 0.6         // fatia do XP pra quem estava por perto no abate
  },

  marcacao: {                 // "gol" = despejar tinta no baldão inimigo
    tempoBase: 0.55,
    tempoPorTinta: 0.035,
    xpPorTinta: 4,
    tintaPorAbate: 8,
    tintaPorSelvagem: 3
  },

  selvagens: {                // criaturas neutras da selva
    respawnSeg: 26,
    xpBase: 55,
    vidaBase: 180
  },

  chefao: {                   // objetivo épico do meio (aparece no fim)
    spawnEmSeg: 240,          // aos 4 minutos de partida
    vida: 1400,
    tintaBonus: 20,
    buffDuracaoSeg: 25
  },

  combate: {
    // ataque básico do jogador: no Espaço, praticamente sem recarga
    recargaBasicoJogadorSeg: 0.000333,   // 1/3 de milissegundo
    danoBasicoJogador: 4,                // dano fixo por tiro (null = usa o ataque do campeão)
    ataqueAutomatico: false              // true = volta a atirar sozinho
  },

  bots: {
    dificuldade: 0.72,        // multiplicador global de dano/velocidade dos COMs
    reacaoSeg: 0.5,           // demoram mais pra decidir (ficam mais "bobos")
    agressividade: 0.55,      // brigam menos, erram mais posicionamento
    chanceHabilidade: 0.22,   // com que frequência tentam usar habilidade
    miraRuimM: 1.8            // erro (em metros) que o COM comete ao mirar
  },

  camera: {
    altura: 26,
    distancia: 20,
    suavizacao: 6,
    fov: 52
  },

  online: {
    jogadoresPorTime: 6,      // 6 humanos (host + 5) contra 6 COMs
    multiplicadorArena: 2,    // estádio 2x maior no online
    maxJogadores: 6,
    tickSnapshotHz: 15,       // host manda estado do jogo
    tickComandoHz: 20,        // clientes mandam input
    servidorPeer: 'publico'   // broker público do PeerJS (não precisa hospedar nada)
  },

  boss: {                     // 🐍 MODO BOSS (online): 12 jogadores x 1 chefão gigante
    jogadores: 12,
    multiplicadorArenaExtra: 3, // 3x o estádio do online normal (= 6x o offline)
    duracaoSeg: 600,
    vidaBase: 9000,
    vidaPorJogador: 1200,
    escala: 5.5,                // tamanho do bicho
    ataque: 70,
    alcance: 11,
    cadencia: 0.55,
    defesa: 30,
    velocidade: 6.2,
    intervaloPancadaSeg: 7,     // baticum na área
    raioPancada: 16,
    danoPancada: 220,
    intervaloInvocarSeg: 22,    // chama capangas
    capangasPorVez: 3,
    furiaAbaixoDe: 0.3,         // % de vida pra ficar em fúria
    bonusFuria: 0.6
  },

  bossSolo: {                 // 🐍 MODO BOSS NORMAL (offline): você + 5 COMs x 1 chefão
    jogadores: 6,             // você + 5 COMs no seu time
    multiplicadorArena: 1.5,  // estádio um pouco maior que o normal, pra caber o bicho
    duracaoSeg: 420,
    vidaBase: 4200,
    vidaPorJogador: 700,
    escala: 4.2,              // um pouco menor que o chefão do online (5.5)
    ataque: 52,
    alcance: 9,
    cadencia: 0.5,
    defesa: 24,
    velocidade: 5.8,
    intervaloPancadaSeg: 8,
    raioPancada: 12,
    danoPancada: 150,
    intervaloInvocarSeg: 25,
    capangasPorVez: 2,
    nome: 'Baldão Chefão'
  },

  roleta: {
    // A roleta começa MUITO rápida e perde 1 km/h a cada volta completa.
    // Com v(n) = V0 - n (km/h) e cada volta valendo `kmPorVolta`, o giro
    // dura 3600 · kmPorVolta · ln(V0) segundos.
    velocidadeInicialKmH: 12345,    // começa a 12.345 km/h
    quedaPorVoltaKmH: 1,            // e perde 1 km/h a cada volta
    kmPorVolta: 0.00013,            // 13 cm de roda: o giro dura ~6s
    fatorLentidao: 1.09             // giro 9% mais lento
  },

  liveUpdate: {
    ativo: true,
    arquivo: './content/patch.json',
    intervaloSeg: 20,         // de quanto em quanto tempo procura patch novo
    avisarNaHud: true
  }
}
