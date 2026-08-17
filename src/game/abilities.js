// ============================================================
//  HABILIDADES — motor genérico dirigido por dados
//  Todo campeão declara habilidades em src/data/champions.js com
//  um "tipo"; aqui esse tipo vira comportamento. Para criar uma
//  habilidade nova, na maioria dos casos basta editar o JSON.
//  Tipos: dash | projetil | area | cone | buff | cura
// ============================================================
import * as THREE from 'three'
import { CONFIG } from '../data/runtime.js'
import { audio } from '../core/audio.js'

const NIVEL_ULTIMATE = 5

export function danoDe (unidade, hab) {
  const n = unidade.nivel - 1
  return (hab.dano || 0) + (hab.danoNivel || 0) * n + unidade.ataque * 0.5
}

export function habilidadesDe (unidade) {
  const c = unidade.champ
  if (!c) return []
  const lista = [...c.habilidades, c.ultimate]
  // prêmio da Roleta Habilidosa: entra como slot X (passivas não têm slot)
  if (unidade.extra && unidade.extra.tipo !== 'passiva') lista.push({ ...unidade.extra, key: 'X' })
  return lista
}

export function habPorSlot (unidade, slot) {
  return habilidadesDe(unidade).find(h => h.key === slot) || null
}

export function cooldownDe (unidade, hab) {
  const mult = unidade.match.modo === 'caos' ? 0.5 : 1
  return hab.cooldown * mult
}

export function podeUsar (unidade, slot) {
  const hab = habPorSlot(unidade, slot)
  if (!hab || unidade.morto) return false
  if (slot === 'R' && unidade.nivel < NIVEL_ULTIMATE) return false
  return (unidade.cooldowns[slot] || 0) <= 0
}

export function nivelUltimate () { return NIVEL_ULTIMATE }

/**
 * Usa a habilidade do slot mirando em `ponto` (Vector3 no chão).
 * Retorna true se foi lançada.
 */
export function usarHabilidade (match, unidade, slot, ponto) {
  if (!podeUsar(unidade, slot)) return false
  const hab = habPorSlot(unidade, slot)
  const dir = new THREE.Vector3().subVectors(ponto || unidade.pos.clone().add(unidade.dir), unidade.pos)
  dir.y = 0
  if (dir.lengthSq() < 0.001) dir.copy(unidade.dir)
  dir.normalize()
  unidade.dir.copy(dir)
  unidade.cancelarMarcacao()
  unidade.cooldowns[slot] = cooldownDe(unidade, hab)

  switch (hab.tipo) {
    case 'dash': _dash(match, unidade, hab, dir); break
    case 'projetil': _projetil(match, unidade, hab, dir); break
    case 'area': _area(match, unidade, hab, ponto || unidade.pos.clone().addScaledVector(dir, 4)); break
    case 'cone': _cone(match, unidade, hab, dir); break
    case 'buff': _buff(match, unidade, hab); break
    case 'cura': _cura(match, unidade, hab, ponto || unidade.pos); break
    default: console.warn('[hab] tipo desconhecido:', hab.tipo)
  }
  if (unidade.ehJogador) audio.habilidade(hab.tipo)
  match.bus.emit('hab:usada', { unidade, hab, slot, ponto: ponto ? ponto.clone() : null })
  return true
}

// ---------------- implementações ----------------
function _dash (match, unidade, hab, dir) {
  unidade.dash = {
    dir: dir.clone(),
    restante: hab.distancia,
    velocidade: Math.max(18, hab.distancia * 2.6),
    dano: danoDe(unidade, hab),
    empurrao: hab.empurrao || 0,
    atingidos: new Set()
  }
  if (hab.escudo) unidade.escudo += hab.escudo
  if (hab.invisivel) unidade.addStatus('invisivel', 1, hab.invisivel)
  if (hab.imparavel) unidade.addStatus('imune', 1, 0.6)
  if (hab.roubaVida) unidade.addStatus('roubaVida', hab.roubaVida, hab.duracaoEfeito || 3)
  if (hab.lentidao) unidade.lentidaoDoDash = { valor: hab.lentidao, duracao: hab.duracaoEfeito || 2 }
  match.efeitosVisuais.onda(unidade.pos, 2.2, unidade.cor)
}

function _projetil (match, unidade, hab, dir) {
  const geo = new THREE.SphereGeometry(hab.raioExplosao ? 0.5 : 0.34, 10, 8)
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: unidade.cor, emissive: unidade.cor, emissiveIntensity: 0.7
  }))
  mesh.position.copy(unidade.pos).setY(1.3)
  match.scene.add(mesh)

  let alvo = null
  if (hab.teleguiado) alvo = match.inimigoMaisProximo(unidade, hab.alcance)

  match.projeteis.push({
    dono: unidade, mesh, dir: dir.clone(),
    velocidade: hab.velocidade || 24,
    restante: hab.alcance || 14,
    dano: danoDe(unidade, hab),
    raioExplosao: hab.raioExplosao || 0,
    perfura: !!hab.perfura,
    alvo,
    lentidao: hab.lentidao || 0,
    duracaoEfeito: hab.duracaoEfeito || 1.5,
    atingidos: new Set(),
    ehBasico: false
  })
}

function _area (match, unidade, hab, ponto) {
  const p = ponto.clone(); p.y = 0
  const disco = new THREE.Mesh(
    new THREE.CircleGeometry(hab.raio, 26),
    new THREE.MeshBasicMaterial({ color: unidade.cor, transparent: true, opacity: 0.28, depthWrite: false })
  )
  disco.rotation.x = -Math.PI / 2
  disco.position.set(p.x, 0.08, p.z)
  match.scene.add(disco)

  match.areas.push({
    dono: unidade, pos: p, raio: hab.raio, mesh: disco,
    dano: danoDe(unidade, hab) / Math.max(1, hab.ticks || 1),
    ticks: hab.ticks || 1, intervalo: hab.intervalo || 0.5, prox: 0,
    lentidao: hab.lentidao || 0, duracaoEfeito: hab.duracaoEfeito || 1.5,
    curaAliado: hab.curaAliado || 0
  })
}

function _cone (match, unidade, hab, dir) {
  const golpes = hab.golpes || 1
  for (let i = 0; i < golpes; i++) {
    match.agendar(i * 0.16, () => {
      if (unidade.morto) return
      match.efeitosVisuais.onda(unidade.pos.clone().addScaledVector(dir, hab.alcance * 0.5), hab.alcance * 0.6, unidade.cor)
      for (const alvo of match.inimigosDe(unidade)) {
        const d = new THREE.Vector3().subVectors(alvo.pos, unidade.pos)
        const dist = d.length()
        if (dist > hab.alcance + 1) continue
        d.normalize()
        if (d.dot(dir) < Math.cos(hab.angulo || 1.2)) continue
        alvo.receberDano(danoDe(unidade, hab) / golpes, unidade)
        if (hab.empurrao) empurrar(match, alvo, dir, hab.empurrao)
      }
    })
  }
}

function _buff (match, unidade, hab) {
  const alvos = hab.raioAliado
    ? match.aliadosDe(unidade).filter(a => a.pos.distanceTo(unidade.pos) <= hab.raioAliado)
    : [unidade]
  for (const a of alvos) {
    if (hab.escudo) a.escudo += hab.escudo
    if (hab.reducaoDano) a.addStatus('reducaoDano', hab.reducaoDano, hab.duracao)
    if (hab.buffAtaque) a.addStatus('ataque', hab.buffAtaque, hab.duracao)
    if (hab.buffVelocidade) a.addStatus('velocidade', hab.buffVelocidade, hab.duracao)
    if (hab.buffAlcance) a.addStatus('alcance', hab.buffAlcance, hab.duracao)
    if (hab.buffCadencia) a.addStatus('cadencia', hab.buffCadencia, hab.duracao)
    if (hab.roubaVida) a.addStatus('roubaVida', hab.roubaVida, hab.duracao)
    if (hab.invisivel) a.addStatus('invisivel', 1, hab.duracao)
    match.efeitosVisuais.onda(a.pos, 2.6, 0xfacc15)
  }
}

function _cura (match, unidade, hab, ponto) {
  const p = ponto.clone(); p.y = 0
  match.efeitosVisuais.onda(p, hab.raio, 0x22c55e)
  const cura = (hab.cura || 0) + (hab.curaNivel || 0) * (unidade.nivel - 1)
  for (const a of match.aliadosDe(unidade, true)) {
    if (a.pos.distanceTo(p) > hab.raio) continue
    a.curar(cura)
    match.efeitosVisuais.texto(a.pos, '+' + Math.round(cura), 0x22c55e)
    if (hab.buffVelocidade) a.addStatus('velocidade', hab.buffVelocidade, hab.duracaoEfeito || 3)
  }
}

export function empurrar (match, alvo, dir, forca) {
  alvo.pos.addScaledVector(dir, forca)
  match.arena.limitar(alvo.pos)
  match.arena.colidirObstaculos(alvo.pos)
}

// ---------------- ataque básico ----------------
export function atacarBasico (match, unidade, alvo) {
  if (!alvo || unidade.morto || alvo.morto) return false
  const dist = unidade.pos.distanceTo(alvo.pos)
  if (dist > unidade.alcance + 1) return false
  if (unidade.ataqueCd > 0) return false

  if (unidade.ehJogador) {
    // jogador: recarga fixa (config/patch), pensada pro disparo no Espaço
    unidade.ataqueCd = CONFIG.combate.recargaBasicoJogadorSeg
  } else {
    const cadencia = unidade.cadencia * (1 + unidade.valorStatus('cadencia'))
    unidade.ataqueCd = 1 / Math.max(0.2, cadencia)
  }
  if (!match.modoRemoto) unidade.ultimoTiroAlvo = alvo    // vai no snapshot pro cliente ver o tiro
  unidade.dir.subVectors(alvo.pos, unidade.pos).setY(0).normalize()

  if (unidade.ehJogador) audio.tiro()

  // COM erra alguns tiros (deixa os bots menos letais)
  if (!unidade.ehJogador && !unidade.ehSelvagem && Math.random() > 0.55 + 0.45 * CONFIG.bots.dificuldade) {
    match.efeitosVisuais.splat(alvo.pos, unidade.cor, 0.6)
    return true
  }

  // dano do tiro básico: o jogador usa o valor fixo do config (patchável ao vivo)
  const danoBasico = (unidade.ehJogador && CONFIG.combate.danoBasicoJogador != null)
    ? CONFIG.combate.danoBasicoJogador
    : unidade.ataque

  if (unidade.alcance <= 5.2) {
    // corpo a corpo: acerta na hora
    alvo.receberDano(danoBasico, unidade)
    match.efeitosVisuais.splat(alvo.pos, unidade.cor, 0.9)
  } else {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshBasicMaterial({ color: unidade.cor })
    )
    mesh.position.copy(unidade.pos).setY(1.3)
    match.scene.add(mesh)
    match.projeteis.push({
      dono: unidade, mesh, dir: unidade.dir.clone(), velocidade: 30,
      restante: unidade.alcance + 2, dano: danoBasico, raioExplosao: 0,
      perfura: false, alvo, atingidos: new Set(), lentidao: 0, duracaoEfeito: 0, ehBasico: true
    })
  }
  return true
}

// ---------------- updates por frame ----------------
export function atualizarProjeteis (match, dt) {
  for (let i = match.projeteis.length - 1; i >= 0; i--) {
    const p = match.projeteis[i]
    // teleguiado/básico segue o alvo
    if (p.alvo && !p.alvo.morto) {
      const d = new THREE.Vector3().subVectors(p.alvo.pos.clone().setY(1.3), p.mesh.position)
      if (d.lengthSq() > 0.001) {
        d.normalize()
        p.dir.lerp(d, p.ehBasico ? 0.35 : 0.12).normalize()
      }
    }
    const passo = p.velocidade * dt
    p.mesh.position.addScaledVector(p.dir, passo)
    p.restante -= passo

    let acertou = false
    for (const alvo of match.inimigosDe(p.dono)) {
      if (p.atingidos.has(alvo.id)) continue
      const dist = alvo.pos.clone().setY(1.3).distanceTo(p.mesh.position)
      if (dist > 1.1) continue
      p.atingidos.add(alvo.id)
      if (p.raioExplosao > 0) {
        match.efeitosVisuais.explosao(p.mesh.position, p.dono.cor)
        if (p.dono.ehJogador) audio.explosao()
        for (const a2 of match.inimigosDe(p.dono)) {
          if (a2.pos.distanceTo(p.mesh.position) <= p.raioExplosao) {
            a2.receberDano(p.dano, p.dono)
            if (p.lentidao) a2.addStatus('lentidao', p.lentidao, p.duracaoEfeito)
          }
        }
      } else {
        alvo.receberDano(p.dano, p.dono)
        if (p.lentidao) alvo.addStatus('lentidao', p.lentidao, p.duracaoEfeito)
        match.efeitosVisuais.splat(alvo.pos, p.dono.cor, 0.8)
      }
      acertou = true
      if (!p.perfura) break
    }

    if ((acertou && !p.perfura) || p.restante <= 0) {
      match.scene.remove(p.mesh)
      p.mesh.geometry.dispose(); p.mesh.material.dispose()
      match.projeteis.splice(i, 1)
    }
  }
}

export function atualizarAreas (match, dt) {
  for (let i = match.areas.length - 1; i >= 0; i--) {
    const a = match.areas[i]
    a.prox -= dt
    if (a.prox <= 0) {
      a.prox = a.intervalo
      a.ticks--
      for (const alvo of match.inimigosDe(a.dono)) {
        if (alvo.pos.distanceTo(a.pos) > a.raio) continue
        alvo.receberDano(a.dano, a.dono)
        if (a.lentidao) alvo.addStatus('lentidao', a.lentidao, a.duracaoEfeito)
      }
      if (a.curaAliado) {
        for (const al of match.aliadosDe(a.dono, true)) {
          if (al.pos.distanceTo(a.pos) <= a.raio) al.curar(a.curaAliado)
        }
      }
      match.efeitosVisuais.splat(a.pos, a.dono.cor, a.raio * 0.5)
    }
    if (a.ticks <= 0) {
      match.scene.remove(a.mesh)
      a.mesh.geometry.dispose(); a.mesh.material.dispose()
      match.areas.splice(i, 1)
    } else {
      a.mesh.material.opacity = 0.15 + 0.13 * Math.sin(match.tempo * 8)
    }
  }
}

export function atualizarDashes (match, dt) {
  for (const u of match.unidades) {
    const d = u.dash
    if (!d || u.morto) { if (u.morto) u.dash = null; continue }
    const passo = Math.min(d.restante, d.velocidade * dt)
    u.pos.addScaledVector(d.dir, passo)
    match.arena.limitar(u.pos)
    match.arena.colidirObstaculos(u.pos)
    d.restante -= passo

    for (const alvo of match.inimigosDe(u)) {
      if (d.atingidos.has(alvo.id)) continue
      if (alvo.pos.distanceTo(u.pos) > 1.8) continue
      d.atingidos.add(alvo.id)
      alvo.receberDano(d.dano, u)
      if (d.empurrao) empurrar(match, alvo, d.dir, d.empurrao)
      if (u.lentidaoDoDash) alvo.addStatus('lentidao', u.lentidaoDoDash.valor, u.lentidaoDoDash.duracao)
    }
    if (d.restante <= 0.01) { u.dash = null; u.lentidaoDoDash = null }
  }
}

export const _internos = { NIVEL_ULTIMATE, CONFIG }
