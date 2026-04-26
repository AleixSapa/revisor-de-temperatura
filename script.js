// === DADES SIMULADES FRONTEND ===
let demoTemp = 45; // Temperatura inicial simulada
let demoDirection = 1; // Puja o baixa

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

// === DADES DEMO ===
const demoProcesses = [
    { name: 'Navegador (Chrome)', cpu: '12.3' },
    { name: 'Visual Studio Code', cpu: '8.7' },
    { name: 'Spotify', cpu: '3.2' },
    { name: 'Sistema Gràfic (X11)', cpu: '2.1' },
    { name: 'Escriptori (Cinnamon)', cpu: '1.5' }
];

let cpuHistoryDemo = [];

function getDemoTemp() {
    // Temperatura que oscil·la entre 38 i 72
    demoTemp += (Math.random() * 2 - 0.5) * demoDirection;
    if (demoTemp > 72) demoDirection = -1;
    if (demoTemp < 38) demoDirection = 1;
    return Math.round(demoTemp * 10) / 10;
}

function getDemoProcesses() {
    return demoProcesses.map(p => {
        const cpuVal = (parseFloat(p.cpu) + (Math.random() * 4 - 2)).toFixed(1);
        
        // Simular historial per CPU alta (> 40%)
        // Això és molt poc probable amb els valors base d'adalt, així que de tant en tant 
        // simularem una pujada
        let finalCpu = cpuVal;
        if (Math.random() > 0.95 && p.name === 'Visual Studio Code') {
            finalCpu = (45 + Math.random() * 15).toFixed(1); 
            // Guardar al historial
            const timeStr = new Date().toLocaleTimeString('ca-ES', {hour12: false});
            cpuHistoryDemo.unshift({
                name: p.name,
                time: timeStr,
                cpu: finalCpu,
                active: true
            });
            if (cpuHistoryDemo.length > 10) cpuHistoryDemo.pop();
        }

        return {
            name: p.name,
            cpu: finalCpu
        };
    }).sort((a, b) => parseFloat(b.cpu) - parseFloat(a.cpu));
}

// Ocultem el banner ja que ara és la versió per defecte
document.body.style.paddingTop = '0';
const existingBanner = document.getElementById('demo-banner');
if(existingBanner) existingBanner.remove();

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
    list.innerHTML = '';
    const degreesToDistribute = Math.max(0, latestTemp - 35);

    processes.forEach(proc => {
        const cpuVal = parseFloat(proc.cpu);
        const proportion = (cpuVal / 100) / totalUsedCores;
        const processDegrees = (proportion * degreesToDistribute).toFixed(1);

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
    });

    updateCulprit(processes, latestTemp);
}

function applyCpuData(totalCores, usedCores) {
    document.getElementById('cpu-total').textContent = totalCores;
    document.getElementById('cpu-used').textContent = usedCores.toFixed(2);
}

function updateSimulation() {
    const fakeTemp = getDemoTemp();
    applyTempData(fakeTemp);

    const fakeCores = 8;
    const fakeUsed = 0.5 + Math.random() * 2.5;
    applyCpuData(fakeCores, fakeUsed);

    const fakeProcesses = getDemoProcesses();
    applyProcessData(fakeProcesses, fakeUsed);
}

// Modal History Logic
const modal = document.getElementById('modal-history');
const btnHistory = document.getElementById('btn-history');
const btnCloseModal = document.getElementById('btn-close-modal');
const historyList = document.getElementById('history-list');

function renderHistory() {
    historyList.innerHTML = '';
    if (cpuHistoryDemo.length === 0) {
        historyList.innerHTML = '<li class="loading">No hi ha processos recents amb consum alt (>40%)</li>';
        return;
    }
    cpuHistoryDemo.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        // Randomly make older things inactive
        if (Math.random() > 0.5) item.active = false;
        
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

btnHistory.addEventListener('click', () => {
    renderHistory();
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

// Inici de la simulació pura
updateSimulation();
setInterval(updateSimulation, 2000);
