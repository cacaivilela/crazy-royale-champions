// ============================================================
//  UNIDADE — campeão (jogador ou bot), criatura selvagem, chefão
//  Visual procedural: cápsula + cabeça + emoji + barra de vida.
// ============================================================
import * as THREE from 'three'
import { CONFIG, getChampion } from '../data/runtime.js'
import { COR_TIME } from './arena.js'
import { construirForma } from './shapes.js'
import { bus } from '../core/events.js'
import { audio } from '../core/audio.js'

let _seq = 0

function texturaEmoji (emoji) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  ctx.font = '96px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, 64, 72)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export class Unit {
  constructor (match, opts) {
    this.match = match
    this.id = 'u' + (++_seq)
    this.time = opts.time              // 'A' | 'B' | 'N' (neutro)
    this.ehJogador = !!opts.ehJogador
    this.ehSelvagem = !!opts.ehSelvagem
    this.champId = opts.champId || null
    this.nome = opts.nome || 'Campeão'
    this.emoji = opts.emoji || '❓'
    this.cor = opts.cor ?? 0xffffff
    this.forma = opts.forma || null
    this.extra = opts.extra || null      // habilidade extra da roleta

    this.nivel = opts.nivel || 1
    this.xp = 0
    this.tinta = 0                      // tinta carregada (pontos)
    this.abates = 0
    this.mortes = 0
    this.tintaMarcada = 0

    this.morto = false
    this.respawnEm = 0
    this.statusList = []
    this.cooldowns = {}
    this.ataqueCd = 0
    this.canalizando = null             // marcação em andamento
    this.ultimoDanoEm = -99
    this.escudo = 0

    this.pos = new THREE.Vector3(opts.x || 0, 0, opts.z || 0)
    this.dir = new THREE.Vector3(0, 0, opts.time === 'A' ? -1 : 1)
    this.velocidadeAtual = new THREE.Vector3()
    this.escala = opts.escala || 1

    this.statsBase = opts.stats || null  // selvagens usam stats fixos
    this.recalcular()
    this.vida = this.vidaMax
    this._construirMesh()
  }

  // ---------- dados vindos do live update ----------
  get champ () { return this.champId ? getChampion(this.champId) : null }

  /** Recalcula status a partir do JSON do campeão (chamado após cada patch). */
  recalcular () {
    const n = this.nivel - 1
    const s = this.champ ? this.champ.stats : this.statsBase
    if (!s) return
    const antesMax = this.vidaMax || 0
    this.vidaMax = Math.round(s.vida + (s.vidaNivel || 0) * n)
    this.ataqueBase = s.ataque + (s.ataqueNivel || 0) * n
    this.alcanceBase = s.alcance
    this.cadencia = s.cadencia || 1
    this.defesa = s.defesa || 0
    this.velocidadeBase = s.velocidade || CONFIG.jogador.velocidadeBase

    // passiva da Roleta Habilidosa
    const ex = this.extra
    if (ex && ex.tipo === 'passiva') {
      if (ex.vida) this.vidaMax += ex.vida
      if (ex.ataque) this.ataqueBase *= (1 + ex.ataque)
      if (ex.velocidade) this.velocidadeBase *= (1 + ex.velocidade)
      if (ex.defesa) this.defesa += ex.defesa
      if (ex.alcance) this.alcanceBase += ex.alcance
      if (ex.cadencia) this.cadencia *= (1 + ex.cadencia)
      this.passivaRegen = ex.regen || 0
      this.passivaRoubaVida = ex.roubaVida || 0
    } else {
      this.passivaRegen = 0
      this.passivaRoubaVida = 0
    }
    if (antesMax && this.vidaMax !== antesMax && this.vida != null) {
      this.vida = Math.min(this.vidaMax, this.vida + (this.vidaMax - antesMax))
    }
  }

  // ---------- visual ----------
  _construirMesh () {
    const corTime = this.time === 'N' ? 0x9ca3af : COR_TIME[this.time]
    this.grupo = new THREE.Group()
    this.grupo.position.copy(this.pos)

    this.corpo = new THREE.Group()
    this.grupo.add(this.corpo)

    // modelo procedural com o formato do personagem (banana, fantasma, foguete…)
    const forma = this.forma || (this.champ && this.champ.forma) || 'generico'
    const { grupo: modelo, altura } = construirForma(forma, this.cor)
    this.corpo.add(modelo)
    this.modelo = modelo
    this.alturaModelo = altura

    // guarda os materiais para efeitos (invisibilidade, dano, buff)
    this.materiais = []
    modelo.traverse(o => {
      if (!o.material) return
      o.castShadow = true
      if (!this.materiais.includes(o.material)) {
        o.material.userData.opacidadeBase = o.material.opacity
        o.material.userData.transparenteBase = o.material.transparent
        this.materiais.push(o.material)
      }
    })

    // anel do time no chão
    const anel = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.15, 22),
      new THREE.MeshBasicMaterial({ color: corTime, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    )
    anel.rotation.x = -Math.PI / 2
    anel.position.y = 0.06
    this.grupo.add(anel)
    this.anel = anel

    // UI flutuante (não gira com o corpo)
    this.ui = new THREE.Group()
    this.ui.position.y = altura + 0.5
    this.grupo.add(this.ui)

    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaEmoji(this.emoji), transparent: true }))
    sp.scale.set(0.9, 0.9, 1)
    sp.position.y = 0.5
    this.ui.add(sp)

    const barraBg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x101020, transparent: true, opacity: 0.85 }))
    barraBg.scale.set(1.7, 0.22, 1)
    this.ui.add(barraBg)
    const barra = new THREE.Sprite(new THREE.SpriteMaterial({ color: corTime }))
    barra.scale.set(1.6, 0.15, 1)
    this.ui.add(barra)
    this.barraVida = barra
    this.barraLargura = 1.6

    if (this.ehJogador) {
      const seta = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.6, 4),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      )
      seta.position.y = 1.1
      seta.rotation.x = Math.PI
      this.ui.add(seta)
      this.seta = seta
    }

    this.grupo.scale.setScalar(this.escala)
    this.match.scene.add(this.grupo)
  }

  /** Deixa o modelo semitransparente (invisibilidade) ou opaco de novo. */
  definirOpacidade (valor) {
    if (this._opacidadeAtual === valor) return
    this._opacidadeAtual = valor
    for (const m of this.materiais) {
      const base = m.userData.opacidadeBase ?? 1
      m.opacity = base * valor
      m.transparent = m.userData.transparenteBase || valor < 1
      m.needsUpdate = true
    }
  }

  atualizarBarra () {
    const frac = Math.max(0, this.vida / this.vidaMax)
    this.barraVida.scale.x = this.barraLargura * frac
    this.barraVida.position.x = -(this.barraLargura * (1 - frac)) / 2
    this.barraVida.material.color.setHex(
      this.escudo > 0 ? 0xfacc15 : (this.time === 'N' ? 0x9ca3af : COR_TIME[this.time])
    )
  }

  // ---------- status / buffs ----------
  addStatus (tipo, valor, duracao, origem = null) {
    this.statusList.push({ tipo, valor, expira: this.match.tempo + duracao, origem })
  }

  valorStatus (tipo) {
    let v = 0
    for (const s of this.statusList) if (s.tipo === tipo) v += s.valor
    return v
  }

  temStatus (tipo) { return this.statusList.some(s => s.tipo === tipo) }

  get velocidade () {
    const mult = 1 + this.valorStatus('velocidade') - this.valorStatus('lentidao')
    return Math.max(1.5, this.velocidadeBase * mult * (this.canalizando ? 0.25 : 1))
  }

  get ataque () { return this.ataqueBase * (1 + this.valorStatus('ataque')) }
  get alcance () { return this.alcanceBase + this.valorStatus('alcance') }
  get invisivel () { return this.temStatus('invisivel') || (this.match.arena.noArbusto(this.pos) && !this.ehSelvagem) }

  // ---------- combate ----------
  receberDano (qtd, origem = null) {
    if (this.morto || qtd <= 0) return 0
    if (this.temStatus('imune')) return 0
    if (this.match.modoRemoto) {
      // cliente online: quem manda na vida é o host, aqui é só efeito visual
      this.match.efeitosVisuais.splat(this.pos, origem ? origem.cor : 0xffffff, 0.7)
      return 0
    }
    const passiva = (this.extra && this.extra.tipo === 'passiva' && this.extra.reducaoDano) || 0
    const reducao = this.defesa / (this.defesa + 100) + this.valorStatus('reducaoDano') + passiva
    let dano = Math.max(1, qtd * (1 - Math.min(0.75, reducao)))

    if (this.escudo > 0) {
      const absorvido = Math.min(this.escudo, dano)
      this.escudo -= absorvido
      dano -= absorvido
    }
    this.vida -= dano
    this.ultimoDanoEm = this.match.tempo
    if (this.canalizando) this.cancelarMarcacao()
    if (this.recall) { this.recall = null; bus.emit('recall:cancelado', { unidade: this }) }
    if (this.ehJogador) { audio.dano(); bus.emit('jogador:dano', { dano, vidaFrac: this.vida / this.vidaMax }) }

    const roubo = origem && origem.valorStatus
      ? origem.valorStatus('roubaVida') + (origem.passivaRoubaVida || 0)
      : 0
    if (roubo > 0) origem.curar(dano * roubo)
    this.match.efeitosVisuais.numero(this.pos, Math.round(dano), origem && origem.ehJogador ? 0xfacc15 : 0xffffff)

    if (this.vida <= 0) this.morrer(origem)
    this.atualizarBarra()
    return dano
  }

  curar (qtd) {
    if (this.morto) return
    this.vida = Math.min(this.vidaMax, this.vida + qtd)
    this.atualizarBarra()
  }

  morrer (assassino) {
    if (this.morto) return
    this.morto = true
    this.vida = 0
    this.mortes++
    this.statusList.length = 0
    this.escudo = 0
    this.grupo.visible = false
    this.match.efeitosVisuais.explosao(this.pos, this.cor)
    if (this.ehJogador || (assassino && assassino.ehJogador)) audio.morte()

    const tempoRespawn = CONFIG.partida.respawnBaseSeg + CONFIG.partida.respawnPorNivel * this.nivel
    this.respawnEm = this.match.tempo + tempoRespawn

    if (assassino && assassino !== this) {
      assassino.abates++
      const xpGanho = this.recompensaXp ??
        (this.ehSelvagem ? CONFIG.selvagens.xpBase : 70 + this.nivel * 22)
      assassino.ganharXp(xpGanho)
      const ganho = this.recompensaTinta ?? (this.ehSelvagem
        ? CONFIG.marcacao.tintaPorSelvagem
        : CONFIG.marcacao.tintaPorAbate + Math.floor(this.tinta * 0.5))
      const bonusTinta = (assassino.extra && assassino.extra.tintaBonus) || 0
      assassino.tinta = Math.min(CONFIG.jogador.maxTintaCarregada,
        assassino.tinta + Math.round(ganho * (1 + bonusTinta)))

      // XP de assistência: quem estava por perto também leva uma fatia
      const fatia = CONFIG.jogador.xpAssistencia
      for (const aliado of this.match.aliadosDe(assassino)) {
        if (aliado.morto || aliado.pos.distanceTo(this.pos) > 15) continue
        aliado.ganharXp(xpGanho * fatia)
        if (!this.ehSelvagem) {
          aliado.tinta = Math.min(CONFIG.jogador.maxTintaCarregada, aliado.tinta + Math.round(ganho * 0.4))
        }
      }
    }
    bus.emit('unidade:morreu', { alvo: this, assassino })
  }

  reviver (pos) {
    this.morto = false
    this.recall = null
    this.vida = this.vidaMax
    this.escudo = 0
    this.tinta = 0
    this.statusList.length = 0
    // imunidade curta DEPOIS de limpar os status, senão ela sumia junto
    this.addStatus('imune', 1, CONFIG.jogador.protecaoSpawnSeg)
    if (pos) this.pos.copy(pos)
    this.grupo.position.copy(this.pos)
    this.grupo.visible = true
    this.atualizarBarra()
  }

  // ---------- progressão ----------
  ganharXp (qtd) {
    if (this.ehSelvagem || this.match.modoRemoto) return
    this.xp += qtd
    const tabela = CONFIG.jogador.xpPorNivel
    while (this.nivel < CONFIG.jogador.nivelMax && this.xp >= tabela[this.nivel]) {
      this.nivel++
      const antes = this.vidaMax
      this.recalcular()
      this.vida += (this.vidaMax - antes)
      this.match.efeitosVisuais.anelUp(this.pos)
      bus.emit('unidade:subiuNivel', { unidade: this })
    }
  }

  progressoNivel () {
    const t = CONFIG.jogador.xpPorNivel
    if (this.nivel >= CONFIG.jogador.nivelMax) return 1
    const ini = t[this.nivel - 1] || 0
    const fim = t[this.nivel]
    return Math.max(0, Math.min(1, (this.xp - ini) / (fim - ini)))
  }

  // ---------- marcação (gol) ----------
  cancelarMarcacao () {
    if (this.canalizando) {
      bus.emit('marcacao:cancelada', { unidade: this })
      this.canalizando = null
    }
  }

  // ---------- por frame ----------
  atualizar (dt) {
    const t = this.match.tempo
    // expira status
    if (this.statusList.length) {
      this.statusList = this.statusList.filter(s => s.expira > t)
    }
    for (const k of Object.keys(this.cooldowns)) {
      if (this.cooldowns[k] > 0) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt)
    }
    if (this.ataqueCd > 0) this.ataqueCd -= dt

    if (this.morto) return

    // passiva de regeneração (vale até em combate)
    if (this.passivaRegen && this.vida < this.vidaMax) {
      this.curar(this.vidaMax * this.passivaRegen * dt)
    }
    // regeneração fora de combate
    if (t - this.ultimoDanoEm > CONFIG.jogador.regenForaDeCombateSeg && this.vida < this.vidaMax) {
      this.curar(this.vidaMax * CONFIG.jogador.regenPorSeg * dt)
    }
    // cura acelerada na própria base
    const base = this.match.arena.baseDe(this.time)
    if (base && !this.ehSelvagem && this.pos.distanceTo(base) < this.match.arena.raioBase) {
      this.curar(this.vidaMax * 0.12 * dt)
    }

    this.grupo.position.copy(this.pos)
    if (this.dir.lengthSq() > 0.0001) {
      const alvo = Math.atan2(this.dir.x, this.dir.z)
      let d = alvo - this.corpo.rotation.y
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      this.corpo.rotation.y += d * Math.min(1, dt * 12)
    }
    // "andar" (balanço) + respiração parado
    const andando = this.velocidadeAtual.lengthSq() > 0.5
    this.corpo.position.y = andando ? Math.abs(Math.sin(t * 11)) * 0.15 : Math.sin(t * 2.2) * 0.03
    this.corpo.rotation.z = andando ? Math.sin(t * 11) * 0.07 : 0
    this.corpo.rotation.x = andando ? 0.06 : 0

    // opacidade quando invisível/escondido
    const escondido = this.invisivel && !this.ehJogador && this.time !== this.match.timeJogador
    this.grupo.visible = !escondido
    this.definirOpacidade(this.invisivel ? 0.45 : 1)

    this.atualizarBarra()
  }

  mover (dirX, dirZ, dt, multiplicador = 1) {
    const len = Math.hypot(dirX, dirZ)
    if (len < 0.01) { this.velocidadeAtual.set(0, 0, 0); return }
    const v = this.velocidade * multiplicador
    const nx = (dirX / len) * v * dt
    const nz = (dirZ / len) * v * dt
    this.pos.x += nx; this.pos.z += nz
    this.velocidadeAtual.set(nx / dt, 0, nz / dt)
    this.dir.set(dirX / len, 0, dirZ / len)
    this.match.arena.limitar(this.pos)
    this.match.arena.colidirObstaculos(this.pos)
  }

  destruir () {
    this.match.scene.remove(this.grupo)
    this.grupo.traverse(o => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        if (o.material.map) o.material.map.dispose()
        o.material.dispose()
      }
    })
  }
}
