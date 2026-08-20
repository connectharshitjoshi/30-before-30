/**
 * 30 BEFORE 30 — HARSHIT EDITION
 * Application Logic, Real-Time Countdown & Accordion Interactions
 */

// DOB & Milestone Configuration
const DOB = new Date('2003-01-28T00:00:00+05:30');
const TARGET_DATE = new Date('2033-01-28T00:00:00+05:30');
const TWENTIETH_BDAY = new Date('2023-01-28T00:00:00+05:30');
const STORAGE_KEY = 'harshit_30_before_30_v1';

// App State
let appState = {
  completedItems: {},
  notes: {},
  targetDates: {},
  openedAccordions: {},
  activeCategory: 'all',
  activeStatus: 'all',
  searchQuery: ''
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderAccordions();
  updateProgressMetrics();
  initEventListeners();
  initConfetti();
});

/* -------------------------------------------------------------
   STATE MANAGEMENT (LocalStorage)
-------------------------------------------------------------- */
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      appState = { ...appState, ...parsed };
    }
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      completedItems: appState.completedItems,
      notes: appState.notes,
      targetDates: appState.targetDates
    }));
  } catch (err) {
    console.error('Error saving state:', err);
  }
}

/* -------------------------------------------------------------
   ACCORDION RENDERING & BUILDING
-------------------------------------------------------------- */
function renderAccordions() {
  const container = document.getElementById('accordions-container');
  if (!container) return;

  container.innerHTML = '';

  let totalVisibleGoals = 0;

  GOALS_DATA.forEach(cat => {
    // Check if category is filtered out
    if (appState.activeCategory !== 'all' && appState.activeCategory !== cat.category) {
      return;
    }

    // Filter goals inside category
    const filteredGoals = cat.goals.filter(goal => {
      // Status filter
      const isGoalCompleted = isAllGoalItemsComplete(goal);
      if (appState.activeStatus === 'completed' && !isGoalCompleted) return false;
      if (appState.activeStatus === 'pending' && isGoalCompleted) return false;

      // Search query filter
      if (appState.searchQuery.trim()) {
        const query = appState.searchQuery.toLowerCase().trim();
        const titleMatch = goal.title.toLowerCase().includes(query);
        const numMatch = goal.num.includes(query);
        const summaryMatch = goal.summary.toLowerCase().includes(query);
        const tagsMatch = goal.tags ? goal.tags.some(t => t.toLowerCase().includes(query)) : false;
        const locsMatch = goal.locations ? goal.locations.some(l => l.toLowerCase().includes(query)) : false;
        const itemsMatch = goal.items.some(it => it.text.toLowerCase().includes(query));
        return titleMatch || numMatch || summaryMatch || tagsMatch || locsMatch || itemsMatch;
      }
      return true;
    });

    if (filteredGoals.length === 0) return;

    totalVisibleGoals += filteredGoals.length;

    // Build Category Section
    const sectionEl = document.createElement('section');
    sectionEl.className = 'category-section';
    sectionEl.setAttribute('data-category', cat.category);

    // Calculate category progress
    const catTotalItems = cat.goals.reduce((acc, g) => acc + g.items.length, 0);
    const catDoneItems = cat.goals.reduce((acc, g) => {
      return acc + g.items.filter(it => appState.completedItems[it.id]).length;
    }, 0);
    const isCatAllDone = catTotalItems > 0 && catDoneItems === catTotalItems;

    sectionEl.innerHTML = `
      <div class="category-header">
        <div class="category-title-wrap">
          <div class="category-icon-badge">${cat.categoryIcon}</div>
          <h2 class="category-title">${cat.categoryTitle}</h2>
        </div>
        <div class="category-progress-badge ${isCatAllDone ? 'all-done' : ''}">
          ${catDoneItems} / ${catTotalItems} Tasks Done
        </div>
      </div>
      <div class="goals-list" id="goals-list-${cat.category}"></div>
    `;

    const goalsListEl = sectionEl.querySelector(`#goals-list-${cat.category}`);

    // Render individual goals
    filteredGoals.forEach(goal => {
      const goalEl = buildGoalAccordion(goal, cat);
      goalsListEl.appendChild(goalEl);
    });

    container.appendChild(sectionEl);
  });

  if (totalVisibleGoals === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No goals matched your filter or search</h3>
        <p style="color: var(--text-dim); margin-top: 0.5rem;">Try adjusting your search terms or clearing category filters.</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="resetFilters()">Reset Filters</button>
      </div>
    `;
  }
}

function buildGoalAccordion(goal, cat) {
  const isCompleted = isAllGoalItemsComplete(goal);
  const isOpen = !!appState.openedAccordions[goal.id];
  const doneCount = goal.items.filter(it => appState.completedItems[it.id]).length;
  const totalCount = goal.items.length;

  const itemEl = document.createElement('div');
  itemEl.className = `accordion-item ${isOpen ? 'open' : ''} ${isCompleted ? 'is-complete' : ''}`;
  itemEl.id = `accordion-${goal.id}`;

  // Locations chips HTML
  let locChipsHtml = '';
  if (goal.locations && goal.locations.length > 0) {
    locChipsHtml = goal.locations.map(loc => `<span class="chip chip-loc">📍 ${loc}</span>`).join('');
  }

  // Tags chips HTML
  let tagsChipsHtml = '';
  if (goal.tags && goal.tags.length > 0) {
    tagsChipsHtml = goal.tags.map(t => `<span class="chip chip-tag">#${t}</span>`).join('');
  }

  // Checklist items HTML
  const itemsHtml = goal.items.map(it => {
    const isChecked = !!appState.completedItems[it.id];
    return `
      <label class="check-item ${isChecked ? 'completed' : ''}" data-item-id="${it.id}">
        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleItemCheck('${goal.id}', '${it.id}', this.checked)">
        <span class="check-text">${it.text}</span>
      </label>
    `;
  }).join('');

  const savedNote = appState.notes[goal.id] || '';
  const savedDate = appState.targetDates[goal.id] || '';

  itemEl.innerHTML = `
    <button type="button" class="accordion-header" onclick="toggleAccordion('${goal.id}')">
      <div class="goal-header-left">
        <div class="goal-num">${goal.num}</div>
        <div class="goal-title-box">
          <div class="goal-title">
            ${goal.title}
          </div>
          <div class="goal-mini-summary">${goal.summary}</div>
        </div>
      </div>
      <div class="goal-header-right">
        <span class="goal-badge ${isCompleted ? 'done-badge' : ''}" id="badge-${goal.id}">
          ${isCompleted ? '✓ COMPLETED' : `${doneCount}/${totalCount} Done`}
        </span>
        <div class="chevron-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
    </button>

    <div class="accordion-content">
      <div class="content-inner">
        ${goal.image ? `
          <div class="goal-banner-wrap">
            <img src="${goal.image}" alt="${goal.title}" class="goal-banner-img" loading="lazy">
            <div class="goal-banner-overlay"></div>
          </div>
        ` : ''}

        <p class="goal-full-summary">${goal.summary}</p>
        
        ${(locChipsHtml || tagsChipsHtml) ? `
          <div class="chips-section">
            ${locChipsHtml}
            ${tagsChipsHtml}
          </div>
        ` : ''}

        <div class="checklist-section">
          <div class="checklist-title">
            <span>Action Milestones & Sub-tasks</span>
          </div>
          <div class="checklist" id="checklist-${goal.id}">
            ${itemsHtml}
          </div>
        </div>

        <div class="accordion-footer">
          <textarea 
            class="notes-input" 
            placeholder="Write personal notes, memories, trip dates, links, or achievements for this goal..."
            oninput="saveGoalNote('${goal.id}', this.value)">${savedNote}</textarea>

          <div class="accordion-action-row">
            <div class="date-input-wrap">
              <label for="date-${goal.id}">Target / Completed Date:</label>
              <input type="date" id="date-${goal.id}" value="${savedDate}" onchange="saveGoalDate('${goal.id}', this.value)">
            </div>
            
            <button type="button" class="btn ${isCompleted ? '' : 'btn-primary'}" style="font-size: 0.78rem; padding: 0.45rem 0.85rem;" onclick="toggleWholeGoal('${goal.id}')">
              ${isCompleted ? '↩ Mark Incomplete' : '✓ Mark All Sub-tasks Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  return itemEl;
}

/* -------------------------------------------------------------
   INTERACTION HANDLERS
-------------------------------------------------------------- */
function toggleAccordion(goalId) {
  const itemEl = document.getElementById(`accordion-${goalId}`);
  if (!itemEl) return;

  const willOpen = !itemEl.classList.contains('open');
  itemEl.classList.toggle('open', willOpen);
  appState.openedAccordions[goalId] = willOpen;
}

function expandAllAccordions() {
  document.querySelectorAll('.accordion-item').forEach(el => {
    el.classList.add('open');
  });
  GOALS_DATA.forEach(cat => {
    cat.goals.forEach(g => {
      appState.openedAccordions[g.id] = true;
    });
  });
  showToast('Expanded all 30 goals');
}

function collapseAllAccordions() {
  document.querySelectorAll('.accordion-item').forEach(el => {
    el.classList.remove('open');
  });
  appState.openedAccordions = {};
  showToast('Collapsed all goals');
}

function toggleItemCheck(goalId, itemId, isChecked) {
  if (isChecked) {
    appState.completedItems[itemId] = true;
    triggerConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.7);
  } else {
    delete appState.completedItems[itemId];
  }

  saveState();
  updateGoalVisuals(goalId);
  updateProgressMetrics();

  // Check if this action completed the entire goal
  const goal = findGoalById(goalId);
  if (goal && isAllGoalItemsComplete(goal) && isChecked) {
    triggerMassiveConfetti();
    showToast(`🎉 Goal "${goal.title}" Completed!`);
  }
}

function toggleWholeGoal(goalId) {
  const goal = findGoalById(goalId);
  if (!goal) return;

  const isCurrentlyComplete = isAllGoalItemsComplete(goal);

  goal.items.forEach(it => {
    if (isCurrentlyComplete) {
      delete appState.completedItems[it.id];
    } else {
      appState.completedItems[it.id] = true;
    }
  });

  saveState();
  renderAccordions();
  updateProgressMetrics();

  if (!isCurrentlyComplete) {
    triggerMassiveConfetti();
    showToast(`🏆 Goal "${goal.title}" Marked 100% Complete!`);
  } else {
    showToast(`Goal "${goal.title}" reset to incomplete.`);
  }
}

function saveGoalNote(goalId, noteText) {
  appState.notes[goalId] = noteText;
  saveState();
}

function saveGoalDate(goalId, dateVal) {
  appState.targetDates[goalId] = dateVal;
  saveState();
  showToast('Target date saved');
}

function isAllGoalItemsComplete(goal) {
  if (!goal || !goal.items || goal.items.length === 0) return false;
  return goal.items.every(it => appState.completedItems[it.id]);
}

function findGoalById(goalId) {
  for (const cat of GOALS_DATA) {
    const found = cat.goals.find(g => g.id === goalId);
    if (found) return found;
  }
  return null;
}

function updateGoalVisuals(goalId) {
  const goal = findGoalById(goalId);
  if (!goal) return;

  const itemEl = document.getElementById(`accordion-${goalId}`);
  const badgeEl = document.getElementById(`badge-${goalId}`);

  const doneCount = goal.items.filter(it => appState.completedItems[it.id]).length;
  const totalCount = goal.items.length;
  const isComplete = totalCount > 0 && doneCount === totalCount;

  if (itemEl) {
    itemEl.classList.toggle('is-complete', isComplete);

    // Update checklist labels styling
    goal.items.forEach(it => {
      const checkLabel = itemEl.querySelector(`[data-item-id="${it.id}"]`);
      if (checkLabel) {
        checkLabel.classList.toggle('completed', !!appState.completedItems[it.id]);
      }
    });
  }

  if (badgeEl) {
    if (isComplete) {
      badgeEl.className = 'goal-badge done-badge';
      badgeEl.textContent = '✓ COMPLETED';
    } else {
      badgeEl.className = 'goal-badge';
      badgeEl.textContent = `${doneCount}/${totalCount} Done`;
    }
  }

  // Update category badge
  const cat = GOALS_DATA.find(c => c.goals.some(g => g.id === goalId));
  if (cat) {
    const catSection = document.querySelector(`.category-section[data-category="${cat.category}"]`);
    if (catSection) {
      const catBadge = catSection.querySelector('.category-progress-badge');
      const catTotalItems = cat.goals.reduce((acc, g) => acc + g.items.length, 0);
      const catDoneItems = cat.goals.reduce((acc, g) => acc + g.items.filter(it => appState.completedItems[it.id]).length, 0);
      if (catBadge) {
        catBadge.textContent = `${catDoneItems} / ${catTotalItems} Tasks Done`;
        catBadge.classList.toggle('all-done', catDoneItems === catTotalItems && catTotalItems > 0);
      }
    }
  }
}

/* -------------------------------------------------------------
   METRICS & PROGRESS BAR UPDATES
-------------------------------------------------------------- */
function updateProgressMetrics() {
  let totalGoals = 0;
  let completedGoals = 0;
  let totalTasks = 0;
  let completedTasks = 0;

  GOALS_DATA.forEach(cat => {
    cat.goals.forEach(goal => {
      totalGoals++;
      if (isAllGoalItemsComplete(goal)) {
        completedGoals++;
      }
      goal.items.forEach(it => {
        totalTasks++;
        if (appState.completedItems[it.id]) {
          completedTasks++;
        }
      });
    });
  });

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Update Hero elements
  const statCompletedGoals = document.getElementById('stat-completed-goals');
  const statCompletedTasks = document.getElementById('stat-completed-tasks');
  const statScorePercent = document.getElementById('stat-score-percent');
  const goalsProgFill = document.getElementById('goals-prog-fill');
  const goalsProgVal = document.getElementById('goals-prog-val');

  if (statCompletedGoals) statCompletedGoals.textContent = `${completedGoals} / ${totalGoals}`;
  if (statCompletedTasks) statCompletedTasks.textContent = `${completedTasks} / ${totalTasks}`;
  if (statScorePercent) statScorePercent.textContent = `${completionPercentage}%`;
  if (goalsProgFill) goalsProgFill.style.width = `${completionPercentage}%`;
  if (goalsProgVal) goalsProgVal.textContent = `${completionPercentage}% Complete (${completedGoals}/${totalGoals} Goals)`;
}

/* -------------------------------------------------------------
   FILTERS & CONTROLS
-------------------------------------------------------------- */
function initEventListeners() {
  // Category Pill Buttons
  const pillBtns = document.querySelectorAll('.pill-btn');
  pillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.activeCategory = btn.getAttribute('data-filter');
      renderAccordions();
    });
  });

  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value;
      renderAccordions();
    });
  }

  // Status Filter
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      appState.activeStatus = e.target.value;
      renderAccordions();
    });
  }
}

function resetFilters() {
  appState.activeCategory = 'all';
  appState.activeStatus = 'all';
  appState.searchQuery = '';

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) statusFilter.value = 'all';

  document.querySelectorAll('.pill-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-filter') === 'all');
  });

  renderAccordions();
  showToast('Filters reset to default');
}

/* -------------------------------------------------------------
   DATA RESET
-------------------------------------------------------------- */
function resetAllData() {
  if (confirm('Are you sure you want to reset all checked milestones and notes? This will clear all checked items.')) {
    appState.completedItems = {};
    appState.notes = {};
    appState.targetDates = {};
    saveState();
    renderAccordions();
    updateProgressMetrics();
    showToast('All progress reset to 0.');
  }
}

/* -------------------------------------------------------------
   TOAST NOTIFICATIONS
-------------------------------------------------------------- */
function showToast(msg) {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span> <span>${msg}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* -------------------------------------------------------------
   CONFETTI PARTICLE ENGINE
-------------------------------------------------------------- */
let confettiParticles = [];
let confettiCtx = null;
let confettiAnimId = null;

function initConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  confettiCtx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
}

function triggerConfettiBurst(x, y) {
  const colors = ['#f59e0b', '#ec4899', '#6366f1', '#10b981', '#06b6d4', '#ffffff'];
  for (let i = 0; i < 40; i++) {
    confettiParticles.push({
      x: x || window.innerWidth / 2,
      y: y || window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.8) * 12,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      opacity: 1,
      decay: Math.random() * 0.02 + 0.015
    });
  }
  if (!confettiAnimId) renderConfettiLoop();
}

function triggerMassiveConfetti() {
  const colors = ['#f59e0b', '#ec4899', '#6366f1', '#10b981', '#06b6d4', '#ffffff', '#a855f7'];
  for (let i = 0; i < 150; i++) {
    confettiParticles.push({
      x: Math.random() * window.innerWidth,
      y: -20,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 6 + 3,
      size: Math.random() * 10 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      opacity: 1,
      decay: Math.random() * 0.01 + 0.008
    });
  }
  if (!confettiAnimId) renderConfettiLoop();
}

function renderConfettiLoop() {
  if (!confettiCtx) return;
  confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2; // gravity
    p.rotation += p.vRot;
    p.opacity -= p.decay;

    if (p.opacity <= 0 || p.y > window.innerHeight) {
      confettiParticles.splice(i, 1);
      continue;
    }

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rotation * Math.PI) / 180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.globalAlpha = p.opacity;
    confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    confettiCtx.restore();
  }

  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(renderConfettiLoop);
  } else {
    confettiAnimId = null;
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}
