// ============================================================
//  SALA ONLINE — lobby com código, roster e roteamento das mensagens
//  O host simula a partida inteira; os outros mandam input e
//  recebem snapshots (host autoritativo, simples e à prova de trapaça
//  básica). Time A = humanos (+COMs pra completar), time B = 6 COMs.
// ============================================================
import { CONFIG, CHAMPIONS } from '../data/runtime.js'
import { bus } from '../core/events.js'
import { criarTransporte, gerarCodigo, TAMANHO_MAX_CODIGO } from './transporte.js'
import { extraEquipado } from '../data/extras.js'

const nomeAnonimo = () => 'Anônimo ' + Math.floor(Math.random() * 900 + 100)

export class Sala {
  constructor () {
    this.tr = null
    this.codigo = null
    this.souHost = false
    this.iniciada = false
    this.jogadores = []          // [{ id, nome, champId, ehHost }]
    this.match = null
    this.meuId = null
    this.cheats = 'nenhum'
    this.modoJogo = 'normal'         // 'normal' (6v6) | 'boss' (12 x chefão)
  }

  get maxJogadores () {
    return this.modoJogo === 'boss' ? CONFIG.boss.jogadores : CONFIG.online.jogadoresPorTime
  }

  get escalaArena () {
    const base = CONFIG.online.multiplicadorArena
    return this.modoJogo === 'boss' ? base * CONFIG.boss.multiplicadorArenaExtra : base
  }

  get cheia () { return this.jogadores.length >= this.maxJogadores }
  get eu () { return this.jogadores.find(j => j.id === this.meuId) }

  // ---------------- criar / entrar ----------------
  async criar ({ nome, champId, tipo = 'peer', codigo = null, cheats = 'nenhum', modoJogo = 'normal' }) {
    this.modoJogo = modoJogo
    // o código é sempre sorteado pelo jogo (ninguém escolhe); `codigo` só existe
    // pra testes automatizados chamarem direto pelo console.
    const forcado = (codigo || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    codigo = forcado.length >= 3
      ? forcado.slice(0, TAMANHO_MAX_CODIGO)
      : gerarCodigo(CONFIG.online.tamanhoCodigo)
    this.cheats = cheats
    this.tr = criarTransporte(tipo)
    this._ligar()
    this.codigo = await this.tr.hospedar(codigo)
    this.souHost = true
    this.meuId = this.tr.meuId
    this.jogadores = [{
      id: this.meuId, nome: nome || 'Anfitrião', champId, ehHost: true,
      extraId: (extraEquipado(champId) || {}).id || null
    }]
    this._avisarLobby()
    return this.codigo
  }

  async entrar (codigo, { nome, champId, tipo = 'peer' }) {
    this.tr = criarTransporte(tipo)
    this._ligar()
    this.codigo = await this.tr.conectar(codigo.trim().toUpperCase().slice(0, TAMANHO_MAX_CODIGO))
    this.souHost = false
    this.meuId = this.tr.meuId
    this.meuNome = nome || nomeAnonimo()
    this.meuChamp = champId
    this.tr.enviarAoHost({
      t: 'ola', nome: this.meuNome, champId,
      extraId: (extraEquipado(champId) || {}).id || null
    })
    return this.codigo
  }

  escolherCampeao (champId) {
    const extraId = (extraEquipado(champId) || {}).id || null
    const eu = this.eu
    if (eu) { eu.champId = champId; eu.extraId = extraId }
    if (this.souHost) this._avisarLobby()
    else if (this.tr) this.tr.enviarAoHost({ t: 'champ', champId, extraId })
    this.meuChamp = champId
  }

  /** Cliente: o anfitrião sumiu (fechou a aba, caiu a internet, saiu da sala). */
  hostCaiu (motivo = 'A partida online acabou porque quem criou a sala desconectou.') {
    if (this.souHost || this.hostJaCaiu) return
    this.hostJaCaiu = true
    bus.emit('sala:hostSaiu', { motivo })
  }

  sair () {
    this.hostJaCaiu = false
    if (this.tr) this.tr.fechar()
    this.tr = null
    this.jogadores = []
    this.iniciada = false
    this.codigo = null
    this.match = null
    bus.emit('sala:saiu', {})
  }

  // ---------------- host: começar a partida ----------------
  /** Monta o roster: humanos no time A (o resto vira COM) e 6 COMs no time B. */
  montarRoster () {
    const porTime = this.maxJogadores
    const usados = new Set(this.jogadores.map(j => j.champId))
    const sortear = () => {
      const livres = CHAMPIONS.filter(c => !usados.has(c.id))
      const lista = livres.length ? livres : CHAMPIONS
      const c = lista[Math.floor(Math.random() * lista.length)]
      usados.add(c.id)
      return c.id
    }

    const roster = []
    this.jogadores.slice(0, porTime).forEach((j, i) => {
      roster.push({
        id: j.id, nome: j.nome, champId: j.champId, extraId: j.extraId || null,
        time: 'A', controle: 'humano', ordem: i
      })
    })
    for (let i = roster.length; i < porTime; i++) {
      roster.push({ id: 'comA' + i, nome: 'COM ' + (i + 1), champId: sortear(), time: 'A', controle: 'com' })
    }
    // no modo boss não existe time B de campeões: o inimigo é o chefão
    if (this.modoJogo !== 'boss') {
      for (let i = 0; i < porTime; i++) {
        roster.push({ id: 'comB' + i, nome: 'COM ' + (i + 1), champId: sortear(), time: 'B', controle: 'com' })
      }
    }
    return roster
  }

  iniciar () {
    if (!this.souHost || this.iniciada) return null
    const roster = this.montarRoster()
    const payload = {
      t: 'iniciar',
      roster,
      escala: this.escalaArena,
      cheats: this.cheats,
      modoJogo: this.modoJogo,
      versaoPatch: CONFIG.versao
    }
    this.iniciada = true
    this.tr.enviarParaTodos(payload)
    this._comecarLocal(payload)
    return payload
  }

  /** Ajusta o roster para o ponto de vista deste jogador e avisa o main. */
  _comecarLocal (payload) {
    const roster = payload.roster.map(v => ({
      ...v,
      controle: v.controle === 'com' ? 'com' : (v.id === this.meuId ? 'local' : 'remoto')
    }))
    this.cheats = payload.cheats || 'nenhum'
    this.modoJogo = payload.modoJogo || 'normal'
    bus.emit('sala:iniciar', {
      roster,
      escala: payload.escala,
      cheats: this.cheats,
      modoJogo: this.modoJogo,
      souHost: this.souHost,
      rede: this,
      meuId: this.meuId
    })
  }

  // ---------------- rede ----------------
  enviarParaTodos (msg) { if (this.tr) this.tr.enviarParaTodos(msg) }

  /** Manda a minha posição no saguão (só vale antes da partida começar). */
  enviarPose (pose) {
    if (!this.tr || this.iniciada) return
    if (this.souHost) this.tr.enviarParaTodos({ t: 'sag', id: this.meuId, ...pose })
    else this.tr.enviarAoHost({ t: 'sag', ...pose })
  }

  enviarAoHost (msg) { if (this.tr) this.tr.enviarAoHost(msg) }

  _avisarLobby () {
    const estado = { t: 'lobby', codigo: this.codigo, jogadores: this.jogadores,
      max: this.maxJogadores, cheats: this.cheats, modoJogo: this.modoJogo }
    if (this.souHost) this.tr.enviarParaTodos(estado)
    bus.emit('sala:lobby', estado)
  }

  _ligar () {
    const tr = this.tr
    tr.aoDiagnostico = (texto) => bus.emit('sala:diagnostico', { texto })

    tr.aoEntrar = (id) => {
      if (!this.souHost) return
      bus.emit('sala:conectou', { id })
    }

    tr.aoSair = (id) => {
      if (this.souHost) {
        this.jogadores = this.jogadores.filter(j => j.id !== id)
        this._avisarLobby()
        if (this.match) {
          this.match.comandos.delete(id)
          if (this.iniciada) this.match.virarCom(id)      // ninguém fica de estátua
        }
        bus.emit('sala:saiu-jogador', { id })
        return
      }
      // sou cliente: quem caiu foi o anfitrião — acabou a brincadeira
      this.hostCaiu()
    }

    tr.aoErro = (err) => bus.emit('sala:erro', { mensagem: err.message || String(err) })

    tr.aoReceber = (de, msg) => {
      if (!msg || !msg.t) return
      // ---------- host ----------
      if (this.souHost) {
        if (msg.t === 'ola') {
          if (this.iniciada || this.cheia) {
            this.tr.enviarPara(de, { t: 'recusado', motivo: this.iniciada ? 'partida já começou' : 'sala cheia' })
            return
          }
          if (!this.jogadores.some(j => j.id === de)) {
            this.jogadores.push({
              id: de, nome: msg.nome || nomeAnonimo(),
              champId: msg.champId || CHAMPIONS[0].id,
              extraId: msg.extraId || null, ehHost: false
            })
          }
          this._avisarLobby()
          return
        }
        if (msg.t === 'champ') {
          const j = this.jogadores.find(x => x.id === de)
          if (j) { j.champId = msg.champId; j.extraId = msg.extraId || null; this._avisarLobby() }
          return
        }
        if (msg.t === 'sag') {
          // pose do saguão: o host carimba quem mandou e espalha pros outros
          const eco = { t: 'sag', id: de, x: msg.x, z: msg.z, a: msg.a, y: msg.y, m: msg.m }
          this.tr.enviarParaTodos(eco)
          bus.emit('sala:saguao', eco)
          return
        }
        if (msg.t === 'cmd' && this.match) { this.match.receberComando(de, msg); return }
        if (msg.t === 'cheat' && this.match) { this.match.receberCheat(de, msg.texto); return }
      }

      // ---------- cliente ----------
      if (msg.t === 'lobby') {
        this.jogadores = msg.jogadores
        this.codigo = msg.codigo
        this.cheats = msg.cheats || 'nenhum'
        this.modoJogo = msg.modoJogo || 'normal'
        bus.emit('sala:lobby', msg)
        return
      }
      if (msg.t === 'sag') { bus.emit('sala:saguao', msg); return }
      if (msg.t === 'iniciar') { this.iniciada = true; this._comecarLocal(msg); return }
      if (msg.t === 'recusado') { bus.emit('sala:erro', { mensagem: msg.motivo }); return }
      if (!this.match) return
      if (msg.t === 'snap') this.match.receberSnapshot(msg)
      else if (msg.t === 'fx') this.match.receberEfeito(msg)
      else if (msg.t === 'selvagem') this.match.receberSelvagem(msg)
      else if (msg.t === 'capangas') this.match.receberCapangas(msg)
      else if (msg.t === 'fim') this.match.receberFim(msg)
      else if (msg.t === 'evt') this.match.receberEvento(msg)
    }
  }
}

export const sala = new Sala()
