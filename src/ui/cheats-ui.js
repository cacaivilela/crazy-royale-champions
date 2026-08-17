// ============================================================
//  UI DOS CHEATS — caixinha de digitar (T) e reconhecimento de voz
//  O modo vem da sala (online) ou do menu (offline).
// ============================================================
import { bus } from '../core/events.js'
import { MODOS, listaDeCheats } from '../game/cheats.js'

const $ = (s) => document.querySelector(s)

export class CheatsUI {
  constructor () {
    this.modo = 'nenhum'
    this.match = null
    this.reconhecimento = null
    this.ouvindo = false
    this.el = {
      caixa: $('#cheat-box'), input: $('#cheat-input'), aviso: $('#cheat-aviso'), lista: $('#cheat-lista')
    }
    this._bind()
  }

  _bind () {
    window.addEventListener('keydown', (e) => {
      if (this.modo !== 'escrita' || !this.match || this.match.acabou) return
      if (e.code === 'KeyT' && this.el.caixa.classList.contains('hidden') &&
          document.activeElement !== this.el.input) {
        e.preventDefault()
        this.abrir()
      } else if (e.code === 'Escape' && !this.el.caixa.classList.contains('hidden')) {
        this.fechar()
      }
    })

    this.el.input.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') { this.enviar(this.el.input.value); this.el.input.value = ''; this.fechar() }
    })

    bus.on('cheat:recusado', ({ mensagem }) => this.aviso(mensagem))
  }

  definirModo (modo) {
    this.modo = modo || 'nenhum'
    if (this.modo !== 'audio') this.pararVoz()
  }

  iniciar (match) {
    this.match = match
    this.fechar()
    if (this.modo === 'audio') this.comecarVoz()
    if (this.modo !== 'nenhum') {
      bus.emit('hud:aviso', {
        texto: this.modo === 'escrita' ? '⌨️ CHEATS LIGADOS — aperte T' : '🎤 CHEATS DE ÁUDIO — fale o código'
      })
    }
  }

  parar () { this.pararVoz(); this.match = null }

  // ---------------- escrita ----------------
  abrir () {
    this.el.caixa.classList.remove('hidden')
    this.el.lista.innerHTML = listaDeCheats().map(l => `<li>${l}</li>`).join('')
    this.el.input.focus()
  }

  fechar () { this.el.caixa.classList.add('hidden') }

  aviso (txt) { this.el.aviso.textContent = txt || '' }

  /** Manda o cheat pra quem manda na partida (host) ou aplica local. */
  enviar (texto) {
    if (!texto || !this.match) return
    bus.emit('cheat:pedido', { texto })
  }

  // ---------------- áudio ----------------
  comecarVoz () {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      bus.emit('hud:aviso', { texto: '🎤 este navegador não escuta cheats — use os escritos' })
      return
    }
    try {
      const r = new SR()
      r.lang = 'pt-BR'
      r.continuous = true
      r.interimResults = false
      r.onresult = (ev) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const txt = ev.results[i][0].transcript
          this.enviar(txt)
        }
      }
      r.onerror = (e) => {
        if (e.error === 'not-allowed') bus.emit('hud:aviso', { texto: '🎤 sem permissão do microfone' })
      }
      r.onend = () => { if (this.ouvindo) { try { r.start() } catch (err) { /* já rodando */ } } }
      r.start()
      this.reconhecimento = r
      this.ouvindo = true
    } catch (e) {
      bus.emit('hud:aviso', { texto: '🎤 não consegui ligar o microfone' })
    }
  }

  pararVoz () {
    this.ouvindo = false
    if (this.reconhecimento) { try { this.reconhecimento.stop() } catch (e) { /* ok */ } }
    this.reconhecimento = null
  }
}
