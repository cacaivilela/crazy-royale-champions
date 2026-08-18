// ============================================================
//  ESTADO DE DADOS EM RUNTIME
//  CONFIG e CHAMPIONS são objetos MUTÁVEIS: o live update
//  sobrescreve valores aqui e o jogo pega a mudança na hora.
//  Nunca faça `import { CONFIG } ... const c = {...CONFIG}` em
//  módulos de gameplay: leia sempre CONFIG.x no momento do uso.
// ============================================================
import { BASE_CONFIG } from './config.js'
import { BASE_CHAMPIONS } from './champions.js'
import { BASE_NOVATOS } from './novatos.js'
import { bus } from '../core/events.js'

const clone = (o) => JSON.parse(JSON.stringify(o))

export const CONFIG = clone(BASE_CONFIG)
// campeões da franquia + novatos exclusivos do Champions
export const CHAMPIONS = clone([...BASE_CHAMPIONS, ...BASE_NOVATOS])

export const PATCH = {
  versao: CONFIG.versao,
  notas: ['Versão base do boilerplate.'],
  aplicadoEm: null,
  origem: 'local'
}

export function getChampion (id) {
  return CHAMPIONS.find(c => c.id === id) || CHAMPIONS[0]
}

// merge recursivo (arrays são substituídos, objetos mesclados)
function deepMerge (alvo, fonte) {
  if (!fonte || typeof fonte !== 'object') return alvo
  for (const k of Object.keys(fonte)) {
    const v = fonte[k]
    if (v && typeof v === 'object' && !Array.isArray(v) &&
        alvo[k] && typeof alvo[k] === 'object' && !Array.isArray(alvo[k])) {
      deepMerge(alvo[k], v)
    } else {
      alvo[k] = Array.isArray(v) ? clone(v) : v
    }
  }
  return alvo
}

function patchChampion (champ, dados) {
  const { habilidades, ultimate, ...resto } = dados
  deepMerge(champ, resto)
  if (ultimate) deepMerge(champ.ultimate, ultimate)
  if (habilidades) {
    // aceita objeto por tecla ({ Q: {...} }) ou array na ordem
    if (Array.isArray(habilidades)) {
      habilidades.forEach((h, i) => { if (champ.habilidades[i]) deepMerge(champ.habilidades[i], h) })
    } else {
      for (const key of Object.keys(habilidades)) {
        const alvo = champ.habilidades.find(h => h.key === key)
        if (alvo) deepMerge(alvo, habilidades[key])
      }
    }
  }
}

/**
 * Aplica um patch vindo de content/patch.json (ou de qualquer fonte).
 * Retorna true se algo mudou de fato.
 */
export function applyPatch (patch, origem = 'arquivo') {
  if (!patch || typeof patch !== 'object') return false
  if (patch.versao && patch.versao === PATCH.versao && origem !== 'forcado') return false

  if (patch.config) deepMerge(CONFIG, patch.config)

  if (patch.campeoes) {
    for (const id of Object.keys(patch.campeoes)) {
      const champ = CHAMPIONS.find(c => c.id === id)
      if (champ) patchChampion(champ, patch.campeoes[id])
    }
  }

  // campeões novos entram sem recarregar a página
  if (Array.isArray(patch.novosCampeoes)) {
    for (const novo of patch.novosCampeoes) {
      if (!novo || !novo.id) continue
      const i = CHAMPIONS.findIndex(c => c.id === novo.id)
      if (i >= 0) CHAMPIONS[i] = clone(novo); else CHAMPIONS.push(clone(novo))
    }
  }

  PATCH.versao = patch.versao || PATCH.versao
  PATCH.notas = patch.notas || []
  PATCH.origem = origem
  PATCH.aplicadoEm = new Date().toLocaleTimeString('pt-BR')
  CONFIG.versao = PATCH.versao

  bus.emit('patch:aplicado', { patch: PATCH, dados: patch })
  console.info(`[live] patch ${PATCH.versao} aplicado (${origem})`, patch.notas || [])
  return true
}

// Volta tudo para os valores de src/data/*.js (útil para depurar patch ruim).
export function resetToBase () {
  deepMerge(CONFIG, clone(BASE_CONFIG))
  CHAMPIONS.length = 0
  CHAMPIONS.push(...clone([...BASE_CHAMPIONS, ...BASE_NOVATOS]))
  PATCH.versao = BASE_CONFIG.versao
  PATCH.notas = ['Reset para o balanceamento base.']
  PATCH.origem = 'reset'
  bus.emit('patch:aplicado', { patch: PATCH, dados: {} })
}
