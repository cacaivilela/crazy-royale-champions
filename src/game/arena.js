// ============================================================
//  ARENA — campo estilo MOBA (2 lanes + selva + baldões)
//  Eixos: X = largura, Z = comprimento. Time A defende +Z, time B -Z.
//  Tudo procedural: zero assets externos.
// ============================================================
import * as THREE from 'three'
import { CONFIG } from '../data/runtime.js'

export const COR_TIME = { A: 0x38bdf8, B: 0xf43f5e }

export class Arena {
  constructor (scene, escala = 1, semBaldoes = false) {
    this.scene = scene
    this.escala = escala
    this.grupo = new THREE.Group()
    scene.add(this.grupo)

    const largura = CONFIG.arena.largura * escala
    const comprimento = CONFIG.arena.comprimento * escala
    this.largura = largura
    this.comprimento = comprimento
    this.meiaL = largura / 2
    this.meiaC = comprimento / 2

    this.baldoes = []       // "gols" — onde se despeja a tinta
    this.arbustos = []      // mato alto: esconde quem entra
    this.pontosSelva = []   // spots de criaturas neutras
    this.bases = {}
    this.semBaldoes = semBaldoes
    this.raioBase = CONFIG.arena.raioBase * escala

    this._chao()
    this._faixas()
    this._basesEBaldoes()
    this._selva()
    this._cenario()
  }

  // ---------- chão ----------
  _chao () {
    const geo = new THREE.PlaneGeometry(this.largura + 16, this.comprimento + 16, 1, 1)
    const mat = new THREE.MeshStandardMaterial({ color: 0x1b1a3a, roughness: 0.95 })
    const chao = new THREE.Mesh(geo, mat)
    chao.rotation.x = -Math.PI / 2
    chao.receiveShadow = true
    this.grupo.add(chao)

    // campo jogável (mais claro)
    const campo = new THREE.Mesh(
      new THREE.PlaneGeometry(this.largura, this.comprimento),
      new THREE.MeshStandardMaterial({ color: 0x2a2760, roughness: 0.9 })
    )
    campo.rotation.x = -Math.PI / 2
    campo.position.y = 0.01
    campo.receiveShadow = true
    this.grupo.add(campo)

    // linha central
    const linha = new THREE.Mesh(
      new THREE.PlaneGeometry(this.largura, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })
    )
    linha.rotation.x = -Math.PI / 2
    linha.position.y = 0.03
    this.grupo.add(linha)

    // paredes invisíveis (visual): borda neon
    const borda = new THREE.Mesh(
      new THREE.RingGeometry(0, 1, 4),
      new THREE.MeshBasicMaterial({ visible: false })
    )
    this.grupo.add(borda)
    const cerca = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(this.largura, 3, this.comprimento)),
      new THREE.LineBasicMaterial({ color: 0x7c3aed })
    )
    cerca.position.y = 1.5
    this.grupo.add(cerca)
  }

  // ---------- lanes ----------
  _faixas () {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a3480, roughness: 0.8 })
    for (const x of [-this.meiaL * 0.6, this.meiaL * 0.6]) {
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(12, this.comprimento - 6), mat)
      lane.rotation.x = -Math.PI / 2
      lane.position.set(x, 0.02, 0)
      lane.receiveShadow = true
      this.grupo.add(lane)
    }
  }

  // ---------- bases e baldões ----------
  _basesEBaldoes () {
    const meia = this.meiaC
    const laneX = this.meiaL * 0.6

    this.bases.A = new THREE.Vector3(0, 0, meia - 4)
    this.bases.B = new THREE.Vector3(0, 0, -meia + 4)

    const criarBaldao = (id, time, x, z, capacidade, ordem) => {
      const cor = COR_TIME[time]
      const g = new THREE.Group()
      g.position.set(x, 0, z)

      const anel = new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.35, 10, 34),
        new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.5, roughness: 0.4 })
      )
      anel.rotation.x = -Math.PI / 2
      anel.position.y = 0.4
      g.add(anel)

      const disco = new THREE.Mesh(
        new THREE.CircleGeometry(3.2, 30),
        new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.18 })
      )
      disco.rotation.x = -Math.PI / 2
      disco.position.y = 0.05
      g.add(disco)

      const balde = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 0.8, 1.8, 14),
        new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5, metalness: 0.2 })
      )
      balde.position.y = 0.9
      balde.castShadow = true
      g.add(balde)

      // placa com o progresso do baldão
      const canvas = document.createElement('canvas')
      canvas.width = 256; canvas.height = 64
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      const placa = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
      placa.scale.set(3.4, 0.85, 1)
      placa.position.y = 2.8
      placa.renderOrder = 5
      g.add(placa)

      this.grupo.add(g)
      const baldao = {
        id, time, ordem, capacidade, acumulado: 0, quebrado: false,
        pos: new THREE.Vector3(x, 0, z), raio: 3.2, grupo: g, anel, disco, balde,
        placa, placaCanvas: canvas, placaTex: tex
      }
      this.baldoes.push(baldao)
      this.atualizarVisualBaldao(baldao)
      return baldao
    }

    // 2 baldões de lane + 1 na base, para cada time
    // estádio maior = baldão mais gordo (senão a partida acaba rápido demais)
    const capLane = Math.round(CONFIG.arena.capacidadeLane * this.escala)
    const capBase = Math.round(CONFIG.arena.capacidadeBase * this.escala)
    if (this.semBaldoes) {
      // modo boss: não tem gol, o objetivo é derrubar o bicho
      for (const time of ['A', 'B']) {
        const p = this.bases[time]
        const plat = new THREE.Mesh(
          new THREE.CylinderGeometry(this.raioBase, this.raioBase, 0.3, 26),
          new THREE.MeshStandardMaterial({ color: COR_TIME[time], transparent: true, opacity: 0.35 })
        )
        plat.position.set(p.x, 0.06, p.z)
        this.grupo.add(plat)
      }
      return
    }
    criarBaldao('A-top', 'A', -laneX, meia * 0.62, capLane, 0)
    criarBaldao('A-bot', 'A', laneX, meia * 0.62, capLane, 0)
    criarBaldao('A-base', 'A', 0, meia - 5, capBase, 1)
    criarBaldao('B-top', 'B', -laneX, -meia * 0.62, capLane, 0)
    criarBaldao('B-bot', 'B', laneX, -meia * 0.62, capLane, 0)
    criarBaldao('B-base', 'B', 0, -meia + 5, capBase, 1)

    // plataformas de spawn
    for (const time of ['A', 'B']) {
      const p = this.bases[time]
      const plat = new THREE.Mesh(
        new THREE.CylinderGeometry(this.raioBase, this.raioBase, 0.3, 26),
        new THREE.MeshStandardMaterial({ color: COR_TIME[time], transparent: true, opacity: 0.35 })
      )
      plat.position.set(p.x, 0.06, p.z)
      this.grupo.add(plat)
    }
  }

  // ---------- selva ----------
  _selva () {
    const spots = [
      { x: -this.meiaL * 0.22, z: -this.meiaC * 0.28, tipo: 'tinteiro' },
      { x: this.meiaL * 0.22, z: -this.meiaC * 0.28, tipo: 'tinteiro' },
      { x: -this.meiaL * 0.22, z: this.meiaC * 0.28, tipo: 'tinteiro' },
      { x: this.meiaL * 0.22, z: this.meiaC * 0.28, tipo: 'tinteiro' },
      { x: -this.meiaL * 0.78, z: 0, tipo: 'gigante' },
      { x: this.meiaL * 0.78, z: 0, tipo: 'gigante' }
    ]
    for (const s of spots) this.pontosSelva.push(new THREE.Vector3(s.x, 0, s.z))
    this.pontoChefao = new THREE.Vector3(0, 0, 0)
    this.tiposSelva = spots.map(s => s.tipo)

    // arbustos (esconderijo)
    const matMato = new THREE.MeshStandardMaterial({ color: 0x1f7a3d, roughness: 1, transparent: true, opacity: 0.75 })
    const posMato = [
      [-this.meiaL * 0.35, this.meiaC * 0.45], [this.meiaL * 0.35, this.meiaC * 0.45],
      [-this.meiaL * 0.35, -this.meiaC * 0.45], [this.meiaL * 0.35, -this.meiaC * 0.45],
      [-this.meiaL * 0.72, this.meiaC * 0.18], [this.meiaL * 0.72, -this.meiaC * 0.18]
    ]
    for (const [x, z] of posMato) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 1.6, 12), matMato)
      m.position.set(x, 0.8, z)
      this.grupo.add(m)
      this.arbustos.push({ pos: new THREE.Vector3(x, 0, z), raio: 3.4 })
    }
  }

  // ---------- decoração ----------
  _cenario () {
    const cores = [0xdb2777, 0xfacc15, 0x38bdf8, 0x22c55e, 0xfb923c]
    for (let i = 0; i < Math.round(40 * this.escala * this.escala); i++) {
      const r = 0.5 + Math.random() * 1.4
      const splat = new THREE.Mesh(
        new THREE.CircleGeometry(r, 8),
        new THREE.MeshBasicMaterial({ color: cores[i % cores.length], transparent: true, opacity: 0.22 })
      )
      splat.rotation.x = -Math.PI / 2
      splat.position.set((Math.random() - 0.5) * this.largura, 0.04, (Math.random() - 0.5) * this.comprimento)
      this.grupo.add(splat)
    }
    // obstáculos (paredes de lata) — só visual/colisão simples
    this.obstaculos = []
    const matBox = new THREE.MeshStandardMaterial({ color: 0x555079, roughness: 0.8 })
    const boxes = [
      [-this.meiaL * 0.45, this.meiaC * 0.15, 3, 6], [this.meiaL * 0.45, -this.meiaC * 0.15, 3, 6],
      [0, this.meiaC * 0.33, 8, 2], [0, -this.meiaC * 0.33, 8, 2]
    ]
    for (const [x, z, w, d] of boxes) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), matBox)
      m.position.set(x, 1.1, z)
      m.castShadow = true; m.receiveShadow = true
      this.grupo.add(m)
      this.obstaculos.push({ x, z, w, d })
    }
  }

  // ---------- helpers ----------
  limitar (pos) {
    const m = 1.2
    pos.x = Math.max(-this.meiaL + m, Math.min(this.meiaL - m, pos.x))
    pos.z = Math.max(-this.meiaC + m, Math.min(this.meiaC - m, pos.z))
    return pos
  }

  colidirObstaculos (pos, raio = 0.9) {
    for (const o of this.obstaculos) {
      const hw = o.w / 2 + raio, hd = o.d / 2 + raio
      const dx = pos.x - o.x, dz = pos.z - o.z
      if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
        // empurra pelo eixo de menor penetração
        if (hw - Math.abs(dx) < hd - Math.abs(dz)) pos.x = o.x + Math.sign(dx || 1) * hw
        else pos.z = o.z + Math.sign(dz || 1) * hd
      }
    }
    return pos
  }

  noArbusto (pos) {
    return this.arbustos.some(a => a.pos.distanceTo(pos) < a.raio)
  }

  baseDe (time) { return this.bases[time] }

  /** Baldões inimigos que ainda podem receber tinta. */
  baldoesAtacaveis (time) {
    const inimigos = this.baldoes.filter(b => b.time !== time && !b.quebrado)
    const laneVivas = inimigos.filter(b => b.ordem === 0)
    return laneVivas.length ? laneVivas : inimigos
  }

  atualizarVisualBaldao (b) {
    const frac = Math.min(1, b.acumulado / b.capacidade)
    b.balde.scale.setScalar(1 + frac * 0.5)
    b.anel.material.emissiveIntensity = 0.5 + frac
    if (b.quebrado) { b.grupo.visible = false; return }

    // placa: barrinha + "acumulado / capacidade"
    const ctx = b.placaCanvas.getContext('2d')
    const cor = '#' + COR_TIME[b.time].toString(16).padStart(6, '0')
    ctx.clearRect(0, 0, 256, 64)
    ctx.fillStyle = 'rgba(5,4,15,.75)'
    ctx.beginPath(); ctx.roundRect(4, 4, 248, 56, 14); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,.16)'
    ctx.beginPath(); ctx.roundRect(16, 34, 224, 16, 8); ctx.fill()
    ctx.fillStyle = cor
    ctx.beginPath(); ctx.roundRect(16, 34, Math.max(6, 224 * frac), 16, 8); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 22px Trebuchet MS, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${b.ordem === 1 ? 'BALDÃO FINAL' : 'BALDÃO'} ${Math.round(b.acumulado)}/${b.capacidade}`, 128, 24)
    b.placaTex.needsUpdate = true
  }
}
