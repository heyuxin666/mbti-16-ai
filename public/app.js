// ── State ──────────────────────────────────
let personalityMeta = [];
let selectedTypes = new Set();
const groupOrder = ["analyst", "diplomat", "sentinel", "explorer"];

// ── DOM refs ──────────────────────────────
const grid = document.getElementById("grid");
const form = document.getElementById("questionForm");
const input = document.getElementById("questionInput");
const submitBtn = document.getElementById("submitBtn");
const clearBtn = document.getElementById("clearBtn");
const statusBar = document.getElementById("statusBar");
const themeToggle = document.getElementById("themeToggle");
const selectionGroups = document.getElementById("selectionGroups");
const selectAllBtn = document.getElementById("selectAllBtn");
const selectionCount = document.getElementById("selectionCount");

// ── Init: load personality metadata ───────
async function loadMeta() {
  try {
    const res = await fetch("/api/personalities");
    if (res.ok) personalityMeta = await res.json();
  } catch (_) {}
  renderSelectionPanel();
  updateSubmitState();
}

// ── Selection Panel ────────────────────────
function renderSelectionPanel() {
  const groups = {};
  personalityMeta.forEach(p => {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  });

  let html = "";
  groupOrder.forEach(groupKey => {
    const members = groups[groupKey];
    if (!members) return;
    const label = members[0].groupLabel || groupKey;
    html += `<div class="selection-group">
      <span class="group-label ${groupKey}" data-group="${groupKey}">${label}</span>
      <div class="group-chips">`;

    members.forEach(p => {
      const sel = selectedTypes.has(p.type) ? " selected" : "";
      html += `
        <div class="personality-chip${sel}" data-type="${p.type}" style="--chip-color:${p.color}" title="${p.type} - ${p.title}">
          <img class="chip-avatar" src="${p.avatar}" alt="${p.type}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <span class="chip-avatar-fallback" style="display:none;background:${p.color}">${p.type.slice(0,2)}</span>
          <span class="chip-type">${p.type}</span>
          <span class="chip-title">${p.title}</span>
        </div>`;
    });

    html += `</div></div>`;
  });

  selectionGroups.innerHTML = html;

  // Click: individual chip toggle
  selectionGroups.querySelectorAll(".personality-chip").forEach(chip => {
    chip.addEventListener("click", () => toggleType(chip.dataset.type));
  });

  // Click: group label toggles all in group
  selectionGroups.querySelectorAll(".group-label").forEach(label => {
    label.addEventListener("click", () => toggleGroup(label.dataset.group));
  });
}

function toggleType(type) {
  if (selectedTypes.has(type)) {
    selectedTypes.delete(type);
  } else {
    selectedTypes.add(type);
  }
  refreshSelection();
}

function toggleGroup(groupKey) {
  const members = personalityMeta.filter(p => p.group === groupKey);
  const allSelected = members.every(p => selectedTypes.has(p.type));

  if (allSelected) {
    members.forEach(p => selectedTypes.delete(p.type));
  } else {
    members.forEach(p => selectedTypes.add(p.type));
  }
  refreshSelection();
}

selectAllBtn.addEventListener("click", () => {
  if (selectedTypes.size === personalityMeta.length) {
    selectedTypes.clear();
    selectAllBtn.textContent = "全选";
  } else {
    personalityMeta.forEach(p => selectedTypes.add(p.type));
    selectAllBtn.textContent = "清空";
  }
  refreshSelection();
});

function refreshSelection() {
  selectionGroups.querySelectorAll(".personality-chip").forEach(chip => {
    chip.classList.toggle("selected", selectedTypes.has(chip.dataset.type));
  });
  selectionCount.textContent = `${selectedTypes.size}/16`;
  selectAllBtn.textContent = selectedTypes.size === 16 ? "清空" : "全选";
  updateSubmitState();
}

function updateSubmitState() {
  submitBtn.disabled = selectedTypes.size === 0;
}

// ── Avatar helpers ────────────────────────
function avatarHtml(meta) {
  return `
    <img class="card-avatar" src="${meta.avatar}" alt="${meta.type}"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
         style="border-color:${meta.color}">
    <div class="avatar-fallback" style="display:none; background:${meta.color || '#888'}">
      ${meta.type.slice(0, 2)}</div>`;
}

// ── Render functions ──────────────────────
function renderEmpty(msg) {
  const message = msg || "先选择你想请教的角色，然后输入问题";
  grid.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">👆</div>
      <p>${message}</p>
    </div>`;
}

function renderSkeletons() {
  clearStatus();
  const selected = personalityMeta.filter(p => selectedTypes.has(p.type));
  if (selected.length === 0) { renderEmpty(); return; }

  let html = "";
  selected.forEach(p => {
    html += `
      <div class="card skeleton" style="--group-color:${p.color}; --group-glow:${p.color}33;">
        <div class="card-header">
          ${avatarHtml(p)}
          <div class="card-info">
            <span class="card-type">${p.type}</span>
            <span class="card-title">${p.title}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="thinking-dots">
            <span style="background:${p.color}"></span>
            <span style="background:${p.color}"></span>
            <span style="background:${p.color}"></span>
          </div>
        </div>
      </div>`;
  });
  grid.innerHTML = html;
}

function renderResponses(responses) {
  const metaMap = {};
  personalityMeta.forEach(p => { metaMap[p.type] = p; });

  // Sort by group order
  const sorted = [...responses].sort((a, b) => {
    const ga = metaMap[a.type]?.group || "";
    const gb = metaMap[b.type]?.group || "";
    return (groupOrder.indexOf(ga) - groupOrder.indexOf(gb));
  });

  let html = "";
  sorted.forEach((r, i) => {
    const p = metaMap[r.type] || {};
    const delay = i * 0.08;
    html += `
      <div class="card" style="--group-color:${p.color || '#888'}; --group-glow:${p.color || '#888'}33; animation-delay:${delay}s;">
        <div class="card-header">
          ${avatarHtml(p)}
          <div class="card-info">
            <span class="card-type">${r.type}</span>
            <span class="card-title">${p.title || ''}</span>
          </div>
        </div>
        <div class="card-body">${escapeHtml(r.response)}</div>
      </div>`;
  });
  grid.innerHTML = html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ── Status bar ────────────────────────────
function setStatus(text, cls) {
  statusBar.textContent = text;
  statusBar.className = "status-bar " + cls;
}

function clearStatus() {
  statusBar.textContent = "";
  statusBar.className = "status-bar hidden";
}

// ── API call ──────────────────────────────
async function callPersonality(type, question) {
  try {
    const res = await fetch("/api/ask-one", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, question }),
    });
    if (!res.ok) throw new Error("fail");
    const data = await res.json();
    return { type, response: data.response };
  } catch (_) {
    return { type, response: "（思考中……请稍后再试）" };
  }
}

// ── Main submit handler ───────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = input.value.trim();
  if (!question) return;
  if (selectedTypes.size === 0) return;

  submitBtn.disabled = true;
  input.disabled = true;
  renderSkeletons();
  const types = [...selectedTypes];
  setStatus(`${types.length}位人格正在思考"${question}"……`, "loading");

  // Fire parallel calls for selected types only
  const promises = types.map(t => callPersonality(t, question));
  const responses = await Promise.all(promises);

  setStatus(`关于"${question}"的回答（${responses.length}位）：`, "success");
  renderResponses(responses);
  clearBtn.classList.remove("hidden");

  submitBtn.disabled = false;
  input.disabled = false;
});

// ── Clear ─────────────────────────────────
clearBtn.addEventListener("click", () => {
  input.value = "";
  input.disabled = false;
  submitBtn.disabled = selectedTypes.size === 0;
  clearBtn.classList.add("hidden");
  clearStatus();
  renderEmpty();
  input.focus();
});

// ── Theme toggle ──────────────────────────
themeToggle.addEventListener("click", () => {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  try { localStorage.setItem("mbti-theme", next); } catch (_) {}
});

(function initTheme() {
  try {
    const saved = localStorage.getItem("mbti-theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  } catch (_) {}
})();

// ── Bootstrap ─────────────────────────────
loadMeta();
