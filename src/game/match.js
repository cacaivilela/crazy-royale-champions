// ============================================================
//  PARTIDA — junta tudo: cena, times, IA, objetivos e regras
//  3v3: você + 2 bots aliados contra 3 bots inimigos.
// ============================================================
import * as THREE from 'three'
import { CONFIG, CHAMPIONS, getChampion } from '../data/runtime.js'
import { bus } from '../core/events.js'
import { Arena, COR_TIME } from './arena.js'
import { Unit } from './entity.js'
import { EfeitosVisuais } from './effects.js'
import { Selvagens } from './wild.js'
import { BotBrain } from './ai.js'
import { CameraJogo } from './camera.js'
import {
  atacarBasico, usarHabilidade, atualizarProjeteis, atualizarAreas, atualizarDashes
} from './abilities.js'
import { atualizarMarcacoes, iniciarMarcacao, baldaoProximo } from './scoring.js'
import { Indicadores } from './indicators.js'
import { audio } from '../core/audio.js'
import { aplicarCheat } from './cheats.js'
import { criarBoss, BossBrain, cfgBoss } from './boss.js'
import { extraEquipado, getExtra } from '../data/extras.js'

const _v = new THREE.Vector3()

export class Match {
  /**
   * @param roster      lista de vagas do online: { id, nome, champId, time, controle }
   *                    controle: 'local' | 'remoto' | 'com'
   * @param modoRemoto  true = cliente online (não simula, só aplica snapshot do host)
   */
  constructor ({ canvas, input, champId, modo = 'ranked', roster = null,
                 escalaArena = 1, modoRemoto = false, rede = null, meuId = 'local',
                 cheats = 'nenhum', modoJogo = 'normal', extraId = null }) {
    this.canvas = canvas
    this.input = input
    this.modo = modo
    this.roster = roster
    this.escalaArena = escalaArena
    this.modoRemoto = modoRemoto
    this.rede = rede
    this.meuId = meuId
    this.ehOnline = !!roster
    this.cheats = cheats
    this.extraId = extraId
    this.modoJogo = modoJogo
    this.ehBoss = modoJogo === 'boss'
    this.ehBossSolo = this.ehBoss && !roster          // boss offline: você + COMs
    this.duracao = this.ehBoss
      ? (this.ehBossSolo ? CONFIG.bossSolo.duracaoSeg : CONFIG.boss.duracaoSeg)
      : CONFIG.partida.duracaoSeg
    if (this.ehBossSolo) escalaArena = CONFIG.bossSolo.multiplicadorArena
    this.comandos = new Map()       // id do jogador remoto -> último comando recebido
    this.remotos = new Map()        // id -> unidade
    this._acumSnap = 0
    this._acumCmd = 0
    this._snapAlvo = null
    this.bus = bus
    this.tempo = 0            // relógio interno (sempre sobe)
    this.decorrido = 0        // tempo de partida
    this.acabou = false
    this.placar = { A: 0, B: 0 }
    this.timeJogador = 'A'
    this.unidades = []
    this.bots = []
    this.projeteis = []
    this.areas = []
    this.timers = []
    this._offs = []
    this.pausado = false
    this.alvoAtual = null
    this._miraSuave = new THREE.Vector3()

    this._cena()
    this.arena = new Arena(this.scene, escalaArena, this.ehBoss)
    this.efeitosVisuais = new EfeitosVisuais(this.scene)
    this.camera = new CameraJogo(canvas, 1,
      this.ehBossSolo ? 1.25 : (this.ehBoss ? 1.5 : (escalaArena > 1 ? 1.15 : 1)))
    if (roster) this._criarTimesOnline(roster)
    else this._criarTimes(champId)
    this.selvagens = new Selvagens(this)
    if (this.ehBoss) {
      const humanos = roster ? roster.length : CONFIG.bossSolo.jogadores
      this.boss = criarBoss(this, humanos)
      if (!this.modoRemoto) this.bossBrain = new BossBrain(this, this.boss)
    }
    this.indicadores = new Indicadores(this)
    this._ouvintes()
  }

  // ---------------- setup ----------------
  _cena () {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0b0a1a)
    this.scene.fog = new THREE.Fog(0x0b0a1a, 70, 150)

    const hemi = new THREE.HemisphereLight(0xa78bfa, 0x1b1a3a, 1.1)
    this.scene.add(hemi)
    const sol = new THREE.DirectionalLight(0xffffff, 1.5)
    sol.position.set(24, 46, 22)
    sol.castShadow = true
    sol.shadow.mapSize.set(1024, 1024)
    sol.shadow.camera.left = -60; sol.shadow.camera.right = 60
    sol.shadow.camera.top = 60; sol.shadow.camera.bottom = -60
    sol.shadow.camera.far = 140
    this.scene.add(sol)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25))

    this.redimensionar()
    this._onResize = () => this.redimensionar()
    window.addEventListener('resize', this._onResize)
  }

  _criarTimes (champId) {
    const usados = new Set([champId])
    const sortear = () => {
      const livres = CHAMPIONS.filter(c => !usados.has(c.id))
      const c = (livres.length ? livres : CHAMPIONS)[Math.floor(Math.random() * (livres.length || CHAMPIONS.length))]
      usados.add(c.id)
      return c.id
    }

    const porTime = this.ehBossSolo
      ? Math.max(1, CONFIG.bossSolo.jogadores)
      : Math.max(1, CONFIG.partida.jogadoresPorTime)
    const spawn = (time, i) => {
      const base = this.arena.baseDe(time)
      const dx = (i - (porTime - 1) / 2) * 3.5
      return { x: base.x + dx, z: base.z }
    }

    // time A: jogador + aliados (a extra vem da Roleta Habilidosa)
    const extra = this.extraId ? getExtra(this.extraId) : extraEquipado(champId)
    this.jogador = this._criarCampeao(champId, 'A', true, spawn('A', 0), null, extra)
    for (let i = 1; i < porTime; i++) {
      const u = this._criarCampeao(sortear(), 'A', false, spawn('A', i))
      this.bots.push(new BotBrain(this, u, { lane: i % 2 === 0 ? -1 : 1 }))
    }
    // time B: inimigos (no modo boss o inimigo é o chefão, não tem time B)
    if (this.ehBoss) return
    for (let i = 0; i < porTime; i++) {
      const u = this._criarCampeao(sortear(), 'B', false, spawn('B', i))
      this.bots.push(new BotBrain(this, u, { lane: i % 2 === 0 ? 1 : -1 }))
    }
  }

  /** Monta os dois times a partir do roster da sala (6 humanos x 6 COMs). */
  _criarTimesOnline (roster) {
    const porTime = Math.max(...roster.map(r => r.time === 'A' ? 1 : 0), 1)
    const contar = (t) => roster.filter(r => r.time === t).length
    const spawnDe = (time, i, total) => {
      const base = this.arena.baseDe(time)
      const dx = (i - (total - 1) / 2) * 3.5
      return { x: base.x + dx, z: base.z }
    }
    const indices = { A: 0, B: 0 }
    void this.ehBoss
    for (const vaga of roster) {
      const i = indices[vaga.time]++
      const pos = spawnDe(vaga.time, i, contar(vaga.time))
      const ehLocal = vaga.controle === 'local'
      const u = this._criarCampeao(vaga.champId, vaga.time, ehLocal, pos, vaga.nome, getExtra(vaga.extraId))
      u.jogadorId = vaga.id
      u.controle = vaga.controle
      if (ehLocal) this.jogador = u
      else if (vaga.controle === 'remoto') this.remotos.set(vaga.id, u)
      else if (!this.modoRemoto) this.bots.push(new BotBrain(this, u, { lane: i % 2 === 0 ? -1 : 1 }))
    }
    this.timeJogador = this.jogador ? this.jogador.time : 'A'
    void porTime
  }

  _criarCampeao (champId, time, ehJogador, pos, nome = null, extra = null) {
    const c = getChampion(champId)
    const u = new Unit(this, {
      champId: c.id, time, ehJogador,
      nome: nome || (ehJogador ? c.nome : `${c.nome} (COM)`),
      emoji: c.emoji, cor: c.cor, forma: c.forma, extra, x: pos.x, z: pos.z
    })
    u.dir.set(0, 0, time === 'A' ? -1 : 1)
    this.unidades.push(u)
    return u
  }

  _ouvintes () {
    this._offs.push(bus.on('unidade:morreu', ({ alvo, assassino }) => {
      if (alvo.ehSelvagem) this.selvagens.aoMorrer(alvo, assassino)
      if (assassino === this.jogador || alvo === this.jogador) this.camera.sacudir(0.7)
    }))
    // live update: recalcula status de todo mundo na hora
    this._offs.push(bus.on('patch:aplicado', () => {
      for (const u of this.unidades) u.recalcular()
      this.camera.redimensionar()
    }))
    // repassa habilidades pros clientes verem o efeito
    this._offs.push(bus.on('hab:usada', ({ unidade, slot }) => {
      if (!this.rede || this.modoRemoto) return
      const i = this.unidades.indexOf(unidade)
      if (i < 0) return
      const alvo = this.miraAtual || unidade.pos
      this.rede.enviarParaTodos({ t: 'fx', i, slot, ax: +alvo.x.toFixed(1), az: +alvo.z.toFixed(1) })
    }))

    // botões de habilidade na tela (touch)
    this._offs.push(bus.on('ui:habilidade', ({ slot }) => this._usarSlot(slot)))
    this._offs.push(bus.on('ui:marcar', () => iniciarMarcacao(this, this.jogador)))
    this._offs.push(bus.on('ui:atacar', ({ apertado }) => { this.tiroTouch = apertado })) 
    this._offs.push(bus.on('ui:recall', () => this.alternarRecall()))
    this._offs.push(bus.on('ui:pausa', () => this.alternarPausa()))

    // cheats: no online quem aplica é o host; o cliente só manda o código
    this._offs.push(bus.on('cheat:pedido', ({ texto }) => {
      if (this.cheats === 'nenhum') {
        bus.emit('cheat:recusado', { mensagem: 'os cheats estão desligados nesta partida' })
        return
      }
      if (this.modoRemoto) { this.rede.enviarAoHost({ t: 'cheat', texto }); return }
      const r = aplicarCheat(this, this.jogador, texto)
      if (!r) bus.emit('cheat:recusado', { mensagem: 'não conheço esse código 🤔' })
    }))
  }

  redimensionar () {
    const w = window.innerWidth, h = window.innerHeight
    this.renderer.setSize(w, h, false)
    if (this.camera) this.camera.redimensionar()
  }

  // ---------------- consultas ----------------
  campeoes () { return this.unidades.filter(u => !u.ehSelvagem) }
  campeoesDoTime (time) { return this.unidades.filter(u => !u.ehSelvagem && u.time === time) }
  vivos () { return this.unidades.filter(u => !u.morto) }

  inimigosDe (u) { return this.unidades.filter(x => !x.morto && x.time !== u.time) }

  aliadosDe (u, incluirEle = false) {
    return this.unidades.filter(x => !x.morto && x.time === u.time && !x.ehSelvagem && (incluirEle || x !== u))
  }

  inimigoMaisProximo (u, raio = 999, soCampeoes = false) {
    let melhor = null, melhorD = raio
    for (const x of this.unidades) {
      if (x.morto || x.time === u.time) continue
      if (soCampeoes && x.ehSelvagem) continue
      if (x.invisivel && x.time !== u.time && !x.ehJogador) continue
      const d = u.pos.distanceTo(x.pos)
      if (d < melhorD) { melhorD = d; melhor = x }
    }
    return melhor
  }

  selvagemMaisProximo (u, raio = 999) {
    let melhor = null, melhorD = raio
    for (const x of this.unidades) {
      if (!x.ehSelvagem || x.morto) continue
      const d = u.pos.distanceTo(x.pos)
      if (d < melhorD) { melhorD = d; melhor = x }
    }
    return melhor
  }

  get tempoRestante () { return Math.max(0, this.duracao - this.decorrido) }

  agendar (delay, fn) { this.timers.push({ em: this.tempo + delay, fn }) }

  // ---------------- loop ----------------
  atualizar (dt) {
    if (this.input.pressed('Escape') && !this.acabou && !this.ehOnline) this.alternarPausa()
    if (this.pausado) {
      this.camera.seguir(this.jogador.pos, dt)
      this.renderer.render(this.scene, this.camera.cam)
      return
    }

    this.tempo += dt
    if (!this.acabou && !this.modoRemoto) this.decorrido += dt

    this._timers()

    if (this.modoRemoto) {
      // ---- CLIENTE ONLINE: manda input, aplica o estado do host ----
      this._enviarComandoAoHost(dt)
      this._aplicarSnapshot(dt)
      const cmd = this._comandoLocal()
      this._preverMovimentoLocal(cmd, dt)
    } else if (!this.acabou) {
      // ---- HOST / OFFLINE: simula tudo ----
      this._aplicarComando(this.jogador, this._comandoLocal(), dt, true)
      for (const [id, u] of this.remotos) {
        const cmd = this.comandos.get(id)
        if (cmd) { this._aplicarComando(u, cmd, dt, false); this._limparUmaVez(cmd) }
      }
      for (const b of this.bots) b.atualizar(dt)
      if (this.bossBrain) this.bossBrain.atualizar(dt)
      this.selvagens.atualizar(dt)
    }

    for (const u of this.unidades) u.atualizar(dt)
    atualizarDashes(this, dt)
    atualizarProjeteis(this, dt)
    atualizarAreas(this, dt)
    if (!this.modoRemoto) {
      atualizarMarcacoes(this, dt)
      this._atualizarRecall(dt)
      this._respawns()
    }
    this.efeitosVisuais.atualizar(dt)
    this.indicadores.atualizar(dt)

    if (this.rede && !this.modoRemoto) this._enviarSnapshot(dt)

    // câmera olha um pouco na direção da mira (dá pra ver quem vem)
    const alvoCam = this._alvoCamera()
    this.camera.seguir(alvoCam, dt)
    this.renderer.render(this.scene, this.camera.cam)

    if (!this.acabou && !this.modoRemoto) this._checarFim()
  }

  _timers () {
    if (!this.timers.length) return
    const restantes = []
    for (const t of this.timers) {
      if (this.tempo >= t.em) { try { t.fn() } catch (e) { console.error(e) } } else restantes.push(t)
    }
    this.timers = restantes
  }

  _respawns () {
    for (const u of this.campeoes()) {
      if (!u.morto || this.tempo < u.respawnEm) continue
      const base = this.arena.baseDe(u.time)
      u.reviver(new THREE.Vector3(base.x + (Math.random() - 0.5) * 4, 0, base.z))
      if (u === this.jogador) bus.emit('jogador:renasceu', {})
    }
  }

  /** Lê teclado/mouse/toque e devolve o comando do quadro. */
  _comandoLocal () {
    const inp = this.input
    const p = this.jogador
    const mira = this.camera.pontoNoChao(inp.ndc) || p.pos.clone().addScaledVector(p.dir, 6)
    this.miraAtual = mira
    const mv = inp.moveVector()
    const lado = this.camera.lado
    return {
      mx: mv.x * lado, mz: mv.y * lado, len: mv.len,
      ax: mira.x, az: mira.z,
      atirar: inp.down('Space') || inp.mouseDown || !!this.tiroTouch || CONFIG.combate.ataqueAutomatico,
      q: inp.pressed('KeyQ'), e: inp.pressed('KeyE'), r: inp.pressed('KeyR'),
      x: inp.pressed('KeyX'),
      marcar: inp.pressed('KeyF'), recall: inp.pressed('KeyB')
    }
  }

  _limparUmaVez (cmd) { cmd.q = cmd.e = cmd.r = cmd.x = cmd.marcar = cmd.recall = false }

  /** Executa um comando (do jogador local ou de um jogador remoto). */
  _aplicarComando (u, cmd, dt, ehLocal) {
    if (!u || u.morto || !cmd) return
    const mira = new THREE.Vector3(cmd.ax ?? u.pos.x, 0, cmd.az ?? u.pos.z)

    if ((cmd.len ?? Math.hypot(cmd.mx || 0, cmd.mz || 0)) > 0.08) {
      u.mover(cmd.mx, cmd.mz, dt)
      u.cancelarMarcacao()
      if (u.recall) { u.recall = null; if (ehLocal) bus.emit('recall:cancelado', { unidade: u }) }
    } else {
      u.velocidadeAtual.set(0, 0, 0)
      // parado dentro do baldão inimigo com tinta? começa a marcar sozinho
      if (!u.canalizando && u.tinta > 0 && baldaoProximo(this, u)) iniciarMarcacao(this, u)
    }

    if (cmd.q) usarHabilidade(this, u, 'Q', mira)
    if (cmd.e) usarHabilidade(this, u, 'E', mira)
    if (cmd.r) usarHabilidade(this, u, 'R', mira)
    if (cmd.x) usarHabilidade(this, u, 'X', mira)
    if (cmd.marcar) iniciarMarcacao(this, u)
    if (cmd.recall) this.alternarRecall(u)

    const alvo = this._alvoDeAtaque(u, mira)
    if (ehLocal) this.alvoAtual = alvo
    if (alvo && cmd.atirar && !u.canalizando && !u.recall) atacarBasico(this, u, alvo)
  }

  /** No cliente, move o próprio campeão na hora (o host corrige depois). */
  _preverMovimentoLocal (cmd, dt) {
    const u = this.jogador
    if (!u || u.morto) return
    if ((cmd.len || 0) > 0.08) u.mover(cmd.mx, cmd.mz, dt)
    const mira = new THREE.Vector3(cmd.ax, 0, cmd.az)
    this.alvoAtual = this._alvoDeAtaque(u, mira)
  }

  // ---------------- rede: cliente -> host ----------------
  _enviarComandoAoHost (dt) {
    this._acumCmd += dt
    const passo = 1 / CONFIG.online.tickComandoHz
    const cmd = this._comandoLocal()
    // guarda os "uma vez" pra não perder botão entre os ticks
    this._cmdPendente = this._cmdPendente || {}
    for (const k of ['q', 'e', 'r', 'x', 'marcar', 'recall']) if (cmd[k]) this._cmdPendente[k] = true
    if (this._acumCmd < passo) return
    this._acumCmd = 0
    this.rede.enviarAoHost({
      t: 'cmd',
      mx: +cmd.mx.toFixed(2), mz: +cmd.mz.toFixed(2), len: +cmd.len.toFixed(2),
      ax: +cmd.ax.toFixed(1), az: +cmd.az.toFixed(1),
      atirar: cmd.atirar,
      q: !!this._cmdPendente.q, e: !!this._cmdPendente.e, r: !!this._cmdPendente.r,
      x: !!this._cmdPendente.x,
      marcar: !!this._cmdPendente.marcar, recall: !!this._cmdPendente.recall
    })
    this._cmdPendente = {}
  }

  // ---------------- rede: host -> clientes ----------------
  _enviarSnapshot (dt) {
    this._acumSnap += dt
    const passo = 1 / CONFIG.online.tickSnapshotHz
    if (this._acumSnap < passo) return
    this._acumSnap = 0
    this.rede.enviarParaTodos(this.snapshot())
  }

  snapshot () {
    const r2 = (n) => Math.round(n * 100) / 100
    return {
      t: 'snap',
      tm: r2(this.decorrido),
      pa: this.placar.A, pb: this.placar.B,
      fim: this.acabou ? 1 : 0,
      u: this.unidades.map(u => [
        r2(u.pos.x), r2(u.pos.z), r2(u.dir.x), r2(u.dir.z),
        Math.round(u.vida), u.nivel, u.tinta, Math.round(u.escudo),
        (u.morto ? 1 : 0) | (u.canalizando ? 2 : 0) | (u.temStatus('invisivel') ? 4 : 0)
      ]),
      b: this.arena.baldoes.map(b => [Math.round(b.acumulado), b.quebrado ? 1 : 0])
    }
  }

  /** Cliente: recebe o estado do host. */
  receberSnapshot (snap) {
    this._snapAlvo = snap
    this.decorrido = snap.tm
    this.placar.A = snap.pa
    this.placar.B = snap.pb
    snap.u.forEach((d, i) => {
      const u = this.unidades[i]
      if (!u) return
      u.vida = d[4]; u.nivel = d[5]; u.tinta = d[6]; u.escudo = d[7]
      const flags = d[8]
      const morto = !!(flags & 1)
      if (morto !== u.morto) {
        u.morto = morto
        u.grupo.visible = !morto
        if (morto) this.efeitosVisuais.explosao(u.pos, u.cor)
      }
      u.canalizandoRemoto = !!(flags & 2)
      u.recalcular()
    })
    snap.b.forEach((d, i) => {
      const b = this.arena.baldoes[i]
      if (!b) return
      const mudou = b.acumulado !== d[0] || b.quebrado !== !!d[1]
      b.acumulado = d[0]; b.quebrado = !!d[1]
      if (mudou) this.arena.atualizarVisualBaldao(b)
    })
    if (snap.fim && !this.acabou) {
      this.acabou = true
      bus.emit('partida:fim', {
        venceu: snap.pa === snap.pb ? 'empate' : (snap.pa > snap.pb ? 'A' : 'B'),
        motivo: 'partida encerrada', placar: { A: snap.pa, B: snap.pb },
        jogador: {
          nome: this.jogador.nome, emoji: this.jogador.emoji, nivel: this.jogador.nivel,
          abates: this.jogador.abates, mortes: this.jogador.mortes, tinta: this.jogador.tintaMarcada
        }
      })
    }
  }

  /** Interpola as posições recebidas (menos a do próprio jogador, que é prevista). */
  _aplicarSnapshot (dt) {
    const snap = this._snapAlvo
    if (!snap) return
    const k = Math.min(1, dt * 12)
    snap.u.forEach((d, i) => {
      const u = this.unidades[i]
      if (!u) return
      if (u === this.jogador) {
        // correção suave da previsão local
        u.pos.x += (d[0] - u.pos.x) * Math.min(1, dt * 3)
        u.pos.z += (d[1] - u.pos.z) * Math.min(1, dt * 3)
        return
      }
      const antX = u.pos.x, antZ = u.pos.z
      u.pos.x += (d[0] - u.pos.x) * k
      u.pos.z += (d[1] - u.pos.z) * k
      u.velocidadeAtual.set((u.pos.x - antX) / dt, 0, (u.pos.z - antZ) / dt)
      if (d[2] || d[3]) u.dir.set(d[2], 0, d[3])
    })
  }

  /** Cliente: reproduz o visual de uma habilidade usada por outro jogador. */
  receberEfeito ({ i, slot, ax, az }) {
    const u = this.unidades[i]
    if (!u) return
    u.cooldowns[slot] = 0
    usarHabilidade(this, u, slot, new THREE.Vector3(ax, 0, az))
  }

  /** Cliente: o host mandou nascer uma criatura nova (chefão). */
  receberSelvagem ({ tipo }) {
    this.selvagens.criar(tipo, this.arena.pontoChefao)
  }

  /** Host: um cliente pediu um cheat — aplica no campeão dele. */
  receberCheat (id, texto) {
    if (this.cheats === 'nenhum' || this.modoRemoto) return
    const u = this.remotos.get(id)
    if (u) aplicarCheat(this, u, texto)
  }

  /** Host: guarda o comando que chegou de um cliente. */
  receberComando (id, cmd) {
    const anterior = this.comandos.get(id)
    if (anterior) {
      // não perde os botões que ainda não foram consumidos
      for (const kk of ['q', 'e', 'r', 'x', 'marcar', 'recall']) if (anterior[kk]) cmd[kk] = true
    }
    this.comandos.set(id, cmd)
  }

  _alvoCamera () {
    const p = this.jogador
    if (p.morto) return this.arena.baseDe(p.time)
    this._miraSuave.copy(p.pos)
    const mira = this.miraAtual
    if (mira) {
      const dx = mira.x - p.pos.x, dz = mira.z - p.pos.z
      const d = Math.hypot(dx, dz) || 1
      const peso = Math.min(1, d / 18) * 5.5
      this._miraSuave.x += (dx / d) * peso
      this._miraSuave.z += (dz / d) * peso
    }
    return this._miraSuave
  }

  alternarPausa () {
    this.pausado = !this.pausado
    bus.emit('partida:pausa', { pausado: this.pausado })
  }

  /** Recall: volta pra base canalizando (tecla B). */
  alternarRecall (unidade = null) {
    const p = unidade || this.jogador
    if (p.morto) return
    if (p.recall) { p.recall = null; bus.emit('recall:cancelado', { unidade: p }); return }
    if (p.pos.distanceTo(this.arena.baseDe(p.time)) < this.arena.raioBase) return
    p.cancelarMarcacao()
    const total = CONFIG.jogador.recallSeg
    p.recall = { total, restante: total }
    audio.habilidade('buff')
    bus.emit('recall:iniciou', { unidade: p })
  }

  _atualizarRecall (dt) {
    for (const p of this.campeoes()) this._recallDe(p, dt)
  }

  _recallDe (p, dt) {
    if (!p.recall || p.morto) return
    p.recall.restante -= dt
    if (p.recall.restante > 0) return
    p.recall = null
    const base = this.arena.baseDe(p.time)
    this.efeitosVisuais.explosao(p.pos, p.cor)
    p.pos.set(base.x, 0, base.z)
    this.efeitosVisuais.onda(p.pos, 4, 0xfacc15)
    if (p === this.jogador) { this.camera.alvo.copy(p.pos); audio.marcando() }
    bus.emit('recall:concluido', { unidade: p })
  }

  _alvoDeAtaque (p, mira) {
    let melhor = null, melhorPeso = Infinity
    for (const x of this.unidades) {
      if (x.morto || x.time === p.time) continue
      if (x.invisivel && !x.ehSelvagem) continue
      const d = p.pos.distanceTo(x.pos)
      if (d > p.alcance + 0.8) continue
      const peso = d + (mira ? x.pos.distanceTo(mira) * 0.6 : 0)
      if (peso < melhorPeso) { melhorPeso = peso; melhor = x }
    }
    return melhor
  }

  _usarSlot (slot) {
    const p = this.jogador
    const mira = this.miraAtual || p.pos.clone().addScaledVector(p.dir, 6)
    usarHabilidade(this, p, slot, mira)
  }

  // ---------------- fim de jogo ----------------
  _checarFim () {
    if (this.ehBoss) return this._checarFimBoss()
    void cfgBoss
    const baseA = this.arena.baldoes.find(b => b.id === 'A-base')
    const baseB = this.arena.baldoes.find(b => b.id === 'B-base')
    let motivo = null
    let venceu = null
    if (baseB && baseB.quebrado) { motivo = 'baldão final destruído'; venceu = 'A' }
    else if (baseA && baseA.quebrado) { motivo = 'baldão final destruído'; venceu = 'B' }
    else if (this.tempoRestante <= 0) {
      motivo = 'tempo esgotado'
      venceu = this.placar.A === this.placar.B ? 'empate' : (this.placar.A > this.placar.B ? 'A' : 'B')
    }
    if (!motivo) return

    this.acabou = true
    const resultado = {
      venceu, motivo, placar: { ...this.placar },
      jogador: {
        nome: this.jogador.nome, emoji: this.jogador.emoji, nivel: this.jogador.nivel,
        abates: this.jogador.abates, mortes: this.jogador.mortes, tinta: this.jogador.tintaMarcada
      }
    }
    bus.emit('partida:fim', resultado)
  }

  _checarFimBoss () {
    let venceu = null, motivo = null
    if (this.boss && this.boss.morto) {
      venceu = 'A'
      motivo = (this.boss.nomeBoss || 'Chefão') + ' derrubado!'
    }
    else if (this.tempoRestante <= 0) { venceu = 'B'; motivo = 'o tempo acabou e o chefão sobreviveu' }
    if (!venceu) return
    this.acabou = true
    bus.emit('partida:fim', {
      venceu, motivo, placar: { ...this.placar },
      jogador: {
        nome: this.jogador.nome, emoji: this.jogador.emoji, nivel: this.jogador.nivel,
        abates: this.jogador.abates, mortes: this.jogador.mortes, tinta: this.jogador.tintaMarcada
      }
    })
  }

  /** Cliente: o host invocou capangas do chefão. */
  receberCapangas ({ x, z }) {
    const quantos = CONFIG.boss.capangasPorVez
    for (let i = 0; i < quantos; i++) {
      const a = (i / quantos) * Math.PI * 2
      const p = new THREE.Vector3(x + Math.cos(a) * 6, 0, z + Math.sin(a) * 6)
      this.arena.limitar(p)
      const c = this.selvagens.criar('gigante', p)
      c.time = 'B'
    }
  }

  // ---------------- limpeza ----------------
  destruir () {
    window.removeEventListener('resize', this._onResize)
    for (const off of this._offs) off()
    if (this.indicadores) this.indicadores.destruir()
    for (const u of this.unidades) u.destruir()
    for (const p of this.projeteis) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose() }
    for (const a of this.areas) { this.scene.remove(a.mesh); a.mesh.geometry.dispose(); a.mesh.material.dispose() }
    this.unidades = []; this.projeteis = []; this.areas = []; this.bots = []
    this.scene.traverse(o => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of mats) { if (m.map) m.map.dispose(); m.dispose() }
      }
    })
    this.renderer.dispose()
  }
}

export { COR_TIME, _v }
