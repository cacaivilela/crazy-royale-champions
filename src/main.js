// ============================================================
//  CRAZY ROYALE CHAMPIONS — ponto de entrada
//  Boilerplate de MOBA 3D com live update de balanceamento.
//  Franquia: https://cacaivilela.github.io/crazy-royale/
// ============================================================
import { Loop } from './core/loop.js'
import { Input, isTouchDevice } from './core/input.js'
import { bus } from './core/events.js'
import { CONFIG, CHAMPIONS, PATCH, applyPatch, resetToBase } from './data/runtime.js'
import { live } from './live/liveupdate.js'
import { conectarHotReload } from './live/hotreload.js'
import { Menu } from './ui/menu.js'
import { Hud } from './ui/hud.js'
import { Minimapa } from './ui/minimap.js'
import { Lobby } from './ui/lobby.js'
import { CheatsUI } from './ui/cheats-ui.js'
import { Roleta } from './ui/roleta.js'
import { musica } from './core/music.js'
import { extraEquipado } from './data/extras.js'
import { sala } from './net/sala.js'
import { Match } from './game/match.js'

const canvas = document.getElementById('canvas')
const telaJogo = document.getElementById('game')
const camadaTouch = document.getElementById('touch-layer')

const input = new Input(canvas, camadaTouch)
const hud = new Hud()
const minimapa = new Minimapa(document.getElementById('minimap'))
const cheatsUI = new CheatsUI()
let match = null

if (isTouchDevice()) camadaTouch.classList.remove('hidden')

// ---------------- loop principal ----------------
const loop = new Loop((dt) => {
  if (match) {
    match.atualizar(dt)
    hud.atualizar(loop.fps)
    minimapa.desenhar()
  }
  input.endFrame()
})

// ---------------- menu ----------------
const menu = new Menu({
  aoJogar: (champId, modo) => iniciarPartida(champId, modo)
})

// ---------------- lobby online ----------------
const lobby = new Lobby({
  champIdAtual: menu ? menu.champId : null,
  aoVoltar: () => menu.mostrar(),
  aoTrocarCampeao: () => { lobby.esconder(); menu.mostrar(); menu.modoEscolhaOnline = true }
})

const roleta = new Roleta({ aoVoltar: () => menu.mostrar() })
document.getElementById('btn-roleta').addEventListener('click', () => {
  menu.esconder()
  roleta.mostrar(menu.champId)
})

document.getElementById('btn-online').addEventListener('click', () => {
  lobby.champIdAtual = menu.champId
  menu.esconder()
  lobby.mostrar()
  if (sala.tr) lobby.mostrarSala(sala.codigo); else lobby.mostrarEntrada()
})

bus.on('sala:iniciar', (dados) => {
  lobby.esconder()
  menu.esconder()
  iniciarPartidaOnline(dados)
})

function iniciarPartidaOnline ({ roster, escala, souHost, rede, meuId, cheats, modoJogo }) {
  if (match) { match.destruir(); match = null }
  telaJogo.classList.remove('hidden')
  match = new Match({
    canvas, input, modo: 'online', roster, modoJogo: modoJogo || 'normal',
    escalaArena: escala, modoRemoto: !souHost, rede, meuId, cheats: cheats || 'nenhum'
  })
  sala.match = match
  hud.iniciar(match)
  minimapa.iniciar(match)
  cheatsUI.definirModo(cheats || 'nenhum')
  cheatsUI.iniciar(match)
  musica.tocar(modoJogo === 'boss' ? 'boss' : 'batalha')
  hud.banner(modoJogo === 'boss'
    ? '🐍 MODO BOSS — DERRUBEM O BALDÃO SUPREMO!'
    : (souHost ? '🌐 VOCÊ É O ANFITRIÃO — VALENDO!' : '🌐 CONECTADO — VALENDO!'))
  loop.start()
  window.CRC.match = match
}

function iniciarPartida (champId, modo) {
  if (match) { match.destruir(); match = null }
  menu.esconder()
  telaJogo.classList.remove('hidden')
  match = new Match({
    canvas, input, champId, modo, cheats: menu.cheats,
    modoJogo: modo === 'boss' ? 'boss' : 'normal'
  })
  hud.iniciar(match)
  minimapa.iniciar(match)
  cheatsUI.definirModo(menu.cheats)
  cheatsUI.iniciar(match)
  musica.tocar(modo === 'boss' ? 'boss' : 'batalha')
  hud.banner(modo === 'boss'
    ? '🐍 MODO BOSS — você + 5 COMs contra o Baldão Chefão!'
    : '🎨 VALENDO! Colete tinta e marque no baldão inimigo')
  loop.start()
  window.CRC.match = match
}

function voltarAoMenu () {
  telaHostSaiu.classList.add('hidden')
  cheatsUI.parar()
  if (match) { match.destruir(); match = null }
  window.CRC.match = null
  loop.stop()
  telaJogo.classList.add('hidden')
  lobby.esconder()
  if (sala.tr) sala.sair()
  menu.mostrar()
  menu.renderar()
  musica.tocar('menu')
}

bus.on('partida:fim', (res) => hud.fim(res))

// o anfitrião saiu: tela de aviso com botão OK
const telaHostSaiu = document.getElementById('host-saiu')
bus.on('sala:hostSaiu', ({ motivo }) => {
  if (match) match.pausado = true
  document.getElementById('host-saiu-motivo').textContent = motivo
  telaHostSaiu.classList.remove('hidden')
})
document.getElementById('btn-host-saiu-ok').addEventListener('click', () => {
  telaHostSaiu.classList.add('hidden')
  voltarAoMenu()
})
bus.on('ir:menu', voltarAoMenu)

// a trilha começa no primeiro clique/tecla (regra dos navegadores)
const ligarTrilha = () => { musica.tocar('menu'); window.removeEventListener('pointerdown', ligarTrilha); window.removeEventListener('keydown', ligarTrilha) }
window.addEventListener('pointerdown', ligarTrilha)
window.addEventListener('keydown', ligarTrilha)

// convite por link: ...?sala=2610 já abre o lobby e entra
const salaDaUrl = new URLSearchParams(location.search).get('sala')
if (salaDaUrl) {
  menu.esconder()
  lobby.champIdAtual = menu.champId
  lobby.entrarPorLink(salaDaUrl.toUpperCase())
}

// ---------------- live update ----------------
live.start()
conectarHotReload()

// checa patch novo quando a aba volta a ficar visível
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) live.checar()
})

// ---------------- PWA ----------------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./public/sw.js').catch(() => {})
  })
}

// ---------------- console de desenvolvimento ----------------
// No devtools: CRC.patch({ versao:'9.9', campeoes:{ 'bananildo':{ stats:{ ataque: 999 } } } })
window.CRC = {
  CONFIG, CHAMPIONS, PATCH, live, sala, hud, minimapa, musica, match: null,
  patch: (p) => applyPatch(p, 'forcado'),
  reset: resetToBase,
  checar: () => live.checar(),
  versao: () => PATCH.versao
}

console.info('%c🏆 Crazy Royale Champions', 'font-size:16px;color:#facc15',
  '\nUse CRC.patch({...}) no console para testar balanceamento ao vivo.')
