// Barramento de eventos minimalista usado por todo o jogo.
// Ex.: bus.on('kill', fn) / bus.emit('kill', dados)
export class EventBus {
  constructor () { this.map = new Map() }
  on (evt, fn) {
    if (!this.map.has(evt)) this.map.set(evt, new Set())
    this.map.get(evt).add(fn)
    return () => this.off(evt, fn)
  }
  off (evt, fn) { const s = this.map.get(evt); if (s) s.delete(fn) }
  emit (evt, data) {
    const s = this.map.get(evt)
    if (!s) return
    for (const fn of [...s]) {
      try { fn(data) } catch (e) { console.error('[bus]', evt, e) }
    }
  }
  clear () { this.map.clear() }
}

// Barramento global (usado pelo live update e pela HUD).
export const bus = new EventBus()
