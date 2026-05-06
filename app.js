// Estado Global
let appData = {
    routine: [],
    sessions: [],
    exercises: []
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupNavigation();
    setupEventListeners();
    renderDashboard();
});

function loadData() {
    const saved = localStorage.getItem('treinoNuvemData');
    if (saved) {
        appData = JSON.parse(saved);
        // Garante que arrays existam
        if(!appData.routine) appData.routine = [];
        if(!appData.sessions) appData.sessions = [];
        if(!appData.exercises) appData.exercises = [];
    }
    updateRoutineSelect();
}

function saveData() {
    localStorage.setItem('treinoNuvemData', JSON.stringify(appData));
}

// Navegação
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update buttons
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update views
            const targetId = item.getAttribute('data-target');
            views.forEach(view => {
                view.classList.remove('active');
                if (view.id === targetId) view.classList.add('active');
            });

            // Specific View Logic
            if(targetId === 'view-dashboard') renderDashboard();
            if(targetId === 'view-history') renderHistory();
        });
    });
}

// Listeners Base
function setupEventListeners() {
    // Import
    document.getElementById('file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                appData = importedData;
                saveData();
                loadData();
                renderDashboard();
                alert('Backup importado com sucesso!');
            } catch (err) {
                alert('Erro ao ler arquivo JSON.');
            }
        };
        reader.readAsText(file);
    });

    // Export
    document.getElementById('btn-export').addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "treino-nuvem-backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    });

    // Clear
    document.getElementById('btn-clear-data').addEventListener('click', () => {
        if(confirm('Tem certeza? Isso apagará todos os dados locais!')) {
            localStorage.removeItem('treinoNuvemData');
            appData = { routine: [], sessions: [], exercises: [] };
            location.reload();
        }
    });

    // Treino Start
    document.getElementById('btn-start-workout').addEventListener('click', startWorkout);
    document.getElementById('btn-cancel-workout').addEventListener('click', cancelWorkout);
    document.getElementById('btn-finish-workout').addEventListener('click', finishWorkout);
}

// ==========================================
// Dashboard Logic
// ==========================================
function renderDashboard() {
    const recentList = document.getElementById('recent-workouts-list');
    recentList.innerHTML = '';
    
    // Sort sessions by date desc
    const sorted = [...appData.sessions].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    sorted.slice(0, 3).forEach(session => {
        const dateStr = new Date(session.date).toLocaleDateString('pt-BR');
        recentList.innerHTML += `
            <div class="card history-item">
                <h4>${session.workoutName || 'Treino'}</h4>
                <p class="history-date"><i class="far fa-calendar"></i> ${dateStr}</p>
                <p>${session.exercises.length} exercícios realizados.</p>
            </div>
        `;
    });

    if(sorted.length === 0) {
        recentList.innerHTML = '<p>Nenhum treino registrado ainda.</p>';
    }

    renderChart(sorted);
}

let evolutionChartInstance = null;
function renderChart(sessions) {
    const ctx = document.getElementById('evolutionChart').getContext('2d');
    
    if(evolutionChartInstance) {
        evolutionChartInstance.destroy();
    }

    // Prepare data: Volume total (Peso x Reps) por treino dos últimos 7 treinos
    const recentSessions = sessions.slice(0, 7).reverse();
    const labels = recentSessions.map(s => {
        const d = new Date(s.date);
        return `${d.getDate()}/${d.getMonth()+1}`;
    });

    const data = recentSessions.map(s => {
        let volume = 0;
        s.exercises.forEach(ex => {
            ex.sets.forEach(set => {
                const w = parseFloat(set.weight) || 0;
                const r = parseInt(set.reps) || 0;
                volume += (w * r);
            });
        });
        return volume;
    });

    evolutionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Volume Total (Carga x Reps)',
                data: data,
                borderColor: '#00adb5',
                backgroundColor: 'rgba(0, 173, 181, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#aaa' } },
                x: { grid: { color: '#333' }, ticks: { color: '#aaa' } }
            },
            plugins: {
                legend: { labels: { color: '#eee' } }
            }
        }
    });
}

// ==========================================
// Histórico Logic
// ==========================================
function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    const sorted = [...appData.sessions].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    sorted.forEach(session => {
        const dateStr = new Date(session.date).toLocaleDateString('pt-BR');
        let details = session.exercises.map(ex => {
            let setsStr = ex.sets.map(s => `${s.weight}kg x ${s.reps}`).join(' | ');
            return `<div style="font-size:0.85rem; margin-top:5px; color:#aaa;"><strong>${ex.name}:</strong> ${setsStr}</div>`;
        }).join('');

        list.innerHTML += `
            <div class="card history-item">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4>${session.workoutName || 'Treino'}</h4>
                    <span class="history-date">${dateStr}</span>
                </div>
                <hr style="border:0; border-top:1px solid #333; margin: 10px 0;">
                ${details}
            </div>
        `;
    });
}

// ==========================================
// Treino Logic
// ==========================================
function updateRoutineSelect() {
    const select = document.getElementById('routine-select');
    select.innerHTML = '<option value="">-- Selecione --</option>';
    appData.routine.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        select.appendChild(opt);
    });
}

let currentActiveWorkout = null;

function startWorkout() {
    const routineId = document.getElementById('routine-select').value;
    if(!routineId) {
        alert('Selecione uma rotina primeiro.');
        return;
    }

    const routine = appData.routine.find(r => r.id === routineId);
    if(!routine) return;

    currentActiveWorkout = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        date: new Date().toISOString(),
        workoutId: routine.id,
        workoutName: routine.name,
        exercises: routine.exercises.map(ex => ({
            exerciseId: ex.id,
            name: ex.name,
            sets: []
        }))
    };

    document.getElementById('routine-selector').classList.add('hidden');
    document.getElementById('active-workout').classList.remove('hidden');
    document.getElementById('active-workout-name').textContent = `Treino: ${routine.name}`;
    
    renderActiveExercises(routine);
}

function renderActiveExercises(routine) {
    const container = document.getElementById('workout-exercises');
    container.innerHTML = '';

    routine.exercises.forEach((ex, index) => {
        const numSets = parseInt(ex.targetSets) || 3;
        let setsHTML = '';
        
        for(let i=1; i<=numSets; i++) {
            setsHTML += `
                <div class="set-row">
                    <span>Série ${i}</span>
                    <input type="number" placeholder="Kg" class="input-weight" data-ex-index="${index}" data-set="${i}">
                    <input type="number" placeholder="Reps" class="input-reps" data-ex-index="${index}" data-set="${i}">
                    <input type="number" placeholder="RPE" class="input-rpe" data-ex-index="${index}" data-set="${i}">
                </div>
            `;
        }

        container.innerHTML += `
            <div class="exercise-group">
                <h4>${ex.name} <span style="font-size:0.8rem; color:var(--primary-color); font-weight:normal;">(${ex.targetSets}x${ex.targetReps})</span></h4>
                <p style="font-size:0.8rem; color:#888; margin-bottom:10px;">${ex.notes || ''}</p>
                <div class="set-row">
                    <label></label><label>Peso (kg)</label><label>Reps</label><label>RPE (1-10)</label>
                </div>
                ${setsHTML}
            </div>
        `;
    });
}

function cancelWorkout() {
    if(confirm('Cancelar este treino? Os dados preenchidos serão perdidos.')) {
        document.getElementById('routine-selector').classList.remove('hidden');
        document.getElementById('active-workout').classList.add('hidden');
        currentActiveWorkout = null;
    }
}

function finishWorkout() {
    if(!currentActiveWorkout) return;

    // Coletar dados dos inputs
    const weightInputs = document.querySelectorAll('.input-weight');
    const repsInputs = document.querySelectorAll('.input-reps');
    const rpeInputs = document.querySelectorAll('.input-rpe');

    // Popula o objeto currentActiveWorkout
    // Limpa sets anteriores se houver (para evitar duplicatas ao clicar multiplas vezes)
    currentActiveWorkout.exercises.forEach(ex => ex.sets = []);

    for(let i=0; i<weightInputs.length; i++) {
        const w = weightInputs[i].value;
        const r = repsInputs[i].value;
        const rpe = rpeInputs[i].value;
        
        // Se preencheu ao menos as repetições
        if(r !== "") {
            const exIndex = weightInputs[i].getAttribute('data-ex-index');
            const setNum = weightInputs[i].getAttribute('data-set');
            
            currentActiveWorkout.exercises[exIndex].sets.push({
                set: setNum,
                weight: w || "0",
                reps: r,
                rpe: rpe || "0"
            });
        }
    }

    // Remove exercicios sem nenhuma serie preenchida
    currentActiveWorkout.exercises = currentActiveWorkout.exercises.filter(ex => ex.sets.length > 0);

    if(currentActiveWorkout.exercises.length === 0) {
        alert('Preencha ao menos uma série para salvar o treino!');
        return;
    }

    appData.sessions.push(currentActiveWorkout);
    saveData();
    
    alert('Treino salvo com sucesso! Bom descanso.');
    
    document.getElementById('routine-selector').classList.remove('hidden');
    document.getElementById('active-workout').classList.add('hidden');
    currentActiveWorkout = null;
    
    // Volta pro dashboard
    document.querySelector('.nav-item[data-target="view-dashboard"]').click();
}
