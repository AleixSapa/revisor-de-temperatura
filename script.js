// === MODE SIMULACIÓ (NOMÉS SI EL SERVIDOR NO RESPON) ===
let demoMode = false;
let demoTemp = 45; // Temperatura Indexal simulada
let demoDirection = 1; // Puja o baixa

// Si obrim Index.html normal o a GitHub Pages / Live Server, el port sol ser diferent a 3000.
// Per tant, apuntem directament on corre el servidor en segon pla (http://127.0.0.1:3000).
const API_BASE = (window.location.port === '3000' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? '' 
    : 'http://127.0.0.1:3000';

const tempValue = document.getElementById('temp-value');
const tempMin = document.getElementById('temp-min');
const tempMax = document.getElementById('temp-max');
const gaugeProgress = document.querySelector('.gauge-progress');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

let minTemp = null;
let maxTemp = null;

const MAX_DISPLAY_TEMP = 100;
const CIRCUMFERENCE = 2 * Math.PI * 45;

// Initialize gauge
gaugeProgress.style.strokeDasharray = CIRCUMFERENCE;
gaugeProgress.style.strokeDashoffset = CIRCUMFERENCE;


// === SIMULACIÓ (FAILBACK) ===
const demoProcesses = [
    { name: 'Navegador (Chrome)', cpu: '12.3' },
    { name: 'Visual Studio Code', cpu: '8.7' },
    { name: 'Spotify', cpu: '3.2' },
    { name: 'Sistema Gràfic (X11)', cpu: '2.1' },
    { name: 'Escriptori (Cinnamon)', cpu: '1.5' }
];

function getDemoTemp() {
    demoTemp += (Math.random() * 2 - 0.5) * demoDirection;
    if (demoTemp > 72) demoDirection = -1;
    if (demoTemp < 38) demoDirection = 1;
    return Math.round(demoTemp * 10) / 10;
}

function getDemoProcesses() {
    return demoProcesses.map(p => ({
        name: p.name,
        cpu: (parseFloat(p.cpu) + (Math.random() * 4 - 2)).toFixed(1)
    }));
}

function showDemoBanner() {
    if (document.getElementById('demo-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'demo-banner';
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; z-Index: 9999;
        background: linear-gradient(90deg, #f59e0b, #ef4444);
        color: white; text-align: center; padding: 8px 16px;
        font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 14px;
        letter-spacing: 1px;
    `;
    banner.textContent = '⚠️ MODE SIMULACIÓ — Les dades són irreals! Assegurat de tenir obert el "run.sh" per llegir les reals.';
    document.body.prepend(banner);
    document.body.style.paddingTop = '36px';
}

function hideDemoBanner() {
    const banner = document.getElementById('demo-banner');
    if (banner) {
        banner.remove();
        document.body.style.paddingTop = '0';
    }
}

// === FUNCIONS DE VISUALITZACIÓ ===
function updateGauge(temp) {
    const percentage = Math.min(Math.max(temp / MAX_DISPLAY_TEMP, 0), 1);
    const offset = CIRCUMFERENCE - (percentage * CIRCUMFERENCE);
    gaugeProgress.style.strokeDashoffset = offset;

    document.querySelectorAll('.guide-item').forEach(item => item.classList.remove('active'));

    if (temp >= 90) {
        gaugeProgress.style.stroke = '#ef4444';
        statusText.textContent = 'PERILL';
        statusDot.style.background = '#ef4444';
        statusDot.style.boxShadow = '0 0 15px #ef4444';
        document.getElementById('guide-perill').classList.add('active');
    } else if (temp >= 70) {
        gaugeProgress.style.stroke = '#f59e0b';
        statusText.textContent = 'PESAT';
        statusDot.style.background = '#f59e0b';
        statusDot.style.boxShadow = '0 0 15px #f59e0b';
        document.getElementById('guide-heavy').classList.add('active');
    } else if (temp >= 50) {
        gaugeProgress.style.stroke = '#38bdf8';
        statusText.textContent = 'NORMAL';
        statusDot.style.background = '#38bdf8';
        statusDot.style.boxShadow = '0 0 15px #38bdf8';
        document.getElementById('guide-normal').classList.add('active');
    } else {
        gaugeProgress.style.stroke = '#10b981';
        statusText.textContent = 'REPÒS';
        statusDot.style.background = '#10b981';
        statusDot.style.boxShadow = '0 0 15px #10b981';
        document.getElementById('guide-repos').classList.add('active');
    }
}

function updateCulprit(processes, currentTemp) {
    const culpritContainer = document.getElementById('culprit-container');
    const culpritName = document.getElementById('culprit-name');
    
    if (currentTemp >= 70 && processes.length > 0) {
        const topProcess = processes[0];
        culpritName.textContent = topProcess.name;
        culpritContainer.classList.remove('hidden');
        if (currentTemp >= 90) {
            culpritContainer.classList.add('danger');
        } else {
            culpritContainer.classList.remove('danger');
        }
    } else {
        culpritContainer.classList.add('hidden');
    }
}

let latestTemp = 0;

function applyTempData(temp) {
    latestTemp = temp;
    tempValue.textContent = latestTemp.toFixed(1);
    
    if (minTemp === null || latestTemp < minTemp) {
        minTemp = latestTemp;
        tempMin.textContent = `${minTemp.toFixed(1)} °C`;
    }
    if (latestTemp > (maxTemp || 0)) {
        maxTemp = latestTemp;
        tempMax.textContent = `${maxTemp.toFixed(1)} °C`;
    }
    updateGauge(latestTemp);
}

function applyProcessData(processes, totalUsedCores) {
    const list = document.getElementById('process-list');
    const degreesToDistribute = Math.max(0, latestTemp - 35);
    
    // Si la llista té el missatge de "Càrrega", l'esborrem de forma segura
    if (list.querySelector('.loading')) {
        list.innerHTML = '';
    }

    const existingItems = list.querySelectorAll('.process-item');

    processes.forEach((proc, Index) => {
        const cpuVal = parseFloat(proc.cpu);
        const proportion = (cpuVal / 100) / totalUsedCores;
        const processDegrees = (proportion * degreesToDistribute).toFixed(1);

        if (existingItems[Index]) {
            // Actualitzem dades existents sense trencar la visualització per evitar parpelleigs
            const li = existingItems[Index];
            li.querySelector('.process-name').textContent = proc.name;
            li.querySelector('.process-temp').textContent = `+${processDegrees}°C`;
            li.querySelector('.process-cpu').textContent = `${proc.cpu}%`;
        } else {
            // Creem l'element només si no en tenim prou a la llista
            const li = document.createElement('li');
            li.className = 'process-item';
            li.innerHTML = `
                <span class="process-name">${proc.name}</span>
                <div class="process-stats">
                    <span class="process-temp">+${processDegrees}°C</span>
                    <span class="process-cpu">${proc.cpu}%</span>
                </div>
            `;
            list.appendChild(li);
        }
    });

    // Eliminem els elements sobrants (si passem de 5 a 4 processos per algun motiu)
    for (let i = processes.length; i < existingItems.length; i++) {
        existingItems[i].remove();
    }

    updateCulprit(processes, latestTemp);
}

function applyCpuData(totalCores, usedCores) {
    document.getElementById('cpu-total').textContent = totalCores;
    document.getElementById('cpu-used').textContent = usedCores.toFixed(2);
}

// === FETCH REAL (SERVIDOR) ===
async function fetchTemp() {
    try {
        const response = await fetch(API_BASE + '/api/temp');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (typeof data.temp === 'number') {
            if (demoMode) { demoMode = false; hideDemoBanner(); }
            applyTempData(data.temp);
        }
    } catch (error) {
        if (!demoMode) { demoMode = true; showDemoBanner(); }
        applyTempData(getDemoTemp());
    }
}

async function fetchProcesses() {
    try {
        const response = await fetch(API_BASE + '/api/processes');
        const data = await response.json();
        const cpuResponse = await fetch(API_BASE + '/api/cpu');
        const cpuData = await cpuResponse.json();
        const totalUsedCores = cpuData.used_cores || 0.1;
        if (data.processes) {
            applyProcessData(data.processes, totalUsedCores);
        }
    } catch (error) {
        const fakeProcesses = getDemoProcesses();
        const fakeTotalCores = 0.8 + Math.random() * 0.5;
        applyProcessData(fakeProcesses, fakeTotalCores);
    }
}

async function fetchCpu() {
    try {
        const response = await fetch(API_BASE + '/api/cpu');
        const data = await response.json();
        if (data.total_cores) {
            applyCpuData(data.total_cores, data.used_cores);
        }
    } catch (error) {
        const fakeCores = 8;
        const fakeUsed = 0.5 + Math.random() * 2.5;
        applyCpuData(fakeCores, fakeUsed);
    }
}

// === HISTORY MODAL ===
const modal = document.getElementById('modal-history');
const btnHistory = document.getElementById('btn-history');
const btnCloseModal = document.getElementById('btn-close-modal');
const historyList = document.getElementById('history-list');

async function fetchHistory() {
    try {
        const response = await fetch(API_BASE + '/api/history');
        const data = await response.json();
        if (data.history) {
            historyList.innerHTML = '';
            if (data.history.length === 0) {
                historyList.innerHTML = '<li class="loading">No hi ha processos recents amb consum alt (>40%)</li>';
                return;
            }
            data.history.forEach(item => {
                const li = document.createElement('li');
                li.className = 'history-item';
                const statusHtml = item.active 
                    ? '<span class="status-badge active">🔴 Actiu</span>' 
                    : '<span class="status-badge">⚪ Finalitzat</span>';
                li.innerHTML = `
                    <div class="history-info">
                        <span class="history-name">${item.name}</span>
                        <span class="history-time">${statusHtml} • a les ${item.time}</span>
                    </div>
                    <span class="history-cpu">${parseFloat(item.cpu).toFixed(1)}%</span>
                `;
                historyList.appendChild(li);
            });
        }
    } catch (error) {
        historyList.innerHTML = '<li class="loading">⚠️ Mode Simulació: no hi ha historial real disponible. Executa el backend!</li>';
    }
}

btnHistory.addEventListener('click', () => {
    fetchHistory();
    modal.classList.add('active');
});

btnCloseModal.addEventListener('click', () => {
    modal.classList.remove('active');
});

window.addEventListener('click', (e) => { 
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

// === PWA INSTALLATION LOGIC ===
let deferredPrompt;
const btnInstall = document.getElementById('btn-install');
const installModal = document.getElementById('modal-install');
const btnCloseInstallModal = document.getElementById('btn-close-install-modal');

window.addEventListener('beforeinstallprompt', (e) => {
    // Evitem que surti el missatge genèric del navegador ràpid
    e.preventDefault();
    deferredPrompt = e;
});

if (btnInstall) {
    btnInstall.addEventListener('click', () => {
        if (installModal) {
            installModal.classList.add('active');
            
            const warningBox = document.getElementById('install-warning');
            if (warningBox) {
                // Si deferredPrompt és null vol dir que el Chrome el bloqueja
                warningBox.style.display = !deferredPrompt ? 'block' : 'none';
            }
        }
    });
}

const btnForceInstall = document.getElementById('btn-force-install');
if (btnForceInstall) {
    btnForceInstall.addEventListener('click', async () => {
        if (!deferredPrompt) {
            alert("Bloquejat pel navegador. Clica el botó de Chrome directament dalt a la dreta per ignorar aquest bloqueig de seguretat nativa.");
            return;
        }
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log("S'ha instal·lat la PWA!");
            if (installModal) installModal.classList.remove('active');
        }
        deferredPrompt = null;
    });
}

if (btnCloseInstallModal) {
    btnCloseInstallModal.addEventListener('click', () => {
        if (installModal) {
            installModal.classList.remove('active');
        }
    });
}

// També permetem tancar-lo fent clic fóra de la caixa
if (installModal) {
    installModal.addEventListener('click', (e) => {
        if (e.target === installModal) {
            installModal.classList.remove('active');
        }
    });
}

window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
});

// INIT
fetchTemp();
fetchProcesses();
fetchCpu();
setInterval(() => {
    fetchTemp();
    fetchProcesses();
    fetchCpu();
}, 5000);
