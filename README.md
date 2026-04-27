# Monitor de Temperatura PC 🌡️

Aquest projecte és una eina de monitorització lleugera i moderna per visualitzar l'estat de la teva CPU en temps real. Funciona com una aplicació web instal·lable (**PWA**) amb un backend en **Python**.

## 🚀 Com funciona?

L'aplicació es divideix en dues parts que treballen juntes:

1.  **El Servidor (Python)**: S'encarrega d'interrogar el maquinari del teu ordinador per obtenir la temperatura, el nombre de nuclis i els processos que més recursos utilitzen.
2.  **La Interfície (PWA)**: Una web d'alta qualitat visual que rep aquestes dades i les mostra de forma intuïtiva amb gràfics i alertes.

## 🛠️ Components Tècnics

### Backend (Python)
- **`server.py`**: Creat amb `http.server`, obre una API al port 3000. Detecta automàticament si ets a Windows o Linux per utilitzar els mètodes de lectura de sensors adequats (WMI/PowerShell en Windows i Thermal Zones en Linux).

### Frontend (Web Modern)
- **`inici.html` & `style.css`**: Disseny premium amb mode fosc, disseny responsive i animacions d'estat (Repòs, Normal, Pesat, Perill).
- **`script.js`**: Gestiona el refresc de dades cada 5 segons i inclou un mode de simulació per si el servidor no és accessible.
- **`sw.js` & `manifest.json`**: Converteixen la web en una PWA, permetent la instal·lació nativa al sistema.

## ⚡ Scripts de Llançament

### 🪟 Windows
- **`Inicia Monitor.bat`**: Mode fàcil. Obre el servidor i l'app.
- **`Inicia Monitor (Sense Finestra).vbs`**: Mode silenciós. El servidor corre invisible en segon pla (ideal per l'inici automàtic).
- **`ACTIVA ENGEGADA AUTOMÀTICA.bat`**: Afegeix l'aplicació a la carpeta d'inici de Windows.

### 🐧 Linux
- **`Inicia Monitor.sh`**: Script unificat per donar permisos, engegar el servidor en segon pla i obrir el navegador.

## 📁 Estructura de fitxers principal
- `server.py`: Servidor API i de fitxers.
- `script.js`: Lògica de control i visualització.
- `style.css`: Estils visual de l'aplicació.
- `inici.html`: Estructura principal de la interfície.
- `sw.js`: Gestió de la memòria cau i PWA.

## 🔔 Gestió d'Avisos Dinàmics

L'aplicació està programada per ser "neta" i només mostrar informació rellevant:
- **Auto-ocultació**: Si el servidor funciona i dóna dades reals, l'avís groc superior **es treu** automàticament per no molestar.
- **Auto-activació**: Si hi ha un problema (el servidor s'atura, falta de permisos o error de sensors), l'avís **s'afegeix** a l'instant amb les instruccions per solucionar-ho.
- **Indicador de Culpable**: El panell que assenyala quina aplicació escalfa el PC només s'afegeix si la temperatura supera els 70°C; si la temperatura baixa, s'amaga.

---
⚠️ **Nota Important**: Aquest sistema es basa en la lectura de sensors de maquinari que poden variar segons el sistema. **A vegades pot fallar** la connexió o la lectura si els sensors canvien de nom; es recomana revisar que el servidor Python estigui correctament executat si les dades no apareixen.