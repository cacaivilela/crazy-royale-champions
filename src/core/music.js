// ============================================================
//  MÚSICA — a trilha do Crazy Royale, acelerada e com power chord
//  É o mesmo loop do jogo original (progressão C–G–Am–F, mesmo
//  gancho, mesmo groove de baixo e a mesma bateria), só que:
//    · roda a 180 bpm (o original é 140), bem mais acelerada
//    · a melodia sai em POWER CHORD (tônica + quinta + oitava)
//      passando por uma distorção, com cara de guitarra
//  Tudo gerado na hora em WebAudio: nenhum arquivo de música.
// ============================================================
import { audio } from './audio.js'
import { bus } from './events.js'

export const BPM = 180                  // a trilha do Crazy Royale acelerada (original: 140)
const PASSO = 60 / BPM / 2              // duração da colcheia
const COMPASSO = 8                      // colcheias por compasso

// Os acordes do Crazy Royale (I–V–vi–IV em Dó maior)
const ACORDES = [
  { baixo: 65.41, notas: [261.6, 329.6, 392.0, 523.3] }, // C
  { baixo: 98.00, notas: [293.7, 392.0, 493.9, 587.3] }, // G
  { baixo: 110.0, notas: [329.6, 440.0, 523.3, 659.3] }, // Am
  { baixo: 87.31, notas: [349.2, 440.0, 523.3, 698.5] }  // F
]

// O gancho original, nota por nota (32 colcheias)
const GANCHO = [
  523.3, 0, 659.3, 784.0, 0, 784.0, 659.3, 0,
  587.3, 0, 587.3, 493.9, 0, 587.3, 784.0, 0,
  659.3, 880.0, 0, 659.3, 523.3, 0, 659.3, 880.0,
  698.5, 0, 523.3, 440.0, 0, 349.2, 392.0, 440.0
]

const BAIXO_BATE = [true, false, true, true, false, true, false, true]
const QUINTA = 1.49831                  // intervalo de quinta justa

// Cada "faixa" é a mesma música com outra pegada
export const FAIXAS = {
  menu: { intensidade: 0.7, transpor: 1, distorcao: 8 },
  batalha: { intensidade: 1, transpor: 1, distorcao: 22 },
  boss: { intensidade: 1.15, transpor: 0.749, distorcao: 34 },   // uma quinta abaixo: pesadão
  vitoria: { intensidade: 1, transpor: 1, distorcao: 18, umaVez: true, jingle: 'vitoria' },
  derrota: { intensidade: 0.9, transpor: 1, distorcao: 10, umaVez: true, jingle: 'derrota' }
}

const JINGLES = {
  vitoria: [523.3, 659.3, 784.0, 1046.5, 0, 1046.5, 1318.5, 0,
            0, 0, 0, 0, 0, 0, 0, 0],
  derrota: [493.9, 0, 440.0, 0, 392.0, 0, 329.6, 0,
            261.6, 0, 0, 0, 0, 0, 0, 0]
}

const CHAVE = 'crc-musica'

class Musica {
  constructor () {
    this.nomeFaixa = null
    this.faixa = null
    this.anterior = null
    this.passo = 0
    this.proximo = 0
    this.timer = null
    this.volume = 0.42
    this.ligada = localStorage.getItem(CHAVE) !== '0'
    this.ganhoAlvo = this.ligada ? this.volume : 0
  }

  get ctx () { return audio.ctx }

  _curvaDistorcao (quantidade) {
    const n = 1024
    const curva = new Float32Array(n)
    const k = quantidade
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1
      curva[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x))
    }
    return curva
  }

  _preparar () {
    audio.destravar()
    if (!this.ctx) return false
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    if (this.saida) return true

    this.saida = this.ctx.createGain()
    this.saida.gain.value = this.ligada ? this.volume : 0
    this.saida.connect(this.ctx.destination)

    // cadeia da "guitarra": distorção + filtro, onde saem os power chords
    this.distorcao = this.ctx.createWaveShaper()
    this.distorcao.curve = this._curvaDistorcao(22)
    this.distorcao.oversample = '4x'
    this.filtroGuitarra = this.ctx.createBiquadFilter()
    this.filtroGuitarra.type = 'lowpass'
    this.filtroGuitarra.frequency.value = 3200
    this.ganhoGuitarra = this.ctx.createGain()
    this.ganhoGuitarra.gain.value = 0.5
    this.distorcao.connect(this.filtroGuitarra)
    this.filtroGuitarra.connect(this.ganhoGuitarra)
    this.ganhoGuitarra.connect(this.saida)
    return true
  }

  tocar (nome) {
    if (!FAIXAS[nome] || !this._preparar()) return
    const faixa = FAIXAS[nome]
    this.anterior = faixa.umaVez ? this.nomeFaixa : null
    if (this.nomeFaixa === nome && this.timer) return
    this.nomeFaixa = nome
    this.faixa = faixa
    this.passo = 0
    this.proximo = this.ctx.currentTime + 0.06
    this.distorcao.curve = this._curvaDistorcao(faixa.distorcao)
    clearInterval(this.timer)
    this.timer = setInterval(() => this._agendar(), 25)
    bus.emit('musica:faixa', { nome })
  }

  parar () {
    clearInterval(this.timer)
    this.timer = null
    this.faixa = null
    this.nomeFaixa = null
  }

  alternar () {
    this.ligada = !this.ligada
    localStorage.setItem(CHAVE, this.ligada ? '1' : '0')
    if (this.saida && this.ctx) {
      const alvo = this.ligada ? this.volume : 0
      const agora = this.ctx.currentTime
      const g = this.saida.gain
      g.cancelScheduledValues(agora)
      g.setValueAtTime(g.value, agora)                // ancora no valor atual…
      g.linearRampToValueAtTime(alvo, agora + 0.08)   // …e sobe/desce sem estalo
      this.ganhoAlvo = alvo                           // estado pra quem consultar
      if (this.ligada && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    }
    bus.emit('musica:mudou', { ligada: this.ligada })
    return this.ligada
  }

  // ---------------- sequenciador ----------------
  _agendar () {
    if (!this.ctx || !this.faixa) return
    if (this.ctx.state === 'suspended') { this.ctx.resume().catch(() => {}); return }
    if (this.proximo < this.ctx.currentTime - 0.5) this.proximo = this.ctx.currentTime + 0.05
    const total = this.faixa.umaVez ? 16 : 32
    while (this.proximo < this.ctx.currentTime + 0.25) {
      this._tocarPasso(this.passo, this.proximo, PASSO)
      this.proximo += PASSO
      this.passo++
      if (this.passo >= total) {
        this.passo = 0
        if (this.faixa.umaVez) {
          const volta = this.anterior
          this.parar()
          if (volta) setTimeout(() => this.tocar(volta), 200)
          return
        }
      }
    }
  }

  _tocarPasso (passoGlobal, quando, passoSeg) {
    const f = this.faixa
    if (!f) return
    const v = f.intensidade
    const t = f.transpor

    // jingles: só o power chord subindo/descendo
    if (f.jingle) {
      const nota = JINGLES[f.jingle][passoGlobal % 16]
      if (nota) this.powerChord(nota * t, quando, passoSeg * 1.6, 0.1 * v)
      if (passoGlobal % 4 === 0) this._bumbo(quando, v)
      return
    }

    const passo = passoGlobal % 32
    const compasso = Math.floor(passo / COMPASSO)
    const tempo = passo % COMPASSO
    const acorde = ACORDES[compasso]
    const hype = Math.floor(passoGlobal / 32) % 2 === 1

    // BAIXO grooveado (root + sub uma oitava abaixo), igualzinho ao original
    if (BAIXO_BATE[tempo]) {
      this._voz(acorde.baixo * t, quando, passoSeg * 1.3, 'square', 0.16 * v)
      this._voz(acorde.baixo * t / 2, quando, passoSeg * 1.5, 'sine', 0.14 * v)
      if (hype) this._voz(acorde.baixo * t * 2, quando, passoSeg * 0.8, 'sawtooth', 0.05 * v)
    }

    // PAD no começo do compasso
    if (tempo === 0) {
      for (const n of acorde.notas.slice(0, 3)) {
        this._voz(n * t / 2, quando, passoSeg * COMPASSO * 0.95, 'triangle', 0.035 * v, 0.08)
      }
      // e o power chord do acorde segurando embaixo do gancho
      this.powerChord(acorde.baixo * t * 2, quando, passoSeg * COMPASSO * 0.9, 0.05 * v)
    }

    // ARPEJO nas colcheias ímpares
    if (tempo % 2 === 1) {
      const n = acorde.notas[(tempo >> 1) % acorde.notas.length]
      this._voz((hype ? n * 2 : n) * t, quando, passoSeg * 0.7, 'triangle', 0.06 * v)
    }

    // MELODIA-GANCHO em POWER CHORD (é isso que dá a cara de guitarra)
    const m = GANCHO[passo]
    if (m) this.powerChord(m * t, quando, passoSeg * 0.85, 0.09 * v)

    // BATERIA (bumbo, caixa e chimbal do original)
    if (tempo === 0 || tempo === 4 || (hype && tempo === 7)) this._bumbo(quando, v)
    if (tempo === 2 || tempo === 6) {
      this._ruido(quando, 0.18, 0.16 * v, 1800)
      this._voz(220, quando, 0.08, 'triangle', 0.08 * v)
    }
    this._ruido(quando, 0.03, (tempo % 2 ? 0.06 : 0.035) * v, 9000)
  }

  /** Power chord: tônica + quinta + oitava, tudo distorcido. */
  powerChord (freq, quando, dur, vol) {
    for (const [mult, peso] of [[1, 1], [QUINTA, 0.85], [2, 0.6], [1.003, 0.5]]) {
      this._voz(freq * mult, quando, dur, 'sawtooth', vol * peso, 0.004, this.distorcao)
    }
  }

  _voz (freq, quando, dur, onda, vol, ataque = 0.012, destino = null) {
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = onda
    osc.frequency.setValueAtTime(freq, quando)
    g.gain.setValueAtTime(0.0001, quando)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), quando + ataque)
    g.gain.exponentialRampToValueAtTime(0.0001, quando + dur)
    osc.connect(g); g.connect(destino || this.saida)
    osc.start(quando); osc.stop(quando + dur + 0.03)
  }

  _bumbo (quando, v) {
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(160, quando)
    osc.frequency.exponentialRampToValueAtTime(55, quando + 0.12)
    g.gain.setValueAtTime(0.32 * v, quando)
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
}

export const musica = new Musica()

bus.on('partida:fim', (res) => musica.tocar(res.venceu === 'A' ? 'vitoria' : 'derrota'))
