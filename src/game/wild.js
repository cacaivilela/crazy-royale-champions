// ============================================================
//  SELVAGENS — criaturas neutras da selva + CHEFÃO do meio
//  Dão XP e tinta; o chefão dá buff pro time inteiro.
// ============================================================
import * as THREE from 'three'
import { Unit } from './entity.js'
import { CONFIG } from '../data/runtime.js'
import { atacarBasico } from './abilities.js'

const MODELOS = {
  tinteiro: {
    nome: 'Tinteiro', emoji: '🎨', cor: 0x9b5de5, escala: 0.85, forma: 'latinha',
    stats: { vida: 180, ataque: 14, alcance: 4.5, cadencia: 0.7, defesa: 4, velocidade: 3.2 },
    xp: 55, tinta: 3, aggro: 6
  },
  gigante: {
    nome: 'Latão Gigante', emoji: '🪣', cor: 0xf59e0b, escala: 1.35, forma: 'balde',
    stats: { vida: 520, ataque: 26, alcance: 5, cadencia: 0.6, defesa: 12, velocidade: 3.0 },
    xp: 150, tinta: 8, aggro: 7
  },
  chefao: {
    nome: 'Baldão Chefe', emoji: '👹', cor: 0xef4444, escala: 2.1, forma: 'chefao',
    stats: { vida: 1400, ataque: 48, alcance: 6, cadencia: 0.55, defesa: 25, velocidade: 3.4 },
    xp: 380, tinta: 20, aggro: 11
  }
}

export class Selvagens {
  constructor (match) {
    this.match = match
    this.lista = []
    this.chefao = null
    this.chefaoSpawnado = false
    this._criarIniciais()
  }

  _criarIniciais () {
    const arena = this.match.arena
    arena.pontosSelva.forEach((p, i) => {
      this.criar(arena.tiposSelva[i] || 'tinteiro', p)
    })
  }

  criar (tipo, ponto) {
    const m = MODELOS[tipo]
    const stats = { ...m.stats, vidaNivel: 0, ataqueNivel: 0 }
    if (tipo === 'chefao') stats.vida = CONFIG.chefao.vida
    else if (tipo === 'tinteiro') stats.vida = CONFIG.selvagens.vidaBase

    const u = new Unit(this.match, {
      time: 'N', ehSelvagem: true, nome: m.nome, emoji: m.emoji, cor: m.cor,
      x: ponto.x, z: ponto.z, escala: m.escala, forma: m.forma, stats
    })
    u.tipoSelvagem = tipo
    u.pontoCasa = ponto.clone()
    u.aggro = m.aggro
    u.recompensaXp = tipo === 'chefao' ? CONFIG.chefao.tintaBonus * 12 : m.xp
    u.recompensaTinta = tipo === 'chefao' ? CONFIG.chefao.tintaBonus : m.tinta
    u.respawnTipo = tipo

    this.lista.push(u)
    this.match.unidades.push(u)
    if (tipo === 'chefao') this.chefao = u
    return u
  }

  atualizar (dt) {
    const t = this.match.tempo

    // spawn do chefão no tempo configurado
    if (!this.chefaoSpawnado && this.match.decorrido >= CONFIG.chefao.spawnEmSeg) {
      this.chefaoSpawnado = true
      this.criar('chefao', this.match.arena.pontoChefao)
      if (this.match.rede) this.match.rede.enviarParaTodos({ t: 'selvagem', tipo: 'chefao' })
      this.match.bus.emit('objetivo', { texto: '👹 BALDÃO CHEFE APARECEU NO CENTRO!' })
    }

    for (const u of this.lista) {
      if (u.morto) {
        if (u.respawnTipo === 'chefao') continue          // chefão não volta
        if (t >= u.respawnEm) {
          u.reviver(u.pontoCasa)
          u.recalcular()
          u.vida = u.vidaMax
        }
        continue
      }

      // aggro simples: bate em quem chegar perto, senão volta pra casa
      const alvo = this.match.inimigoMaisProximo(u, u.aggro)
      if (alvo) {
        u.alvoAtual = alvo
        const d = new THREE.Vector3().subVectors(alvo.pos, u.pos)
        const dist = d.length()
        if (dist > u.alcance * 0.8) u.mover(d.x, d.z, dt)
        else { u.velocidadeAtual.set(0, 0, 0); atacarBasico(this.match, u, alvo) }
        if (u.pos.distanceTo(u.pontoCasa) > 14) u.alvoAtual = null
      } else if (u.pos.distanceTo(u.pontoCasa) > 1.2) {
        const d = new THREE.Vector3().subVectors(u.pontoCasa, u.pos)
        u.mover(d.x, d.z, dt)
        u.curar(u.vidaMax * 0.15 * dt)                    // regenera voltando
      } else {
        u.velocidadeAtual.set(0, 0, 0)
      }
    }
  }

  /** Chamado pela partida quando uma unidade morre. */
  aoMorrer (alvo, assassino) {
    if (!alvo.ehSelvagem) return
    if (alvo.respawnTipo !== 'chefao') {
      alvo.respawnEm = this.match.tempo + CONFIG.selvagens.respawnSeg
      return
    }
    if (!assassino) return
    const time = assassino.time
    for (const u of this.match.campeoesDoTime(time)) {
      u.addStatus('ataque', 0.25, CONFIG.chefao.buffDuracaoSeg)
      u.addStatus('velocidade', 0.15, CONFIG.chefao.buffDuracaoSeg)
      u.tinta = Math.min(CONFIG.jogador.maxTintaCarregada, u.tinta + CONFIG.chefao.tintaBonus)
    }
    this.match.bus.emit('objetivo', {
      texto: `👹 Time ${time === 'A' ? 'AZUL' : 'VERMELHO'} derrubou o Baldão Chefe! Buff por ${CONFIG.chefao.buffDuracaoSeg}s`
    })
  }
}
