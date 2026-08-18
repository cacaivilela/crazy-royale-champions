// ============================================================
//  SAGUÃO — a pracinha do lobby online
//  Enquanto a sala enche, cada um anda com o seu campeão numa
//  praça 3D e vê os outros jogadores andando junto (posição
//  sincronizada pela mesma rede da sala).
//  Cena leve e própria: nada de arena, IA ou combate aqui.
// ============================================================
import * as THREE from 'three'
import { CONFIG, CHAMPIONS, getChampion } from '../data/runtime.js'
import { construirForma } from './shapes.js'
import { CameraJogo } from './camera.js'

const RAIO = 18                 // raio da praça (limite de caminhada)
const GRAVIDADE = 26
const IMPULSO_PULO = 9
const ENVIO_POR_SEG = 12        // taxa de envio da pose pra rede

function textura (desenhar, w = 256, h = 128) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  desenhar(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const texturaEmoji = (emoji) => textura((ctx, w, h) => {
  ctx.font = '96px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, w / 2, h / 2 + 6)
}, 128, 128)

const texturaNome = (nome, cor) => textura((ctx, w, h) => {
  ctx.font = 'bold 44px "Trebuchet MS", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 8
  ctx.strokeStyle = 'rgba(0,0,0,.75)'
  ctx.strokeText(nome, w / 2, h / 2)
  ctx.fillStyle = cor
  ctx.fillText(nome, w / 2, h / 2)
}, 256, 64)

// ------------------------------------------------------------
//  Boneco: um campeão andando no saguão
// ------------------------------------------------------------
class Boneco {
  constructor (scene, { id, nome, champId, ehEu }) {
    this.scene = scene
    this.id = id
    this.nome = nome || 'Campeão'
    this.ehEu = !!ehEu
    this.champId = null

    this.pos = new THREE.Vector3()
    this.destino = new THREE.Vector3()      // alvo de interpolação (remotos)
    this.angulo = 0
    this.anguloAlvo = 0
    this.altura = 0                          // pulo
    this.vy = 0
    this.andando = false

    this.grupo = new THREE.Group()
    this.corpo = new THREE.Group()
    this.ui = new THREE.Group()
    this.grupo.add(this.corpo, this.ui)
    scene.add(this.grupo)

    const anel = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.1, 24),
      new THREE.MeshBasicMaterial({
        color: ehEu ? 0xfacc15 : 0x8b5cf6, transparent: true, opacity: 0.8, side: THREE.DoubleSide
      })
    )
    anel.rotation.x = -Math.PI / 2
    anel.position.y = 0.05
    this.grupo.add(anel)
    this.anel = anel

    this.placa = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texturaNome(this.nome + (ehEu ? ' (você)' : ''), ehEu ? '#facc15' : '#ffffff'),
      transparent: true, depthTest: false
    }))
    this.placa.scale.set(3.2, 0.8, 1)
    this.ui.add(this.placa)

    this.trocarChamp(champId)
  }

  trocarChamp (champId) {
    if (champId === this.champId) return
    const c = getChampion(champId) || CHAMPIONS[0]
    this.champId = c.id
    this.velocidade = (c.stats && c.stats.velocidade) || CONFIG.jogador.velocidadeBase

    if (this.modelo) { this.corpo.remove(this.modelo); descartar(this.modelo) }
    const { grupo, altura } = construirForma(c.forma, c.cor)
    grupo.traverse(o => { if (o.material) o.castShadow = true })
    this.corpo.add(grupo)
    this.modelo = grupo
    this.alturaModelo = altura

    if (this.emojiSprite) { this.ui.remove(this.emojiSprite); descartar(this.emojiSprite) }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaEmoji(c.emoji), transparent: true }))
    sp.scale.set(1, 1, 1)
    sp.position.y = 0.75
    this.ui.add(sp)
    this.emojiSprite = sp
    this.ui.position.y = altura + 0.6
  }

  definirNome (nome) {
    if (!nome || nome === this.nome) return
    this.nome = nome
    this.placa.material.map.dispose()
    this.placa.material.map = texturaNome(nome + (this.ehEu ? ' (você)' : ''), this.ehEu ? '#facc15' : '#ffffff')
  }

  /** Pose recebida pela rede (jogador remoto). */
  aplicarPose ({ x, z, a, y, m }) {
    this.destino.set(x, 0, z)
    this.anguloAlvo = a
    this.altura = y || 0
    this.andando = !!m
    if (this.pos.distanceToSquared(this.destino) > 400) this.pos.copy(this.destino)  // teleporte: reentrou
  }

  atualizar (dt, t, remoto) {
    if (remoto) this.pos.lerp(this.destino, Math.min(1, dt * 10))

    let d = this.anguloAlvo - this.angulo
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    this.angulo += d * Math.min(1, dt * 12)
    this.corpo.rotation.y = this.angulo

    this.grupo.position.set(this.pos.x, this.altura, this.pos.z)
    // balanço de caminhada / respiração parado
    this.corpo.position.y = this.andando ? Math.abs(Math.sin(t * 11)) * 0.15 : Math.sin(t * 2.2) * 0.04
    this.corpo.rotation.z = this.andando ? Math.sin(t * 11) * 0.07 : 0
    this.anel.material.opacity = this.ehEu ? 0.55 + Math.sin(t * 4) * 0.25 : 0.5
  }

  destruir () {
    this.scene.remove(this.grupo)
    descartar(this.grupo)
  }
}

function descartar (obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) { if (m.map) m.map.dispose(); m.dispose() }
    }
  })
}

// ------------------------------------------------------------
//  Saguão
// ------------------------------------------------------------
export class Saguao {
  /**
   * @param canvas   canvas próprio do saguão (fica atrás do painel do lobby)
   * @param input    Input global (teclado); o toque é lido no próprio canvas
   * @param aoPose   callback(pose) — manda a minha posição pra rede
   */
  constructor ({ canvas, input, aoPose }) {
    this.canvas = canvas
    this.input = input
    this.aoPose = aoPose || (() => {})
    this.bonecos = new Map()
    this.ativo = false
    this.meuId = null
    this.tempo = 0
    this._acumEnvio = 0
    this._toque = { id: null, cx: 0, cy: 0, x: 0, y: 0 }
  }

  // ---------------- ciclo de vida ----------------
  iniciar ({ meuId, nome, champId, jogadores }) {
    if (this.ativo) { this.sincronizar(jogadores, meuId, champId, nome); return }
    this.ativo = true
    this.meuId = meuId || 'eu'
    this.tempo = 0
    this._montarCena()
    this.canvas.classList.remove('hidden')

    this.eu = this._boneco(this.meuId, nome || 'Você', champId, true)
    this.eu.pos.set(0, 0, 6)
    this.sincronizar(jogadores, this.meuId, champId, nome)

    this._ligarToque()
    this._onResize = () => this._redimensionar()
    window.addEventListener('resize', this._onResize)
    this._redimensionar()

    let anterior = performance.now()
    const frame = (agora) => {
      if (!this.ativo) return
      this._raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (agora - anterior) / 1000)
      anterior = agora
      this._passo(dt)
    }
    this._raf = requestAnimationFrame(frame)
  }

  parar () {
    if (!this.ativo) return
    this.ativo = false
    cancelAnimationFrame(this._raf)
    window.removeEventListener('resize', this._onResize)
    this._desligarToque()
    for (const b of this.bonecos.values()) b.destruir()
    this.bonecos.clear()
    this.eu = null
    descartar(this.scene)
    this.renderer.dispose()
    this.scene = null
    this.renderer = null
    this.canvas.classList.add('hidden')
  }

  // ---------------- cena ----------------
  _montarCena () {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0x120f2e, 34, 66)

    this.scene.add(new THREE.HemisphereLight(0xc4b5fd, 0x241f4d, 1.2))
    const sol = new THREE.DirectionalLight(0xffffff, 1.35)
    sol.position.set(16, 34, 14)
    sol.castShadow = true
    sol.shadow.mapSize.set(1024, 1024)
    sol.shadow.camera.left = -26; sol.shadow.camera.right = 26
    sol.shadow.camera.top = 26; sol.shadow.camera.bottom = -26
    sol.shadow.camera.far = 90
    this.scene.add(sol)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25))

    // piso da praça
    const piso = new THREE.Mesh(
      new THREE.CircleGeometry(RAIO + 1.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x2a2358, roughness: 0.95 })
    )
    piso.rotation.x = -Math.PI / 2
    piso.receiveShadow = true
    this.scene.add(piso)

    const miolo = new THREE.Mesh(
      new THREE.CircleGeometry(6.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x3b2f7a, roughness: 0.9 })
    )
    miolo.rotation.x = -Math.PI / 2
    miolo.position.y = 0.02
    this.scene.add(miolo)

    for (const [r, cor] of [[6.6, 0xfacc15], [RAIO, 0x38bdf8]]) {
      const anel = new THREE.Mesh(
        new THREE.RingGeometry(r, r + 0.35, 80),
        new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      )
      anel.rotation.x = -Math.PI / 2
      anel.position.y = 0.04
      this.scene.add(anel)
    }

    // muretinha em volta + postes coloridos
    const muro = new THREE.Mesh(
      new THREE.CylinderGeometry(RAIO + 1.6, RAIO + 1.6, 1.6, 64, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x4c3ba8, roughness: 0.8, side: THREE.DoubleSide })
    )
    muro.position.y = 0.8
    this.scene.add(muro)

    const cores = [0xf43f5e, 0x38bdf8, 0xfacc15, 0x22c55e, 0xfb923c, 0xdb2777]
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2
      const poste = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 3.2, 10),
        new THREE.MeshStandardMaterial({ color: 0x1f1a45, roughness: 0.7 })
      )
      poste.position.set(Math.cos(ang) * (RAIO + 0.6), 1.6, Math.sin(ang) * (RAIO + 0.6))
      poste.castShadow = true
      this.scene.add(poste)
      const luz = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 12),
        new THREE.MeshBasicMaterial({ color: cores[i % cores.length] })
      )
      luz.position.set(poste.position.x, 3.4, poste.position.z)
      this.scene.add(luz)
    }

    // baldões de enfeite (a marca da casa)
    for (const [x, z, cor] of [[-9, -7, 0x38bdf8], [9, -7, 0xf43f5e], [0, 11, 0xfacc15]]) {
      const balde = new THREE.Group()
      const corpo = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 0.85, 2, 20),
        new THREE.MeshStandardMaterial({ color: cor, roughness: 0.5, metalness: 0.15 })
      )
      corpo.position.y = 1
      corpo.castShadow = true
      const tinta = new THREE.Mesh(
        new THREE.CircleGeometry(1.05, 20),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
      )
      tinta.rotation.x = -Math.PI / 2
      tinta.position.y = 1.95
      balde.add(corpo, tinta)
      balde.position.set(x, 0, z)
      this.scene.add(balde)
    }

    this.camera = new CameraJogo(this.canvas, 1, 1.05)
    this.camera.alvo.set(0, 0, 6)
  }

  /** Chamado quando o painel do lobby encolhe/cresce. */
  redimensionar () { this._redimensionar() }

  _redimensionar () {
    if (!this.renderer) return
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.redimensionar()
  }

  // ---------------- jogadores ----------------
  _boneco (id, nome, champId, ehEu = false) {
    const b = new Boneco(this.scene, { id, nome, champId, ehEu })
    this.bonecos.set(id, b)
    return b
  }

  /** Acerta a lista de bonecos com o roster da sala. */
  sincronizar (jogadores, meuId = this.meuId, meuChamp = null, meuNome = null) {
    if (!this.ativo) return
    this.meuId = meuId || this.meuId
    const lista = jogadores || []
    const vivos = new Set()

    lista.forEach((j, i) => {
      vivos.add(j.id)
      let b = this.bonecos.get(j.id)
      if (!b) {
        b = this._boneco(j.id, j.nome, j.champId, j.id === this.meuId)
        const ang = (i / Math.max(1, lista.length)) * Math.PI * 2
        b.pos.set(Math.cos(ang) * 5, 0, Math.sin(ang) * 5 + 4)
        b.destino.copy(b.pos)
      }
      b.trocarChamp(j.champId)
      b.definirNome(j.nome)
    })

    // quem saiu da sala some do saguão (o meu boneco fica sempre)
    for (const [id, b] of this.bonecos) {
      if (vivos.has(id) || id === this.meuId) continue
      b.destruir()
      this.bonecos.delete(id)
    }

    if (this.eu) {
      if (meuChamp) this.eu.trocarChamp(meuChamp)
      if (meuNome) this.eu.definirNome(meuNome)
      // o meu id só é conhecido depois de conectar: reancora o boneco
      if (this.meuId && !this.bonecos.has(this.meuId)) {
        for (const [id, b] of this.bonecos) if (b === this.eu) this.bonecos.delete(id)
        this.eu.id = this.meuId
        this.bonecos.set(this.meuId, this.eu)
      }
    }
  }

  definirCampeao (champId) { if (this.eu) this.eu.trocarChamp(champId) }

  /** Pose de outro jogador chegando pela rede. */
  aplicarPose (id, pose) {
    if (!this.ativo || !id || id === this.meuId) return
    const b = this.bonecos.get(id)
    if (b) b.aplicarPose(pose)
  }

  // ---------------- toque (arrastar pra andar) ----------------
  _ligarToque () {
    const t = this._toque
    this._pd = (e) => {
      t.id = e.pointerId; t.cx = e.clientX; t.cy = e.clientY; t.x = 0; t.y = 0
      this.canvas.setPointerCapture(e.pointerId)
    }
    this._pm = (e) => {
      if (t.id !== e.pointerId) return
      const max = 55
      let dx = (e.clientX - t.cx) / max
      let dy = (e.clientY - t.cy) / max
      const l = Math.hypot(dx, dy)
      if (l > 1) { dx /= l; dy /= l }
      t.x = dx; t.y = dy
    }
    this._pu = (e) => {
      if (t.id !== e.pointerId) return
      t.id = null; t.x = 0; t.y = 0
    }
    this.canvas.addEventListener('pointerdown', this._pd)
    this.canvas.addEventListener('pointermove', this._pm)
    this.canvas.addEventListener('pointerup', this._pu)
    this.canvas.addEventListener('pointercancel', this._pu)
  }

  _desligarToque () {
    this.canvas.removeEventListener('pointerdown', this._pd)
    this.canvas.removeEventListener('pointermove', this._pm)
    this.canvas.removeEventListener('pointerup', this._pu)
    this.canvas.removeEventListener('pointercancel', this._pu)
    this._toque.id = null; this._toque.x = 0; this._toque.y = 0
  }

  _direcao () {
    let x = this._toque.x, y = this._toque.y
    const digitando = document.activeElement &&
      ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
    if (this.input && !digitando) {
      if (this.input.down('KeyA') || this.input.down('ArrowLeft')) x -= 1
      if (this.input.down('KeyD') || this.input.down('ArrowRight')) x += 1
      if (this.input.down('KeyW') || this.input.down('ArrowUp')) y -= 1
      if (this.input.down('KeyS') || this.input.down('ArrowDown')) y += 1
    }
    const l = Math.hypot(x, y)
    if (l > 1) { x /= l; y /= l }
    return { x, y, len: Math.min(1, l), digitando }
  }

  // ---------------- frame ----------------
  _passo (dt) {
    this.tempo += dt
    const eu = this.eu
    const { x, y, len, digitando } = this._direcao()

    if (eu) {
      const correndo = !digitando && this.input &&
        (this.input.down('ShiftLeft') || this.input.down('ShiftRight'))
      if (len > 0.05) {
        const v = eu.velocidade * (correndo ? 1.55 : 1) * len
        eu.pos.x += x * v * dt
        eu.pos.z += y * v * dt
        eu.anguloAlvo = Math.atan2(x, y)
        eu.andando = true
      } else {
        eu.andando = false
      }
      // pulo (espaço) — só de zoeira mesmo
      if (!digitando && this.input && this.input.down('Space') && eu.altura <= 0) eu.vy = IMPULSO_PULO
      if (eu.vy !== 0 || eu.altura > 0) {
        eu.vy -= GRAVIDADE * dt
        eu.altura += eu.vy * dt
        if (eu.altura <= 0) { eu.altura = 0; eu.vy = 0 }
      }
      // não deixa sair da praça
      const d = Math.hypot(eu.pos.x, eu.pos.z)
      if (d > RAIO) { eu.pos.x = (eu.pos.x / d) * RAIO; eu.pos.z = (eu.pos.z / d) * RAIO }
      this.camera.seguir(eu.pos, dt)
      this._enviar(dt)
    }

    for (const b of this.bonecos.values()) b.atualizar(dt, this.tempo, b !== eu)
    this.renderer.render(this.scene, this.camera.cam)
  }

  _enviar (dt) {
    this._acumEnvio += dt
    const intervalo = this.eu.andando || this.eu.altura > 0 ? 1 / ENVIO_POR_SEG : 0.5
    if (this._acumEnvio < intervalo) return
    this._acumEnvio = 0
    this.aoPose({
      x: +this.eu.pos.x.toFixed(2), z: +this.eu.pos.z.toFixed(2),
      a: +this.eu.anguloAlvo.toFixed(2), y: +this.eu.altura.toFixed(2),
      m: this.eu.andando ? 1 : 0
    })
  }
}
