import http.server
import socketserver
import subprocess
import json
import os
import sys
import datetime
import argparse
import random

# Historial de processos que han consumit molt
cpu_history = []
MAX_HISTORY = 20

# Configuració per defecte
PORT = 3000
TEST_MODE = False

class TempHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS per permetre que GitHub Pages demani dades a localhost
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Cache-Control')
        self.send_header('Access-Control-Max-Age', '86400')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Suprimim logs perquè si fem servir Live Server, cada escriptura 
        # al fitxer serve.log refresca la pàgina automàticament.
        return

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        clean_path = self.path.split('?')[0].rstrip('/')
        is_windows = sys.platform.startswith('win')

        if clean_path == '/api/temp':
            try:
                if TEST_MODE:
                    temp = round(40 + random.random() * 30, 1)
                else:
                    temp = None
                    if is_windows:
                        # Windows: Provar multiples mètodes (WMI)
                        try:
                            # Mètode 1: MS Acquire Thermal Zone
                            cmd = "powershell -NoProfile -Command \"(Get-CimInstance -Namespace root/wmi -ClassName MsAcpi_ThermalZoneTemperature).CurrentTemperature\""
                            raw = subprocess.check_output(cmd, shell=True).decode('utf-8').strip()
                            if raw:
                                temp = (float(raw.split()[0]) / 10.0) - 273.15
                            
                            if temp is None:
                                # Mètode 2: Objectes de rendiment del sistema
                                cmd = "powershell -NoProfile -Command \"(Get-Counter '\\Thermal Zone Information(*)\\Temperature').CounterSamples.CookedValue\""
                                raw = subprocess.check_output(cmd, shell=True).decode('utf-8').strip()
                                if raw:
                                    temp = float(raw.split()[0]) - 273.15
                        except:
                            pass
                    else:
                        # Linux: Provar thermal_zones i hwmon
                        # Thermal zones
                        for i in range(10):
                            path = f"/sys/class/thermal/thermal_zone{i}/temp"
                            if os.path.exists(path):
                                try:
                                    with open(path, 'r') as f:
                                        temp = float(f.read().strip()) / 1000.0
                                    # Evitem zones de seguretat o valors estranys (< 5 o > 120)
                                    if 5 < temp < 120:
                                        break
                                    else:
                                        temp = None
                                except:
                                    continue
                        
                        # Si falla, provar hwmon (sensors de CPU reals)
                        if temp is None:
                            for i in range(10):
                                for j in range(10):
                                    path = f"/sys/class/hwmon/hwmon{i}/temp{j}_input"
                                    if os.path.exists(path):
                                        try:
                                            with open(path, 'r') as f:
                                                temp = float(f.read().strip()) / 1000.0
                                            if 5 < temp < 120:
                                                break
                                            else:
                                                temp = None
                                        except:
                                            continue
                                if temp is not None: break

                    if temp is None:
                        # Si falla el sensor real en Windows/Linux, posem un valor de seguretat o error
                        if is_windows:
                            raise Exception("No s'ha pogut llegir la temperatura. Revisa si tens sensors compatibles i permisos d'Administrador.")
                        raise Exception("No s'ha trobat cap sensor de temperatura compatible (Thermal Zone/Hwmon) a Linux.")

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                res = {
                    'temp': temp, 
                    'unit': '°C', 
                    'demo': TEST_MODE,
                    'os': 'windows' if is_windows else 'linux',
                    'run_cmd': 'Inicia Monitor.bat' if is_windows else 'linux_extras/run.sh'
                }
                self.wfile.write(json.dumps(res).encode())
            except Exception as e:
                self.send_response(200) # Enviem 200 però amb error per permetre al frontend mostrar el banner correctament
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': str(e), 
                    'demo': True,
                    'os': 'windows' if is_windows else 'linux',
                    'run_cmd': 'Inicia Monitor.bat' if is_windows else 'linux_extras/run.sh'
                }).encode())

        elif clean_path == '/api/processes':
            try:
                friendly_names = {
                    'chrome': 'Chrome', 'chromium': 'Chromium', 'firefox': 'Firefox',
                    'msedge': 'Edge', 'python': 'Servidor Monitor', 'python3': 'Servidor Monitor',
                    'Code': 'VS Code', 'explorer': 'Explorador', 'Taskmgr': 'Admin. Tasques',
                    'spotify': 'Spotify', 'discord': 'Discord', 'steam': 'Steam',
                    'vlc': 'VLC Media Player', 'slack': 'Slack', 'zoom': 'Zoom',
                    'Xorg': 'Sistema Gr\xc3\xa0fic', 'gnome-shell': 'Escriptori (GNOME)',
                    'cinnamon': 'Escriptori (Cinnamon)', 'plasmashell': 'Escriptori (KDE)'
                }

                processes = []
                if TEST_MODE:
                    demo_procs = ['chrome', 'Code', 'spotify', 'explorer']
                    for name in demo_procs:
                        cpu = round(random.random() * 15, 1)
                        processes.append({'name': friendly_names.get(name, name), 'cpu': str(cpu)})
                else:
                    if is_windows:
                        # Windows: PowerShell Get-Process
                        cmd = "powershell -NoProfile -Command \"Get-Process | Sort-Object CPU -Descending | Select-Object -First 20 -Property Name, @{Name='CPU';Expression={$_.CPU / (Get-Date).Subtract($_.StartTime).TotalSeconds * 100}} | ConvertTo-Json\""
                        try:
                            raw = subprocess.check_output(cmd, shell=True).decode('utf-8')
                            data = json.loads(raw)
                            if not isinstance(data, list): data = [data]
                            for p in data:
                                name = p.get('Name', 'Unknown')
                                cpu_val = p.get('CPU') or 0.0
                                f_name = friendly_names.get(name, name)
                                processes.append({'name': f_name, 'cpu': str(round(float(cpu_val), 1)), 'orig': name})
                        except:
                            processes = [{'name': 'Error llegint processos', 'cpu': '0'}]
                    else:
                        # Linux
                        cmd = "ps -eo comm,%cpu --sort=-%cpu --no-headers | head -n 30"
                        output = subprocess.check_output(cmd, shell=True).decode('utf-8').strip().split('\n')
                        grouped_data = {}
                        for line in output:
                            parts = line.split()
                            if len(parts) >= 2:
                                name, cpu_val = parts[0], float(parts[1])
                                f_name = friendly_names.get(name, name)
                                if f_name not in grouped_data: grouped_data[f_name] = {'cpu': 0.0, 'orig': name}
                                grouped_data[f_name]['cpu'] += cpu_val

                        for f_name, data in grouped_data.items():
                            total_cpu = data['cpu']
                            now = datetime.datetime.now().strftime("%H:%M:%S")
                            if total_cpu > 40.0:
                                found = False
                                for item in cpu_history:
                                    if item['name'] == f_name:
                                        found = True
                                        if total_cpu > float(item['cpu']):
                                            item['cpu'] = str(round(total_cpu, 1))
                                            item['time'] = now
                                        break
                                if not found:
                                    cpu_history.append({'name': f_name, 'orig_name': data['orig'], 'cpu': str(round(total_cpu, 1)), 'time': now})
                                    if len(cpu_history) > MAX_HISTORY:
                                        cpu_history.sort(key=lambda x: float(x['cpu']), reverse=True)
                                        cpu_history.pop()
                            processes.append({'name': f_name, 'cpu': str(round(total_cpu, 1))})

                processes.sort(key=lambda x: float(x['cpu']), reverse=True)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'processes': processes[:5], 'demo': TEST_MODE}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())

        elif clean_path == '/api/history':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'history': cpu_history, 'demo': TEST_MODE}).encode())

        elif clean_path == '/api/cpu':
            try:
                cores = os.cpu_count()
                if TEST_MODE:
                    usage_cores = 1.5 + random.random() * 2.0
                else:
                    if is_windows:
                        cmd = "powershell -NoProfile -Command \"(Get-CimInstance Win32_Processor).LoadPercentage\""
                        raw = subprocess.check_output(cmd, shell=True).decode('utf-8').strip()
                        usage_cores = (float(raw) / 100.0) * cores if raw else 0.1
                    else:
                        total_cpu = subprocess.check_output("ps -eo %cpu --no-headers | awk '{s+=$1} END {print s}'", shell=True).decode('utf-8').strip()
                        usage_cores = float(total_cpu) / 100.0
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'total_cores': cores, 'used_cores': round(usage_cores, 2), 'demo': TEST_MODE}).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            path = self.path.split('?')[0]
            if path == '/':
                path = '/inici.html'
            
            # Seguretat: Validació de camins per evitar Directory Traversal
            base_dir = os.getcwd()
            filepath = os.path.normpath(os.path.join(base_dir, path.lstrip('/')))
            
            if not filepath.startswith(base_dir):
                self.send_response(403)
                self.end_headers()
                self.wfile.write(b"Acci\xc3\xb3 denegada")
                return

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
    parser = argparse.ArgumentParser(description='Monitor de temperatura del PC')
    parser.add_argument('--test', '-t', action='store_true', help='Executa en mode prova amb dades simulades')
    parser.add_argument('--port', '-p', type=int, default=3000, help='Port del servidor')
    args = parser.parse_args()

    PORT = args.port
    TEST_MODE = args.test

    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    
    mode_str = " (MODE PROVA)" if TEST_MODE else ""
    with socketserver.TCPServer(("", PORT), TempHandler) as httpd:
        print(f"✅ Servidor de Monitorització Actiu{mode_str}")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nAturant el servidor...")
            httpd.server_close()
            sys.exit(0)

