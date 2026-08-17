// ============================================================
//  CAMPEÕES — universo Crazy Royale (paintball maluco)
//  role: atirador | defensor | assassino | suporte | velocista
//  Cada habilidade usa um "tipo" genérico resolvido em game/abilities.js:
//    dash | projetil | area | cone | buff | cura | invocar
// ============================================================
export const BASE_CHAMPIONS = [
  {
    id: 'bananildo', nome: 'Bananildo', emoji: '🍌', role: 'velocista', cor: 0xffe135, forma: 'banana',
    lore: 'Escorregou pra dentro do torneio e nunca mais saiu.',
    stats: { vida: 620, vidaNivel: 78, ataque: 26, ataqueNivel: 5.5, alcance: 6.5, cadencia: 1.15, defesa: 8, velocidade: 9.2 },
    habilidades: [
      { key: 'Q', nome: 'Escorregada', icone: '🛝', tipo: 'dash', cooldown: 6, distancia: 9, dano: 55, danoNivel: 12, lentidao: 0.45, duracaoEfeito: 2 },
      { key: 'E', nome: 'Cacho Explosivo', icone: '💥', tipo: 'projetil', cooldown: 8, velocidade: 26, alcance: 14, dano: 90, danoNivel: 20, raioExplosao: 3.4 }
    ],
    ultimate: { key: 'R', nome: 'Chuva de Bananas', icone: '🌧️', tipo: 'area', cooldown: 55, raio: 7.5, dano: 70, danoNivel: 24, ticks: 5, intervalo: 0.5, lentidao: 0.35 }
  },
  {
    id: 'tank-tonho', nome: 'Tank Tonho', emoji: '🛡️', role: 'defensor', cor: 0x4a6741, forma: 'lata',
    lore: 'Feito de lata reciclada e teimosia pura.',
    stats: { vida: 980, vidaNivel: 122, ataque: 22, ataqueNivel: 4.2, alcance: 5.2, cadencia: 0.95, defesa: 22, velocidade: 7.6 },
    habilidades: [
      { key: 'Q', nome: 'Investida de Escudo', icone: '🛡️', tipo: 'dash', cooldown: 7, distancia: 8, dano: 70, danoNivel: 14, empurrao: 4.5, escudo: 120 },
      { key: 'E', nome: 'Provocar', icone: '😤', tipo: 'area', cooldown: 10, raio: 6, dano: 30, danoNivel: 8, lentidao: 0.5, duracaoEfeito: 2.5, ticks: 1, intervalo: 0.1 }
    ],
    ultimate: { key: 'R', nome: 'Muralha de Lata', icone: '🧱', tipo: 'buff', cooldown: 60, duracao: 8, escudo: 420, reducaoDano: 0.35, raioAliado: 6 }
  },
  {
    id: 'dona-bruxa', nome: 'Dona Bruxa', emoji: '🧙', role: 'suporte', cor: 0x7a3fb5, forma: 'bruxa',
    lore: 'Mistura tinta com poção e ninguém sabe o que sai.',
    stats: { vida: 640, vidaNivel: 80, ataque: 25, ataqueNivel: 5.8, alcance: 8.5, cadencia: 1.0, defesa: 10, velocidade: 8.0 },
    habilidades: [
      { key: 'Q', nome: 'Poção Curativa', icone: '🧪', tipo: 'cura', cooldown: 9, raio: 5.5, cura: 130, curaNivel: 30, buffVelocidade: 0.2, duracaoEfeito: 3 },
      { key: 'E', nome: 'Feitiço Lento', icone: '🕸️', tipo: 'area', cooldown: 11, raio: 5, dano: 60, danoNivel: 16, lentidao: 0.55, duracaoEfeito: 3, ticks: 3, intervalo: 0.6 }
    ],
    ultimate: { key: 'R', nome: 'Caldeirão Maluco', icone: '🫕', tipo: 'area', cooldown: 62, raio: 8, dano: 55, danoNivel: 18, ticks: 8, intervalo: 0.5, curaAliado: 40 }
  },
  {
    id: 'gato-ninja', nome: 'Gato Ninja', emoji: '🐱', role: 'assassino', cor: 0x2b2b2b, forma: 'gato',
    lore: 'Sete vidas, oito emboscadas.',
    stats: { vida: 600, vidaNivel: 74, ataque: 32, ataqueNivel: 7.2, alcance: 4.6, cadencia: 1.35, defesa: 9, velocidade: 9.0 },
    habilidades: [
      { key: 'Q', nome: 'Sombra Felina', icone: '🌑', tipo: 'dash', cooldown: 5.5, distancia: 11, dano: 40, danoNivel: 10, invisivel: 1.2 },
      { key: 'E', nome: 'Garra Tripla', icone: '🐾', tipo: 'cone', cooldown: 8, alcance: 6, angulo: 1.1, dano: 65, danoNivel: 18, golpes: 3 }
    ],
    ultimate: { key: 'R', nome: 'Nove Vidas', icone: '😼', tipo: 'buff', cooldown: 58, duracao: 7, buffAtaque: 0.5, buffVelocidade: 0.3, roubaVida: 0.25 }
  },
  {
    id: 'robo-ze', nome: 'Robô Zé', emoji: '🤖', role: 'atirador', cor: 0x9aa7b0, forma: 'robo',
    lore: 'Programado pra vencer, mas trava no menu.',
    stats: { vida: 590, vidaNivel: 72, ataque: 30, ataqueNivel: 6.8, alcance: 10, cadencia: 1.05, defesa: 8, velocidade: 8.1 },
    habilidades: [
      { key: 'Q', nome: 'Raio de Tinta', icone: '🔫', tipo: 'projetil', cooldown: 6, velocidade: 34, alcance: 16, dano: 85, danoNivel: 19, perfura: true },
      { key: 'E', nome: 'Míssil Colorido', icone: '🚀', tipo: 'projetil', cooldown: 10, velocidade: 18, alcance: 18, dano: 110, danoNivel: 24, raioExplosao: 4, teleguiado: true }
    ],
    ultimate: { key: 'R', nome: 'Modo Canhão', icone: '💣', tipo: 'buff', cooldown: 60, duracao: 8, buffAtaque: 0.35, buffAlcance: 4, buffCadencia: 0.6, imovel: false }
  },
  {
    id: 'dino-rex', nome: 'Dino Rex', emoji: '🦖', role: 'defensor', cor: 0x4caf50, forma: 'dino',
    lore: 'O REI do torneio: extinto uma vez, invicto desde então. 🏆',
    stats: { vida: 1180, vidaNivel: 145, ataque: 38, ataqueNivel: 8.5, alcance: 7.2, cadencia: 1.25, defesa: 30, velocidade: 8.9 },
    habilidades: [
      { key: 'Q', nome: 'Rugido Jurássico', icone: '🗣️', tipo: 'area', cooldown: 6, raio: 9, dano: 110, danoNivel: 26, lentidao: 0.55, duracaoEfeito: 3, ticks: 1, intervalo: 0.1 },
      { key: 'E', nome: 'Rabada Devastadora', icone: '🌀', tipo: 'cone', cooldown: 5, alcance: 9, angulo: 1.9, dano: 140, danoNivel: 30, golpes: 2, empurrao: 7 }
    ],
    ultimate: { key: 'R', nome: 'Estampida', icone: '🦕', tipo: 'dash', cooldown: 38, distancia: 22, dano: 320, danoNivel: 60, empurrao: 8, escudo: 500, imparavel: true, roubaVida: 0.35, duracaoEfeito: 6 }
  },
  {
    id: 'fantasminha', nome: 'Fantasminha', emoji: '👻', role: 'assassino', cor: 0xf0f0f0, forma: 'fantasma',
    lore: 'Morreu de rir e continuou na partida.',
    stats: { vida: 580, vidaNivel: 70, ataque: 31, ataqueNivel: 7.0, alcance: 5.0, cadencia: 1.3, defesa: 8, velocidade: 9.1 },
    habilidades: [
      { key: 'Q', nome: 'Atravessar', icone: '🌫️', tipo: 'dash', cooldown: 6, distancia: 12, dano: 45, danoNivel: 11, invisivel: 1.5 },
      { key: 'E', nome: 'Grito Gelado', icone: '😱', tipo: 'cone', cooldown: 9, alcance: 7, angulo: 1.0, dano: 75, danoNivel: 19, golpes: 2, empurrao: 2 }
    ],
    ultimate: { key: 'R', nome: 'Assombração', icone: '👀', tipo: 'buff', cooldown: 58, duracao: 6, invisivel: true, buffAtaque: 0.45, buffVelocidade: 0.25 }
  },
  {
    id: 'pizza-man', nome: 'Pizza Man', emoji: '🍕', role: 'suporte', cor: 0xe2a829, forma: 'pizza',
    lore: 'Entrega em 30 minutos ou o abate é grátis.',
    stats: { vida: 660, vidaNivel: 82, ataque: 24, ataqueNivel: 5.4, alcance: 8.0, cadencia: 1.05, defesa: 11, velocidade: 8.3 },
    habilidades: [
      { key: 'Q', nome: 'Fatia Voadora', icone: '🍕', tipo: 'projetil', cooldown: 6, velocidade: 28, alcance: 15, dano: 80, danoNivel: 18, perfura: true },
      { key: 'E', nome: 'Rodízio', icone: '🧀', tipo: 'cura', cooldown: 10, raio: 6, cura: 120, curaNivel: 28, buffVelocidade: 0.22, duracaoEfeito: 3 }
    ],
    ultimate: { key: 'R', nome: 'Buffet Livre', icone: '🍽️', tipo: 'buff', cooldown: 60, duracao: 8, raioAliado: 8, escudo: 260, buffAtaque: 0.2, buffVelocidade: 0.2 }
  },
  {
    id: 'unicornia', nome: 'Unicórnia', emoji: '🦄', role: 'velocista', cor: 0xff9ff3, forma: 'unicornio',
    lore: 'Corre tão rápido que deixa arco-íris de tinta no chão.',
    stats: { vida: 610, vidaNivel: 76, ataque: 27, ataqueNivel: 5.8, alcance: 5.6, cadencia: 1.2, defesa: 9, velocidade: 9.4 },
    habilidades: [
      { key: 'Q', nome: 'Galope Arco-Íris', icone: '🌈', tipo: 'dash', cooldown: 5.5, distancia: 12, dano: 50, danoNivel: 12, empurrao: 2 },
      { key: 'E', nome: 'Chifrada', icone: '🦄', tipo: 'cone', cooldown: 8, alcance: 6, angulo: 0.9, dano: 95, danoNivel: 21, golpes: 1, empurrao: 4 }
    ],
    ultimate: { key: 'R', nome: 'Chuva de Purpurina', icone: '✨', tipo: 'area', cooldown: 55, raio: 8, dano: 60, danoNivel: 20, ticks: 6, intervalo: 0.5, lentidao: 0.4, curaAliado: 35 }
  },
  {
    id: 'caveirao', nome: 'Caveirão', emoji: '💀', role: 'assassino', cor: 0xeeeeee, forma: 'caveira',
    lore: 'Frágil que só, mas bate como um caminhão de tinta.',
    stats: { vida: 520, vidaNivel: 62, ataque: 38, ataqueNivel: 8.4, alcance: 4.8, cadencia: 1.25, defesa: 4, velocidade: 8.8 },
    habilidades: [
      { key: 'Q', nome: 'Osso Certeiro', icone: '🦴', tipo: 'projetil', cooldown: 5, velocidade: 32, alcance: 15, dano: 95, danoNivel: 22, perfura: true },
      { key: 'E', nome: 'Salto Macabro', icone: '☠️', tipo: 'dash', cooldown: 8, distancia: 10, dano: 85, danoNivel: 20, empurrao: 3 }
    ],
    ultimate: { key: 'R', nome: 'Dança dos Ossos', icone: '💀', tipo: 'buff', cooldown: 55, duracao: 7, buffAtaque: 0.6, roubaVida: 0.3, buffCadencia: 0.35 }
  },
  {
    id: 'alien-glub', nome: 'Alien Glub', emoji: '👽', role: 'atirador', cor: 0x6fd66f, forma: 'alien',
    lore: 'Veio de outro multiverso só pra jogar tinta.',
    stats: { vida: 585, vidaNivel: 71, ataque: 29, ataqueNivel: 6.6, alcance: 10.5, cadencia: 1.0, defesa: 7, velocidade: 8.0 },
    habilidades: [
      { key: 'Q', nome: 'Raio Abdutor', icone: '🛸', tipo: 'projetil', cooldown: 7, velocidade: 22, alcance: 17, dano: 90, danoNivel: 20, teleguiado: true, lentidao: 0.4, duracaoEfeito: 2 },
      { key: 'E', nome: 'Campo Gravitacional', icone: '🌌', tipo: 'area', cooldown: 11, raio: 6, dano: 50, danoNivel: 14, ticks: 4, intervalo: 0.6, lentidao: 0.5, duracaoEfeito: 2.5 }
    ],
    ultimate: { key: 'R', nome: 'Disco Voador', icone: '🛸', tipo: 'area', cooldown: 62, raio: 9, dano: 75, danoNivel: 26, ticks: 6, intervalo: 0.45, lentidao: 0.3 }
  },
  {
    id: 'cogu', nome: 'Cogu', emoji: '🍄', role: 'defensor', cor: 0xe8584d, forma: 'cogumelo',
    lore: 'Cresceu no canto úmido da arena e nunca mais saiu.',
    stats: { vida: 950, vidaNivel: 118, ataque: 23, ataqueNivel: 4.6, alcance: 5.4, cadencia: 0.9, defesa: 20, velocidade: 7.5 },
    habilidades: [
      { key: 'Q', nome: 'Nuvem de Esporos', icone: '🌫️', tipo: 'area', cooldown: 9, raio: 6.5, dano: 45, danoNivel: 13, ticks: 4, intervalo: 0.6, lentidao: 0.45, duracaoEfeito: 2.5 },
      { key: 'E', nome: 'Cabeçada Fofa', icone: '🍄', tipo: 'dash', cooldown: 8, distancia: 7, dano: 70, danoNivel: 15, empurrao: 5, escudo: 140 }
    ],
    ultimate: { key: 'R', nome: 'Chapéu Guarda-Chuva', icone: '☂️', tipo: 'buff', cooldown: 58, duracao: 9, raioAliado: 7, escudo: 380, reducaoDano: 0.3 }
  },
  {
    id: 'pinguim-frost', nome: 'Pinguim Frost', emoji: '🐧', role: 'atirador', cor: 0x223344, forma: 'pinguim',
    lore: 'Congela a tinta antes de arremessar. Ninguém sabe como.',
    stats: { vida: 620, vidaNivel: 76, ataque: 27, ataqueNivel: 6.2, alcance: 9.5, cadencia: 1.0, defesa: 12, velocidade: 7.9 },
    habilidades: [
      { key: 'Q', nome: 'Bola de Gelo', icone: '❄️', tipo: 'projetil', cooldown: 6, velocidade: 26, alcance: 15, dano: 80, danoNivel: 18, raioExplosao: 3.2, lentidao: 0.5, duracaoEfeito: 2.5 },
      { key: 'E', nome: 'Escorrega no Gelo', icone: '⛸️', tipo: 'dash', cooldown: 8, distancia: 9, dano: 45, danoNivel: 11, lentidao: 0.35, duracaoEfeito: 2 }
    ],
    ultimate: { key: 'R', nome: 'Nevasca', icone: '🌨️', tipo: 'area', cooldown: 60, raio: 9, dano: 55, danoNivel: 19, ticks: 8, intervalo: 0.5, lentidao: 0.55, duracaoEfeito: 1.5 }
  },
  {
    id: 'abelha-zum', nome: 'Abelha Zum', emoji: '🐝', role: 'velocista', cor: 0xffc107, forma: 'abelha',
    lore: 'Zumbido irritante + ferrão de tinta = pesadelo.',
    stats: { vida: 590, vidaNivel: 72, ataque: 26, ataqueNivel: 5.9, alcance: 7.0, cadencia: 1.35, defesa: 8, velocidade: 9.5 },
    habilidades: [
      { key: 'Q', nome: 'Ferroada', icone: '🐝', tipo: 'dash', cooldown: 5, distancia: 10, dano: 60, danoNivel: 13, roubaVida: 0.2 },
      { key: 'E', nome: 'Enxame', icone: '🍯', tipo: 'area', cooldown: 10, raio: 5.5, dano: 45, danoNivel: 13, ticks: 5, intervalo: 0.4, lentidao: 0.3, duracaoEfeito: 1.5 }
    ],
    ultimate: { key: 'R', nome: 'Modo Zum-Zum', icone: '💨', tipo: 'buff', cooldown: 54, duracao: 8, buffCadencia: 0.7, buffVelocidade: 0.35, buffAtaque: 0.2 }
  },
  {
    id: 'vovo-punk', nome: 'Vovó Punk', emoji: '👵', role: 'suporte', cor: 0xff6ec7, forma: 'vovo',
    lore: 'Tricota escudos e xinga inimigo em dois idiomas.',
    stats: { vida: 700, vidaNivel: 88, ataque: 23, ataqueNivel: 5.2, alcance: 8.2, cadencia: 0.95, defesa: 14, velocidade: 7.8 },
    habilidades: [
      { key: 'Q', nome: 'Chá da Vovó', icone: '🍵', tipo: 'cura', cooldown: 8, raio: 6, cura: 140, curaNivel: 32, buffVelocidade: 0.15, duracaoEfeito: 3 },
      { key: 'E', nome: 'Bolsada', icone: '👜', tipo: 'cone', cooldown: 9, alcance: 5.5, angulo: 1.3, dano: 85, danoNivel: 18, golpes: 1, empurrao: 5 }
    ],
    ultimate: { key: 'R', nome: 'Tricô Blindado', icone: '🧶', tipo: 'buff', cooldown: 60, duracao: 9, raioAliado: 8, escudo: 320, reducaoDano: 0.25, buffVelocidade: 0.15 }
  },
  {
    id: 'polvo-otto', nome: 'Polvo Otto', emoji: '🐙', role: 'defensor', cor: 0xb5179e, forma: 'polvo',
    lore: 'Oito braços, oito marcadores de tinta.',
    stats: { vida: 880, vidaNivel: 110, ataque: 25, ataqueNivel: 5.2, alcance: 6.2, cadencia: 1.1, defesa: 17, velocidade: 7.9 },
    habilidades: [
      { key: 'Q', nome: 'Chicote de Tentáculo', icone: '🦑', tipo: 'cone', cooldown: 7, alcance: 8, angulo: 1.4, dano: 70, danoNivel: 16, golpes: 2, empurrao: 3 },
      { key: 'E', nome: 'Nuvem de Tinta', icone: '🖤', tipo: 'area', cooldown: 10, raio: 6, dano: 40, danoNivel: 12, ticks: 5, intervalo: 0.5, lentidao: 0.5, duracaoEfeito: 2 }
    ],
    ultimate: { key: 'R', nome: 'Abraço de Oito Braços', icone: '🐙', tipo: 'area', cooldown: 58, raio: 7.5, dano: 80, danoNivel: 24, ticks: 5, intervalo: 0.4, lentidao: 0.6, duracaoEfeito: 2, curaAliado: 30 }
  },
  {
    id: 'dr-cerebro', nome: 'Dr. Cérebro', emoji: '🧠', role: 'suporte', cor: 0xff8fab, forma: 'cerebro',
    lore: 'Calculou a trajetória perfeita da tinta. Errou mesmo assim.',
    stats: { vida: 600, vidaNivel: 74, ataque: 28, ataqueNivel: 6.4, alcance: 9.0, cadencia: 0.95, defesa: 9, velocidade: 8.0 },
    habilidades: [
      { key: 'Q', nome: 'Pulso Mental', icone: '🧠', tipo: 'projetil', cooldown: 6, velocidade: 30, alcance: 16, dano: 85, danoNivel: 20, perfura: true, lentidao: 0.3, duracaoEfeito: 1.5 },
      { key: 'E', nome: 'Experimento', icone: '⚗️', tipo: 'cura', cooldown: 10, raio: 6, cura: 110, curaNivel: 26, buffVelocidade: 0.25, duracaoEfeito: 3.5 }
    ],
    ultimate: { key: 'R', nome: 'Colapso Cerebral', icone: '💫', tipo: 'area', cooldown: 62, raio: 8.5, dano: 90, danoNivel: 28, ticks: 5, intervalo: 0.6, lentidao: 0.45, duracaoEfeito: 2 }
  },
  {
    id: 'foguetinho', nome: 'Foguetinho', emoji: '🚀', role: 'assassino', cor: 0xc44536, forma: 'foguete',
    lore: 'Só tem dois botões: ligar e explodir.',
    stats: { vida: 560, vidaNivel: 68, ataque: 33, ataqueNivel: 7.4, alcance: 5.5, cadencia: 1.2, defesa: 7, velocidade: 9.3 },
    habilidades: [
      { key: 'Q', nome: 'Decolagem', icone: '🚀', tipo: 'dash', cooldown: 5.5, distancia: 14, dano: 55, danoNivel: 13, empurrao: 3 },
      { key: 'E', nome: 'Fogos de Artifício', icone: '🎆', tipo: 'projetil', cooldown: 9, velocidade: 20, alcance: 15, dano: 105, danoNivel: 24, raioExplosao: 4.2 }
    ],
    ultimate: { key: 'R', nome: 'Reentrada', icone: '☄️', tipo: 'dash', cooldown: 56, distancia: 20, dano: 170, danoNivel: 36, empurrao: 6, escudo: 180, imparavel: true }
  }
]
