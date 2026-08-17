// ============================================================
//  INDICADORES NO CHÃO — leitura rápida do que está rolando
//   · anel de alcance do ataque básico
//   · marcador no alvo atual
//   · marcador da mira (mouse)
//   · seta apontando pro objetivo quando você carrega tinta
// ============================================================
import * as THREE from 'three'

export class Indicadores {
  constructor (match) {
    this.match = match
    this.grupo = new THREE.Group()
    match.scene.add(this.grupo)

    this.alcance = this._anel(0.98, 1.02, 0xfacc15, 0.28)
    this.alvo = this._anel(0.72, 0.95, 0xff3b6b, 0.85)
    this.mira = this._anel(0.24, 0.34, 0xffffff, 0.5)
    this.marcacao = this._anel(0.9, 1.25, 0x22c55e, 0.9)

    // seta do objetivo (fica na frente do jogador)
    this.seta = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.0, 3),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.8, depthWrite: false })
    )
    this.seta.visible = false
    this._up = new THREE.Vector3(0, 1, 0)
    this.grupo.add(this.seta)
  }

  _anel (ri, ro, cor, opacidade) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(ri, ro, 32),
      new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: opacidade, depthWrite: false, side: THREE.DoubleSide })
    )
    m.rotation.x = -Math.PI / 2
    m.visible = false
    this.grupo.add(m)
    return m
  }

  atualizar (dt) {
    const m = this.match
    const p = m.jogador
    const t = m.tempo

    // alcance do ataque básico
    this.alcance.visible = !p.morto
    if (!p.morto) {
      this.alcance.position.set(p.pos.x, 0.07, p.pos.z)
      this.alcance.scale.setScalar(p.alcance)
    }

    // alvo atual
    const alvo = m.alvoAtual
    this.alvo.visible = !!alvo && !p.morto
    if (alvo) {
      this.alvo.position.set(alvo.pos.x, 0.09, alvo.pos.z)
      const pulso = 1 + Math.sin(t * 9) * 0.08
      this.alvo.scale.setScalar((alvo.ehSelvagem ? 1.2 : 1) * pulso)
    }

    // mira
    const mira = m.miraAtual
    this.mira.visible = !!mira && !p.morto && !m.input.touch
    if (mira) this.mira.position.set(mira.x, 0.08, mira.z)

    // progresso da marcação embaixo dos pés
    if (p.canalizando) {
      const c = p.canalizando
      const k = 1 - c.restante / c.total
      this.marcacao.visible = true
      this.marcacao.position.set(p.pos.x, 0.12, p.pos.z)
      this.marcacao.scale.setScalar(1 + k * 1.6)
      this.marcacao.material.opacity = 0.9 - k * 0.4
    } else if (p.recall) {
      const k = 1 - p.recall.restante / p.recall.total
      this.marcacao.visible = true
      this.marcacao.position.set(p.pos.x, 0.12, p.pos.z)
      this.marcacao.scale.setScalar(2.6 - k * 1.6)
      this.marcacao.material.opacity = 0.8
    } else {
      this.marcacao.visible = false
    }

    // seta pro objetivo (só quando vale a pena ir marcar)
    const baldoes = m.arena.baldoesAtacaveis(p.time)
    if (!p.morto && p.tinta > 0 && baldoes.length) {
      const b = baldoes.reduce((a, c) => p.pos.distanceTo(c.pos) < p.pos.distanceTo(a.pos) ? c : a)
      const dir = new THREE.Vector3().subVectors(b.pos, p.pos).setY(0)
      const dist = dir.length()
      dir.normalize()
      this.seta.visible = dist > 5
      this.seta.position.set(p.pos.x + dir.x * 2.6, 0.35 + Math.sin(t * 4) * 0.1, p.pos.z + dir.z * 2.6)
      this.seta.quaternion.setFromUnitVectors(this._up, dir)   // cone deitado apontando pro baldão
    } else {
      this.seta.visible = false
    }
  }

  destruir () {
    this.match.scene.remove(this.grupo)
    this.grupo.traverse(o => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) o.material.dispose()
    })
  }
}
