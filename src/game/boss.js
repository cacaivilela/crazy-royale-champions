// ============================================================
//  MODO BOSS — 12 jogadores contra um Baldão Supremo gigante
//  O chefão tem IA própria: persegue, dá pancada em área,
//  invoca capangas e entra em fúria quando está acabando.
// ============================================================
import * as THREE from 'three'
import { Unit } from './entity.js'
import { CONFIG } from '../data/runtime.js'
import { atacarBasico } from './abilities.js'
import { bus } from '../core/events.js'

const _v = new THREE.Vector3()

/** Junta CONFIG.boss com o perfil do modo (solo tem números menores). */
export function cfgBoss (match) {
  return match && match.ehBossSolo ? { ...CONFIG.boss, ...CONFIG.bossSolo } : CONFIG.boss
}

export function criarBoss (match, quantosJogadores) {
  const c = cfgBoss(match)
  const vida = c.vidaBase + c.vidaPorJogador * Math.max(1, quantosJogadores)
  const u = new Unit(match, {
    time: 'B', nome: c.nome || 'Baldão Supremo', emoji: '👹', cor: 0xef4444,
    forma: 'chefao', escala: c.escala,
    x: match.arena.baseDe('B').x, z: match.arena.baseDe('B').z * 0.55,
    stats: {
      vida, vidaNivel: 0, ataque: c.ataque, ataqueNivel: 0,
      alcance: c.alcance, cadencia: c.cadencia, defesa: c.defesa, velocidade: c.velocidade
    }
  })
  u.ehBoss = true
  u.nomeBoss = c.nome || 'Baldão Supremo'
  u.recompensaXp = 400
  u.recompensaTinta = 0
  match.unidades.push(u)
  return u
}

export class BossBrain {
  constructor (match, boss) {
    this.match = match
    this.u = boss
    const c = cfgBoss(match)
    this.proximaPancada = c.intervaloPancadaSeg
    this.proximaInvocacao = c.intervaloInvocarSeg
    this.furioso = false
  }

  atualizar (dt) {
    const m = this.match
    const u = this.u
    if (u.morto) return
    const c = cfgBoss(m)
    const t = m.tempo

    // fúria quando a vida acaba
    if (!this.furioso && u.vida / u.vidaMax <= c.furiaAbaixoDe) {
      this.furioso = true
      u.addStatus('ataque', c.bonusFuria, 9999)
      u.addStatus('velocidade', c.bonusFuria * 0.5, 9999)
      u.grupo.scale.setScalar(u.escala * 1.15)
      bus.emit('objetivo', { texto: `🔥 O ${(u.nomeBoss || 'CHEFÃO').toUpperCase()} ESTÁ FURIOSO!` })
    }

    // alvo: jogador vivo mais perto
    const alvo = m.inimigoMaisProximo(u, 999, true)
    if (!alvo) { u.velocidadeAtual.set(0, 0, 0); return }
    const dist = u.pos.distanceTo(alvo.pos)

    // pancada em área
    if (t >= this.proximaPancada) {
      this.proximaPancada = t + c.intervaloPancadaSeg
      this._pancada()
    }
    // capangas
    if (t >= this.proximaInvocacao) {
      this.proximaInvocacao = t + c.intervaloInvocarSeg
      this._invocar()
    }

    if (dist > u.alcance * 0.7) {
      _v.subVectors(alvo.pos, u.pos)
      u.mover(_v.x, _v.z, dt)
    } else {
      u.velocidadeAtual.set(0, 0, 0)
      atacarBasico(this.match, u, alvo)
    }
  }

  _pancada () {
    const m = this.match
    const u = this.u
    const c = cfgBoss(m)
    m.efeitosVisuais.onda(u.pos, c.raioPancada, 0xff3b6b)
    m.efeitosVisuais.explosao(u.pos, 0xef4444)
    if (m.jogador && !m.jogador.morto && m.jogador.pos.distanceTo(u.pos) < c.raioPancada) m.camera.sacudir(1.2)
    for (const alvo of m.inimigosDe(u)) {
      const d = alvo.pos.distanceTo(u.pos)
      if (d > c.raioPancada) continue
      const forca = 1 - (d / c.raioPancada) * 0.6
      alvo.receberDano(c.danoPancada * forca * (this.furioso ? 1.4 : 1), u)
      alvo.addStatus('lentidao', 0.4, 2)
    }
    bus.emit('boss:pancada', { boss: u })
  }

  _invocar () {
    const m = this.match
    const quantos = cfgBoss(m).capangasPorVez
    for (let i = 0; i < quantos; i++) {
      const a = (i / quantos) * Math.PI * 2
      const p = new THREE.Vector3(
        this.u.pos.x + Math.cos(a) * 6,
        0,
        this.u.pos.z + Math.sin(a) * 6
      )
      m.arena.limitar(p)
      const capanga = m.selvagens.criar('gigante', p)
      capanga.time = 'B'                    // capanga do chefão luta pelo time dele
      capanga.anel.material.color.setHex(0xf43f5e)
      capanga.pontoCasa.copy(p)
    }
    bus.emit('objetivo', { texto: '🪣 O chefão chamou capangas!' })
    if (m.rede && !m.modoRemoto) m.rede.enviarParaTodos({ t: 'capangas', x: this.u.pos.x, z: this.u.pos.z })
  }
}
