#!/usr/bin/env python3
"""
Servidor de desenvolvimento do Crazy Royale Champions.

- Serve os arquivos estáticos do projeto (sem build, sem npm).
- Live reload: fica de olho nos arquivos e avisa o navegador por SSE (/__live).
    * .css              -> troca a folha de estilo sem perder a partida
    * content/*.json    -> reaplica o patch AO VIVO (sem recarregar)
    * .js / .html       -> recarrega a página

Uso:  python3 dev.py [porta]
"""
import http.server
import json
import os
import queue
import socketserver
import sys
import threading
import time

RAIZ = os.path.dirname(os.path.abspath(__file__))
PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
IGNORAR = {'.git', 'node_modules', '__pycache__', '.github'}
VIGIAR = ('.js', '.css', '.html', '.json', '.webmanifest', '.svg')

clientes = []
clientes_lock = threading.Lock()


def transmitir(evento: dict):
    dados = json.dumps(evento)
    with clientes_lock:
        alvos = list(clientes)
    for q in alvos:
        try:
            q.put_nowait(dados)
        except Exception:
            pass


def tipo_do_arquivo(caminho: str) -> str:
    rel = os.path.relpath(caminho, RAIZ).replace(os.sep, '/')
    if rel.startswith('content/'):
        return 'content'
    if caminho.endswith('.css'):
        return 'css'
    return 'js'


def varrer():
    mapa = {}
    for base, dirs, arquivos in os.walk(RAIZ):
        dirs[:] = [d for d in dirs if d not in IGNORAR and not d.startswith('.')]
        for nome in arquivos:
            if not nome.endswith(VIGIAR):
                continue
            caminho = os.path.join(base, nome)
            # three.js vendorizado é grande e nunca muda: fora do watcher
            if 'vendor' in caminho:
                continue
            try:
                mapa[caminho] = os.path.getmtime(caminho)
            except OSError:
                pass
    return mapa


def vigiar():
    anterior = varrer()
    while True:
        time.sleep(0.7)
        atual = varrer()
        mudados = [c for c, m in atual.items() if anterior.get(c) != m]
        if mudados:
            for c in mudados:
                rel = os.path.relpath(c, RAIZ)
                print(f'  ↻ {rel}')
                transmitir({'tipo': tipo_do_arquivo(c), 'arquivo': rel})
        anterior = atual


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=RAIZ, **kwargs)

    def log_message(self, fmt, *args):
        if '__live' in (args[0] if args else ''):
            return
        pass  # silencioso: só mostramos mudanças de arquivo

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0] == '/__live':
            return self.sse()
        return super().do_GET()

    def sse(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()
        q = queue.Queue()
        with clientes_lock:
            clientes.append(q)
        try:
            self.wfile.write(b'retry: 1000\n\n')
            self.wfile.flush()
            while True:
                try:
                    dados = q.get(timeout=15)
                except queue.Empty:
                    dados = json.dumps({'tipo': 'ping'})
                self.wfile.write(f'data: {dados}\n\n'.encode())
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            with clientes_lock:
                if q in clientes:
                    clientes.remove(q)


class Servidor(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    threading.Thread(target=vigiar, daemon=True).start()
    with Servidor(('0.0.0.0', PORTA), Handler) as httpd:
        print('🏆 Crazy Royale Champions — servidor de desenvolvimento')
        print(f'   http://localhost:{PORTA}')
        print('   live reload ligado (edite src/ ou content/patch.json)')
        print('   Ctrl+C para sair\n')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\ntchau! 👋')
