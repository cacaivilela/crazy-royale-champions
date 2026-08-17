// ============================================================
//  CÂMERA — visão isométrica que segue o campeão (estilo MOBA)
// ============================================================
import * as THREE from 'three'
import { CONFIG } from '../data/runtime.js'

export class CameraJogo {
  constructor (canvas, lado = 1, zoom = 1) {
    this.canvas = canvas
    this.lado = lado
    this.zoom = zoom                 // 1 = time A (olha pra -Z), -1 = time B
    this.cam = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.5, 400)
    this.alvo = new THREE.Vector3()
    this.plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    this.ray = new THREE.Raycaster()
    this._tmp = new THREE.Vector3()
    this.shake = 0
    this.redimensionar()
  }

  redimensionar () {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.cam.aspect = w / h
    this.cam.fov = CONFIG.camera.fov
    this.cam.updateProjectionMatrix()
  }

  seguir (pos, dt) {
    const c = CONFIG.camera
    this.alvo.lerp(pos, Math.min(1, dt * c.suavizacao))
    const tremor = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0
    this.cam.position.set(
      this.alvo.x + tremor,
      c.altura * this.zoom + tremor,
      this.alvo.z + c.distancia * this.zoom * this.lado
    )
    this.cam.lookAt(this.alvo.x, 0, this.alvo.z - 3 * this.lado)
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2)
  }

  sacudir (forca = 0.5) { this.shake = Math.max(this.shake, forca) }

  /** Converte a posição do mouse (NDC) num ponto no chão (y=0). */
  pontoNoChao (ndc) {
    this.ray.setFromCamera({ x: ndc.x, y: ndc.y }, this.cam)
    const p = this.ray.ray.intersectPlane(this.plano, this._tmp)
    return p ? p.clone() : null
  }
}
