// ============================================================
//  HOT RELOAD de desenvolvimento (funciona com `python3 dev.py`)
//  O servidor manda eventos SSE em /__live quando um arquivo muda:
//    css      -> troca o <link> sem perder a partida
//    content  -> refaz o fetch do patch (live update instantâneo)
//    js/html  -> recarrega a página
//  Em produção (GitHub Pages) o EventSource falha e é ignorado.
// ============================================================
import { bus } from '../core/events.js'
import { live } from './liveupdate.js'

export function conectarHotReload () {
  if (!('EventSource' in window)) return
  const ehLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname) ||
                  location.hostname.startsWith('192.168.') || location.protocol === 'file:'
  if (!ehLocal) return

  let es
  try { es = new EventSource('/__live') } catch { return }

  es.addEventListener('open', () => {
    console.info('%c[dev] hot reload conectado', 'color:#22c55e')
    bus.emit('dev:hotreload', { conectado: true })
  })

  es.addEventListener('message', (e) => {
    let msg
    try { msg = JSON.parse(e.data) } catch { return }
    if (msg.tipo === 'ping') return

    if (msg.tipo === 'css') {
      const link = document.getElementById('app-style')
      if (link) link.href = link.href.split('?')[0] + '?v=' + Date.now()
      bus.emit('dev:recarregou', { tipo: 'css' })
      return
    }
    if (msg.tipo === 'content') {
      live.checar()       // aplica o novo patch.json na hora
      return
    }
    console.info('[dev] mudou', msg.arquivo, '- recarregando…')
    location.reload()
  })

  es.addEventListener('error', () => { /* servidor estático: ignora */ })
}
