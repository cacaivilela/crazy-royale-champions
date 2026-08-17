// ============================================================
//  EFEITOS VISUAIS — números de dano, explosões de tinta, anéis
//  Tudo com pool de objetos (nada de alocar por frame).
// ============================================================
import * as THREE from 'three'

class PoolNumeros {
  constructor (scene, tamanho = 26) {
    this.scene = scene
    this.itens = []
    for (let i = 0; i < tamanho; i++) {
      const canvas = document.createElement('canvas')
      canvas.width = 128; canvas.height = 64
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
      sp.visible = false
      sp.scale.set(1.6, 0.8, 1)
      sp.renderOrder = 10
      scene.add(sp)
      this.itens.push({ sp, canvas, tex, vivo: 0 })
    }
    this.i = 0
  }

  emitir (pos, texto, cor = 0xffffff) {
    const it = this.itens[this.i = (this.i + 1) % this.itens.length]
    const ctx = it.canvas.getContext('2d')
    ctx.clearRect(0, 0, 128, 64)
    ctx.font = 'bold 46px Trebuchet MS, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.lineWidth = 7; ctx.strokeStyle = '#000'
    ctx.strokeText(texto, 64, 32)
    ctx.fillStyle = '#' + cor.toString(16).padStart(6, '0')
    ctx.fillText(texto, 64, 32)
    it.tex.needsUpdate = true
    it.sp.position.set(pos.x + (Math.random() - 0.5), pos.y + 2.4, pos.z + (Math.random() - 0.5))
    it.sp.material.opacity = 1
    it.sp.visible = true
    it.vivo = 0.9
  }

  atualizar (dt) {
    for (const it of this.itens) {
      if (it.vivo <= 0) continue
      it.vivo -= dt
      it.sp.position.y += dt * 2.2
      it.sp.material.opacity = Math.max(0, it.vivo / 0.9)
      if (it.vivo <= 0) it.sp.visible = false
    }
  }
}

export class EfeitosVisuais {
  constructor (scene) {
    this.scene = scene
    this.numeros = new PoolNumeros(scene)
    this.aneis = []
    this.splats = []
    this.geoAnel = new THREE.RingGeometry(0.6, 1, 24)
    this.geoSplat = new THREE.CircleGeometry(1, 10)
  }

  numero (pos, valor, cor) { this.numeros.emitir(pos, String(valor), cor) }
  texto (pos, txt, cor = 0xfacc15) { this.numeros.emitir(pos, txt, cor) }

  _anel (pos, cor, raioFinal, dur, y = 0.2) {
    const m = new THREE.Mesh(this.geoAnel, new THREE.MeshBasicMaterial({
      color: cor, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false
    }))
    m.rotation.x = -Math.PI / 2
    m.position.set(pos.x, y, pos.z)
    this.scene.add(m)
    this.aneis.push({ m, t: 0, dur, raioFinal })
    return m
  }

  explosao (pos, cor = 0xffffff) { this._anel(pos, cor, 3.4, 0.45); this.splat(pos, cor, 1.6) }
  anelUp (pos) { this._anel(pos, 0xfacc15, 2.4, 0.7) }
  onda (pos, raio, cor) { this._anel(pos, cor, raio, 0.5) }

  splat (pos, cor, raio = 1) {
    const m = new THREE.Mesh(this.geoSplat, new THREE.MeshBasicMaterial({
      color: cor, transparent: true, opacity: 0.45, depthWrite: false
    }))
    m.rotation.x = -Math.PI / 2
    m.rotation.z = Math.random() * 6.28
    m.position.set(pos.x, 0.05 + Math.random() * 0.01, pos.z)
    m.scale.setScalar(raio * (0.7 + Math.random() * 0.6))
    this.scene.add(m)
    this.splats.push({ m, t: 0 })
    if (this.splats.length > 60) {
      const velho = this.splats.shift()
      this.scene.remove(velho.m); velho.m.material.dispose()
    }
  }

  atualizar (dt) {
    this.numeros.atualizar(dt)
    for (let i = this.aneis.length - 1; i >= 0; i--) {
      const a = this.aneis[i]
      a.t += dt
      const k = a.t / a.dur
      a.m.scale.setScalar(0.3 + k * a.raioFinal)
      a.m.material.opacity = Math.max(0, 0.9 * (1 - k))
      if (k >= 1) {
        this.scene.remove(a.m); a.m.material.dispose()
        this.aneis.splice(i, 1)
      }
    }
    for (const s of this.splats) {
      if (s.m.material.opacity > 0.16) s.m.material.opacity -= dt * 0.02
    }
  }
}
