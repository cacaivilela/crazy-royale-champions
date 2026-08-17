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
export const TAMANHO_MAX_CODIGO = 10

export function gerarCodigo (tam = TAMANHO_MAX_CODIGO) {
  tam = Math.max(3, Math.min(TAMANHO_MAX_CODIGO, tam))
  let s = ''
  for (let i = 0; i < tam; i++) s += LETRAS[Math.floor(Math.random() * LETRAS.length)]
  return s
}

// Servidores de conexão: STUN descobre seu IP público; TURN retransmite
// quando os dois lados estão atrás de NAT/CGNAT (caso comum entre casas
// diferentes, 4G e operadoras). Sem TURN, muita conexão simplesmente não fecha.
export const SERVIDORES_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
]

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
    const peer = new window.Peer(id, {
      debug: 1,
      config: { iceServers: SERVIDORES_ICE, iceCandidatePoolSize: 4 }
    })
    // se cair a ligação com o servidor de salas, tenta voltar sozinho
    peer.on('disconnected', () => {
      this._diag('conexão com o servidor de salas caiu — reconectando…')
      setTimeout(() => { try { peer.reconnect() } catch (e) { /* já morreu */ } }, 800)
    })
    return peer
  }

  _diag (texto) { if (this.aoDiagnostico) this.aoDiagnostico(texto) }

  _idDaSala (codigo) { return 'crazyroyale-champions-' + codigo }

  async hospedar (codigo = gerarCodigo()) {
    this.souHost = true
    this.codigo = codigo
    return new Promise((resolve, reject) => {
      const peer = this._novoPeer(this._idDaSala(codigo))
      this.peer = peer
      const tempo = setTimeout(() => reject(new Error('o servidor de salas não respondeu — tente de novo em alguns segundos')), 25000)
      this._diag('falando com o servidor de salas…')
      peer.on('open', (id) => {
        clearTimeout(tempo)
        this.meuId = id
        this._diag('sala aberta! esperando alguém entrar…')
        resolve(codigo)
      })
      peer.on('connection', (con) => { this._diag('alguém está entrando…'); this._ligarConexao(con) })
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
      const tempo = setTimeout(() => reject(new Error(
        'não consegui conectar na sala. Confirme o código e se a pessoa ainda está com a tela da sala aberta. ' +
        'Se o código estiver certo, pode ser a rede bloqueando — tente pelo 4G do celular ou use o botão 🔍 testar conexão.'
      )), 30000)
      this._diag('falando com o servidor de salas…')
      peer.on('open', () => {
        this.meuId = peer.id
        this._diag('procurando a sala ' + codigo + '…')
        const con = peer.connect(this._idDaSala(codigo), { reliable: true })
        this.conHost = con
        con.on('open', () => {
          clearTimeout(tempo)
          this._diag('conectado ao anfitrião ✅')
          this._ligarConexao(con)
          resolve(codigo)
        })
        con.on('error', (e) => { clearTimeout(tempo); reject(e) })
        // acompanha o aperto de mão do WebRTC (é aqui que costuma travar)
        setTimeout(() => {
          const pc = con.peerConnection
          if (!pc || con.open) return
          this._diag('negociando conexão (' + pc.iceConnectionState + ')…')
          pc.oniceconnectionstatechange = () => {
            this._diag('conexão: ' + pc.iceConnectionState)
            if (pc.iceConnectionState === 'failed') {
              clearTimeout(tempo)
              reject(new Error('a rede de vocês bloqueou a conexão direta. Tente outra rede (4G do celular costuma resolver).'))
            }
          }
        }, 1200)
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

/**
 * Testa se este computador/rede consegue usar WebRTC.
 * Retorna { host, stun, turn, detalhe } — sem `stun` nem `turn` a conexão
 * entre redes diferentes provavelmente não vai fechar.
 */
export async function testarConexao (tempoMs = 8000) {
  const res = { host: false, stun: false, turn: false, detalhe: [] }
  if (!window.RTCPeerConnection) { res.detalhe.push('este navegador não tem WebRTC'); return res }
  const pc = new RTCPeerConnection({ iceServers: SERVIDORES_ICE })
  pc.createDataChannel('teste')
  await pc.setLocalDescription(await pc.createOffer())
  await new Promise((resolve) => {
    const fim = setTimeout(resolve, tempoMs)
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) { clearTimeout(fim); return resolve() }
      const c = ev.candidate.candidate
      if (c.includes(' typ host')) res.host = true
      if (c.includes(' typ srflx')) res.stun = true
      if (c.includes(' typ relay')) res.turn = true
    }
  })
  try { pc.close() } catch (e) { /* ok */ }
  if (!res.stun && !res.turn) res.detalhe.push('a rede parece bloquear WebRTC (firewall/escola/trabalho)')
  else if (!res.turn) res.detalhe.push('sem retransmissor: conexão só fecha em redes mais abertas')
  return res
}

export function criarTransporte (tipo = 'peer') {
  return tipo === 'local' ? new LocalTransporte() : new PeerTransporte()
}
