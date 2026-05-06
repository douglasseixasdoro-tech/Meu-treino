const STORAGE_KEY = "treino-nuvem-v1";

const state = loadState();

const templates = {
  workout: document.querySelector("#workoutTemplate"),
  exercise: document.querySelector("#exerciseTemplate"),
};

const els = {
  workoutList: document.querySelector("#workoutList"),
  sessionWorkout: document.querySelector("#sessionWorkout"),
  sessionExercises: document.querySelector("#sessionExercises"),
  sessionDate: document.querySelector("#sessionDate"),
  sessionHistory: document.querySelector("#sessionHistory"),
  measureHistory: document.querySelector("#measureHistory"),
  csvPreview: document.querySelector("#csvPreview"),
  geminiPrompt: document.querySelector("#geminiPrompt"),
  dashboardStats: document.querySelector("#dashboardStats"),
  dashboardExercise: document.querySelector("#dashboardExercise"),
  exerciseChart: document.querySelector("#exerciseChart"),
  exerciseTimeline: document.querySelector("#exerciseTimeline"),
  recordsList: document.querySelector("#recordsList"),
  exerciseCatalogList: document.querySelector("#exerciseCatalogList"),
  duplicateBox: document.querySelector("#duplicateBox"),
  appMenu: document.querySelector("#appMenu"),
  menuOverlay: document.querySelector("#menuOverlay"),
  aiExtraInstruction: document.querySelector("#aiExtraInstruction"),
};

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
});

document.querySelectorAll(".menu-link").forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab);
    closeMenu();
  });
});

document.querySelector("#menuOpenBtn").addEventListener("click", openMenu);
document.querySelector("#menuCloseBtn").addEventListener("click", closeMenu);
els.menuOverlay.addEventListener("click", closeMenu);

document.querySelector("#addWorkoutBtn").addEventListener("click", () => {
  state.routine.push({
    id: crypto.randomUUID(),
    name: "Novo treino",
    exercises: [],
  });
  saveAndRender();
});

document.querySelector("#saveSessionBtn").addEventListener("click", saveSession);
document.querySelector("#saveMeasureBtn").addEventListener("click", saveMeasure);
document.querySelector("#exportJsonBtn").addEventListener("click", exportJson);
document.querySelector("#importJsonInput").addEventListener("change", importJson);
document.querySelector("#importCsvInput").addEventListener("change", importCsv);
document.querySelector("#exportWorkbookBtn").addEventListener("click", exportWorkbook);
document.querySelector("#importWorkbookInput").addEventListener("change", importWorkbook);
document.querySelector("#importPastedTableBtn").addEventListener("click", importPastedTable);
document.querySelector("#addCatalogExerciseBtn").addEventListener("click", addCatalogExercise);
document.querySelector("#clearAllDataBtn").addEventListener("click", clearAllData);
document.querySelector("#clearAllDataSheetBtn")?.addEventListener("click", clearAllData);
document.querySelector("#exportSessionsCsv").addEventListener("click", () => showCsv("sessions"));
document.querySelector("#exportMeasuresCsv").addEventListener("click", () => showCsv("measures"));
document.querySelector("#exportRoutineCsv").addEventListener("click", () => showCsv("routine"));
document.querySelector("#exportCatalogCsv").addEventListener("click", () => showCsv("catalog"));
document.querySelector("#buildPromptBtn").addEventListener("click", buildGeminiPrompt);
els.sessionWorkout.addEventListener("change", renderSessionForm);
els.dashboardExercise.addEventListener("change", renderExerciseEvolution);

function activateTab(tabName) {
  document.querySelectorAll(".tab, .panel").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(`.tab[data-tab="${tabName}"]`).forEach((tab) => tab.classList.add("active"));
  document.querySelector(`#${tabName}`).classList.add("active");
}

function openMenu() {
  els.appMenu.classList.add("open");
  els.appMenu.setAttribute("aria-hidden", "false");
  els.menuOverlay.hidden = false;
}

function closeMenu() {
  els.appMenu.classList.remove("open");
  els.appMenu.setAttribute("aria-hidden", "true");
  els.menuOverlay.hidden = true;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return migrateState(JSON.parse(saved));
  return {
    exerciseCatalog: [],
    routine: [],
    sessions: [],
    measures: [],
  };
}

function migrateState(data) {
  data.exerciseCatalog ||= [];
  data.routine ||= [];
  data.sessions ||= [];
  data.measures ||= [];
  return data;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveAndRender() {
  persist();
  render();
}

function render() {
  renderRoutine();
  renderExerciseCatalog();
  renderWorkoutSelect();
  renderSessionForm();
  renderSessionHistory();
  renderMeasureHistory();
  renderDashboard();
}

function renderRoutine() {
  els.workoutList.innerHTML = "";
  state.routine.forEach((workout) => {
    const node = templates.workout.content.cloneNode(true);
    const container = node.querySelector(".workout-card");
    const nameInput = node.querySelector(".workout-name");
    nameInput.value = workout.name;
    nameInput.addEventListener("change", (e) => {
      workout.name = e.target.value;
      persist();
      renderWorkoutSelect();
    });

    node.querySelector(".delete-workout").addEventListener("click", () => {
      state.routine = state.routine.filter((w) => w.id !== workout.id);
      saveAndRender();
    });

    node.querySelector(".add-exercise").addEventListener("click", () => {
      workout.exercises.push({
        id: crypto.randomUUID(),
        name: "",
        targetSets: 3,
        targetReps: "10",
        notes: "",
      });
      saveAndRender();
    });

    const exList = node.querySelector(".exercise-list");
    workout.exercises.forEach((ex) => {
      const exNode = templates.exercise.content.cloneNode(true);
      const exName = exNode.querySelector(".ex-name");
      exName.value = ex.name;
      exName.addEventListener("change", (e) => {
        ex.name = e.target.value;
        persist();
      });

      const exSets = exNode.querySelector(".ex-sets");
      exSets.value = ex.targetSets;
      exSets.addEventListener("change", (e) => {
        ex.targetSets = parseInt(e.target.value) || 0;
        persist();
      });

      const exReps = exNode.querySelector(".ex-reps");
      exReps.value = ex.targetReps;
      exReps.addEventListener("change", (e) => {
        ex.targetReps = e.target.value;
        persist();
      });

      exNode.querySelector(".delete-exercise").addEventListener("click", () => {
        workout.exercises = workout.exercises.filter((e) => e.id !== ex.id);
        saveAndRender();
      });

      exList.appendChild(exNode);
    });

    els.workoutList.appendChild(node);
  });
}

function renderWorkoutSelect() {
  els.sessionWorkout.innerHTML = '<option value="">Selecione o treino...</option>';
  state.routine.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = w.name;
    els.sessionWorkout.appendChild(opt);
  });
}

function renderSessionForm() {
  els.sessionExercises.innerHTML = "";
  const workoutId = els.sessionWorkout.value;
  const workout = state.routine.find((w) => w.id === workoutId);
  if (!workout) return;

  if (!els.sessionDate.value) {
  els.sessionDate.value = today();
}

  workout.exercises.forEach((exTemplate) => {
    const div = document.createElement("div");
    div.className = "session-exercise-card";
    div.dataset.templateId = exTemplate.id;
    div.dataset.name = exTemplate.name;

    div.innerHTML = `
      <div class="ex-header">
        <strong>${escapeHtml(exTemplate.name)}</strong>
        <span class="hint">${exTemplate.targetSets}x${exTemplate.targetReps}</span>
      </div>
      <div class="sets-stack"></div>
      <button class="add-set-btn ghost">+ Adicionar série</button>
    `;

    const stack = div.querySelector(".sets-stack");
    const addBtn = div.querySelector(".add-set-btn");

    const addSet = (weight = "", reps = "", rpe = "") => {
      const setDiv = document.createElement("div");
      setDiv.className = "set-row";
      setDiv.innerHTML = `
        <input type="number" placeholder="kg" class="set-weight" value="${weight}">
        <input type="number" placeholder="reps" class="set-reps" value="${reps}">
        <input type="number" placeholder="RPE" class="set-rpe" value="${rpe}">
        <button class="delete-set icon ghost">×</button>
      `;
      setDiv.querySelector(".delete-set").onclick = () => setDiv.remove();
      stack.appendChild(setDiv);
    };

    for (let i = 0; i < exTemplate.targetSets; i++) addSet();
    addBtn.onclick = () => addSet();

    els.sessionExercises.appendChild(div);
  });
}

function saveSession() {
  const workoutId = els.sessionWorkout.value;
  const date = els.sessionDate.value;
  const workout = state.routine.find((w) => w.id === workoutId);

  if (!workout || !date) return alert("Selecione o treino e a data.");

  const session = {
    id: crypto.randomUUID(),
    date,
    workoutId,
    workoutName: workout.name,
    exercises: [],
  };

  document.querySelectorAll(".session-exercise-card").forEach((card) => {
    const exSession = {
      name: card.dataset.name,
      sets: [],
    };
    card.querySelectorAll(".set-row").forEach((row) => {
      const weight = parseFloat(row.querySelector(".set-weight").value);
      const reps = parseInt(row.querySelector(".set-reps").value);
      const rpe = parseInt(row.querySelector(".set-rpe").value);
      if (!isNaN(weight) || !isNaN(reps)) {
        exSession.sets.push({ weight, reps, rpe });
      }
    });
    if (exSession.sets.length > 0) session.exercises.push(exSession);
  });

  state.sessions.push(session);
  saveAndRender();
  activateTab("dashboard");
}

function renderSessionHistory() {
  const rows = state.sessions.slice(0, 10).map((session) => {
    const totalSets = session.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
    return `
      <tr>
        <td>${session.date}</td>
        <td>${escapeHtml(session.workoutName)}</td>
        <td>${totalSets}</td>
        <td>${escapeHtml(summarizeSession(session))}</td>
      </tr>
    `;
  });
  els.sessionHistory.innerHTML = table(["Data", "Treino", "Séries", "Resumo"], rows);
}

function summarizeSession(session) {
  return session.exercises.map((e) => `${e.name} (${e.sets.length}s)`).join(", ");
}

function saveMeasure() {
  const measure = {
    id: crypto.randomUUID(),
    date: document.querySelector("#measureDate").value || today(),
    weight: document.querySelector("#mWeight").value,
    waist: document.querySelector("#mWaist").value,
    chest: document.querySelector("#mChest").value,
    arm: document.querySelector("#mArm").value,
    leg: document.querySelector("#mLeg").value,
    notes: document.querySelector("#mNotes").value,
  };
  state.measures.push(measure);
  saveAndRender();
}

function renderMeasureHistory() {
  const rows = state.measures.map(
    (item) => `
    <tr>
      <td>${item.date}</td>
      <td>${item.weight}</td>
      <td>${item.waist}</td>
      <td>${item.chest}</td>
      <td>${item.arm}</td>
      <td>${item.leg}</td>
      <td>${escapeHtml(item.notes)}</td>
    </tr>
  `,
  );
  els.measureHistory.innerHTML = table(["Data", "Peso", "Cintura", "Peito", "Braço", "Perna", "Obs"], rows);
}

function renderDashboard() {
  const totalWorkouts = state.sessions.length;
  const lastWorkout = state.sessions[state.sessions.length - 1]?.date || "-";
  const exerciseCount = state.exerciseCatalog.length;

  els.dashboardStats.innerHTML = `
    <div class="stat-card">
      <p class="eyebrow">total</p>
      <div class="stat-value">${totalWorkouts}</div>
      <p class="hint">Sessões registradas</p>
    </div>
    <div class="stat-card">
      <p class="eyebrow">último</p>
      <div class="stat-value">${lastWorkout}</div>
      <p class="hint">Data do treino</p>
    </div>
    <div class="stat-card">
      <p class="eyebrow">catálogo</p>
      <div class="stat-value">${exerciseCount}</div>
      <p class="hint">Exercícios cadastrados</p>
    </div>
  `;

  const names = [...new Set(state.sessions.flatMap((s) => s.exercises.map((e) => e.name)))].sort();
  const current = els.dashboardExercise.value;
  els.dashboardExercise.innerHTML = '<option value="">Escolha um exercício...</option>';
  names.forEach((n) => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    els.dashboardExercise.appendChild(opt);
  });
  els.dashboardExercise.value = current;

  renderRecords(calculateRecords(names));
  renderExerciseEvolution();
}

function calculateRecords(names) {
  const records = [];
  names.forEach((name) => {
    let maxWeight = 0;
    let date = "";
    state.sessions.forEach((s) => {
      s.exercises.forEach((ex) => {
        if (ex.name === name) {
          ex.sets.forEach((set) => {
            if (set.weight > maxWeight) {
              maxWeight = set.weight;
              date = s.date;
            }
          });
        }
      });
    });
    if (maxWeight > 0) records.push({ name, maxWeight, date });
  });
  return records.sort((a, b) => b.maxWeight - a.maxWeight);
}

function renderRecords(records) {
  if (!records.length) {
    els.recordsList.innerHTML = `<div class="records-empty">Registre treinos para ver seus recordes.</div>`;
    return;
  }

  els.recordsList.innerHTML = records
    .slice(0, 12)
    .map(
      (record) => `
    <div class="record-item">
      <strong>${escapeHtml(record.name)}</strong>
      <div class="record-meta">
        <span class="record-pill">${record.maxWeight} kg</span>
        <span>${record.date}</span>
      </div>
    </div>
  `,
    )
    .join("");
}

function renderExerciseEvolution() {
  const name = els.dashboardExercise.value;
  if (!name) {
    els.exerciseChart.innerHTML = "";
    els.exerciseTimeline.innerHTML = "";
    return;
  }

  const history = [];
  state.sessions.forEach((s) => {
    s.exercises.forEach((ex) => {
      if (ex.name === name) {
        const bestSet = ex.sets.reduce((prev, curr) => (curr.weight > prev.weight ? curr : prev), { weight: 0 });
        history.push({ date: s.date, weight: bestSet.weight, reps: bestSet.reps });
      }
    });
  });

  const maxWeight = Math.max(...history.map((h) => h.weight), 1);
  els.exerciseChart.innerHTML = history
    .map(
      (h) => `
    <div class="chart-bar" style="height: ${(h.weight / maxWeight) * 100}%" title="${h.date}: ${h.weight}kg"></div>
  `,
    )
    .join("");

  els.exerciseTimeline.innerHTML = history
    .reverse()
    .map(
      (h) => `
    <div class="timeline-item">
      <span>${h.date}</span>
      <strong>${h.weight} kg × ${h.reps}</strong>
    </div>
  `,
    )
    .join("");
}

function renderExerciseCatalog() {
  els.exerciseCatalogList.innerHTML = "";
  state.exerciseCatalog.forEach((ex) => {
    const div = document.createElement("div");
    div.className = "exercise-card";
    div.innerHTML = `
      <div class="ex-header">
        <strong>${escapeHtml(ex.name)}</strong>
        <button class="delete-catalog-ex icon ghost">×</button>
      </div>
      <p class="muscle-tag">${escapeHtml(ex.muscleGroup)}</p>
      <p class="hint">${escapeHtml(ex.notes)}</p>
    `;
    div.querySelector(".delete-catalog-ex").onclick = () => {
      state.exerciseCatalog = state.exerciseCatalog.filter((e) => e.id !== ex.id);
      saveAndRender();
    };
    els.exerciseCatalogList.appendChild(div);
  });
}

function addCatalogExercise() {
  const name = document.querySelector("#catName").value;
  if (!name) return;
  state.exerciseCatalog.push({
    id: crypto.randomUUID(),
    name,
    muscleGroup: document.querySelector("#catMuscle").value,
    notes: document.querySelector("#catNotes").value,
    restSeconds: parseInt(document.querySelector("#catRest").value) || 60,
  });
  saveAndRender();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `treino-nuvem-backup-${today()}.json`;
  a.click();
}

function importJson(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      Object.assign(state, migrateState(data));
      saveAndRender();
      alert("Backup carregado!");
    } catch (err) {
      alert("Erro ao importar JSON.");
    }
  };
  reader.readAsText(file);
}

function importCsv(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const lines = content.split("\n").map((l) => l.split(",").map((c) => c.trim()));
    els.csvPreview.innerHTML = table(lines[0], lines.slice(1, 11));
  };
  reader.readAsText(file);
}

function exportWorkbook() {
  alert("Para exportar em Excel real, recomendo usar o formato JSON e converter online ou usar uma biblioteca como SheetJS.");
}

function importWorkbook() {
  alert("Use a funcionalidade de colar tabela ou importar JSON por enquanto.");
}

function importPastedTable() {
  const text = document.querySelector("#pastedTable").value;
  if (!text) return;
  const rows = text
    .split("\n")
    .map((r) => r.split("\t"))
    .filter((r) => r.length > 1);
  alert(`Detectadas ${rows.length} linhas. A lógica de mapeamento para as colunas do app deve ser implementada aqui.`);
}

function showCsv(type) {
  let csv = "";
  if (type === "sessions") {
    csv = "data,treino,exercicio,peso,reps,rpe\n";
    state.sessions.forEach((s) => {
      s.exercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          csv += `${s.date},${s.workoutName},${ex.name},${set.weight},${set.reps},${set.rpe}\n`;
        });
      });
    });
  }
  els.csvPreview.textContent = csv;
}

function buildGeminiPrompt() {
  const lastMeasures = state.measures[state.measures.length - 1];
  const lastSessions = state.sessions.slice(-3);

  let prompt = `Analise meu progresso de treino:\n\n`;
  if (lastMeasures) {
    prompt += `Última medida (${lastMeasures.date}): Peso ${lastMeasures.weight}kg, Braço ${lastMeasures.arm}cm.\n`;
  }
  prompt += `\nÚltimos treinos:\n`;
  lastSessions.forEach((s) => {
    prompt += `- ${s.date}: ${s.workoutName} (${summarizeSession(s)})\n`;
  });

  prompt += `\nInstrução extra: ${els.aiExtraInstruction.value || "Dê dicas para melhorar meu volume de treino."}`;
  els.geminiPrompt.value = prompt;
}

function clearAllData() {
  if (confirm("TEM CERTEZA? Isso apagará tudo permanentemente.")) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

function table(headers, rows) {
  if (!rows.length) return "<p>Nenhum registro ainda.</p>";
  return `
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60000);
  return localDate.toISOString().split("T")[0];
}
render();