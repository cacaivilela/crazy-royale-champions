// ============================================================
//  Entrada: teclado + mouse + joystick virtual (touch)
//  Uso:  input.axis.x/y (movimento), input.pressed('KeyQ') (uma vez),
//        input.down('KeyQ') (segurando), input.ndc (mouse em -1..1)
// ============================================================
export class Input {
  constructor (canvas, touchLayer) {
    this.canvas = canvas
    this.keys = new Set()
    this._justPressed = new Set()
    this.axis = { x: 0, y: 0 }        // y negativo = frente
    this.ndc = { x: 0, y: 0 }
    this.mouseDown = false
    this.touch = false
    this._joy = { id: null, cx: 0, cy: 0 }
    this._bind(touchLayer)
  }

  _bind (touchLayer) {
    const kd = (e) => {
      if (e.repeat) return
      // evita rolar a página com espaço/setas durante a partida
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
      this.keys.add(e.code); this._justPressed.add(e.code)
    }
    const ku = (e) => this.keys.delete(e.code)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false })

    const move = (e) => {
      const r = this.canvas.getBoundingClientRect()
      this.ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1
      this.ndc.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
    }
    this.canvas.addEventListener('pointermove', move)
    this.canvas.addEventListener('pointerdown', (e) => { move(e); if (e.pointerType !== 'touch') this.mouseDown = true })
    window.addEventListener('pointerup', () => { this.mouseDown = false })
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    // ---- joystick virtual ----
    const joy = touchLayer && touchLayer.querySelector('#joystick')
    if (joy) {
      const knob = joy.querySelector('i')
      const start = (e) => {
        this.touch = true
        const r = joy.getBoundingClientRect()
        this._joy.id = e.pointerId; this._joy.cx = r.left + r.width / 2; this._joy.cy = r.top + r.height / 2
        joy.setPointerCapture(e.pointerId)
      }
      const drag = (e) => {
        if (this._joy.id !== e.pointerId) return
        const dx = e.clientX - this._joy.cx, dy = e.clientY - this._joy.cy
        const max = 46, len = Math.hypot(dx, dy) || 1
        const k = Math.min(1, max / len)
        knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`
        this.axis.x = (dx / max); this.axis.y = (dy / max)
        const l = Math.hypot(this.axis.x, this.axis.y)
        if (l > 1) { this.axis.x /= l; this.axis.y /= l }
      }
      const end = (e) => {
        if (this._joy.id !== e.pointerId) return
        this._joy.id = null; knob.style.transform = ''
        this.axis.x = 0; this.axis.y = 0
      }
      joy.addEventListener('pointerdown', start)
      joy.addEventListener('pointermove', drag)
      joy.addEventListener('pointerup', end)
      joy.addEventListener('pointercancel', end)
    }
  }

  // Deve ser chamado no fim de cada frame.
  endFrame () { this._justPressed.clear() }

  down (code) { return this.keys.has(code) }
  pressed (code) { return this._justPressed.has(code) }

  // Movimento combinado teclado + joystick (retorna vetor normalizado)
  moveVector () {
    let x = this.axis.x, y = this.axis.y
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1
    const l = Math.hypot(x, y)
    if (l > 1) { x /= l; y /= l }
    return { x, y, len: Math.min(1, l) }
  }
}

export const isTouchDevice = () =>
  ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
