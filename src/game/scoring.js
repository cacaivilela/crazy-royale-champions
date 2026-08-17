// ============================================================
//  MARCAÇÃO — despejar a tinta carregada no baldão inimigo
//  (o "gol" do Crazy Royale Champions)
// ============================================================
import { CONFIG } from '../data/runtime.js'

export function baldaoProximo (match, unidade) {
  const cand = match.arena.baldoesAtacaveis(unidade.time)
  for (const b of cand) {
    if (unidade.pos.distanceTo(b.pos) <= b.raio) return b
  }
  return null
}

export function iniciarMarcacao (match, unidade) {
  if (unidade.morto || unidade.tinta <= 0 || unidade.canalizando) return false
  const b = baldaoProximo(match, unidade)
  if (!b) return false
  const total = CONFIG.marcacao.tempoBase + CONFIG.marcacao.tempoPorTinta * unidade.tinta
  unidade.canalizando = { baldao: b, total, restante: total }
  match.bus.emit('marcacao:iniciou', { unidade, baldao: b })
  return true
}

export function atualizarMarcacoes (match, dt) {
  for (const u of match.campeoes()) {
    if (!u.canalizando) continue
    const c = u.canalizando
    if (u.morto || c.baldao.quebrado || u.pos.distanceTo(c.baldao.pos) > c.baldao.raio + 0.4) {
      u.cancelarMarcacao()
      continue
    }
    c.restante -= dt
    if (c.restante > 0) continue

    // ---- marcou! ----
    const bruto = u.tinta
    const mult = match.tempoRestante <= CONFIG.partida.tempoFinalSeg ? CONFIG.partida.multiplicadorFinal : 1
    const pontos = bruto * mult

    match.placar[u.time] += pontos
    u.tintaMarcada += pontos
    u.tinta = 0
    u.canalizando = null
    u.ganharXp(bruto * CONFIG.marcacao.xpPorTinta)

    const b = c.baldao
    b.acumulado += bruto
    match.efeitosVisuais.texto(b.pos, `+${pontos}`, 0xfacc15)
    match.efeitosVisuais.explosao(b.pos, u.cor)

    if (b.acumulado >= b.capacidade && !b.quebrado) {
      b.quebrado = true
      match.bus.emit('objetivo', { texto: `💥 Baldão ${b.id} destruído!` })
      match.bus.emit('baldao:quebrou', { baldao: b, unidade: u })
    }
    match.arena.atualizarVisualBaldao(b)
    match.bus.emit('marcou', { unidade: u, pontos, baldao: b, dobro: mult > 1 })
  }
}
