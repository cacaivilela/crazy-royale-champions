// ============================================================
//  TRANSPORTE — como as mensagens viajam entre os jogadores
//  · PeerTransporte  : WebRTC via broker público do PeerJS
//                      (ninguém precisa hospedar servidor)
//  · LocalTransporte : BroadcastChannel, abas do mesmo navegador
//                      (usado nos testes e pra jogar em 2 abas)
//  API comum:
//    hospedar(codigo) / conectar(codigo) / enviarParaTodos(msg)
//    enviarAoHost(msg) / enviarPara(id, msg) / fechar()
//    callbacks: aoEntrar, aoSair, aoReceber, aoErro
// ============================================================

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   // sem 0/O/1/I pra não confundir

export function gerarCodigo (tam = 5) {
  let s = ''
  for (let i = 0; i < tam; i++) s += LETRAS[Math.floor(Math.random() * LETRAS.length)]
  return s
}

class Base {
  constructor () {
    this.souHost = false
    this.codigo = null
    this.meuId = 'eu'
    this.aoEntrar = () => {}
    this.aoSair = () => {}
    this.aoReceber = () => {}
    this.aoErro = () => {}
  }
}

// ------------------------------------------------------------
export class LocalTransporte extends Base {
  constructor () {
    super()
    this.canal = null
    this.conhecidos = new Set()
  }

  _abrir (codigo) {
    this.codigo = codigo
    this.canal = new BroadcastChannel('crc-sala-' + codigo)
    this.canal.onmessage = (ev) => {
      const { de, para, msg } = ev.data || {}
      if (!de || de === this.meuId) return
      if (para && para !== this.meuId) return
      if (msg && msg.t === '__ola') {
        if (this.souHost && !this.conhecidos.has(de)) {
          this.conhecidos.add(de)
          this.canal.postMessage({ de: this.meuId, para: de, msg: { t: '__oi' } })
          this.aoEntrar(de)
        }
        return
      }
      if (msg && msg.t === '__tchau') {
        this.conhecidos.delete(de)
        this.aoSair(de)
        return
      }
      if (msg && msg.t === '__oi') { this.pronto = true; return }
      this.aoReceber(de, msg)
    }
  }

  async hospedar (codigo = gerarCodigo()) {
    this.souHost = true
    this.meuId = 'host-' + Math.random().toString(36).slice(2, 7)
    this._abrir(codigo)
    return codigo
  }

  async conectar (codigo) {
    this.souHost = false
    this.meuId = 'p-' + Math.random().toString(36).slice(2, 7)
    this._abrir(codigo)
    this.canal.postMessage({ de: this.meuId, msg: { t: '__ola' } })
    return codigo
  }

  enviarParaTodos (msg) { if (this.canal) this.canal.postMessage({ de: this.meuId, msg }) }
  enviarPara (id, msg) { if (this.canal) this.canal.postMessage({ de: this.meuId, para: id, msg }) }
  enviarAoHost (msg) { this.enviarParaTodos(msg) }
  fechar () {
    if (!this.canal) return
    this.canal.postMessage({ de: this.meuId, msg: { t: '__tchau' } })
    this.canal.close()
    this.canal = null
  }
}

// ------------------------------------------------------------
export class PeerTransporte extends Base {
  constructor () {
    super()
    this.peer = null
    this.conexoes = new Map()      // id -> DataConnection
    this.conHost = null
  }

  _novoPeer (id) {
    if (!window.Peer) throw new Error('PeerJS não carregou (vendor/peerjs.min.js)')
    return new window.Peer(id, { debug: 1 })
  }

  _idDaSala (codigo) { return 'crazyroyale-champions-' + codigo }

  async hospedar (codigo = gerarCodigo()) {
    this.souHost = true
    this.codigo = codigo
    return new Promise((resolve, reject) => {
      const peer = this._novoPeer(this._idDaSala(codigo))
      this.peer = peer
      const tempo = setTimeout(() => reject(new Error('sem resposta do servidor de salas')), 12000)
      peer.on('open', (id) => {
        clearTimeout(tempo)
        this.meuId = id
        resolve(codigo)
      })
      peer.on('connection', (con) => this._ligarConexao(con))
      peer.on('error', (err) => {
        clearTimeout(tempo)
        if (err.type === 'unavailable-id') reject(new Error('esse código já está em uso, tente outro'))
        else this.aoErro(err)
      })
    })
  }

  async conectar (codigo) {
    this.souHost = false
    this.codigo = codigo
    return new Promise((resolve, reject) => {
      const peer = this._novoPeer(null)
      this.peer = peer
      const tempo = setTimeout(() => reject(new Error('nao achei essa sala')), 15000)
      peer.on('open', () => {
        this.meuId = peer.id
        const con = peer.connect(this._idDaSala(codigo), { reliable: true })
        this.conHost = con
        con.on('open', () => { clearTimeout(tempo); this._ligarConexao(con); resolve(codigo) })
        con.on('error', (e) => { clearTimeout(tempo); reject(e) })
      })
      peer.on('error', (err) => {
        clearTimeout(tempo)
        reject(new Error(err.type === 'peer-unavailable' ? 'sala nao encontrada' : err.message))
      })
    })
  }

  _ligarConexao (con) {
    this.conexoes.set(con.peer, con)
    con.on('data', (msg) => this.aoReceber(con.peer, msg))
    con.on('close', () => { this.conexoes.delete(con.peer); this.aoSair(con.peer) })
    con.on('error', () => { this.conexoes.delete(con.peer); this.aoSair(con.peer) })
    if (this.souHost) {
      if (con.open) this.aoEntrar(con.peer)
      else con.on('open', () => this.aoEntrar(con.peer))
    }
  }

  enviarParaTodos (msg) {
    for (const con of this.conexoes.values()) if (con.open) con.send(msg)
  }
  enviarPara (id, msg) {
    const con = this.conexoes.get(id)
    if (con && con.open) con.send(msg)
  }
  enviarAoHost (msg) { if (this.conHost && this.conHost.open) this.conHost.send(msg) }

  fechar () {
    for (const con of this.conexoes.values()) { try { con.close() } catch (e) { /* já foi */ } }
    this.conexoes.clear()
    if (this.peer) { try { this.peer.destroy() } catch (e) { /* já foi */ } }
    this.peer = null
  }
}

export function criarTransporte (tipo = 'peer') {
  return tipo === 'local' ? new LocalTransporte() : new PeerTransporte()
}
