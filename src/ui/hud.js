// ============================================================
//  HUD — barras, habilidades, feed, avisos e tela de fim
// ============================================================
import { bus } from '../core/events.js'
import { CONFIG, PATCH } from '../data/runtime.js'
import { habilidadesDe, podeUsar, cooldownDe, nivelUltimate } from '../game/abilities.js'

const $ = (sel) => document.querySelector(sel)

export class Hud {
  constructor () {
    this.el = {
      scoreA: $('#score-a'), scoreB: $('#score-b'), timer: $('#match-timer'),
      emoji: $('#p-emoji'), nivel: $('#p-level'), hpFill: $('#p-hp-fill'), hpText: $('#p-hp-text'),
      xpFill: $('#p-xp-fill'), carry: $('#p-carry').querySelector('b'),
      skills: $('#hud-skills'), feed: $('#killfeed'), toasts: $('#toasts'),
      respawn: $('#respawn'), banner: $('#objective-banner'), fps: $('#fps'),
      endcard: $('#endcard'), endTitle: $('#end-title'), endSub: $('#end-sub'), endStats: $('#end-stats'),
      hurt: $('#hurt'), pause: $('#pause'), btnPausa: $('#btn-pausa'),
      bossHud: $('#boss-hud'), bossFill: $('#boss-fill'), bossPct: $('#boss-pct')
    }
    this.match = null
    this.slots = new Map()
    this._bannerAte = 0
    this._ligarEventos()
  }

  _ligarEventos () {
    bus.on('unidade:morreu', ({ alvo, assassino }) => {
      if (alvo.ehSelvagem && alvo.tipoSelvagem !== 'chefao') return
      const quem = assassino ? `${assassino.emoji} ${assassino.nome}` : '☠️'
      this.feed(`${quem} → ${alvo.emoji} ${alvo.nome}`)
    })
    bus.on('marcou', ({ unidade, pontos, dobro }) => {
      this.feed(`🎨 ${unidade.emoji} marcou ${pontos}${dobro ? ' (DOBRO!)' : ''}`)
      if (unidade.ehJogador) this.toast(`+${pontos} TINTAS!`)
    })
    bus.on('objetivo', ({ texto }) => this.banner(texto))
    bus.on('unidade:subiuNivel', ({ unidade }) => {
      if (!unidade.ehJogador) return
      this.toast(`NÍVEL ${unidade.nivel}!`)
      if (unidade.nivel === nivelUltimate()) this.banner('⚡ ULTIMATE LIBERADA — tecla R')
      this.montarHabilidades(this.match)
    })
    bus.on('live:novidade', ({ versao, notas }) => {
      this.toast(`📡 PATCH ${versao} APLICADO AO VIVO`, 'live')
      if (notas && notas[0]) this.feed('📡 ' + notas[0])
    })
    bus.on('dev:recarregou', ({ tipo }) => this.toast('🔄 ' + tipo + ' recarregado', 'live'))

    // vinheta vermelha ao levar tinta na cara
    bus.on('jogador:dano', () => {
      this.el.hurt.classList.add('on')
      clearTimeout(this._hurtTimer)
      this._hurtTimer = setTimeout(() => this.el.hurt.classList.remove('on'), 130)
    })
    bus.on('partida:pausa', ({ pausado }) => this.el.pause.classList.toggle('hidden', !pausado))
    bus.on('hud:aviso', ({ texto }) => this.banner(texto, 3))
    bus.on('cheat:aplicado', ({ cheat, unidade, mensagem }) => {
      this.feed(`${cheat.icone} ${unidade.nome}: ${mensagem}`)
      if (unidade.ehJogador) this.toast(cheat.icone + ' ' + mensagem)
    })
    bus.on('cheat:recusado', ({ mensagem }) => this.toast('❌ ' + mensagem))
    bus.on('recall:iniciou', () => this.banner('🏠 VOLTANDO PRA BASE…', 3))
    bus.on('recall:cancelado', () => this.toast('recall cancelado'))
    bus.on('jogador:renasceu', () => this.toast('✨ PROTEGIDO POR 2s'))

    // botões (pausa + toque)
    this.el.btnPausa.addEventListener('click', () => bus.emit('ui:pausa', {}))
    const botao = (id, evt) => {
      const el = document.getElementById(id)
      if (el) el.addEventListener('pointerdown', (e) => { e.preventDefault(); bus.emit(evt, {}) })
    }
    botao('t-marcar', 'ui:marcar')
    botao('t-recall', 'ui:recall')
    const atacar = document.getElementById('t-atacar')
    if (atacar) {
      const on = (e) => { e.preventDefault(); bus.emit('ui:atacar', { apertado: true }) }
      const off = () => bus.emit('ui:atacar', { apertado: false })
      atacar.addEventListener('pointerdown', on)
      atacar.addEventListener('pointerup', off)
      atacar.addEventListener('pointercancel', off)
      atacar.addEventListener('pointerleave', off)
    }
  }

  // ---------- ciclo ----------
  iniciar (match) {
    this.match = match
    this.el.endcard.classList.add('hidden')
    this.el.pause.classList.add('hidden')
    this.el.feed.innerHTML = ''
    this.el.emoji.textContent = match.jogador.emoji
    this.el.bossHud.classList.toggle('hidden', !match.ehBoss)
    this.el.bossHud.classList.remove('furia')
    if (match.ehBoss && match.boss) {
      this.el.bossHud.querySelector('b').textContent = (match.boss.nomeBoss || 'BALDÃO SUPREMO').toUpperCase()
    }
    this.montarHabilidades(match)
  }

  montarHabilidades (match) {
    if (!match) return
    const p = match.jogador
    this.el.skills.innerHTML = ''
    this.slots.clear()
    for (const hab of habilidadesDe(p)) {
      const div = document.createElement('div')
      div.className = 'skill' + (hab.key === 'R' ? ' ult' : '')
      div.innerHTML = `<span class="key">${hab.key}</span>${hab.icone}<span class="cd"></span>`
      div.title = `${hab.nome} (${hab.key})`
      div.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        bus.emit('ui:habilidade', { slot: hab.key })
      })
      this.el.skills.appendChild(div)
      this.slots.set(hab.key, { div, cd: div.querySelector('.cd'), hab })
    }
  }

  atualizar (fps) {
    const m = this.match
    if (!m) return
    const p = m.jogador

    this.el.scoreA.textContent = m.placar.A
    this.el.scoreB.textContent = m.placar.B

    const rest = Math.ceil(m.tempoRestante)
    // o relógio para em 99 minutos: os segundos que sobram viram 99:60…99:99
    // (a partir de 99:59 volta a ser a conta normal, sem pulo nenhum)
    let mm = Math.floor(rest / 60)
    let ss = rest % 60
    if (rest > 5999) { mm = 99; ss = rest - 5940 }
    this.el.timer.textContent = `${mm}:${String(ss).padStart(2, '0')}`
    this.el.timer.classList.toggle('urgente', rest <= CONFIG.partida.tempoFinalSeg)

    const frac = Math.max(0, p.vida / p.vidaMax)
    this.el.hpFill.style.transform = `scaleX(${frac})`
    this.el.hpText.textContent = `${Math.ceil(Math.max(0, p.vida))}/${p.vidaMax}${p.escudo > 0 ? ' +' + Math.round(p.escudo) : ''}`
    this.el.xpFill.style.transform = `scaleX(${p.progressoNivel()})`
    this.el.nivel.textContent = p.nivel
    this.el.carry.textContent = p.tinta

    for (const [slot, s] of this.slots) {
      const cd = p.cooldowns[slot] || 0
      const bloqueado = slot === 'R' && p.nivel < nivelUltimate()
      s.div.classList.toggle('locked', bloqueado)
      s.div.classList.toggle('ready', !bloqueado && cd <= 0 && !p.morto)
      if (bloqueado) {
        s.cd.style.opacity = 1
        s.cd.textContent = 'N' + nivelUltimate()
      } else if (cd > 0) {
        s.cd.style.opacity = 1
        s.cd.textContent = cd > 1 ? Math.ceil(cd) : cd.toFixed(1)
      } else {
        s.cd.style.opacity = 0
        s.cd.textContent = ''
      }
    }

    // respawn / marcação
    if (p.morto) {
      const seg = Math.max(0, p.respawnEm - m.tempo)
      this.el.respawn.classList.remove('hidden')
      this.el.respawn.textContent = `💀 VOLTANDO EM ${seg.toFixed(1)}s`
    } else {
      this.el.respawn.classList.add('hidden')
    }

    if (p.canalizando) {
      const c = p.canalizando
      const pct = Math.round((1 - c.restante / c.total) * 100)
      this.banner(`🎨 MARCANDO… ${pct}%`, 0.25)
    } else if (p.recall) {
      const pct = Math.round((1 - p.recall.restante / p.recall.total) * 100)
      this.banner(`🏠 VOLTANDO PRA BASE… ${pct}%`, 0.25)
    }

    if (this._bannerAte && m.tempo > this._bannerAte) {
      this.el.banner.classList.add('hidden')
      this._bannerAte = 0
    }

    if (m.ehBoss && m.boss) {
      const frac = Math.max(0, m.boss.vida / m.boss.vidaMax)
      this.el.bossFill.style.transform = `scaleX(${frac})`
      this.el.bossPct.textContent = `${Math.ceil(frac * 100)}% · ${Math.max(0, Math.round(m.boss.vida))}`
      this.el.bossHud.classList.toggle('furia', frac <= CONFIG.boss.furiaAbaixoDe)
    }

    if (fps != null) this.el.fps.textContent = `${fps} fps · patch ${PATCH.versao}`
  }

  // ---------- avisos ----------
  banner (texto, dur = 2.6) {
    this.el.banner.textContent = texto
    this.el.banner.classList.remove('hidden')
    this._bannerAte = (this.match ? this.match.tempo : 0) + dur
  }

  toast (texto, classe = '') {
    const d = document.createElement('div')
    d.className = 'toast ' + classe
    d.textContent = texto
    this.el.toasts.appendChild(d)
    setTimeout(() => d.remove(), 2200)
  }

  feed (texto) {
    const d = document.createElement('div')
    d.className = 'feed-item'
    d.textContent = texto
    this.el.feed.appendChild(d)
    while (this.el.feed.children.length > 6) this.el.feed.firstChild.remove()
    setTimeout(() => d.remove(), 6000)
  }

  fim (res) {
    const jogadorVenceu = res.venceu === 'A'
    this.el.endTitle.textContent = res.venceu === 'empate' ? 'EMPATE!' : (jogadorVenceu ? 'VITÓRIA! 🏆' : 'DERROTA 💀')
    this.el.endSub.textContent = `${res.placar.A} × ${res.placar.B} — ${res.motivo}`
    const j = res.jogador
    this.el.endStats.innerHTML = [
      ['Abates', j.abates], ['Mortes', j.mortes],
      ['Tinta marcada', j.tinta], ['Nível final', j.nivel]
    ].map(([k, v]) => `<div class="end-stat"><b>${v}</b><span>${k.toUpperCase()}</span></div>`).join('')
    this.el.endcard.classList.remove('hidden')
  }
}
