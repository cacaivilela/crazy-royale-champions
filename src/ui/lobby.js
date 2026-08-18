// ============================================================
//  LOBBY ONLINE — criar sala, entrar com código e começar
//  O botão "COMEÇAR" libera assim que 1 pessoa entra: o resto
//  do time humano é preenchido com COMs.
// ============================================================
import { bus } from '../core/events.js'
import { CONFIG, CHAMPIONS, getChampion } from '../data/runtime.js'
import { sala } from '../net/sala.js'
import { testarConexao } from '../net/transporte.js'
import { MODOS } from '../game/cheats.js'
import { getExtra } from '../data/extras.js'
import { Saguao } from '../game/saguao.js'

const $ = (s) => document.querySelector(s)

export class Lobby {
  constructor ({ champIdAtual, aoVoltar, aoTrocarCampeao, input }) {
    this.champIdAtual = champIdAtual
    this.aoVoltar = aoVoltar
    this.aoTrocarCampeao = aoTrocarCampeao
    this.el = {
      tela: $('#lobby'), entrada: $('#lobby-entrada'), sala: $('#lobby-sala'),
      nome: $('#lobby-nome'), codigo: $('#lobby-codigo'), local: $('#lobby-local'),
      codigoAtual: $('#lobby-codigo-atual'), jogadores: $('#lobby-jogadores'),
      contagem: $('#lobby-contagem'), dica: $('#lobby-dica'), status: $('#lobby-status'),
      comecar: $('#btn-comecar'),
      cheats: $('#lobby-cheats'), cheatInfo: $('#lobby-cheat-info'), modos: $('#lobby-modos'),
      link: $('#lobby-link'), diag: $('#lobby-diag'),
      saguao: $('#saguao-canvas'), btnSaguao: $('#btn-saguao'), btnCamera: $('#btn-camera')
    }
    this.cheatsEscolhido = 'nenhum'
    this.modoEscolhido = 'normal'
    this.saguao = new Saguao({
      canvas: this.el.saguao,
      input,
      aoPose: (pose) => sala.enviarPose(pose)
    })
    this._bind()
  }

  get tipo () { return this.el.local.checked ? 'local' : 'peer' }

  _bind () {
    $('#btn-criar').addEventListener('click', () => this.criar())
    $('#btn-entrar').addEventListener('click', () => this.entrar())
    $('#btn-copiar').addEventListener('click', () => this.copiar())
    $('#btn-copiar-link').addEventListener('click', () => this.copiarLink())
    $('#btn-testar').addEventListener('click', () => this.testar())
    $('#btn-sair-sala').addEventListener('click', () => { sala.sair(); this.mostrarEntrada() })
    $('#btn-voltar-menu').addEventListener('click', () => { sala.sair(); this.esconder(); this.aoVoltar() })
    this.el.btnSaguao.addEventListener('click', () => this.focarSaguao())
    this.el.btnCamera.addEventListener('click', () => this.alternarCamera())
    $('#btn-trocar-champ').addEventListener('click', () => this.aoTrocarCampeao())
    this.el.comecar.addEventListener('click', () => {
      this.status('preparando o estádio…')
      sala.iniciar()
    })
    this.el.codigo.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.entrar() })
    this.el.modos.addEventListener('click', (e) => {
      const b = e.target.closest('.cheat-opt')
      if (!b) return
      this.modoEscolhido = b.dataset.modo
      this.el.modos.querySelectorAll('.cheat-opt').forEach(x => x.classList.toggle('active', x === b))
    })

    this.el.cheats.addEventListener('click', (e) => {
      const b = e.target.closest('.cheat-opt')
      if (!b) return
      this.cheatsEscolhido = b.dataset.cheat
      this.el.cheats.querySelectorAll('.cheat-opt').forEach(x => x.classList.toggle('active', x === b))
    })

    bus.on('sala:lobby', (estado) => this.renderar(estado))
    bus.on('sala:diagnostico', ({ texto }) => { this.el.diag.textContent = '· ' + texto })
    bus.on('menu:campeao', ({ champId }) => this.definirCampeao(champId))
    bus.on('sala:erro', ({ mensagem }) => this.status('⚠️ ' + mensagem))
    bus.on('sala:saguao', (pose) => this.saguao.aplicarPose(pose.id, pose))
    bus.on('sala:iniciar', () => this.pararSaguao())
    bus.on('sala:saiu-jogador', () => this.status('um jogador saiu da sala'))
  }

  // ---------------- ações ----------------
  async criar () {
    this.status('criando sala…')
    try {
      const codigo = await sala.criar({
        nome: this.el.nome.value.trim() || 'Anfitrião',
        champId: this.champIdAtual,
        tipo: this.tipo,
        cheats: this.cheatsEscolhido,
        modoJogo: this.modoEscolhido
      })
      this.mostrarSala(codigo)
      this.el.link.textContent = this.linkConvite
      this.status(`sala ${codigo} criada! passe o código (ou o link) pros seus amigos 🎉`)
    } catch (e) {
      this.status('⚠️ não deu pra criar a sala: ' + e.message)
    }
  }

  async entrar () {
    const codigo = this.el.codigo.value.trim().toUpperCase()
    if (codigo.length < 3) return this.status('⚠️ digite o código da sala')
    this.status('entrando…')
    try {
      this.el.diag.textContent = ''
      await sala.entrar(codigo, {
        nome: this.el.nome.value.trim(),
        champId: this.champIdAtual,
        tipo: this.tipo
      })
      this.mostrarSala(codigo)
      this.el.link.textContent = this.linkConvite
      this.status('conectado! esperando o anfitrião começar…')
    } catch (e) {
      this.status('⚠️ ' + (e.message || 'não achei essa sala'))
    }
  }

  copiar () {
    const txt = sala.codigo || ''
    if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {})
    this.status('código ' + txt + ' copiado ✅')
  }

  get linkConvite () {
    return location.origin + location.pathname + '?sala=' + (sala.codigo || '')
  }

  copiarLink () {
    const url = this.linkConvite
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {})
    if (navigator.share) navigator.share({ title: 'Crazy Royale Champions', text: 'Bora jogar comigo!', url }).catch(() => {})
    this.status('link copiado ✅ — mande no WhatsApp que já entra direto')
  }

  /** Diz se esta rede consegue fazer WebRTC (a causa nº 1 de "não funcionou"). */
  async testar () {
    this.status('🔍 testando a conexão desta rede…')
    const r = await testarConexao()
    const linha = [
      r.host ? '✅ rede local' : '❌ rede local',
      r.stun ? '✅ IP público (STUN)' : '❌ IP público (STUN)',
      r.turn ? '✅ retransmissor (TURN)' : '⚠️ retransmissor (TURN)'
    ].join(' · ')
    const veredito = (r.stun || r.turn)
      ? (r.turn ? 'Tudo certo — dá pra jogar online.' : 'Deve funcionar na maioria das redes.')
      : 'Esta rede está bloqueando o jogo online. Tente o 4G do celular ou outra rede.'
    this.status(linha + ' — ' + veredito)
    this.el.diag.textContent = r.detalhe.join(' · ')
  }

  /** Entrada automática por link (?sala=CODIGO). */
  async entrarPorLink (codigo) {
    this.el.codigo.value = codigo
    this.mostrar()
    this.status('entrando na sala ' + codigo + ' pelo link…')
    await this.entrar()
  }

  definirCampeao (champId) {
    this.champIdAtual = champId
    this.saguao.definirCampeao(champId)
    if (sala.tr) sala.escolherCampeao(champId)
  }

  // ---------------- tela ----------------
  mostrar () { this.el.tela.classList.remove('hidden') }

  esconder () {
    this.pararSaguao()
    this.el.tela.classList.add('hidden')
  }

  mostrarEntrada () {
    this.pararSaguao()
    this.el.entrada.classList.remove('hidden')
    this.el.sala.classList.add('hidden')
    this.status('')
  }

  mostrarSala (codigo) {
    this.el.entrada.classList.add('hidden')
    this.el.sala.classList.remove('hidden')
    this.el.codigoAtual.textContent = codigo
    this.el.comecar.classList.toggle('hidden', !sala.souHost)
    this.iniciarSaguao()
  }

  // ---------------- saguão ----------------
  /** Liga a pracinha 3D onde todo mundo anda enquanto a sala enche. */
  iniciarSaguao () {
    this.saguao.iniciar({
      meuId: sala.meuId,
      nome: (sala.eu && sala.eu.nome) || this.el.nome.value.trim() || 'Você',
      champId: this.champIdAtual,
      jogadores: sala.jogadores
    })
    // já entra compacto: o painel inteiro tapa justamente o meio da tela,
    // que é onde os bonecos andam.
    this.compactar(true)
  }

  pararSaguao () {
    this.saguao.parar()
    this.compactar(false)
    this.el.btnCamera.textContent = '📷 ligar minha câmera'
  }

  /** Alterna entre painel compacto (saguão à mostra) e painel inteiro. */
  compactar (ligado) {
    this.el.tela.classList.toggle('saguao-focado', ligado)
    this.el.btnSaguao.textContent = ligado ? '📋 ver a sala inteira' : '🕹️ voltar pro saguão'
    this.saguao.redimensionar()
  }

  focarSaguao () {
    this.compactar(!this.el.tela.classList.contains('saguao-focado'))
  }

  /** Liga/desliga a webcam: o seu rosto vai pro lugar do emoji do campeão. */
  async alternarCamera () {
    this.el.btnCamera.disabled = true
    const r = await this.saguao.alternarCamera()
    this.el.btnCamera.disabled = false
    this.el.btnCamera.textContent = r.ligada ? '📷 desligar câmera' : '📷 ligar minha câmera'
    if (r.msg) this.status(r.msg)
  }

  status (txt) { this.el.status.textContent = txt }

  renderar (estado) {
    const jogadores = estado.jogadores || []
    this.saguao.sincronizar(jogadores, sala.meuId, this.champIdAtual)
    const ehBoss = (estado.modoJogo || sala.modoJogo) === 'boss'
    const max = estado.max || sala.maxJogadores
    this.el.codigoAtual.textContent = estado.codigo || sala.codigo || '—'
    const modo = MODOS[estado.cheats || sala.cheats || 'nenhum']
    const arena = ehBoss ? 'estádio 6x (3x o online normal)' : 'estádio 2x'
    this.el.cheatInfo.textContent =
      `${ehBoss ? '🐍 MODO BOSS' : '🏆 NORMAL'} · ${arena} · ${modo.icone} ${modo.nome}`
    this.el.contagem.textContent = `(${jogadores.length}/${max})`

    this.el.jogadores.innerHTML = ''
    jogadores.forEach((j, i) => {
      const c = getChampion(j.champId) || CHAMPIONS[0]
      const ex = getExtra(j.extraId)
      const div = document.createElement('div')
      div.className = 'lobby-jog'
      div.innerHTML = `<span class="emoji">${c.emoji}</span>
        <b>${j.nome}${j.id === sala.meuId ? ' (você)' : ''}</b>
        <span class="tagzin">${c.nome.toUpperCase()}${ex ? ' · 🎡 ' + ex.icone + ' ' + ex.nome.toUpperCase() : ''}${j.ehHost ? ' · ANFITRIÃO' : ''}</span>`
      this.el.jogadores.appendChild(div)
      void i
    })
    for (let i = jogadores.length; i < max; i++) {
      const div = document.createElement('div')
      div.className = 'lobby-jog com'
      div.innerHTML = '<span class="emoji">🤖</span><b>vaga livre</b><span class="tagzin">VIRA COM</span>'
      this.el.jogadores.appendChild(div)
    }

    const outros = jogadores.length - 1
    if (sala.souHost) {
      this.el.comecar.disabled = outros < 1
      const contra = ehBoss ? 'o BALDÃO SUPREMO 👹' : '6 COMs'
      this.el.comecar.textContent = outros < 1
        ? '▶ COMEÇAR (espere entrar 1 pessoa)'
        : `▶ COMEÇAR — ${jogadores.length} humano(s) + ${max - jogadores.length} COM(s) vs ${contra}`
      this.el.dica.textContent = outros < 1
        ? 'Assim que alguém entrar com o código, o botão libera e as vagas que sobrarem viram COMs.'
        : `Pode começar! As ${max - jogadores.length} vaga(s) que sobrarem viram COMs no seu time.`
    } else {
      this.el.comecar.classList.add('hidden')
      this.el.dica.textContent = 'Esperando o anfitrião começar a partida…'
    }
  }
}
