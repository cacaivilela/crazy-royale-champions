// ============================================================
//  NOVATOS — exclusivos do Crazy Royale Champions
//  Não existem no Crazy Royale original: são a turma nova que
//  entrou no torneio. Como acabaram de chegar, os status são
//  fraquinhos de propósito (menos vida, menos dano, recarga
//  maior) — mas cada um tem um truque só dele.
//  Mesma estrutura dos campeões, com `novato: true`.
// ============================================================
export const BASE_NOVATOS = [
  {
    id: 'guitarrao', nome: 'Guitarrão', emoji: '🎸', role: 'atirador', cor: 0xe11d48, forma: 'guitarra', novato: true,
    lore: 'Novato: sabe três acordes e acha que já é headliner.',
    stats: { vida: 470, vidaNivel: 54, ataque: 18, ataqueNivel: 3.6, alcance: 8.5, cadencia: 0.85, defesa: 5, velocidade: 7.6 },
    habilidades: [
      { key: 'Q', nome: 'Acorde Estourado', icone: '🎵', tipo: 'projetil', cooldown: 11, velocidade: 22, alcance: 12, dano: 45, danoNivel: 9 },
      { key: 'E', nome: 'Microfonia', icone: '🔊', tipo: 'area', cooldown: 15, raio: 4.5, dano: 30, danoNivel: 7, ticks: 2, intervalo: 0.6, lentidao: 0.25, duracaoEfeito: 1.5 }
    ],
    ultimate: { key: 'R', nome: 'Solo de Guitarra', icone: '🤘', tipo: 'buff', cooldown: 75, duracao: 6, buffAtaque: 0.3, buffCadencia: 0.25 }
  },
  {
    id: 'cubo-gelo', nome: 'Cubo Gelo', emoji: '🧊', role: 'defensor', cor: 0x7dd3fc, forma: 'gelo', novato: true,
    lore: 'Novato: aguenta pancada, mas derrete de nervoso.',
    stats: { vida: 620, vidaNivel: 68, ataque: 15, ataqueNivel: 3.0, alcance: 4.5, cadencia: 0.75, defesa: 12, velocidade: 6.9 },
    habilidades: [
      { key: 'Q', nome: 'Escorregão', icone: '⛸️', tipo: 'dash', cooldown: 12, distancia: 6, dano: 30, danoNivel: 7, lentidao: 0.25, duracaoEfeito: 1.5 },
      { key: 'E', nome: 'Casquinha de Gelo', icone: '🧊', tipo: 'buff', cooldown: 18, duracao: 5, escudo: 90, reducaoDano: 0.12 }
    ],
    ultimate: { key: 'R', nome: 'Geladeira Aberta', icone: '❄️', tipo: 'area', cooldown: 80, raio: 5.5, dano: 40, danoNivel: 10, ticks: 3, intervalo: 0.7, lentidao: 0.4, duracaoEfeito: 2 }
  },
  {
    id: 'dona-cupcake', nome: 'Dona Cupcake', emoji: '🧁', role: 'suporte', cor: 0xff8fc7, forma: 'cupcake', novato: true,
    lore: 'Novata: cura com açúcar e boa vontade (mais açúcar que técnica).',
    stats: { vida: 480, vidaNivel: 56, ataque: 14, ataqueNivel: 2.8, alcance: 7.0, cadencia: 0.8, defesa: 6, velocidade: 7.4 },
    habilidades: [
      { key: 'Q', nome: 'Confeito Curativo', icone: '🍬', tipo: 'cura', cooldown: 14, raio: 4.5, cura: 60, curaNivel: 12, buffVelocidade: 0.1, duracaoEfeito: 2 },
      { key: 'E', nome: 'Chuva de Granulado', icone: '✨', tipo: 'area', cooldown: 16, raio: 4.5, dano: 28, danoNivel: 6, ticks: 3, intervalo: 0.5, lentidao: 0.2, duracaoEfeito: 1.5 }
    ],
    ultimate: { key: 'R', nome: 'Festa de Aniversário', icone: '🎉', tipo: 'cura', cooldown: 78, raio: 6.5, cura: 130, curaNivel: 22, buffVelocidade: 0.2, duracaoEfeito: 3 }
  },
  {
    id: 'raiozinho', nome: 'Raiozinho', emoji: '⚡', role: 'assassino', cor: 0xcbd5e1, forma: 'nuvem', novato: true,
    lore: 'Novato: é rápido, mas o raio dele ainda é mais susto que dano.',
    stats: { vida: 420, vidaNivel: 48, ataque: 20, ataqueNivel: 4.2, alcance: 5.0, cadencia: 1.0, defesa: 3, velocidade: 8.6 },
    habilidades: [
      { key: 'Q', nome: 'Piscar de Raio', icone: '⚡', tipo: 'dash', cooldown: 10, distancia: 8, dano: 35, danoNivel: 8 },
      { key: 'E', nome: 'Chuvisco', icone: '🌧️', tipo: 'projetil', cooldown: 13, velocidade: 26, alcance: 11, dano: 42, danoNivel: 9, lentidao: 0.2, duracaoEfeito: 1.5 }
    ],
    ultimate: { key: 'R', nome: 'Tempestadinha', icone: '⛈️', tipo: 'area', cooldown: 76, raio: 5, dano: 45, danoNivel: 11, ticks: 4, intervalo: 0.5, lentidao: 0.25 }
  },
  {
    id: 'pipa', nome: 'Pipa Voadora', emoji: '🪁', role: 'velocista', cor: 0xfacc15, forma: 'pipa', novato: true,
    lore: 'Novata: corre com o vento — e cai com ele também.',
    stats: { vida: 430, vidaNivel: 50, ataque: 16, ataqueNivel: 3.2, alcance: 5.5, cadencia: 0.95, defesa: 3, velocidade: 8.8 },
    habilidades: [
      { key: 'Q', nome: 'Rasante', icone: '🪁', tipo: 'dash', cooldown: 9, distancia: 9, dano: 28, danoNivel: 6 },
      { key: 'E', nome: 'Rabiolada', icone: '🎗️', tipo: 'cone', cooldown: 14, alcance: 5, angulo: 1.1, dano: 40, danoNivel: 9, golpes: 1, empurrao: 2 }
    ],
    ultimate: { key: 'R', nome: 'Vento Forte', icone: '🌬️', tipo: 'buff', cooldown: 72, duracao: 6, buffVelocidade: 0.35, raioAliado: 5 }
  },
  {
    id: 'ima-ivan', nome: 'Ímã Ivan', emoji: '🧲', role: 'defensor', cor: 0xf43f5e, forma: 'ima', novato: true,
    lore: 'Novato: atrai tudo — inclusive problema.',
    stats: { vida: 590, vidaNivel: 64, ataque: 15, ataqueNivel: 3.0, alcance: 5.0, cadencia: 0.8, defesa: 10, velocidade: 7.1 },
    habilidades: [
      { key: 'Q', nome: 'Puxadinha', icone: '🧲', tipo: 'cone', cooldown: 12, alcance: 5.5, angulo: 1.3, dano: 32, danoNivel: 7, golpes: 1, empurrao: -3 },
      { key: 'E', nome: 'Campo Magnético', icone: '🌀', tipo: 'area', cooldown: 17, raio: 4.5, dano: 26, danoNivel: 6, ticks: 3, intervalo: 0.6, lentidao: 0.35, duracaoEfeito: 2 }
    ],
    ultimate: { key: 'R', nome: 'Atração Fatal', icone: '💥', tipo: 'area', cooldown: 80, raio: 6, dano: 60, danoNivel: 13, ticks: 3, intervalo: 0.5, lentidao: 0.45, duracaoEfeito: 2.5 }
  },
  {
    id: 'sinal-fechado', nome: 'Sinal Fechado', emoji: '🚦', role: 'defensor', cor: 0x334155, forma: 'semaforo', novato: true,
    lore: 'Novato: manda todo mundo parar, mas ninguém obedece direito.',
    stats: { vida: 640, vidaNivel: 70, ataque: 13, ataqueNivel: 2.6, alcance: 6.0, cadencia: 0.7, defesa: 13, velocidade: 6.7 },
    habilidades: [
      { key: 'Q', nome: 'Sinal Vermelho', icone: '🔴', tipo: 'area', cooldown: 13, raio: 5, dano: 24, danoNivel: 5, ticks: 1, intervalo: 0.1, lentidao: 0.5, duracaoEfeito: 2 },
      { key: 'E', nome: 'Sinal Verde', icone: '🟢', tipo: 'buff', cooldown: 18, duracao: 5, buffVelocidade: 0.22, raioAliado: 5 }
    ],
    ultimate: { key: 'R', nome: 'Blitz', icone: '🚧', tipo: 'area', cooldown: 82, raio: 6.5, dano: 50, danoNivel: 11, ticks: 4, intervalo: 0.6, lentidao: 0.55, duracaoEfeito: 2.5 }
  },
  {
    id: 'globo-disco', nome: 'Globo Disco', emoji: '🪩', role: 'suporte', cor: 0xa78bfa, forma: 'globo', novato: true,
    lore: 'Novato: acha que partida é balada. Às vezes é.',
    stats: { vida: 460, vidaNivel: 52, ataque: 15, ataqueNivel: 3.0, alcance: 7.5, cadencia: 0.85, defesa: 5, velocidade: 7.5 },
    habilidades: [
      { key: 'Q', nome: 'Feixe de Luz', icone: '💡', tipo: 'projetil', cooldown: 11, velocidade: 24, alcance: 12, dano: 40, danoNivel: 8 },
      { key: 'E', nome: 'Pista de Dança', icone: '🕺', tipo: 'buff', cooldown: 17, duracao: 5, buffAtaque: 0.12, buffVelocidade: 0.15, raioAliado: 6 }
    ],
    ultimate: { key: 'R', nome: 'Balada Total', icone: '🪩', tipo: 'area', cooldown: 80, raio: 6, dano: 40, danoNivel: 9, ticks: 5, intervalo: 0.5, lentidao: 0.3, curaAliado: 18 }
  }
]
