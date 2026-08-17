// ============================================================
//  ÁUDIO — efeitos 100% procedurais (WebAudio, sem arquivos)
//  Destrava no primeiro clique/tecla, como manda o navegador.
// ============================================================
import { bus } from './events.js'

class Audio {
  constructor () {
    this.ctx = null
    this.ligado = true
    this.volume = 0.5
    this._destravado = false
  }

  destravar () {
    if (this._destravado) return
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
      this._destravado = true
    } catch (e) { /* sem áudio, sem drama */ }
  }

  _tom ({ freq = 440, freqFim = null, dur = 0.12, tipo = 'sine', vol = 0.3, atraso = 0 }) {
    if (!this.ligado || !this.ctx) return
    const t0 = this.ctx.currentTime + atraso
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = tipo
    osc.frequency.setValueAtTime(freq, t0)
    if (freqFim) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqFim), t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g); g.connect(this.master)
    osc.start(t0); osc.stop(t0 + dur + 0.02)
  }

  _ruido ({ dur = 0.2, vol = 0.25, filtro = 900, atraso = 0 }) {
    if (!this.ligado || !this.ctx) return
    const t0 = this.ctx.currentTime + atraso
    const n = Math.floor(this.ctx.sampleRate * dur)
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const src = this.ctx.createBufferSource(); src.buffer = buf
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtro
    const g = this.ctx.createGain(); g.gain.value = vol
    src.connect(f); f.connect(g); g.connect(this.master)
    src.start(t0)
  }

  // --------- sons do jogo ---------
  tiro ()      { this._tom({ freq: 620, freqFim: 260, dur: 0.09, tipo: 'square', vol: 0.09 }) }
  acerto ()    { this._ruido({ dur: 0.12, vol: 0.12, filtro: 1600 }) }
  dano ()      { this._tom({ freq: 180, freqFim: 70, dur: 0.22, tipo: 'sawtooth', vol: 0.16 }) }
  habilidade (tipo) {
    if (tipo === 'cura') { this._tom({ freq: 520, freqFim: 880, dur: 0.3, tipo: 'sine', vol: 0.2 }) }
    else if (tipo === 'dash') { this._tom({ freq: 300, freqFim: 900, dur: 0.18, tipo: 'triangle', vol: 0.18 }) }
    else if (tipo === 'buff') { this._tom({ freq: 400, freqFim: 700, dur: 0.25, tipo: 'square', vol: 0.14 }) }
    else { this._tom({ freq: 760, freqFim: 300, dur: 0.2, tipo: 'sawtooth', vol: 0.16 }) }
  }
  explosao ()  { this._ruido({ dur: 0.4, vol: 0.3, filtro: 700 }); this._tom({ freq: 120, freqFim: 40, dur: 0.35, tipo: 'sine', vol: 0.22 }) }
  morte ()     { this._tom({ freq: 320, freqFim: 60, dur: 0.5, tipo: 'triangle', vol: 0.22 }) }
  nivel ()     { [523, 659, 784].forEach((f, i) => this._tom({ freq: f, dur: 0.16, tipo: 'square', vol: 0.16, atraso: i * 0.08 })) }
  marcou ()    { [523, 659, 784, 1046].forEach((f, i) => this._tom({ freq: f, dur: 0.18, tipo: 'triangle', vol: 0.2, atraso: i * 0.07 })) }
  marcando ()  { this._tom({ freq: 300, freqFim: 420, dur: 0.1, tipo: 'sine', vol: 0.08 }) }
  aviso ()     { [880, 660].forEach((f, i) => this._tom({ freq: f, dur: 0.22, tipo: 'square', vol: 0.18, atraso: i * 0.18 })) }
  vitoria ()   { [523, 659, 784, 1046, 1318].forEach((f, i) => this._tom({ freq: f, dur: 0.3, tipo: 'triangle', vol: 0.22, atraso: i * 0.13 })) }
  derrota ()   { [440, 370, 294, 220].forEach((f, i) => this._tom({ freq: f, dur: 0.35, tipo: 'sawtooth', vol: 0.18, atraso: i * 0.16 })) }
}

export const audio = new Audio()

// destrava no primeiro gesto do jogador
const destravar = () => { audio.destravar() }
window.addEventListener('pointerdown', destravar, { once: false })
window.addEventListener('keydown', destravar, { once: false })

// liga os eventos globais nos sons
bus.on('unidade:subiuNivel', ({ unidade }) => { if (unidade.ehJogador) audio.nivel() })
bus.on('marcou', ({ unidade }) => { if (unidade.ehJogador) audio.marcou() })
bus.on('objetivo', () => audio.aviso())
bus.on('partida:fim', (res) => { res.venceu === 'A' ? audio.vitoria() : audio.derrota() })
