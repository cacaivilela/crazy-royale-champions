// Game loop com delta fixo máximo (evita "teleporte" ao voltar de outra aba).
export class Loop {
  constructor (update) {
    this.update = update
    this.running = false
    this.last = 0
    this.fps = 0
    this._acc = 0
    this._frames = 0
    this._tick = this._tick.bind(this)
  }
  start () {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    requestAnimationFrame(this._tick)
  }
  stop () { this.running = false }
  _tick (now) {
    if (!this.running) return
    requestAnimationFrame(this._tick)
    let dt = (now - this.last) / 1000
    this.last = now
    if (dt > 0.1) dt = 0.1        // clamp: no máximo 100ms por frame
    this._acc += dt; this._frames++
    if (this._acc >= 0.5) { this.fps = Math.round(this._frames / this._acc); this._acc = 0; this._frames = 0 }
    this.update(dt, now / 1000)
  }
}
