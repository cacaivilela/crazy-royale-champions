// ============================================================
//  LIVE UPDATE — balanceamento "ao vivo", estilo Pokémon Unite
//  Busca content/patch.json de tempos em tempos; se a versão
//  mudou, aplica em CONFIG/CHAMPIONS sem recarregar a página e
//  avisa o jogo (evento 'patch:aplicado') para recalcular status.
// ============================================================
import { CONFIG, applyPatch, PATCH } from '../data/runtime.js'
import { bus } from '../core/events.js'

export class LiveUpdate {
  constructor () {
    this.timer = null
    this.online = false
    this.ultimaChecagem = 0
    this.falhas = 0
  }

  start () {
    if (!CONFIG.liveUpdate.ativo) return
    this.checar(true)
    this._agendar()
  }

  stop () { clearTimeout(this.timer); this.timer = null }

  _agendar () {
    clearTimeout(this.timer)
    const seg = Math.max(3, CONFIG.liveUpdate.intervaloSeg)
    this.timer = setTimeout(() => { this.checar(); this._agendar() }, seg * 1000)
  }

  /** Busca o patch. `inicial` evita o toast na primeira carga. */
  async checar (inicial = false) {
    const url = `${CONFIG.liveUpdate.arquivo}?v=${Date.now()}`
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const dados = await res.json()
      this.online = true; this.falhas = 0; this.ultimaChecagem = Date.now()

      const mudou = applyPatch(dados, 'arquivo')
      if (mudou && !inicial && CONFIG.liveUpdate.avisarNaHud) {
        bus.emit('live:novidade', { versao: PATCH.versao, notas: PATCH.notas })
      }
      if (mudou && dados.recarregar) location.reload()
      bus.emit('live:status', { online: true, versao: PATCH.versao })
      return mudou
    } catch (err) {
      this.falhas++
      this.online = false
      if (this.falhas <= 1) console.warn('[live] sem patch remoto:', err.message)
      bus.emit('live:status', { online: false, versao: PATCH.versao })
      return false
    }
  }
}

export const live = new LiveUpdate()
