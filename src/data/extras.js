// ============================================================
//  HABILIDADES EXTRAS — o prêmio da 🎡 Roleta Habilidosa
//  Uma extra fica equipada no slot X do campeão (ativa) ou
//  entra direto nos atributos (passiva).
//  Mesma linguagem de src/data/champions.js: dá pra criar extra
//  nova só adicionando um objeto aqui (ou por patch ao vivo).
// ============================================================
import { bus } from '../core/events.js'

export const RARIDADES = {
  comum: { nome: 'Comum', cor: 0x9ca3af, peso: 55 },
  rara: { nome: 'Rara', cor: 0x38bdf8, peso: 30 },
  epica: { nome: 'Épica', cor: 0xa855f7, peso: 15 }
}

export const EXTRAS = [
  // ---------- ativas (vão pro slot X) ----------
  {
    id: 'bomba-tinta', nome: 'Bomba de Tinta', icone: '💣', raridade: 'comum',
    descricao: 'joga uma bomba que explode numa área grande',
    key: 'X', tipo: 'projetil', cooldown: 12, velocidade: 20, alcance: 14,
    dano: 120, danoNivel: 18, raioExplosao: 5
  },
  {
    id: 'raio-trovao', nome: 'Raio Trovão', icone: '⚡', raridade: 'rara',
    descricao: 'raio que atravessa todo mundo na linha',
    key: 'X', tipo: 'projetil', cooldown: 10, velocidade: 40, alcance: 18,
    dano: 100, danoNivel: 22, perfura: true, lentidao: 0.3, duracaoEfeito: 1.5
  },
  {
    id: 'redemoinho', nome: 'Redemoinho', icone: '🌀', raridade: 'rara',
    descricao: 'tornado de tinta que castiga a área por 3s',
    key: 'X', tipo: 'area', cooldown: 14, raio: 6.5, dano: 90, danoNivel: 20,
    ticks: 6, intervalo: 0.5, lentidao: 0.45, duracaoEfeito: 1.5
  },
  {
    id: 'planador', nome: 'Planador', icone: '🦅', raridade: 'comum',
    descricao: 'voo rasante que atropela quem estiver no caminho',
    key: 'X', tipo: 'dash', cooldown: 9, distancia: 16, dano: 60, danoNivel: 12, empurrao: 3
  },
  {
    id: 'barreira', nome: 'Barreira de Lata', icone: '🛡️', raridade: 'comum',
    descricao: 'escudo grosso pra você e quem estiver perto',
    key: 'X', tipo: 'buff', cooldown: 20, duracao: 8, escudo: 220, raioAliado: 6, reducaoDano: 0.15
  },
  {
    id: 'seringa', nome: 'Seringa Maluca', icone: '💉', raridade: 'comum',
    descricao: 'cura na hora e acelera o time por 3s',
    key: 'X', tipo: 'cura', cooldown: 16, raio: 5.5, cura: 160, curaNivel: 25,
    buffVelocidade: 0.25, duracaoEfeito: 3
  },
  {
    id: 'passo-fantasma', nome: 'Passo Fantasma', icone: '👣', raridade: 'epica',
    descricao: 'some por 5s e sai mais rápido',
    key: 'X', tipo: 'buff', cooldown: 26, duracao: 5, invisivel: true, buffVelocidade: 0.35
  },
  {
    id: 'garras', nome: 'Garras de Tinta', icone: '🐾', raridade: 'rara',
    descricao: 'três talhos em leque na frente',
    key: 'X', tipo: 'cone', cooldown: 11, alcance: 7, angulo: 1.2,
    dano: 95, danoNivel: 20, golpes: 3
  },
  {
    id: 'buraco', nome: 'Buraco Pegajoso', icone: '🕳️', raridade: 'comum',
    descricao: 'poça que quase congela quem pisa',
    key: 'X', tipo: 'area', cooldown: 13, raio: 6, dano: 40, danoNivel: 10,
    ticks: 5, intervalo: 0.6, lentidao: 0.65, duracaoEfeito: 2.5
  },
  {
    id: 'furia-final', nome: 'Fúria Final', icone: '🔥', raridade: 'epica',
    descricao: 'por 8s: +60% de ataque e roubo de vida',
    key: 'X', tipo: 'buff', cooldown: 40, duracao: 8, buffAtaque: 0.6, roubaVida: 0.25, buffCadencia: 0.3
  },

  // ---------- passivas (entram direto nos atributos) ----------
  {
    id: 'botas-turbo', nome: 'Botas Turbo', icone: '🥾', raridade: 'comum',
    descricao: 'passiva: +15% de velocidade o tempo todo',
    tipo: 'passiva', velocidade: 0.15
  },
  {
    id: 'coracao-lata', nome: 'Coração de Lata', icone: '❤️', raridade: 'comum',
    descricao: 'passiva: +180 de vida máxima',
    tipo: 'passiva', vida: 180
  },
  {
    id: 'sorte-grande', nome: 'Sorte Grande', icone: '🍀', raridade: 'rara',
    descricao: 'passiva: +20% de dano',
    tipo: 'passiva', ataque: 0.2
  },
  {
    id: 'ima-tinta', nome: 'Ímã de Tinta', icone: '🧲', raridade: 'rara',
    descricao: 'passiva: +50% de tinta em tudo que você derruba',
    tipo: 'passiva', tintaBonus: 0.5
  },
  {
    id: 'casco', nome: 'Casco Reforçado', icone: '🐢', raridade: 'epica',
    descricao: 'passiva: -18% de dano recebido e +40 de defesa',
    tipo: 'passiva', defesa: 40, reducaoDano: 0.18
  },
  {
    id: 'mira-laser', nome: 'Mira Laser', icone: '🎯', raridade: 'epica',
    descricao: 'passiva: +3 de alcance e +25% de cadência',
    tipo: 'passiva', alcance: 3, cadencia: 0.25
  }
  ,

  // ---------- lote 2: as iradas ----------
  {
    id: 'vulcao', nome: 'Vulcão de Tinta', icone: '🌋', raridade: 'epica',
    descricao: 'o chão vira lava colorida e queima por 4s',
    key: 'X', tipo: 'area', cooldown: 22, raio: 7.5, dano: 150, danoNivel: 26,
    ticks: 8, intervalo: 0.5, lentidao: 0.35, duracaoEfeito: 1.5
  },
  {
    id: 'jato-congelante', nome: 'Jato Congelante', icone: '🧊', raridade: 'rara',
    descricao: 'quase congela quem toma: 70% de lentidão',
    key: 'X', tipo: 'projetil', cooldown: 12, velocidade: 28, alcance: 15,
    dano: 80, danoNivel: 16, raioExplosao: 4, lentidao: 0.7, duracaoEfeito: 3
  },
  {
    id: 'bumerangue', nome: 'Bumerangue Maluco', icone: '🪃', raridade: 'comum',
    descricao: 'atravessa a galera toda numa tacada só',
    key: 'X', tipo: 'projetil', cooldown: 9, velocidade: 26, alcance: 22,
    dano: 85, danoNivel: 17, perfura: true
  },
  {
    id: 'fogos', nome: 'Fogos de Festa', icone: '🎆', raridade: 'comum',
    descricao: 'explode numa área enorme e faz barulho',
    key: 'X', tipo: 'projetil', cooldown: 13, velocidade: 18, alcance: 15,
    dano: 115, danoNivel: 20, raioExplosao: 5.5
  },
  {
    id: 'ventania', nome: 'Ventania', icone: '🌪️', raridade: 'comum',
    descricao: 'sopra todo mundo pra longe',
    key: 'X', tipo: 'cone', cooldown: 12, alcance: 9, angulo: 1.5,
    dano: 60, danoNivel: 12, golpes: 1, empurrao: 8
  },
  {
    id: 'pirulito', nome: 'Pirulito Gigante', icone: '🍭', raridade: 'comum',
    descricao: 'pancada doce que gruda o inimigo no chão',
    key: 'X', tipo: 'cone', cooldown: 10, alcance: 6.5, angulo: 1.0,
    dano: 110, danoNivel: 22, golpes: 1, empurrao: 3
  },
  {
    id: 'pocao-coletiva', nome: 'Poção Coletiva', icone: '🧪', raridade: 'rara',
    descricao: 'cura o time inteiro numa área bem grande',
    key: 'X', tipo: 'cura', cooldown: 24, raio: 9, cura: 200, curaNivel: 30,
    buffVelocidade: 0.2, duracaoEfeito: 3
  },
  {
    id: 'tiro-certeiro', nome: 'Tiro Certeiro', icone: '🎯', raridade: 'rara',
    descricao: 'por 9s: +4 de alcance e +50% de cadência',
    key: 'X', tipo: 'buff', cooldown: 28, duracao: 9, buffAlcance: 4, buffCadencia: 0.5
  },
  {
    id: 'maldicao', nome: 'Maldição da Tinta', icone: '💀', raridade: 'epica',
    descricao: 'zona amaldiçoada: dano contínuo e lentidão pesada',
    key: 'X', tipo: 'area', cooldown: 26, raio: 8, dano: 130, danoNivel: 24,
    ticks: 6, intervalo: 0.7, lentidao: 0.55, duracaoEfeito: 3
  },
  {
    id: 'casco-giratorio', nome: 'Casco Giratório', icone: '🐢', raridade: 'comum',
    descricao: 'sai rodopiando, empurra e ainda ganha escudo',
    key: 'X', tipo: 'dash', cooldown: 11, distancia: 13, dano: 80, danoNivel: 16,
    empurrao: 5, escudo: 150
  },

  // ---------- passivas iradas ----------
  {
    id: 'pele-regenerativa', nome: 'Pele Regenerativa', icone: '🦎', raridade: 'rara',
    descricao: 'passiva: regenera 2% da vida por segundo',
    tipo: 'passiva', regen: 0.02
  },
  {
    id: 'sede-tinta', nome: 'Sede de Tinta', icone: '🧛', raridade: 'rara',
    descricao: 'passiva: 18% de todo dano vira vida pra você',
    tipo: 'passiva', roubaVida: 0.18
  },
  {
    id: 'coroa-real', nome: 'Coroa Real', icone: '👑', raridade: 'epica',
    descricao: 'passiva: +10% de ataque, +10% de velocidade e +120 de vida',
    tipo: 'passiva', ataque: 0.1, velocidade: 0.1, vida: 120
  },
  {
    id: 'leveza', nome: 'Leveza de Pluma', icone: '🪶', raridade: 'comum',
    descricao: 'passiva: +25% de velocidade, mas -80 de vida (vai na fé)',
    tipo: 'passiva', velocidade: 0.25, vida: -80
  }
]

export const getExtra = (id) => EXTRAS.find(e => e.id === id) || null

/** Sorteio com peso por raridade. */
export function sortearExtra (excluir = null) {
  const lista = EXTRAS.filter(e => e.id !== excluir)
  const total = lista.reduce((s, e) => s + (RARIDADES[e.raridade]?.peso || 10), 0)
  let n = Math.random() * total
  for (const e of lista) {
    n -= RARIDADES[e.raridade]?.peso || 10
    if (n <= 0) return e
  }
  return lista[lista.length - 1]
}

// ---------------- o que está equipado (fica salvo no navegador) ----------------
const CHAVE = 'crc-extras'

function ler () {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') } catch (e) { return {} }
}

export function extraEquipado (champId) {
  return getExtra(ler()[champId])
}

export function equiparExtra (champId, extraId) {
  const mapa = ler()
  if (extraId) mapa[champId] = extraId; else delete mapa[champId]
  try { localStorage.setItem(CHAVE, JSON.stringify(mapa)) } catch (e) { /* modo anônimo */ }
  bus.emit('extra:equipado', { champId, extra: getExtra(extraId) })
  return getExtra(extraId)
}
