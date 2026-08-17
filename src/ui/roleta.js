// ============================================================
//  🎡 ROLETA HABILIDOSA — sorteia uma habilidade extra e equipa
//  no campeão que você está usando (slot X, ou passiva).
// ============================================================
import { EXTRAS, RARIDADES, sortearExtra, equiparExtra, extraEquipado } from '../data/extras.js'
import { getChampion, CONFIG } from '../data/runtime.js'
import { audio } from '../core/audio.js'
import { bus } from '../core/events.js'

const $ = (s) => document.querySelector(s)
const hex = (n) => '#' + n.toString(16).padStart(6, '0')

export class Roleta {
  constructor ({ aoVoltar }) {
    this.aoVoltar = aoVoltar
    this.champId = null
    this.angulo = 0
    this.girando = false
    this.el = {
      tela: $('#roleta'), canvas: $('#roleta-canvas'), botao: $('#btn-girar'),
      resultado: $('#roleta-resultado'), campeao: $('#roleta-campeao'), atual: $('#roleta-atual'),
      veloc: $('#roleta-veloc')
    }
    this.velocidade = 0
    this.voltas = 0
    this.ctx = this.el.canvas.getContext('2d')
    this.el.botao.addEventListener('click', () => this.girar())
    $('#btn-roleta-voltar').addEventListener('click', () => { this.esconder(); this.aoVoltar() })
    $('#btn-tirar-extra').addEventListener('click', () => {
      equiparExtra(this.champId, null)
      this.atualizarCabecalho()
      this.el.resultado.innerHTML = '<p class="roleta-vazio">Sem extra equipada — gire pra ganhar uma!</p>'
    })
  }

  mostrar (champId) {
    this.champId = champId
    this.el.tela.classList.remove('hidden')
    this.atualizarCabecalho()
    this.velocidade = 0
    this.desenhar()
    this.mostrarVelocimetro(0, 0)
    this.el.veloc.innerHTML = '<b>—</b> km/h <span>· aperte GIRAR</span>'
    const eq = extraEquipado(champId)
    this.el.resultado.innerHTML = eq
      ? this._cartao(eq, 'equipada agora')
      : '<p class="roleta-vazio">Gire a roleta pra ganhar uma habilidade extra!</p>'
  }

  esconder () { this.el.tela.classList.add('hidden') }

  atualizarCabecalho () {
    const c = getChampion(this.champId)
    const eq = extraEquipado(this.champId)
    this.el.campeao.innerHTML = `<span class="emoji">${c.emoji}</span> <b>${c.nome}</b>`
    this.el.atual.textContent = eq ? `equipada: ${eq.icone} ${eq.nome}` : 'nenhuma extra equipada'
  }

  // ---------------- desenho ----------------
  desenhar () {
    const ctx = this.ctx
    const W = this.el.canvas.width, R = W / 2
    const n = EXTRAS.length
    const passo = (Math.PI * 2) / n

    ctx.clearRect(0, 0, W, W)
    ctx.save()
    // quanto mais rápida, mais borrada (a 99 milhões de km/s vira um risco só)
    const borrao = this.velocidade > 0 ? Math.min(14, Math.log10(this.velocidade + 1) * 2.2) : 0
    if (borrao > 0.2) ctx.filter = `blur(${borrao.toFixed(1)}px)`
    ctx.translate(R, R)
    ctx.rotate(this.angulo)

    EXTRAS.forEach((ex, i) => {
      const ini = i * passo - Math.PI / 2 - passo / 2
      const cor = RARIDADES[ex.raridade].cor
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, R - 8, ini, ini + passo)
      ctx.closePath()
      ctx.fillStyle = hex(cor)
      ctx.globalAlpha = i % 2 ? 0.85 : 1
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(0,0,0,.35)'
      ctx.stroke()

      ctx.save()
      ctx.rotate(ini + passo / 2)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '26px serif'
      ctx.fillText(ex.icone, R * 0.66, 0)
      ctx.restore()
    })

    // miolo
    ctx.beginPath()
    ctx.arc(0, 0, R * 0.22, 0, Math.PI * 2)
    ctx.fillStyle = '#0b0a1a'
    ctx.fill()
    ctx.strokeStyle = '#facc15'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#facc15'
    ctx.font = 'bold 22px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎡', 0, 1)
    ctx.restore()
  }

  // ---------------- giro ----------------
  //  Física do pedido: começa a 123.456 km/h e perde 1 km/h por volta.
  //  v(n) = V0 - n (km/h); dn/dt = v/3600/kmPorVolta  =>  v(t) = V0 · e^(-t/τ)
  //  com τ = 3600 · kmPorVolta · fatorLentidao. Freia sozinha e para em 1 km/h.
  girar () {
    if (this.girando) return
    const cfg = CONFIG.roleta
    const V0 = cfg.velocidadeInicialKmH
    const queda = cfg.quedaPorVoltaKmH
    const tau = 3600 * cfg.kmPorVolta * (cfg.fatorLentidao || 1)   // km/h -> segundos
    const C = tau
    const T = tau * Math.log(V0 / queda)     // tempo até sobrar 1 km/h

    const atual = extraEquipado(this.champId)
    const premio = sortearExtra(atual ? atual.id : null)
    const i = EXTRAS.indexOf(premio)
    const passo = (Math.PI * 2) / EXTRAS.length

    // ângulo bruto que a física entrega no fim…
    const voltasFisica = V0 * (1 - Math.exp(-T / C)) / queda
    const anguloFisico = voltasFisica * Math.PI * 2
    // …e o ajuste (imperceptível) pra parar exatamente no prêmio
    const desejado = -i * passo
    const alvo = anguloFisico - ((anguloFisico - desejado) % (Math.PI * 2))
    const k = alvo / anguloFisico

    this.girando = true
    this.el.botao.disabled = true
    this.el.resultado.innerHTML = '<p class="roleta-vazio">girando… 🎲</p>'
    audio.destravar()

    const t0 = performance.now()
    let proximoTique = 0
    const quadro = (agora) => {
      const t = Math.min(T, (agora - t0) / 1000)
      const v = V0 * Math.exp(-t / tau)                  // km/h agora
      const voltas = (V0 - v) / queda                    // voltas já dadas
      this.angulo = voltas * Math.PI * 2 * k
      this.velocidade = v
      this.voltas = voltas
      this.desenhar()
      this.mostrarVelocimetro(v, voltas)
      if (t >= proximoTique) { proximoTique = t + 0.12; audio.tiro() }
      if (t < T) return requestAnimationFrame(quadro)
      this.velocidade = 0
      this.mostrarVelocimetro(0, voltas)
      this.terminar(premio)
    }
    requestAnimationFrame(quadro)
  }

  mostrarVelocimetro (v, voltas) {
    const fmt = (n) => Math.floor(n).toLocaleString('pt-BR')
    this.el.veloc.innerHTML = v > 0
      ? `<b>${fmt(v)}</b> km/h <span>· ${fmt(voltas)} voltas · −${CONFIG.roleta.quedaPorVoltaKmH} km/h por volta</span>`
      : `<b>0</b> km/h <span>· parou depois de ${fmt(voltas)} voltas 🎉</span>`
  }

  terminar (premio) {
    this.girando = false
    this.el.botao.disabled = false
    equiparExtra(this.champId, premio.id)
    this.atualizarCabecalho()
    this.el.resultado.innerHTML = this._cartao(premio, 'equipada! 🎉')
    audio.nivel()
    bus.emit('roleta:premio', { extra: premio, champId: this.champId })
  }

  _cartao (ex, rodape) {
    const r = RARIDADES[ex.raridade]
    const slot = ex.tipo === 'passiva' ? 'PASSIVA (sempre ligada)' : 'SLOT X'
    return `<div class="roleta-card" style="border-color:${hex(r.cor)}">
      <span class="roleta-icone">${ex.icone}</span>
      <b>${ex.nome}</b>
      <span class="roleta-rar" style="color:${hex(r.cor)}">${r.nome} · ${slot}</span>
      <em>${ex.descricao}</em>
      <small>${rodape}</small>
    </div>`
  }
}
