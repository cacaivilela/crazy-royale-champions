// ============================================================
//  IA DOS BOTS — máquina de estados simples e legível
//  estados: recuar | lutar | farmar | marcar | empurrar
//  Ajuste a força geral em CONFIG.bots (dá pra mudar ao vivo!).
// ============================================================
import * as THREE from 'three'
import { CONFIG } from '../data/runtime.js'
import { atacarBasico, usarHabilidade, podeUsar, habPorSlot } from './abilities.js'
import { iniciarMarcacao, baldaoProximo } from './scoring.js'

const _v = new THREE.Vector3()

export class BotBrain {
  constructor (match, unidade, opts = {}) {
    this.match = match
    this.u = unidade
    this.lane = opts.lane || (Math.random() < 0.5 ? -1 : 1)   // -1 top, +1 bot
    this.estado = 'farmar'
    this.destino = unidade.pos.clone()
    this.proximaDecisao = 0
    this.alvo = null
  }

  atualizar (dt) {
    const u = this.u
    if (u.morto) return
    const t = this.match.tempo
    if (t >= this.proximaDecisao) {
      this.proximaDecisao = t + CONFIG.bots.reacaoSeg
      this._decidir()
    }
    this._agir(dt)
  }

  // ---------- decisão ----------
  _decidir () {
    const u = this.u
    const m = this.match
    const vidaFrac = u.vida / u.vidaMax
    const inimigo = m.inimigoMaisProximo(u, 13, true)

    // 1) fugir se estiver quase morrendo
    if (vidaFrac < 0.28 && inimigo) {
      this.estado = 'recuar'
      this.destino.copy(m.arena.baseDe(u.time))
      this.alvo = null
      return
    }
    // 1.5) modo boss: o objetivo é o chefão — os COMs vão pra cima dele
    if (m.ehBoss && u.time === 'A' && m.boss && !m.boss.morto) {
      const capanga = m.inimigoMaisProximo(u, 9, false)
      this.estado = 'lutar'
      this.alvo = (capanga && capanga !== m.boss) ? capanga : m.boss
      this.destino.copy(this.alvo.pos)
      return
    }

    // 2) marcar se tem tinta e um baldão perto/livre
    if (u.tinta >= 6 && (!inimigo || vidaFrac > 0.55)) {
      const alvos = m.arena.baldoesAtacaveis(u.time)
      if (alvos.length) {
        const b = alvos.reduce((a, c) => u.pos.distanceTo(c.pos) < u.pos.distanceTo(a.pos) ? c : a)
        if (u.pos.distanceTo(b.pos) < 26 || u.tinta >= 18) {
          this.estado = 'marcar'
          this.destino.copy(b.pos)
          this.alvo = inimigo && u.pos.distanceTo(inimigo.pos) < u.alcance ? inimigo : null
          return
        }
      }
    }
    // 3) brigar se tem inimigo por perto
    if (inimigo && Math.random() < CONFIG.bots.agressividade) {
      this.estado = 'lutar'
      this.alvo = inimigo
      this.destino.copy(inimigo.pos)
      return
    }
    // 4) farmar selvagem
    const selvagem = m.selvagemMaisProximo(u, 30)
    if (selvagem && (u.tinta < 14 || u.nivel < 5)) {
      this.estado = 'farmar'
      this.alvo = selvagem
      this.destino.copy(selvagem.pos)
      return
    }
    // 5) empurrar a lane
    this.estado = 'empurrar'
    this.alvo = null
    const alvos = m.arena.baldoesAtacaveis(u.time)
    const b = alvos.length ? alvos[Math.abs(this.lane) % alvos.length] : null
    this.destino.copy(b ? b.pos : m.arena.baseDe(u.time === 'A' ? 'B' : 'A'))
  }

  // ---------- ação ----------
  _agir (dt) {
    const u = this.u
    const m = this.match
    const dif = CONFIG.bots.dificuldade

    // marcando? fica parado
    if (u.canalizando) { u.velocidadeAtual.set(0, 0, 0); return }

    if (this.estado === 'marcar') {
      const b = baldaoProximo(m, u)
      if (b && u.tinta > 0) { iniciarMarcacao(m, u); return }
    }

    const alvo = this.alvo && !this.alvo.morto ? this.alvo : null
    const destino = alvo ? alvo.pos : this.destino
    const dist = u.pos.distanceTo(destino)

    // usa habilidades quando o alvo está no alcance
    if (alvo && dist < 12) {
      this._usarHabilidades(alvo, dist, dif)
    }

    // ataque básico
    if (alvo && dist <= u.alcance + 0.8) {
      atacarBasico(m, u, alvo)
      // reposiciona de leve (kite) em vez de ficar colado
      if (u.alcance > 6 && dist < u.alcance * 0.55) {
        _v.subVectors(u.pos, alvo.pos)
        u.mover(_v.x, _v.z, dt, 0.7 * dif)
      } else {
        u.velocidadeAtual.set(0, 0, 0)
      }
      return
    }

    if (dist > 1.4) {
      _v.subVectors(destino, u.pos)
      u.mover(_v.x, _v.z, dt, dif)
    } else {
      u.velocidadeAtual.set(0, 0, 0)
    }
  }

  _usarHabilidades (alvo, dist, dif) {
    const u = this.u
    const m = this.match
    if (Math.random() > (CONFIG.bots.chanceHabilidade ?? 0.3) * dif) return
    for (const slot of ['R', 'E', 'Q']) {
      if (!podeUsar(u, slot)) continue
      const hab = habPorSlot(u, slot)
      const alc = hab.alcance || hab.distancia || hab.raio || 6
      if (hab.tipo === 'cura' || (hab.tipo === 'buff' && u.champ.role === 'defensor')) {
        if (u.vida / u.vidaMax < 0.7 || m.aliadosDe(u).some(a => a.vida / a.vidaMax < 0.6)) {
          usarHabilidade(m, u, slot, u.pos.clone())
          return
        }
        continue
      }
      if (dist <= alc + 1.5) {
        // COM não mira perfeito: erra um pouco o ponto
        const erro = CONFIG.bots.miraRuimM ?? 0
        const ponto = alvo.pos.clone()
        ponto.x += (Math.random() - 0.5) * 2 * erro
        ponto.z += (Math.random() - 0.5) * 2 * erro
        usarHabilidade(m, u, slot, ponto)
        return
      }
    }
  }
}
