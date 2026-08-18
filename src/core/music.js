// ============================================================
//  MÚSICA — trilha chiptune gerada na hora (WebAudio, zero arquivo)
//  Um sequenciador simples toca baixo, melodia e bateria em loop.
//  Faixas: menu | batalha | boss | vitoria | derrota
//  Liga/desliga com o botão 🎵 (fica salvo no navegador).
// ============================================================
import { audio } from './audio.js'
import { bus } from './events.js'

const nota = (n) => 440 * Math.pow(2, (n - 69) / 12)
const _ = null   // silêncio, pra deixar as partituras legíveis

// Cada faixa tem 16 passos (colcheias). Números são notas MIDI.
export const FAIXAS = {
  menu: {
    bpm: 104, ondaLead: 'triangle', ondaBaixo: 'sine', vol: 0.85,
    melodia: [76, _, 79, 76, 72, _, 74, _, 76, _, 81, 79, 76, _, 72, _],
    baixo:   [45, _, 45, _, 43, _, 43, _, 41, _, 41, _, 43, _, 43, 43],
    bateria: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 3]
  },
  batalha: {
    bpm: 152, ondaLead: 'square', ondaBaixo: 'sawtooth', vol: 1,
    melodia: [76, 76, 83, _, 81, _, 79, 76, 74, _, 76, 79, 81, _, 79, 76],
    baixo:   [45, 45, _, 45, 45, _, 43, 43, 41, 41, _, 41, 43, _, 43, 43],
    bateria: [1, 4, 2, 4, 1, 4, 2, 4, 1, 4, 2, 4, 1, 2, 3, 3]
  },
  boss: {
    bpm: 132, ondaLead: 'sawtooth', ondaBaixo: 'square', vol: 1.1,
    melodia: [64, _, 63, 64, 67, _, 66, 67, 71, _, 70, 71, 74, 71, 67, 64],
    baixo:   [40, 40, _, 40, 39, 39, _, 39, 37, 37, _, 37, 36, _, 36, 36],
    bateria: [1, 4, 2, 4, 1, 1, 2, 4, 1, 4, 2, 4, 1, 2, 2, 3]
  },
  // jingles (tocam uma vez e voltam pra faixa anterior)
  vitoria: {
    bpm: 140, ondaLead: 'square', ondaBaixo: 'triangle', vol: 1, umaVez: true,
    melodia: [72, 76, 79, 84, _, 84, 84, _, 83, 84, 88, _, _, _, _, _],
    baixo:   [48, _, 52, _, 55, _, 60, _, 55, _, 60, _, _, _, _, _],
    bateria: [1, 0, 2, 0, 1, 2, 3, 0, 1, 0, 3, 0, 0, 0, 0, 0]
  },
  derrota: {
    bpm: 96, ondaLead: 'triangle', ondaBaixo: 'sine', vol: 0.9, umaVez: true,
    melodia: [71, _, 69, _, 67, _, 64, _, 62, _, _, _, _, _, _, _],
    baixo:   [47, _, 45, _, 43, _, 40, _, 38, _, _, _, _, _, _, _],
    bateria: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
  }
}

const CHAVE = 'crc-musica'

class Musica {
  constructor () {
    this.faixa = null
    this.nomeFaixa = null
    this.anterior = null
    this.passo = 0
    this.proximo = 0
    this.timer = null
    this.ligada = localStorage.getItem(CHAVE) !== '0'
    this.volume = 0.5
  }

  get ctx () { return audio.ctx }

  _preparar () {
    audio.destravar()
    if (!this.ctx) return false
    // alguns navegadores criam o contexto "suspenso" mesmo depois do clique
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    if (this.saida) return true
    this.saida = this.ctx.createGain()
    this.saida.gain.value = this.ligada ? this.volume : 0
    this.saida.connect(this.ctx.destination)
    return true
  }

  /** Troca de faixa (com jingles voltando sozinhos pra trilha anterior). */
  tocar (nome) {
    if (!FAIXAS[nome]) return
    if (!this._preparar()) return          // ainda sem gesto do jogador
    const faixa = FAIXAS[nome]
    if (faixa.umaVez) this.anterior = this.nomeFaixa
    else this.anterior = null
    if (this.nomeFaixa === nome && this.timer) return
    this.nomeFaixa = nome
    this.faixa = faixa
    this.passo = 0
    this.proximo = this.ctx.currentTime + 0.06
    clearInterval(this.timer)
    this.timer = setInterval(() => this._agendar(), 25)
    bus.emit('musica:faixa', { nome })
  }

  parar () {
    clearInterval(this.timer)
    this.timer = null
    this.nomeFaixa = null
    this.faixa = null
  }

  alternar () {
    this.ligada = !this.ligada
    localStorage.setItem(CHAVE, this.ligada ? '1' : '0')
    if (this.saida && this.ctx) {
      const alvo = this.ligada ? this.volume : 0
      this.saida.gain.cancelScheduledValues(this.ctx.currentTime)
      this.saida.gain.value = alvo                    // estado imediato
      this.saida.gain.setTargetAtTime(alvo, this.ctx.currentTime, 0.08)  // e sem estalo
      if (this.ligada && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    }
    bus.emit('musica:mudou', { ligada: this.ligada })
    return this.ligada
  }

  // ---------------- sequenciador ----------------
  _agendar () {
    if (!this.ctx || !this.faixa) return
    if (this.ctx.state === 'suspended') { this.ctx.resume().catch(() => {}); return }
    // se o navegador segurou o áudio (aba em segundo plano), reancora o relógio
    if (this.proximo < this.ctx.currentTime - 0.5) this.proximo = this.ctx.currentTime + 0.05
    const passoSeg = 60 / this.faixa.bpm / 2          // colcheia
    while (this.proximo < this.ctx.currentTime + 0.25) {
      this._tocarPasso(this.passo, this.proximo, passoSeg)
      this.proximo += passoSeg
      this.passo++
      if (this.passo >= 16) {
        this.passo = 0
        if (this.faixa.umaVez) {                     // jingle acabou
          const volta = this.anterior
          this.parar()
          if (volta) setTimeout(() => this.tocar(volta), 200)
          return
        }
      }
    }
  }

  _tocarPasso (i, quando, passoSeg) {
    const f = this.faixa
    const v = (f.vol || 1) * 0.5
    if (f.melodia[i] != null) this._voz(nota(f.melodia[i]), quando, passoSeg * 1.6, f.ondaLead, 0.16 * v)
    if (f.baixo[i] != null) this._voz(nota(f.baixo[i]) / 2, quando, passoSeg * 1.4, f.ondaBaixo, 0.24 * v)
    const b = f.bateria[i]
    if (b === 1) this._bumbo(quando, v)
    else if (b === 2) this._caixa(quando, v)
    else if (b === 3) this._prato(quando, v)
    else if (b === 4) this._chimbal(quando, v)
  }

  _voz (freq, quando, dur, onda, vol) {
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = onda
    osc.frequency.setValueAtTime(freq, quando)
    g.gain.setValueAtTime(0.0001, quando)
    g.gain.exponentialRampToValueAtTime(vol, quando + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, quando + dur)
    osc.connect(g); g.connect(this.saida)
    osc.start(quando); osc.stop(quando + dur + 0.03)
  }

  _bumbo (quando, v) {
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, quando)
    osc.frequency.exponentialRampToValueAtTime(45, quando + 0.12)
    g.gain.setValueAtTime(0.35 * v, quando)
    g.gain.exponentialRampToValueAtTime(0.0001, quando + 0.16)
    osc.connect(g); g.connect(this.saida)
    osc.start(quando); osc.stop(quando + 0.2)
  }

  _ruido (quando, dur, vol, corte) {
    const n = Math.floor(this.ctx.sampleRate * dur)
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const src = this.ctx.createBufferSource(); src.buffer = buf
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = corte
    const g = this.ctx.createGain(); g.gain.value = vol
    src.connect(f); f.connect(g); g.connect(this.saida)
    src.start(quando)
  }

  _caixa (quando, v) { this._ruido(quando, 0.16, 0.16 * v, 1400) }
  _chimbal (quando, v) { this._ruido(quando, 0.05, 0.07 * v, 6000) }
  _prato (quando, v) { this._ruido(quando, 0.45, 0.12 * v, 4000) }
}

export const musica = new Musica()

// jingles automáticos no fim da partida
bus.on('partida:fim', (res) => musica.tocar(res.venceu === 'A' ? 'vitoria' : 'derrota'))
