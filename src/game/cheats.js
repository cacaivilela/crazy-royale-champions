// ============================================================
//  CHEATS — códigos malucos, liberados por sala/partida
//  Modos: 'nenhum' | 'escrita' (digitar no T) | 'audio' (falar no microfone)
//  No online quem aplica é sempre o HOST (o cliente só manda o código).
// ============================================================
import { bus } from '../core/events.js'
import { CONFIG } from '../data/runtime.js'

export const MODOS = {
  nenhum: { nome: 'Sem cheats', icone: '🚫', dica: 'partida limpa, do jeito que os puristas gostam' },
  escrita: { nome: 'Cheats escritos', icone: '⌨️', dica: 'aperte T e digite o código' },
  audio: { nome: 'Cheats de áudio', icone: '🎤', dica: 'fale o código no microfone (precisa de permissão)' }
}

// Cada cheat tem palavras que valem (escrito ou falado).
export const CHEATS = [
  {
    id: 'tinta', palavras: ['tinta', 'balde', 'tinta maluca'], icone: '🎨',
    descricao: 'enche seu tanque de tinta',
    aplicar: (m, u) => { u.tinta = CONFIG.jogador.maxTintaCarregada; return 'TANQUE CHEIO!' }
  },
  {
    id: 'vida', palavras: ['vida', 'cura', 'poção', 'pocao'], icone: '❤️',
    descricao: 'cura tudo e dá escudo',
    aplicar: (m, u) => { u.curar(u.vidaMax); u.escudo += 300; return 'VIDA CHEIA + ESCUDO!' }
  },
  {
    id: 'turbo', palavras: ['turbo', 'corre', 'foguete'], icone: '💨',
    descricao: '+80% de velocidade por 20s',
    aplicar: (m, u) => { u.addStatus('velocidade', 0.8, 20); return 'TURBO LIGADO!' }
  },
  {
    id: 'forca', palavras: ['força', 'forca', 'brutamontes', 'porrada'], icone: '💪',
    descricao: 'dobra seu ataque por 20s',
    aplicar: (m, u) => { u.addStatus('ataque', 1.0, 20); return 'FORÇA BRUTA!' }
  },
  {
    id: 'ulti', palavras: ['ulti', 'ultimate', 'recarrega'], icone: '⚡',
    descricao: 'zera as recargas das habilidades',
    aplicar: (m, u) => { u.cooldowns = {}; return 'HABILIDADES PRONTAS!' }
  },
  {
    id: 'nivel', palavras: ['nível', 'nivel', 'level', 'sobe'], icone: '⭐',
    descricao: 'sobe um nível na hora',
    aplicar: (m, u) => {
      if (u.nivel >= CONFIG.jogador.nivelMax) return 'JÁ ESTÁ NO MÁXIMO!'
      u.nivel++; const antes = u.vidaMax; u.recalcular(); u.vida += (u.vidaMax - antes)
      return 'NÍVEL ' + u.nivel + '!'
    }
  },
  {
    id: 'gigante', palavras: ['gigante', 'grandão', 'grandao'], icone: '🦣',
    descricao: 'fica gigante e mais forte por 20s',
    aplicar: (m, u) => {
      u.grupo.scale.setScalar(u.escala * 1.7)
      u.addStatus('ataque', 0.5, 20); u.addStatus('reducaoDano', 0.25, 20)
      m.agendar(20, () => u.grupo.scale.setScalar(u.escala))
      return 'MODO GIGANTE!'
    }
  },
  {
    id: 'mini', palavras: ['mini', 'pequeno', 'formiga'], icone: '🐜',
    descricao: 'fica minúsculo e muito rápido',
    aplicar: (m, u) => {
      u.grupo.scale.setScalar(u.escala * 0.55)
      u.addStatus('velocidade', 0.6, 20)
      m.agendar(20, () => u.grupo.scale.setScalar(u.escala))
      return 'MODO FORMIGA!'
    }
  },
  {
    id: 'fantasma', palavras: ['fantasma', 'sumir', 'invisível', 'invisivel'], icone: '👻',
    descricao: 'fica invisível por 12s',
    aplicar: (m, u) => { u.addStatus('invisivel', 1, 12); return 'AGORA VOCÊ SUMIU!' }
  },
  {
    id: 'chefe', palavras: ['chefe', 'chefão', 'chefao', 'baldão', 'baldao'], icone: '👹',
    descricao: 'chama o Baldão Chefe na hora',
    aplicar: (m) => {
      if (m.selvagens.chefaoSpawnado) return 'O CHEFE JÁ VEIO!'
      m.selvagens.chefaoSpawnado = true
      m.selvagens.criar('chefao', m.arena.pontoChefao)
      if (m.rede) m.rede.enviarParaTodos({ t: 'selvagem', tipo: 'chefao' })
      return 'CHEFÃO CONVOCADO!'
    }
  }
]

const normalizar = (txt) => (txt || '').toString().toLowerCase().trim()
  .replace(/[.!?,]/g, '').replace(/\s+/g, ' ')

export function acharCheat (texto) {
  const t = normalizar(texto)
  if (!t) return null
  return CHEATS.find(c => c.id === t || c.palavras.some(p => t === p || t.includes(p))) || null
}

/**
 * Aplica um cheat. Só roda de verdade no host/offline.
 * Retorna a mensagem pra HUD (ou null se não valeu).
 */
export function aplicarCheat (match, unidade, texto) {
  if (!match || !unidade || match.cheats === 'nenhum') return null
  const cheat = acharCheat(texto)
  if (!cheat) return null
  const msg = cheat.aplicar(match, unidade)
  bus.emit('cheat:aplicado', { cheat, unidade, mensagem: msg })
  return { cheat, mensagem: msg }
}

export function listaDeCheats () {
  return CHEATS.map(c => `${c.icone} <b>${c.palavras[0]}</b> — ${c.descricao}`)
}
