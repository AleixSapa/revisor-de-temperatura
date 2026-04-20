import http.server
import socketserver
import subprocess
import json
import os
import sys
import datetime

PORT = 3000

# Historial de processos que han consumit molt
cpu_history = []
MAX_HISTORY = 20

class TempHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS headers perquè GitHub Pages pugui accedir al servidor local
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/temp':
            try:
                # Usem la comanda exacta: cat /sys/class/thermal/thermal_zone0/temp | awk '{print $1/1000}'
                # Si thermal_zone0 no existeix, provem zones successives
                temp = None
                for i in range(5):  # Provem zones 0-4
                    path = f"/sys/class/thermal/thermal_zone{i}/temp"
                    if os.path.exists(path):
                        cmd = f"cat {path} | awk '{{print $1/1000}}'"
                        raw = subprocess.check_output(cmd, shell=True).decode('utf-8').strip()
                        temp = float(raw)
                        break

                if temp is None:
                    raise Exception("No s'ha trobat cap sensor de temperatura compatible")

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'temp': temp, 'unit': '°C'}).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        elif self.path == '/api/processes':
            try:
                # Diccionari de noms amigables
                friendly_names = {
                    'chrome': 'Navegador (Chrome)',
                    'chromium': 'Navegador (Chromium)',
                    'firefox': 'Navegador (Firefox)',
                    'DisplayLinkMana': 'Pantalles Externes',
                    'DisplayLinkManager': 'Pantalles Externes',
                    'python3': 'Aquesta Web (Servidor)',
                    'ps': 'Monitoritzant...',
                    'Xorg': 'Sistema Gràfic (X11)',
                    'gnome-shell': 'Interfície del Sistema',
                    'cinnamon': 'Escriptori (Cinnamon)',
                    'code': 'Visual Studio Code',
                    'slack': 'Slack',
                    'spotify': 'Spotify',
                    'discord': 'Discord',
                    'systemd': 'Sistema Base',
                    'node': 'Node.js (App)',
                    'antigravity': 'Assistent Antigravity',
                    'resourcemanager': 'Gestor de Recursos',
                    'language_server': 'Servidor de Llenguatge (IDE)',
                    'bash': 'Terminal (Bash)',
                    'zsh': 'Terminal (Zsh)',
                    'sh': 'Terminal',
                    'docker': 'Docker',
                    'dockerd': 'Servei de Docker',
                    'containerd': 'Gestor de Contenidors',
                    'rust-analyzer': 'Analitzador de Rust',
                    'git': 'Git (Control de versions)'
                }

                # Obtenim els top 5 processos per CPU (saltant la capçalera)
                cmd = "ps -eo comm,%cpu --sort=-%cpu --no-headers | head -n 5"
                output = subprocess.check_output(cmd, shell=True).decode('utf-8').strip().split('\n')
                processes = []
                for line in output:
                    parts = line.split()
                    if len(parts) >= 2:
                        name = parts[0]
                        cpu = parts[1]
                        
                        # Busquem si tenim un nom més bonic
                        friendly_name = friendly_names.get(name, name)
                        
                        # Guardem a l'historial si consumeix més del 40%
                        # Evitem duplicats recents del mateix procés
                        cpu_val = float(cpu)
                        if cpu_val > 40.0:
                            now = datetime.datetime.now().strftime("%H:%M:%S")
                            
                            # Busquem si el procés ja és a l'historial
                            found = False
                            for item in cpu_history:
                                if item['name'] == friendly_name:
                                    found = True
                                    # Si el consum actual és superior al guardat, actualitzem el rècord
                                    if cpu_val > float(item['cpu']):
                                        item['cpu'] = cpu
                                        item['time'] = now
                                    break
                            
                            # Si no hi era, l'afegim
                            if not found:
                                cpu_history.append({
                                    'name': friendly_name,
                                    'orig_name': name,
                                    'cpu': cpu,
                                    'time': now
                                })
                                # Mantenim el límit d'historial
                                if len(cpu_history) > MAX_HISTORY:
                                    cpu_history.sort(key=lambda x: float(x['cpu']), reverse=True)
                                    cpu_history.pop()

                        processes.append({'name': friendly_name, 'cpu': cpu})
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'processes': processes}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        elif self.path == '/api/history':
            try:
                # Obtenim processos actius actualment per marcar l'estat en l'historial
                current_processes_raw = subprocess.check_output("ps -eo comm --no-headers", shell=True).decode('utf-8').strip().split('\n')
                current_processes = [p.strip() for p in current_processes_raw]
                
                # Mapegem cada entrada amb l'estat actiu
                # Nota: friendly_names és al revés aquí, hauríem de comprovar si el nom original o l'aliat coincideix.
                # Per simplicitat, comprovarem si el procés està actiu buscant el seu nom en l'output de ps.
                
                history_to_send = []
                for item in cpu_history:
                    # Necessitem el nom original per fer el check. El guardaré en la inserció.
                    is_active = False
                    orig_name = item.get('orig_name', item['name'])
                    if orig_name in current_processes:
                        is_active = True
                    
                    item_copy = item.copy()
                    item_copy['active'] = is_active
                    history_to_send.append(item_copy)

                # Ordenem per CPU (lo més pesat adalt)
                history_to_send.sort(key=lambda x: float(x['cpu']), reverse=True)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'history': history_to_send}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        elif self.path == '/api/cpu':
            try:
                # Nombre de nuclis
                cores = int(subprocess.check_output("nproc", shell=True).decode('utf-8').strip())
                
                # Ús total (suma de tots els % d'ús de ps)
                # ps -eo %cpu retorna el % de cada procés. Sumant-ho tot i dividint per 100 donarà els nuclis en ús.
                total_cpu = subprocess.check_output("ps -eo %cpu --no-headers | awk '{s+=$1} END {print s}'", shell=True).decode('utf-8').strip()
                usage_cores = float(total_cpu) / 100.0
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'total_cores': cores,
                    'used_cores': round(usage_cores, 2)
                }).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            # We want to serve files from the 'public' folder
            # If the user asks for /, we serve public/index.html
            path = self.path
            if path == '/':
                path = '/index.html'
            
            filepath = os.path.join(os.getcwd(), 'public', path.lstrip('/'))
            
            if os.path.exists(filepath) and os.path.isfile(filepath):
                self.send_response(200)
                # Simple content-type detection
                if filepath.endswith(".html"): self.send_header('Content-type', 'text/html')
                elif filepath.endswith(".css"): self.send_header('Content-type', 'text/css')
                elif filepath.endswith(".js"): self.send_header('Content-type', 'application/javascript')
                self.end_headers()
                with open(filepath, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b"File not found")

if __name__ == "__main__":
    # Ensure we are in the right directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Use allow_reuse_address to avoid "Address already in use" errors during development
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), TempHandler) as httpd:
        print(f"Monitor de temperatura actiu a http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nAturant el servidor...")
            httpd.server_close()
            sys.exit(0)
