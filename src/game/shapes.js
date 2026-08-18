// ============================================================
//  FORMAS DOS CAMPEÕES — modelos procedurais (zero assets)
//  Cada campeão tem o formato do que ele é: banana é banana,
//  fantasma é fantasma, foguete é foguete…
//  Convenção: origem nos pés (y=0), altura ~2.4, largura ~1.4.
//  Retorna { grupo, altura } — `altura` posiciona a UI flutuante.
// ============================================================
import * as THREE from 'three'

const M = (cor, opts = {}) => new THREE.MeshStandardMaterial({
  color: cor, roughness: opts.rough ?? 0.55, metalness: opts.metal ?? 0.05,
  emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 0.4,
  transparent: !!opts.opacity, opacity: opts.opacity ?? 1, flatShading: !!opts.flat
})

const PRETO = 0x1b1b26
const BRANCO = 0xf7f7ff

function add (g, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.rotation.set(rx, ry, rz)
  m.castShadow = true
  g.add(m)
  return m
}

// olhinhos padrão (dois pontos brancos com pupila)
function olhos (g, y, z = 0.42, sep = 0.22, r = 0.11) {
  const branco = M(BRANCO, { rough: 0.3 })
  const preto = M(PRETO)
  for (const s of [-1, 1]) {
    add(g, new THREE.SphereGeometry(r, 10, 8), branco, s * sep, y, z)
    add(g, new THREE.SphereGeometry(r * 0.5, 8, 6), preto, s * sep, y, z + r * 0.6)
  }
}

function pernas (g, cor, y = 0.3, sep = 0.3, alt = 0.5) {
  const mat = M(cor, { rough: 0.7 })
  for (const s of [-1, 1]) {
    add(g, new THREE.CylinderGeometry(0.13, 0.13, alt, 8), mat, s * sep, y, 0)
    add(g, new THREE.SphereGeometry(0.19, 10, 8), mat, s * sep, y - alt / 2, 0.08)
  }
}

function bracos (g, cor, y = 1.2, sep = 0.55, comp = 0.55, angulo = 0.5) {
  const mat = M(cor, { rough: 0.7 })
  for (const s of [-1, 1]) {
    add(g, new THREE.CapsuleGeometry(0.12, comp, 4, 8), mat, s * sep, y, 0, 0, 0, s * angulo)
  }
}

// ------------------------------------------------------------
export const FORMAS = {
  // 🍌 banana curvada de verdade (tubo seguindo uma curva)
  banana (cor) {
    const g = new THREE.Group()
    const curva = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.15, 0.35, 0),
      new THREE.Vector3(0.95, 1.35, 0),
      new THREE.Vector3(-0.05, 2.35, 0)
    )
    const corpo = add(g, new THREE.TubeGeometry(curva, 24, 0.31, 12, false), M(cor, { rough: 0.5 }))
    corpo.castShadow = true
    add(g, new THREE.ConeGeometry(0.18, 0.3, 8), M(0x6b4b16), -0.06, 2.5, 0, 0, 0, -0.1)
    add(g, new THREE.ConeGeometry(0.16, 0.26, 8), M(0x6b4b16), -0.17, 0.24, 0, Math.PI, 0, 0.15)
    // carinha na barriga da banana
    olhos(g, 1.6, 0.3, 0.19, 0.12)
    add(g, new THREE.TorusGeometry(0.12, 0.03, 6, 12, Math.PI), M(PRETO), 0, 1.42, 0.3, 0, 0, Math.PI)
    bracos(g, cor, 1.3, 0.5, 0.4, 0.6)
    pernas(g, 0xf7d94c, 0.3, 0.24, 0.45)
    return { grupo: g, altura: 2.7 }
  },

  // 🛡️ tanque de lata com escudo
  lata (cor) {
    const g = new THREE.Group()
    add(g, new THREE.BoxGeometry(1.15, 1.25, 0.9), M(cor, { metal: 0.45, rough: 0.4 }), 0, 1.15)
    add(g, new THREE.CylinderGeometry(0.42, 0.42, 0.42, 10), M(cor, { metal: 0.5 }), 0, 2.0)
    olhos(g, 2.05, 0.4, 0.17, 0.1)
    add(g, new THREE.CylinderGeometry(0.62, 0.62, 0.14, 18), M(0xb0b6c4, { metal: 0.8, rough: 0.3 }),
      0.72, 1.25, 0.25, Math.PI / 2, 0, 0.2)
    bracos(g, cor, 1.3, 0.68, 0.5, 0.35)
    pernas(g, 0x3d3d4d, 0.32, 0.3, 0.5)
    return { grupo: g, altura: 2.45 }
  },

  // 🧙 bruxa: manto cônico + chapéu pontudo
  bruxa (cor) {
    const g = new THREE.Group()
    add(g, new THREE.ConeGeometry(0.72, 1.6, 12), M(cor, { rough: 0.8 }), 0, 0.8)
    add(g, new THREE.SphereGeometry(0.4, 14, 12), M(0xf3c8a0), 0, 1.85)
    olhos(g, 1.9, 0.33, 0.16, 0.09)
    add(g, new THREE.CylinderGeometry(0.62, 0.62, 0.07, 16), M(cor, { rough: 0.9 }), 0, 2.16)
    add(g, new THREE.ConeGeometry(0.42, 0.9, 14), M(cor, { rough: 0.9 }), 0, 2.6, 0, 0, 0, 0.12)
    add(g, new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), M(0x6b4b16), 0.62, 1.1, 0, 0, 0, 0.18)
    add(g, new THREE.IcosahedronGeometry(0.16, 0), M(0x7cf5ff, { emissive: 0x2ad1ff, ei: 1.4 }), 0.75, 1.85)
    return { grupo: g, altura: 3.1 }
  },

  // 🐱 gatinho com orelhas, focinho claro e rabo em pé
  gato (cor) {
    const g = new THREE.Group()
    const pelo = M(cor, { rough: 0.85 })
    const claro = M(0xf3ede4, { rough: 0.8 })
    add(g, new THREE.CapsuleGeometry(0.48, 0.6, 6, 14), pelo, 0, 1.05)
    const peito = add(g, new THREE.SphereGeometry(0.34, 12, 10), claro, 0, 1.0, 0.3)
    peito.scale.set(1, 1.25, 0.55)
    add(g, new THREE.SphereGeometry(0.48, 14, 12), pelo, 0, 1.9)
    for (const s2 of [-1, 1]) {
      add(g, new THREE.ConeGeometry(0.24, 0.5, 5), pelo, s2 * 0.28, 2.35, 0)
      add(g, new THREE.ConeGeometry(0.13, 0.3, 5), M(0xff9ec7), s2 * 0.28, 2.33, 0.05)
    }
    const focinho = add(g, new THREE.SphereGeometry(0.26, 12, 10), claro, 0, 1.78, 0.34)
    focinho.scale.set(1.2, 0.8, 0.7)
    olhos(g, 1.98, 0.42, 0.19, 0.13)
    add(g, new THREE.ConeGeometry(0.08, 0.1, 6), M(0xff9ec7), 0, 1.82, 0.55, Math.PI / 2)
    // bigodes
    for (const s2 of [-1, 1]) {
      for (const dy of [-0.06, 0.06]) {
        add(g, new THREE.CylinderGeometry(0.012, 0.012, 0.42, 4), claro,
          s2 * 0.34, 1.78 + dy, 0.4, 0, 0, Math.PI / 2 + s2 * 0.25)
      }
    }
    // rabo levantado
    add(g, new THREE.TorusGeometry(0.4, 0.1, 8, 16, Math.PI * 1.2), pelo,
      0, 1.2, -0.62, 0, 0, -Math.PI * 0.15)
    add(g, new THREE.SphereGeometry(0.11, 8, 6), claro, 0.05, 1.85, -0.75)
    pernas(g, cor, 0.28, 0.28, 0.45)
    return { grupo: g, altura: 2.7 }
  },

  // 🤖 robô caixa com antena
  robo (cor) {
    const g = new THREE.Group()
    add(g, new THREE.BoxGeometry(1.0, 1.15, 0.75), M(cor, { metal: 0.6, rough: 0.35 }), 0, 1.1)
    add(g, new THREE.BoxGeometry(0.8, 0.62, 0.68), M(cor, { metal: 0.6, rough: 0.3 }), 0, 2.0)
    add(g, new THREE.BoxGeometry(0.62, 0.2, 0.06), M(0x14e3ff, { emissive: 0x14e3ff, ei: 1.6 }), 0, 2.05, 0.36)
    add(g, new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), M(0x9aa7b0, { metal: 0.9 }), 0, 2.5)
    add(g, new THREE.SphereGeometry(0.11, 10, 8), M(0xff3b6b, { emissive: 0xff3b6b, ei: 1.5 }), 0, 2.72)
    for (const s of [-1, 1]) {
      add(g, new THREE.BoxGeometry(0.22, 0.7, 0.22), M(0x6b7480, { metal: 0.7 }), s * 0.62, 1.2)
      add(g, new THREE.BoxGeometry(0.28, 0.5, 0.3), M(0x4a5058, { metal: 0.7 }), s * 0.28, 0.3)
    }
    return { grupo: g, altura: 2.9 }
  },

  // 🦖 dinossauro: focinho, cauda grossa e espinhos nas costas
  dino (cor) {
    const g = new THREE.Group()
    const pele = M(cor, { rough: 0.85 })
    const barriga = M(0xd7f0a8, { rough: 0.85 })

    const tronco = add(g, new THREE.CapsuleGeometry(0.52, 0.6, 6, 14), pele, 0, 1.15, -0.1, Math.PI / 2.6)
    tronco.scale.set(1, 1, 1.25)
    const pancinha = add(g, new THREE.SphereGeometry(0.36, 12, 10), barriga, 0, 0.95, 0.34)
    pancinha.scale.set(1, 1.15, 0.6)

    // cabeça grandona pra frente
    const cabeca = add(g, new THREE.SphereGeometry(0.42, 14, 12), pele, 0, 1.95, 0.45)
    cabeca.scale.set(1, 0.95, 1.05)
    add(g, new THREE.BoxGeometry(0.46, 0.34, 0.62), pele, 0, 1.88, 0.85)
    add(g, new THREE.BoxGeometry(0.42, 0.08, 0.5), M(BRANCO), 0, 1.74, 0.92)   // dentes
    add(g, new THREE.SphereGeometry(0.07, 8, 6), M(PRETO), -0.12, 2.0, 1.12)
    add(g, new THREE.SphereGeometry(0.07, 8, 6), M(PRETO), 0.12, 2.0, 1.12)
    olhos(g, 2.15, 0.62, 0.2, 0.11)

    // cauda em três blocos
    for (let i = 0; i < 3; i++) {
      add(g, new THREE.SphereGeometry(0.34 - i * 0.09, 12, 10), pele, 0, 0.95 - i * 0.06, -0.75 - i * 0.42)
    }
    add(g, new THREE.ConeGeometry(0.16, 0.45, 8), pele, 0, 0.8, -2.0, -Math.PI / 2)

    // espinhos das costas até a cauda
    for (let i = 0; i < 6; i++) {
      add(g, new THREE.ConeGeometry(0.15 - i * 0.015, 0.34, 4), M(0xf7d94c),
        0, 1.65 - i * 0.13, 0.05 - i * 0.38, -0.25)
    }
    // bracinhos ridículos + patas grossas
    for (const s2 of [-1, 1]) {
      add(g, new THREE.CapsuleGeometry(0.08, 0.24, 4, 8), pele, s2 * 0.42, 1.35, 0.42, 0.6)
      add(g, new THREE.CapsuleGeometry(0.2, 0.35, 5, 10), pele, s2 * 0.34, 0.4, 0.05)
      add(g, new THREE.SphereGeometry(0.24, 10, 8), pele, s2 * 0.34, 0.18, 0.16)
    }
    return { grupo: g, altura: 2.6 }
  },

  // 👻 fantasma com barra flutuante e franjas
  fantasma (cor) {
    const g = new THREE.Group()
    const mat = M(cor, { rough: 0.3, opacity: 0.78, emissive: cor, ei: 0.25 })
    add(g, new THREE.SphereGeometry(0.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0, 1.7)
    add(g, new THREE.CylinderGeometry(0.6, 0.68, 1.0, 16), mat, 0, 1.2)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      add(g, new THREE.ConeGeometry(0.19, 0.42, 7), mat, Math.cos(a) * 0.5, 0.55, Math.sin(a) * 0.5, Math.PI)
    }
    olhos(g, 1.75, 0.55, 0.22, 0.13)
    add(g, new THREE.SphereGeometry(0.13, 10, 8), M(PRETO), 0, 1.5, 0.58)
    return { grupo: g, altura: 2.4 }
  },

  // 🍕 fatia de pizza em pé (recortada de verdade, com borda e calabresa)
  pizza (cor) {
    const g = new THREE.Group()
    const R = 1.45
    const a1 = Math.PI * 0.32, a2 = Math.PI * 0.68     // abertura da fatia

    const fatia = new THREE.Shape()
    fatia.moveTo(0, 0)
    fatia.lineTo(Math.cos(a1) * R, Math.sin(a1) * R)
    fatia.absarc(0, 0, R, a1, a2, false)
    fatia.lineTo(0, 0)
    const geo = new THREE.ExtrudeGeometry(fatia, { depth: 0.2, bevelEnabled: false })
    geo.translate(0, 0, -0.1)
    const massa = add(g, geo, M(cor, { rough: 0.85 }), 0, 0.55)   // ponta pra baixo
    massa.castShadow = true

    // borda (crosta) acompanhando o arco
    add(g, new THREE.TorusGeometry(R, 0.15, 8, 20, a2 - a1), M(0xd9a066, { rough: 0.9 }),
      0, 0.55, 0, 0, 0, a1)

    // calabresas
    const pepe = M(0xd62828, { rough: 0.7 })
    for (const [ang, rr] of [[0.42, 0.6], [0.5, 1.05], [0.58, 0.62], [0.46, 1.35], [0.55, 1.0]]) {
      const a = Math.PI * ang
      add(g, new THREE.CylinderGeometry(0.17, 0.17, 0.1, 12), pepe,
        Math.cos(a) * rr, 0.55 + Math.sin(a) * rr, 0.13, Math.PI / 2)
    }
    // queijo escorrendo
    add(g, new THREE.SphereGeometry(0.2, 10, 8), M(0xffe08a, { rough: 0.8 }), -0.45, 1.5, 0.12)
    add(g, new THREE.SphereGeometry(0.16, 10, 8), M(0xffe08a, { rough: 0.8 }), 0.5, 1.35, 0.12)

    olhos(g, 1.15, 0.16, 0.26, 0.13)
    add(g, new THREE.TorusGeometry(0.14, 0.035, 6, 12, Math.PI), M(PRETO), 0, 0.95, 0.16, 0, 0, Math.PI)
    bracos(g, 0xd9a066, 1.0, 0.85, 0.45, 0.7)
    pernas(g, 0xd9a066, 0.3, 0.28, 0.5)
    return { grupo: g, altura: 2.3 }
  },

  // 🦄 cavalinho com crina, chifre e quatro patas
  unicornio (cor) {
    const g = new THREE.Group()
    const pele = M(cor, { rough: 0.75 })
    const tronco = add(g, new THREE.CapsuleGeometry(0.4, 0.95, 6, 14), pele, 0, 1.15, -0.15, Math.PI / 2)
    tronco.scale.set(1, 1, 1.05)
    // pescoço + cabeça
    add(g, new THREE.CylinderGeometry(0.22, 0.28, 0.75, 10), pele, 0, 1.55, 0.35, -0.45)
    const cabeca = add(g, new THREE.SphereGeometry(0.3, 14, 12), pele, 0, 1.92, 0.62)
    cabeca.scale.set(1, 1.05, 1.1)
    add(g, new THREE.BoxGeometry(0.26, 0.24, 0.34), pele, 0, 1.84, 0.86)
    add(g, new THREE.SphereGeometry(0.06, 8, 6), M(PRETO), 0, 1.8, 1.02)
    for (const s2 of [-1, 1]) add(g, new THREE.ConeGeometry(0.09, 0.24, 5), pele, s2 * 0.17, 2.16, 0.55)
    olhos(g, 1.95, 0.84, 0.17, 0.085)
    // chifre + crina
    add(g, new THREE.ConeGeometry(0.1, 0.55, 8), M(0xffd700, { metal: 0.6, emissive: 0xffd700, ei: 0.5 }),
      0, 2.32, 0.6, -0.25)
    const crina = M(0x9b5de5, { rough: 0.8 })
    for (let i = 0; i < 4; i++) {
      add(g, new THREE.SphereGeometry(0.17, 10, 8), crina, 0, 2.05 - i * 0.2, 0.42 - i * 0.16)
    }
    // rabo
    add(g, new THREE.ConeGeometry(0.17, 0.75, 8), crina, 0, 1.25, -0.72, -Math.PI / 2.4)
    // quatro patas
    const casco = M(0xf7f0ff, { rough: 0.6 })
    for (const zx of [0.32, -0.42]) {
      for (const s2 of [-1, 1]) {
        add(g, new THREE.CylinderGeometry(0.11, 0.11, 0.75, 8), pele, s2 * 0.26, 0.4, zx)
        add(g, new THREE.CylinderGeometry(0.13, 0.13, 0.16, 8), casco, s2 * 0.26, 0.06, zx)
      }
    }
    return { grupo: g, altura: 2.6 }
  },

  // 💀 caveira com costelas
  caveira (cor) {
    const g = new THREE.Group()
    add(g, new THREE.SphereGeometry(0.5, 16, 12), M(cor, { rough: 0.5 }), 0, 1.95)
    add(g, new THREE.BoxGeometry(0.62, 0.24, 0.5), M(cor, { rough: 0.5 }), 0, 1.6, 0.06)
    for (const s of [-1, 1]) {
      add(g, new THREE.SphereGeometry(0.16, 10, 8), M(PRETO), s * 0.2, 2.0, 0.38)
    }
    add(g, new THREE.CylinderGeometry(0.07, 0.07, 0.55, 6), M(cor, { rough: 0.5 }), 0, 1.35)
    for (let i = 0; i < 3; i++) {
      add(g, new THREE.TorusGeometry(0.34 - i * 0.04, 0.06, 6, 14, Math.PI * 1.1),
        M(cor, { rough: 0.5 }), 0, 1.15 - i * 0.22, 0, 0, 0, Math.PI * 0.95)
    }
    add(g, new THREE.BoxGeometry(0.66, 0.2, 0.4), M(cor, { rough: 0.5 }), 0, 0.55)
    pernas(g, cor, 0.28, 0.22, 0.5)
    return { grupo: g, altura: 2.6 }
  },

  // 👽 alienígena cabeçudo
  alien (cor) {
    const g = new THREE.Group()
    const cabeca = add(g, new THREE.SphereGeometry(0.6, 16, 14), M(cor, { rough: 0.4 }), 0, 1.85)
    cabeca.scale.set(1, 1.25, 0.95)
    for (const s of [-1, 1]) {
      const olho = add(g, new THREE.SphereGeometry(0.2, 12, 10), M(PRETO, { rough: 0.1, metal: 0.4 }), s * 0.26, 1.9, 0.46)
      olho.scale.set(1, 1.5, 0.6)
      olho.rotation.z = s * 0.4
    }
    add(g, new THREE.CapsuleGeometry(0.3, 0.5, 5, 12), M(cor, { rough: 0.5 }), 0, 0.95)
    bracos(g, cor, 1.05, 0.42, 0.55, 0.35)
    pernas(g, cor, 0.3, 0.22, 0.5)
    add(g, new THREE.TorusGeometry(0.5, 0.07, 8, 18), M(0x8ef7ff, { emissive: 0x2ad1ff, ei: 1.1 }), 0, 2.62, 0, Math.PI / 2.2)
    return { grupo: g, altura: 2.9 }
  },

  // 🍄 cogumelo com chapéu de bolinhas
  cogumelo (cor) {
    const g = new THREE.Group()
    add(g, new THREE.CylinderGeometry(0.45, 0.55, 1.25, 14), M(0xf3e3c3, { rough: 0.85 }), 0, 0.62)
    const chapeu = add(g, new THREE.SphereGeometry(0.85, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      M(cor, { rough: 0.7 }), 0, 1.32)
    chapeu.scale.set(1, 0.8, 1)
    const bolinha = M(BRANCO, { rough: 0.6 })
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const r = 0.55
      add(g, new THREE.SphereGeometry(0.16, 10, 8), bolinha,
        Math.cos(a) * r, 1.54 + Math.sin(i) * 0.06, Math.sin(a) * r)
    }
    olhos(g, 0.82, 0.48, 0.2, 0.12)
    add(g, new THREE.TorusGeometry(0.13, 0.03, 6, 12, Math.PI), M(PRETO), 0, 0.66, 0.46, 0, 0, Math.PI)
    pernas(g, 0xf3e3c3, 0.22, 0.24, 0.35)
    return { grupo: g, altura: 2.2 }
  },

  // 🐧 pinguim de barriga branca
  pinguim (cor) {
    const g = new THREE.Group()
    const corpo = add(g, new THREE.CapsuleGeometry(0.52, 0.75, 6, 16), M(cor, { rough: 0.6 }), 0, 1.1)
    corpo.scale.set(1, 1, 0.9)
    const barriga = add(g, new THREE.SphereGeometry(0.44, 14, 12), M(BRANCO, { rough: 0.6 }), 0, 1.05, 0.22)
    barriga.scale.set(1, 1.3, 0.7)
    add(g, new THREE.SphereGeometry(0.42, 14, 12), M(cor, { rough: 0.6 }), 0, 1.9)
    add(g, new THREE.ConeGeometry(0.16, 0.42, 8), M(0xffa53b), 0, 1.85, 0.42, Math.PI / 2)
    olhos(g, 2.0, 0.36, 0.17, 0.1)
    for (const s of [-1, 1]) {
      const asa = add(g, new THREE.CapsuleGeometry(0.12, 0.55, 4, 8), M(cor, { rough: 0.6 }), s * 0.56, 1.1, 0, 0, 0, s * 0.25)
      asa.scale.set(1, 1, 0.5)
    }
    for (const s of [-1, 1]) add(g, new THREE.BoxGeometry(0.26, 0.1, 0.36), M(0xffa53b), s * 0.22, 0.06, 0.12)
    return { grupo: g, altura: 2.45 }
  },

  // 🐝 abelha listrada com asas
  abelha (cor) {
    const g = new THREE.Group()
    const corpo = add(g, new THREE.SphereGeometry(0.55, 16, 12), M(cor, { rough: 0.6 }), 0, 1.15)
    corpo.scale.set(1, 0.9, 1.25)
    for (let i = 0; i < 3; i++) {
      add(g, new THREE.TorusGeometry(0.48 - i * 0.05, 0.09, 8, 18), M(PRETO, { rough: 0.7 }),
        0, 1.15, -0.15 + i * 0.28, Math.PI / 2)
    }
    add(g, new THREE.SphereGeometry(0.38, 14, 12), M(PRETO, { rough: 0.6 }), 0, 1.5, 0.5)
    olhos(g, 1.55, 0.82, 0.16, 0.1)
    for (const s of [-1, 1]) {
      add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), M(PRETO), s * 0.15, 1.85, 0.45, 0, 0, s * 0.4)
      add(g, new THREE.SphereGeometry(0.07, 8, 6), M(PRETO), s * 0.24, 2.0, 0.42)
      const asa = add(g, new THREE.SphereGeometry(0.34, 10, 8), M(0xcdf6ff, { opacity: 0.55, rough: 0.1 }),
        s * 0.5, 1.6, 0, 0, 0, s * 0.5)
      asa.scale.set(1, 0.18, 0.65)
    }
    add(g, new THREE.ConeGeometry(0.12, 0.4, 8), M(PRETO), 0, 1.1, -0.75, -Math.PI / 2)
    pernas(g, PRETO, 0.3, 0.24, 0.5)
    return { grupo: g, altura: 2.35 }
  },

  // 👵 vovó com coque e bengala
  vovo (cor) {
    const g = new THREE.Group()
    add(g, new THREE.ConeGeometry(0.6, 1.3, 12), M(cor, { rough: 0.85 }), 0, 0.65)
    add(g, new THREE.SphereGeometry(0.38, 14, 12), M(0xf3c8a0), 0, 1.65)
    add(g, new THREE.SphereGeometry(0.42, 12, 10), M(0xdcdcf0, { rough: 0.9 }), 0, 1.78, -0.08)
    add(g, new THREE.SphereGeometry(0.24, 10, 8), M(0xdcdcf0, { rough: 0.9 }), 0, 2.12, -0.16)
    for (const s of [-1, 1]) {
      add(g, new THREE.TorusGeometry(0.13, 0.03, 6, 14), M(0x333344), s * 0.15, 1.7, 0.32)
    }
    add(g, new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), M(0x6b4b16), 0.6, 0.6)
    add(g, new THREE.TorusGeometry(0.11, 0.05, 6, 12, Math.PI), M(0x6b4b16), 0.6, 1.2, 0, 0, Math.PI / 2)
    bracos(g, cor, 1.05, 0.5, 0.4, 0.45)
    return { grupo: g, altura: 2.5 }
  },

  // 🐙 polvo com tentáculos
  polvo (cor) {
    const g = new THREE.Group()
    const cabeca = add(g, new THREE.SphereGeometry(0.62, 16, 14), M(cor, { rough: 0.55 }), 0, 1.55)
    cabeca.scale.set(1, 1.2, 1)
    olhos(g, 1.65, 0.5, 0.24, 0.14)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const t = add(g, new THREE.ConeGeometry(0.16, 1.0, 7), M(cor, { rough: 0.6 }),
        Math.cos(a) * 0.42, 0.5, Math.sin(a) * 0.42, Math.PI - 0.35 * Math.cos(a * 2), 0, 0)
      t.rotation.z = Math.sin(a) * 0.3
      t.rotation.x = Math.cos(a) * 0.3 + Math.PI
    }
    return { grupo: g, altura: 2.5 }
  },

  // 🧠 cérebro ambulante
  cerebro (cor) {
    const g = new THREE.Group()
    add(g, new THREE.CapsuleGeometry(0.34, 0.5, 5, 12), M(0xe8e2ff, { rough: 0.7 }), 0, 0.85)
    const nucleo = add(g, new THREE.SphereGeometry(0.5, 14, 12), M(cor, { rough: 0.75 }), 0, 1.75)
    nucleo.scale.set(1.05, 0.95, 1)
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      const r = 0.42
      add(g, new THREE.SphereGeometry(0.19, 10, 8), M(cor, { rough: 0.75 }),
        Math.cos(a) * r, 1.75 + Math.sin(i * 1.7) * 0.22, Math.sin(a) * r)
    }
    add(g, new THREE.SphereGeometry(0.18, 10, 8), M(cor, { rough: 0.75 }), 0, 2.12)
    olhos(g, 1.6, 0.5, 0.2, 0.12)
    add(g, new THREE.TorusGeometry(0.5, 0.03, 6, 20), M(0x7cf5ff, { emissive: 0x2ad1ff, ei: 1.2 }), 0, 2.3, 0, Math.PI / 2.4)
    bracos(g, 0xe8e2ff, 0.95, 0.4, 0.45, 0.4)
    pernas(g, 0xe8e2ff, 0.28, 0.2, 0.45)
    return { grupo: g, altura: 2.7 }
  },

  // 🚀 foguete com aletas e chama
  foguete (cor) {
    const g = new THREE.Group()
    add(g, new THREE.CylinderGeometry(0.42, 0.48, 1.35, 14), M(cor, { metal: 0.4, rough: 0.35 }), 0, 1.15)
    add(g, new THREE.ConeGeometry(0.42, 0.75, 14), M(BRANCO, { metal: 0.3 }), 0, 2.2)
    add(g, new THREE.SphereGeometry(0.22, 12, 10), M(0x7cf5ff, { emissive: 0x2ad1ff, ei: 0.9, opacity: 0.9 }), 0, 1.55, 0.34)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2
      add(g, new THREE.BoxGeometry(0.1, 0.6, 0.42), M(0xf7d94c, { metal: 0.4 }),
        Math.cos(a) * 0.45, 0.62, Math.sin(a) * 0.45, 0, -a, 0)
    }
    const chama = add(g, new THREE.ConeGeometry(0.3, 0.7, 10), M(0xffa53b, { emissive: 0xff5722, ei: 1.6, opacity: 0.85 }),
      0, 0.18, 0, Math.PI)
    g.userData.chama = chama
    return { grupo: g, altura: 2.9 }
  },


  // ============ FORMAS DOS NOVATOS (exclusivos do Champions) ============

  // 🎸 guitarra elétrica ambulante
  guitarra (cor) {
    const g = new THREE.Group()
    const mat = M(cor, { rough: 0.25, metal: 0.3 })
    // corpo em formato de 8 (duas "barrigas" achatadas)
    const barriga = (raio, y, escalaZ) => {
      const m = add(g, new THREE.CylinderGeometry(raio, raio, 0.3, 20), mat, 0, y, 0, Math.PI / 2)
      m.scale.set(1, 1, escalaZ)
      return m
    }
    barriga(0.62, 0.85, 1)
    barriga(0.48, 1.42, 1)
    add(g, new THREE.BoxGeometry(0.95, 0.6, 0.31), mat, 0, 1.15)
    // pickguard e captadores
    add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.34, 16), M(0xf7f0ff, { rough: 0.4 }), -0.12, 1.0, 0, Math.PI / 2)
    add(g, new THREE.BoxGeometry(0.42, 0.12, 0.36), M(PRETO, { metal: 0.6 }), 0.05, 1.28)
    add(g, new THREE.BoxGeometry(0.42, 0.12, 0.36), M(PRETO, { metal: 0.6 }), 0.05, 0.78)
    // braço + trastes + cordas + cabeça
    add(g, new THREE.BoxGeometry(0.26, 1.5, 0.18), M(0x6b4b16, { rough: 0.6 }), 0, 2.35, 0)
    for (let i = 0; i < 6; i++) {
      add(g, new THREE.BoxGeometry(0.26, 0.02, 0.19), M(0xdedeee, { metal: 0.9 }), 0, 1.85 + i * 0.24, 0)
    }
    for (let i = 0; i < 4; i++) {
      add(g, new THREE.CylinderGeometry(0.01, 0.01, 2.3, 4), M(0xf7f7ff, { metal: 0.9 }), -0.08 + i * 0.055, 2.05, 0.1)
    }
    const cabeca = add(g, new THREE.BoxGeometry(0.36, 0.46, 0.16), M(cor, { rough: 0.3 }), 0, 3.25, 0)
    cabeca.rotation.z = 0.12
    for (let i = 0; i < 3; i++) {
      for (const s2 of [-1, 1]) {
        add(g, new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6), M(0xdedeee, { metal: 0.9 }),
          s2 * 0.2, 3.36 - i * 0.14, 0, 0, 0, Math.PI / 2)
      }
    }
    olhos(g, 1.45, 0.35, 0.2, 0.12)
    add(g, new THREE.TorusGeometry(0.13, 0.03, 6, 12, Math.PI), M(PRETO), 0, 1.2, 0.34, 0, 0, Math.PI)
    pernas(g, PRETO, 0.28, 0.26, 0.42)
    return { grupo: g, altura: 3.6 }
  },

  // 🧊 cubo de gelo
  gelo (cor) {
    const g = new THREE.Group()
    const mat = M(cor, { rough: 0.08, metal: 0.1, opacity: 0.82, flat: true })
    add(g, new THREE.BoxGeometry(1.3, 1.3, 1.3), mat, 0, 1.05)
    add(g, new THREE.BoxGeometry(0.5, 0.5, 0.5), M(0xffffff, { rough: 0.05, opacity: 0.5 }), -0.3, 1.35, 0.3, 0.4, 0.3, 0)
    for (const s of [-1, 1]) add(g, new THREE.ConeGeometry(0.16, 0.4, 4), mat, s * 0.5, 1.85, 0, 0, Math.PI / 4)
    olhos(g, 1.15, 0.68, 0.24, 0.14)
    add(g, new THREE.TorusGeometry(0.16, 0.04, 6, 12, Math.PI), M(PRETO), 0, 0.85, 0.68, 0, 0, Math.PI)
    pernas(g, 0xbfefff, 0.22, 0.3, 0.4)
    return { grupo: g, altura: 2.4 }
  },

  // 🧁 cupcake com cobertura
  cupcake (cor) {
    const g = new THREE.Group()
    add(g, new THREE.CylinderGeometry(0.62, 0.46, 0.9, 16, 1), M(0xd9a066, { rough: 0.9 }), 0, 0.5)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      add(g, new THREE.BoxGeometry(0.1, 0.9, 0.06), M(0xf7c8d0, { rough: 0.85 }),
        Math.cos(a) * 0.56, 0.5, Math.sin(a) * 0.56, 0, -a, 0)
    }
    for (let i = 0; i < 4; i++) {
      const r = 0.62 - i * 0.14
      add(g, new THREE.SphereGeometry(r, 14, 10), M(cor, { rough: 0.6 }), 0, 1.05 + i * 0.28, 0)
    }
    add(g, new THREE.SphereGeometry(0.16, 10, 8), M(0xd62828), 0, 2.1, 0)
    add(g, new THREE.CylinderGeometry(0.02, 0.02, 0.2, 5), M(0x4caf50), 0, 2.28, 0, 0, 0, 0.3)
    const conf = [0xffe14d, 0x38bdf8, 0x22c55e, 0xff6ec7]
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      add(g, new THREE.BoxGeometry(0.07, 0.07, 0.16), M(conf[i % 4]),
        Math.cos(a) * 0.45, 1.35 + Math.sin(i) * 0.2, Math.sin(a) * 0.45, i, a, 0)
    }
    olhos(g, 0.62, 0.5, 0.2, 0.12)
    return { grupo: g, altura: 2.6 }
  },

  // ⚡ nuvem com raio
  nuvem (cor) {
    const g = new THREE.Group()
    const mat = M(cor, { rough: 0.9 })
    for (const [x, y, z, r] of [[0, 1.5, 0, 0.6], [-0.5, 1.35, 0.1, 0.45], [0.5, 1.4, -0.1, 0.5], [0.15, 1.75, 0.05, 0.42]]) {
      add(g, new THREE.SphereGeometry(r, 14, 10), mat, x, y, z)
    }
    const raio = M(0xffe14d, { emissive: 0xffd400, ei: 1.6 })
    add(g, new THREE.ConeGeometry(0.22, 0.7, 4), raio, 0.05, 0.75, 0, Math.PI)
    add(g, new THREE.ConeGeometry(0.16, 0.5, 4), raio, -0.1, 0.35, 0)
    olhos(g, 1.55, 0.52, 0.22, 0.13)
    add(g, new THREE.TorusGeometry(0.14, 0.035, 6, 12, Math.PI), M(PRETO), 0, 1.3, 0.5, 0, 0, Math.PI)
    return { grupo: g, altura: 2.4 }
  },

  // 🪁 pipa com rabiola
  pipa (cor) {
    const g = new THREE.Group()
    const mat = M(cor, { rough: 0.5, flat: true })
    const losango = new THREE.Shape()
    losango.moveTo(0, 1.1); losango.lineTo(0.75, 0); losango.lineTo(0, -1.1); losango.lineTo(-0.75, 0); losango.lineTo(0, 1.1)
    const geo = new THREE.ExtrudeGeometry(losango, { depth: 0.1, bevelEnabled: false })
    add(g, geo, mat, 0, 1.55, 0)
    add(g, new THREE.BoxGeometry(0.05, 2.2, 0.14), M(0x6b4b16), 0, 1.55, 0.08)
    add(g, new THREE.BoxGeometry(1.5, 0.05, 0.14), M(0x6b4b16), 0, 1.55, 0.08)
    const cores = [0xffe14d, 0x38bdf8, 0xf43f5e]
    for (let i = 0; i < 5; i++) {
      add(g, new THREE.BoxGeometry(0.24, 0.1, 0.05), M(cores[i % 3]), Math.sin(i) * 0.18, 0.42 - i * 0.09, -0.1, 0, 0, i * 0.5)
    }
    olhos(g, 1.75, 0.16, 0.2, 0.12)
    add(g, new THREE.TorusGeometry(0.13, 0.03, 6, 12, Math.PI), M(PRETO), 0, 1.5, 0.16, 0, 0, Math.PI)
    return { grupo: g, altura: 2.8 }
  },

  // 🧲 ímã de ferradura
  ima (cor) {
    const g = new THREE.Group()
    const corpo = add(g, new THREE.TorusGeometry(0.6, 0.26, 10, 20, Math.PI), M(cor, { metal: 0.55, rough: 0.35 }), 0, 1.25)
    corpo.rotation.z = 0
    for (const s of [-1, 1]) {
      add(g, new THREE.CylinderGeometry(0.26, 0.26, 0.6, 12), M(cor, { metal: 0.55 }), s * 0.6, 0.95, 0)
      add(g, new THREE.CylinderGeometry(0.27, 0.27, 0.24, 12), M(0xdedeee, { metal: 0.85 }), s * 0.6, 0.63, 0)
    }
    olhos(g, 1.55, 0.3, 0.22, 0.12)
    // faíscas magnéticas
    for (let i = 0; i < 4; i++) {
      add(g, new THREE.IcosahedronGeometry(0.09, 0), M(0x7cf5ff, { emissive: 0x2ad1ff, ei: 1.4 }),
        (i % 2 ? 1 : -1) * 0.6, 0.42, (i < 2 ? 0.22 : -0.22))
    }
    pernas(g, 0x555079, 0.22, 0.3, 0.36)
    return { grupo: g, altura: 2.3 }
  },

  // 🚦 semáforo
  semaforo (cor) {
    const g = new THREE.Group()
    add(g, new THREE.CylinderGeometry(0.16, 0.22, 1.1, 10), M(0x555079, { metal: 0.5 }), 0, 0.55)
    add(g, new THREE.BoxGeometry(0.7, 1.5, 0.5), M(cor, { rough: 0.6, metal: 0.2 }), 0, 1.85)
    const luzes = [[0xf43f5e, 1.05], [0xfacc15, 0.55], [0x22c55e, 0.05]]
    luzes.forEach(([c, dy], i) => {
      add(g, new THREE.SphereGeometry(0.2, 12, 10), M(c, { emissive: c, ei: i === 0 ? 1.6 : 0.35 }), 0, 1.6 + dy, 0.26)
      add(g, new THREE.CylinderGeometry(0.24, 0.26, 0.1, 12), M(0x2b2b3d), 0, 1.72 + dy, 0.3, Math.PI / 2)
    })
    add(g, new THREE.BoxGeometry(0.9, 0.12, 0.6), M(0x2b2b3d), 0, 2.68)
    olhos(g, 2.75, 0.32, 0.2, 0.1)
    pernas(g, 0x2b2b3d, 0.2, 0.22, 0.34)
    return { grupo: g, altura: 3.1 }
  },

  // 🪩 globo de discoteca
  globo (cor) {
    const g = new THREE.Group()
    const bola = add(g, new THREE.IcosahedronGeometry(0.75, 1),
      M(0xe8e4ff, { metal: 0.9, rough: 0.08, flat: true, emissive: cor, ei: 0.35 }), 0, 1.6)
    bola.castShadow = true
    // espelhinhos claros + alguns coloridos, pra ler como globo de balada
    const cores = [0xffffff, 0xffffff, 0x7cf5ff, 0xffe14d, 0xff8fc7, 0xffffff]
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 * 1.6
      const y = 1.6 + Math.cos(i * 0.9) * 0.58
      const raio = Math.sqrt(Math.max(0.02, 0.62 - Math.pow(y - 1.6, 2)))
      const c = cores[i % cores.length]
      add(g, new THREE.BoxGeometry(0.19, 0.19, 0.04),
        M(c, { metal: 1, rough: 0.02, flat: true, emissive: c, ei: 0.5 }),
        Math.cos(a) * raio * 1.18, y, Math.sin(a) * raio * 1.18, 0, -a, 0)
    }
    add(g, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), M(0x9aa7b0, { metal: 0.8 }), 0, 2.5)
    add(g, new THREE.SphereGeometry(0.14, 10, 8), M(0xfacc15, { emissive: 0xfacc15, ei: 1.2 }), 0, 2.78)
    olhos(g, 1.65, 0.7, 0.24, 0.13)
    pernas(g, 0x555079, 0.3, 0.26, 0.5)
    return { grupo: g, altura: 3.0 }
  },

  // ---------- criaturas da selva ----------
  latinha (cor) {
    const g = new THREE.Group()
    add(g, new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14), M(cor, { metal: 0.5, rough: 0.4 }), 0, 0.7)
    add(g, new THREE.TorusGeometry(0.56, 0.07, 8, 16), M(0xdedeee, { metal: 0.7 }), 0, 1.24, 0, Math.PI / 2)
    add(g, new THREE.CylinderGeometry(0.2, 0.3, 0.35, 10), M(cor, { rough: 0.3, emissive: cor, ei: 0.7 }), 0, 1.42)
    olhos(g, 0.85, 0.5, 0.2, 0.12)
    pernas(g, 0x33334d, 0.16, 0.24, 0.3)
    return { grupo: g, altura: 1.9 }
  },

  balde (cor) {
    const g = new THREE.Group()
    add(g, new THREE.CylinderGeometry(0.75, 0.55, 1.3, 16), M(cor, { rough: 0.5, metal: 0.25 }), 0, 0.75)
    add(g, new THREE.TorusGeometry(0.76, 0.09, 8, 18), M(0xdedeee, { metal: 0.6 }), 0, 1.38, 0, Math.PI / 2)
    add(g, new THREE.TorusGeometry(0.7, 0.05, 6, 16, Math.PI), M(0x9aa7b0, { metal: 0.8 }), 0, 1.5, 0)
    olhos(g, 0.9, 0.62, 0.24, 0.14)
    return { grupo: g, altura: 2.0 }
  },

  chefao (cor) {
    const g = new THREE.Group()
    add(g, new THREE.CylinderGeometry(0.85, 0.6, 1.5, 16), M(cor, { rough: 0.45, metal: 0.3 }), 0, 0.85)
    add(g, new THREE.TorusGeometry(0.86, 0.11, 8, 20), M(0x2b2b3d, { metal: 0.7 }), 0, 1.6, 0, Math.PI / 2)
    for (const s of [-1, 1]) {
      add(g, new THREE.ConeGeometry(0.2, 0.6, 6), M(0xf7d94c, { metal: 0.5 }), s * 0.55, 1.85, 0, 0, 0, s * 0.35)
    }
    olhos(g, 1.05, 0.72, 0.3, 0.18)
    add(g, new THREE.BoxGeometry(0.7, 0.14, 0.2), M(PRETO), 0, 0.62, 0.7)
    return { grupo: g, altura: 2.4 }
  },

  // fallback simpático
  generico (cor) {
    const g = new THREE.Group()
    add(g, new THREE.CapsuleGeometry(0.55, 0.85, 6, 14), M(cor), 0, 1.05)
    add(g, new THREE.SphereGeometry(0.45, 14, 12), M(cor), 0, 1.95)
    olhos(g, 2.0, 0.4, 0.18, 0.11)
    bracos(g, cor, 1.15, 0.6, 0.5, 0.4)
    pernas(g, cor)
    return { grupo: g, altura: 2.6 }
  }
}

export function construirForma (nome, cor) {
  const fn = FORMAS[nome] || FORMAS.generico
  return fn(cor)
}
