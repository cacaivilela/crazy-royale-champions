// ============================================================
//  MENU — escolha de campeão, modos e janelas de ajuda/patch
//  A lista de campeões é reconstruída a cada patch (live update),
//  então dá pra adicionar campeão novo sem recarregar a página.
// ============================================================
import { CHAMPIONS, PATCH, CONFIG } from '../data/runtime.js'
import { bus } from '../core/events.js'
import { nivelUltimate } from '../game/abilities.js'
import { extraEquipado } from '../data/extras.js'
import { musica } from '../core/music.js'

const $ = (s) => document.querySelector(s)

const MAX_STAT = { vida: 1100, ataque: 36, alcance: 11, cadencia: 1.5, defesa: 26, velocidade: 10 }
const ROTULO = {
  vida: 'Vida', ataque: 'Ataque', alcance: 'Alcance',
  cadencia: 'Cadência', defesa: 'Defesa', velocidade: 'Velocidade'
}

export class Menu {
  constructor ({ aoJogar }) {
    this.aoJogar = aoJogar
    this.champId = CHAMPIONS[0].id
    this.modo = 'ranked'
    this.cheats = 'nenhum'
    this.el = {
      tela: $('#menu'), grid: $('#champ-grid'), contagem: $('#champ-count'),
      gridNovatos: $('#novato-grid'), contagemNovatos: $('#novato-count'),
      detalhe: $('#champ-detail'), modos: $('#mode-select'),
      badge: $('#patch-badge'), dot: $('#live-dot'), label: $('#live-label')
    }
    this._bind()
    this.renderar()
  }

  _bind () {
    $('#btn-play').addEventListener('click', () => this.aoJogar(this.champId, this.modo))
    $('#btn-again').addEventListener('click', () => this.aoJogar(this.champId, this.modo))
    $('#btn-menu').addEventListener('click', () => bus.emit('ir:menu'))
    const btnMusica = $('#btn-musica')
    const pintarMusica = () => { btnMusica.textContent = musica.ligada ? '🎵 Música: ligada' : '🔇 Música: desligada' }
    btnMusica.addEventListener('click', () => { musica.alternar(); pintarMusica() })
    bus.on('musica:mudou', pintarMusica)
    pintarMusica()

    $('#btn-help').addEventListener('click', () => this.modal(this._ajuda()))
    $('#btn-patch').addEventListener('click', () => this.modal(this._notas()))
    $('#modal-close').addEventListener('click', () => $('#modal').classList.add('hidden'))
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('#modal').classList.add('hidden') })

    const seletorCheat = document.querySelector('#menu .cheat-select')
    if (seletorCheat) {
      seletorCheat.addEventListener('click', (e) => {
        const b = e.target.closest('.cheat-opt')
        if (!b) return
        this.cheats = b.dataset.cheat
        seletorCheat.querySelectorAll('.cheat-opt').forEach(x => x.classList.toggle('active', x === b))
      })
    }

    this.el.modos.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn')
      if (!btn) return
      this.modo = btn.dataset.mode
      this.el.modos.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn))
    })

    bus.on('patch:aplicado', () => this.renderar())
    bus.on('extra:equipado', () => this.renderar())
    bus.on('live:status', ({ online, versao }) => {
      this.el.dot.classList.toggle('on', online)
      this.el.label.textContent = online ? 'live update ativo' : 'offline (usando patch local)'
      this.el.badge.textContent = 'patch ' + versao
    })
  }

  mostrar () { this.el.tela.classList.remove('hidden') }
  esconder () { this.el.tela.classList.add('hidden') }

  renderar () {
    const g = this.el.grid
    const gn = this.el.gridNovatos
    g.innerHTML = ''
    gn.innerHTML = ''
    if (!CHAMPIONS.some(c => c.id === this.champId)) this.champId = CHAMPIONS[0].id

    const cartao = (c) => {
      const div = document.createElement('div')
      div.className = 'card' + (c.id === this.champId ? ' sel' : '') + (c.novato ? ' novato' : '')
      div.innerHTML = `${c.novato ? '<span class="selo">NOVATO</span>' : ''}
        <span class="emoji">${c.emoji}</span>
        <span class="nome">${c.nome}</span>
        <span class="role">${c.role}</span>`
      div.addEventListener('click', () => {
        this.champId = c.id
        this.renderar()
        bus.emit('menu:campeao', { champId: c.id })
      })
      return div
    }

    const campeoes = CHAMPIONS.filter(c => !c.novato)
    const novatos = CHAMPIONS.filter(c => c.novato)
    for (const c of campeoes) g.appendChild(cartao(c))
    for (const c of novatos) gn.appendChild(cartao(c))
    this.el.contagemNovatos.textContent = `(${novatos.length})`
    this.el.contagem.textContent = `(${campeoes.length})`
    this.el.badge.textContent = 'patch ' + PATCH.versao
    this._detalhe()
  }

  _detalhe () {
    const c = CHAMPIONS.find(x => x.id === this.champId)
    if (!c) return
    const barras = Object.keys(ROTULO).map(k => {
      const v = Math.min(1, (c.stats[k] || 0) / MAX_STAT[k])
      return `<div class="statline"><b>${ROTULO[k]}</b><i><s style="width:${(v * 100).toFixed(0)}%"></s></i></div>`
    }).join('')

    const hab = [...c.habilidades, c.ultimate].map(h => `
      <div class="loadout-card">
        <span class="label">${h.key === 'R' ? 'ULTIMATE · NÍVEL ' + nivelUltimate() : 'HABILIDADE ' + h.key}</span>
        <strong>${h.icone} ${h.nome}</strong>
        <em>${this._descricao(h)}</em>
      </div>`).join('')

    const extra = extraEquipado(c.id)
    const cartaoExtra = extra
      ? `<div class="loadout-card">
           <span class="label">🎡 EXTRA DA ROLETA · ${extra.tipo === 'passiva' ? 'PASSIVA' : 'SLOT X'}</span>
           <strong>${extra.icone} ${extra.nome}</strong>
           <em>${extra.descricao}</em>
         </div>`
      : ''

    this.el.detalhe.innerHTML = `
      <div class="loadout-card">
        <span class="label">${c.novato ? '🆕 NOVATO (exclusivo do Champions)' : 'CAMPEÃO'}</span>
        <strong>${c.emoji} ${c.nome}</strong>
        <em>${c.role} — ${c.lore || ''}</em>
        ${extra ? `<span class="extra-tag">🎡 ${extra.icone} ${extra.nome}</span>` : ''}
      </div>
      ${cartaoExtra}
      <div class="loadout-card">
        <span class="label">ATRIBUTOS</span>
        ${barras}
      </div>
      ${hab}`
  }

  _descricao (h) {
    const partes = []
    const tipos = {
      dash: 'avanço', projetil: 'projétil', area: 'área',
      cone: 'cone', buff: 'buff', cura: 'cura'
    }
    partes.push(`${tipos[h.tipo] || h.tipo} · recarga ${h.cooldown}s`)
    if (h.dano) partes.push(`${h.dano} de dano (+${h.danoNivel || 0}/nível)`)
    if (h.cura) partes.push(`cura ${h.cura}`)
    if (h.escudo) partes.push(`escudo ${h.escudo}`)
    if (h.lentidao) partes.push(`lentidão ${Math.round(h.lentidao * 100)}%`)
    if (h.buffAtaque) partes.push(`+${Math.round(h.buffAtaque * 100)}% ataque`)
    if (h.buffVelocidade) partes.push(`+${Math.round(h.buffVelocidade * 100)}% velocidade`)
    if (h.reducaoDano) partes.push(`-${Math.round(h.reducaoDano * 100)}% dano recebido`)
    if (h.roubaVida) partes.push(`${Math.round(h.roubaVida * 100)}% roubo de vida`)
    if (h.buffCadencia) partes.push(`+${Math.round(h.buffCadencia * 100)}% cadência`)
    if (h.curaAliado) partes.push(`cura aliados ${h.curaAliado}/tick`)
    if (h.perfura) partes.push('perfura')
    if (h.teleguiado) partes.push('teleguiado')
    if (h.raioExplosao) partes.push('explode em área')
    if (h.imparavel) partes.push('imparável')
    if (h.empurrao) partes.push('empurra')
    if (h.invisivel) partes.push('fica invisível')
    return partes.join(' · ')
  }

  modal (html) {
    $('#modal-body').innerHTML = html
    $('#modal').classList.remove('hidden')
  }

  _ajuda () {
    return `<h3>Como jogar 🎮</h3>
      <ul>
        <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> — andar (no celular use o direcional)</li>
        <li><kbd>Espaço</kbd> — <b>atacar</b> (recarga quase zero; segurar mantém o tiro). O clique do mouse também atira.</li>
        <li>Mouse — mirar: você acerta o inimigo mais perto do cursor dentro do alcance</li>
        <li><kbd>Q</kbd> <kbd>E</kbd> — habilidades · <kbd>R</kbd> — ultimate (nível ${nivelUltimate()})</li>
        <li><kbd>X</kbd> — habilidade extra da 🎡 Roleta Habilidosa (quando for uma ativa)</li>
        <li><kbd>F</kbd> — despejar tinta no baldão (ou só fique parado dentro do anel)</li>
        <li><kbd>B</kbd> — voltar pra base · <kbd>Esc</kbd> — pausar</li>
      </ul>
      <h3>Objetivo 🎯</h3>
      <ul>
        <li>Derrote selvagens e inimigos para <b>coletar tinta</b> 🎨</li>
        <li>Entre no anel de um <b>baldão inimigo</b> e fique parado para marcar</li>
        <li>Encher um baldão o destrói — destrua o baldão final para vencer na hora</li>
        <li>No último ${CONFIG.partida.tempoFinalSeg}s toda marcação vale <b>em dobro</b></li>
        <li>O <b>Baldão Chefe</b> nasce no centro aos ${Math.round(CONFIG.chefao.spawnEmSeg / 60)} min e dá buff pro time</li>
      </ul>
      <h3>Modos</h3>
      <ul>
        <li><b>Partida Rápida</b> — 3v3, tinta no baldão inimigo</li>
        <li><b>Modo Boss</b> — você + 5 COMs contra o Baldão Chefão gigante</li>
        <li><b>Modo Caos</b> — tudo igual, mas com metade da recarga</li>
        <li><b>Online</b> — sala com código: 6 humanos vs 6 COMs, ou 12 contra o Baldão Supremo</li>
      </ul>
      <h3>Dicas</h3>
      <ul>
        <li>Dentro do mato você fica invisível pro inimigo</li>
        <li>Levar dano cancela a marcação — vá acompanhado</li>
      </ul>`
  }

  _notas () {
    const notas = (PATCH.notas || []).map(n => `<li>${n}</li>`).join('') || '<li>Sem notas.</li>'
    return `<h3>📡 Patch ${PATCH.versao}</h3>
      <p style="opacity:.7;font-size:13px">origem: ${PATCH.origem} · aplicado: ${PATCH.aplicadoEm || 'no carregamento'}</p>
      <ul>${notas}</ul>
      <h3>Live update</h3>
      <p style="font-size:14px;line-height:1.6">
        O jogo procura <code>content/patch.json</code> a cada ${CONFIG.liveUpdate.intervaloSeg}s.
        Mudou a <code>versao</code> do arquivo? O balanceamento entra <b>na hora</b>, sem recarregar —
        inclusive campeões novos.
      </p>`
  }
}
