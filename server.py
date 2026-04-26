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
        # CORS headers perquè qualsevol web (Local, Live Server, GitHub Pages) pugui llegir el servidor
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Suprimir logs per evitar que serve.log creixi massa
        return

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/temp':
            try:
                # Usem la comanda exacta: cat /sys/class/thermal/thermal_zone0/temp | awk '{print $1/1000}'
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

                # Obtenim els top 5 processos per CPU
                cmd = "ps -eo comm,%cpu --sort=-%cpu --no-headers | head -n 5"
                output = subprocess.check_output(cmd, shell=True).decode('utf-8').strip().split('\n')
                processes = []
                for line in output:
                    parts = line.split()
                    if len(parts) >= 2:
                        name = parts[0]
                        cpu = parts[1]
                        
                        friendly_name = friendly_names.get(name, name)
                        
                        cpu_val = float(cpu)
                        if cpu_val > 40.0:
                            now = datetime.datetime.now().strftime("%H:%M:%S")
                            
                            found = False
                            for item in cpu_history:
                                if item['name'] == friendly_name:
                                    found = True
                                    if cpu_val > float(item['cpu']):
                                        item['cpu'] = cpu
                                        item['time'] = now
                                    break
                            
                            if not found:
                                cpu_history.append({
                                    'name': friendly_name,
                                    'orig_name': name,
                                    'cpu': cpu,
                                    'time': now
                                })
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
                current_processes_raw = subprocess.check_output("ps -eo comm --no-headers", shell=True).decode('utf-8').strip().split('\n')
                current_processes = [p.strip() for p in current_processes_raw]
                
                history_to_send = []
                for item in cpu_history:
                    is_active = False
                    orig_name = item.get('orig_name', item['name'])
                    if orig_name in current_processes:
                        is_active = True
                    
                    item_copy = item.copy()
                    item_copy['active'] = is_active
                    history_to_send.append(item_copy)

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
                cores = int(subprocess.check_output("nproc", shell=True).decode('utf-8').strip())
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
            path = self.path
            if path == '/':
                path = '/Index.html'
            
            # Serve files from the current directory (since we moved everything to the root)
            filepath = os.path.join(os.getcwd(), path.lstrip('/'))
            
            if os.path.exists(filepath) and os.path.isfile(filepath):
                self.send_response(200)
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
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), TempHandler) as httpd:
        print(f"Monitor de temperatura actiu a http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nAturant el servidor...")
            httpd.server_close()
            sys.exit(0)
