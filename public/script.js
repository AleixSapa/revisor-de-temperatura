// Si estem a GitHub Pages, cridem l'API al servidor local
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? ''
    : 'http://localhost:3000';

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

function updateGauge(temp) {
    const percentage = Math.min(Math.max(temp / MAX_DISPLAY_TEMP, 0), 1);
    const offset = CIRCUMFERENCE - (percentage * CIRCUMFERENCE);
    gaugeProgress.style.strokeDashoffset = offset;

    // Reset guide active states
    document.querySelectorAll('.guide-item').forEach(item => item.classList.remove('active'));

    // Lògica de colors i text d'estat segons els rangs de l'usuari
    if (temp >= 90) {
        gaugeProgress.style.stroke = '#ef4444'; // Perill (>90)
        statusText.textContent = 'PERILL';
        statusDot.style.background = '#ef4444';
        statusDot.style.boxShadow = '0 0 15px #ef4444';
        document.getElementById('guide-perill').classList.add('active');
    } else if (temp >= 70) {
        gaugeProgress.style.stroke = '#f59e0b'; // Pesat (70-85)
        statusText.textContent = 'PESAT';
        statusDot.style.background = '#f59e0b';
        statusDot.style.boxShadow = '0 0 15px #f59e0b';
        document.getElementById('guide-heavy').classList.add('active');
    } else if (temp >= 50) {
        gaugeProgress.style.stroke = '#38bdf8'; // Normal (50-70)
        statusText.textContent = 'NORMAL';
        statusDot.style.background = '#38bdf8';
        statusDot.style.boxShadow = '0 0 15px #38bdf8';
        document.getElementById('guide-normal').classList.add('active');
    } else {
        gaugeProgress.style.stroke = '#10b981'; // Repòs (35-50)
        statusText.textContent = 'REPÒS';
        statusDot.style.background = '#10b981';
        statusDot.style.boxShadow = '0 0 15px #10b981';
        document.getElementById('guide-repos').classList.add('active');
    }
}

// Lògica per detectar el culpable segons la CPU
function updateCulprit(processes, currentTemp) {
    const culpritContainer = document.getElementById('culprit-container');
    const culpritName = document.getElementById('culprit-name');
    
    // Si la temperatura és >= 70, busquem qui consumeix més
    if (currentTemp >= 70 && processes.length > 0) {
        // El primer de la llista és el que més consumeix (pel sort de server.py)
        const topProcess = processes[0];
        culpritName.textContent = topProcess.name;
        culpritContainer.classList.remove('hidden');
        
        // Si és perill, afegim classe de perill per a l'animació de sacsejada
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

async function fetchTemp() {
    try {
        const response = await fetch(API_BASE + '/api/temp');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        if (typeof data.temp === 'number') {
            latestTemp = data.temp;
            
            // Animation effect for number if possible (simple version)
            tempValue.textContent = latestTemp.toFixed(1);
            
            // Update Min/Max
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
    } catch (error) {
        console.error('Error fetching temp:', error);
        statusDot.style.background = '#ef4444';
        statusDot.style.boxShadow = '0 0 15px #ef4444';
        statusText.textContent = 'Error de connexió';
        tempValue.textContent = '--';
    }
}

async function fetchProcesses() {
    try {
        const response = await fetch(API_BASE + '/api/processes');
        const data = await response.json();
        
        // Obtenim també l'ús total de CPU per fer el repartiment proporcional
        const cpuResponse = await fetch(API_BASE + '/api/cpu');
        const cpuData = await cpuResponse.json();
        const totalUsedCores = cpuData.used_cores || 0.1; // Evitem divisió per zero

        if (data.processes) {
            const list = document.getElementById('process-list');
            list.innerHTML = '';
            
            // Càlcul de graus a repartir (Temperatura actual - 35°C de repòs)
            const degreesToDistribute = Math.max(0, latestTemp - 35);
            
            data.processes.forEach(proc => {
                const cpuVal = parseFloat(proc.cpu);
                // Proporció: (Ús procés / Ús total del sistema) * Graus extra
                // L'ús de cpuData.used_cores està en "nuclis", cpuVal està en % (100 = 1 nucli)
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
            
            // Actualitzem el culpable
            updateCulprit(data.processes, latestTemp);
        }
    } catch (error) {
        console.error('Error fetching processes:', error);
    }
}

async function fetchCpu() {
    try {
        const response = await fetch(API_BASE + '/api/cpu');
        const data = await response.json();
        if (data.total_cores) {
            document.getElementById('cpu-total').textContent = data.total_cores;
            document.getElementById('cpu-used').textContent = data.used_cores.toFixed(2);
        }
    } catch (error) {
        console.error('Error fetching CPU:', error);
    }
}

// Modal History Logic
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
        console.error('Error fetching history:', error);
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

// Initial fetch and start interval
fetchTemp();
fetchProcesses();
fetchCpu();
setInterval(() => {
    fetchTemp();
    fetchProcesses();
    fetchCpu();
}, 5000);
