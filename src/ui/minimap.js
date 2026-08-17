// ============================================================
//  MINIMAPA 2D — desenha arena, baldões, aliados e inimigos
// ============================================================
import { COR_TIME } from '../game/arena.js'

const hex = (n) => '#' + n.toString(16).padStart(6, '0')

export class Minimapa {
  constructor (canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.match = null
  }

  iniciar (match) { this.match = match }

  desenhar () {
    const m = this.match
    if (!m) return
    const ctx = this.ctx
    const W = this.canvas.width, H = this.canvas.height
    const arena = m.arena
    const px = (x) => (x / arena.largura + 0.5) * W
    const pz = (z) => (0.5 - z / arena.comprimento) * H   // +Z (time A) embaixo

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(42,39,96,.9)'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,.2)'
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke()

    for (const b of arena.baldoes) {
      if (b.quebrado) continue
      ctx.beginPath()
      ctx.arc(px(b.pos.x), pz(b.pos.z), b.ordem === 1 ? 6 : 4.5, 0, 6.29)
      ctx.fillStyle = hex(COR_TIME[b.time])
      ctx.globalAlpha = 0.55
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = hex(COR_TIME[b.time])
      ctx.stroke()
    }

    for (const u of m.unidades) {
      if (u.morto) continue
      if (u.time !== m.timeJogador && u.invisivel) continue
      const r = u.ehJogador ? 5 : (u.ehSelvagem ? 2.6 : 3.6)
      ctx.beginPath()
      ctx.arc(px(u.pos.x), pz(u.pos.z), r, 0, 6.29)
      ctx.fillStyle = u.ehJogador ? '#facc15' : (u.time === 'N' ? '#9ca3af' : hex(COR_TIME[u.time]))
      ctx.fill()
      if (u.ehJogador) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1 }
    }
  }
}
