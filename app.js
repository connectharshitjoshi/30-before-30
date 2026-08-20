/**
 * 30 BEFORE 30 — HARSHIT EDITION
 * Application Logic, Interactive Travel & Adventure Map, Real-Time Progress & Accordion Interactions
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
  searchQuery: '',
  viewMode: 'list', // 'list' | 'map' | 'split'
  mapCategoryFilter: 'all',
  showMapRoutes: true
};

// Map Global Instances
let leafletMap = null;
let mapMarkers = [];
let mapRouteLayers = [];

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderAccordions();
  updateProgressMetrics();
  initEventListeners();
  initConfetti();
  initAdventureMap();
  updateMapStats();
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
   VIEW MODE SWITCHER (List / Map / Split)
-------------------------------------------------------------- */
function switchMainView(viewMode) {
  appState.viewMode = viewMode;

  const tabBtns = document.querySelectorAll('.view-tab-btn');
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewMode);
  });

  const mapSection = document.getElementById('travel-map-section');
  const toolbar = document.getElementById('roadmap-toolbar');
  const accordionsContainer = document.getElementById('accordions-container');
  const container = document.querySelector('.container');

  if (container) {
    container.classList.toggle('split-layout-active', viewMode === 'split');
  }

  if (viewMode === 'list') {
    if (mapSection) mapSection.style.display = 'none';
    if (toolbar) toolbar.style.display = 'block';
    if (accordionsContainer) accordionsContainer.style.display = 'block';
  } else if (viewMode === 'map') {
    if (mapSection) mapSection.style.display = 'block';
    if (toolbar) toolbar.style.display = 'none';
    if (accordionsContainer) accordionsContainer.style.display = 'none';
    
    // Ensure map refreshes layout correctly
    setTimeout(() => {
      if (!leafletMap) initAdventureMap();
      if (leafletMap) leafletMap.invalidateSize();
    }, 50);
  } else if (viewMode === 'split') {
    if (mapSection) mapSection.style.display = 'block';
    if (toolbar) toolbar.style.display = 'block';
    if (accordionsContainer) accordionsContainer.style.display = 'block';
    
    setTimeout(() => {
      if (!leafletMap) initAdventureMap();
      if (leafletMap) leafletMap.invalidateSize();
    }, 50);
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

  // Match mapped destinations from database
  const goalMapSpots = (typeof LOCATIONS_DATA !== 'undefined') ? LOCATIONS_DATA.filter(l => l.goalId === goal.id) : [];

  // Locations chips HTML with interactive map click
  let locChipsHtml = '';
  if (goalMapSpots.length > 0) {
    locChipsHtml = goalMapSpots.map(spot => `
      <button type="button" class="chip chip-loc" onclick="event.stopPropagation(); focusLocationOnMap('${spot.id}')" title="Click to view ${spot.name} (${spot.state}) on Interactive Map">
        <span class="chip-pin">📍</span>
        <span class="chip-loc-name">${spot.name}</span>
        <span class="chip-loc-action">🗺️ Map</span>
      </button>
    `).join('');
  } else if (goal.locations && goal.locations.length > 0) {
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
            ${goalMapSpots.length > 0 ? `
              <button type="button" class="banner-map-badge-btn" onclick="event.stopPropagation(); focusGoalOnMap('${goal.id}')">
                <span>🗺️ ${goalMapSpots.length} Pinned Spot${goalMapSpots.length > 1 ? 's' : ''}</span>
              </button>
            ` : ''}
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
            
            <div class="accordion-btn-group">
              ${goalMapSpots.length > 0 ? `
                <button type="button" class="btn btn-map-quick" onclick="focusGoalOnMap('${goal.id}')" title="Explore spots on Adventure Map">
                  <span>🗺️ View on Map</span>
                </button>
              ` : ''}
              
              <button type="button" class="btn ${isCompleted ? '' : 'btn-primary'}" style="font-size: 0.78rem; padding: 0.45rem 0.85rem;" onclick="toggleWholeGoal('${goal.id}')">
                ${isCompleted ? '↩ Mark Incomplete' : '✓ Mark All Sub-tasks Complete'}
              </button>
            </div>
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
  updateMapMarkersState();
  updateMapStats();

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
  updateMapMarkersState();
  updateMapStats();

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
   INTERACTIVE TRAVEL & ADVENTURE MAP ENGINE (Leaflet.js)
-------------------------------------------------------------- */
function initAdventureMap() {
  const mapEl = document.getElementById('adventure-leaflet-map');
  if (!mapEl || typeof L === 'undefined') return;

  if (leafletMap) {
    leafletMap.invalidateSize();
    return;
  }

  // Initialize Leaflet Map centered on India & surrounding world
  leafletMap = L.map('adventure-leaflet-map', {
    center: [22.5, 78.9],
    zoom: 5,
    minZoom: 2,
    maxZoom: 18,
    zoomControl: true,
    scrollWheelZoom: true
  });

  // Dark Theme CartoDB Tile Layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(leafletMap);

  renderMapMarkers();
  renderMapRoutes();
  updateMapStats();
}

function createCustomMarkerIcon(loc, isGoalDone) {
  const categoryClass = isGoalDone ? 'pin-done' : `pin-${loc.category}`;
  const pulseClass = isGoalDone ? 'marker-pulse pulse-done' : 'marker-pulse';
  
  return L.divIcon({
    className: 'custom-leaflet-marker-wrap',
    html: `
      <div class="map-marker-pin ${categoryClass}" title="${loc.name} (${loc.state})">
        <span class="marker-emoji">${loc.icon || '📍'}</span>
        ${isGoalDone ? '<span class="marker-done-tick">✓</span>' : ''}
        <div class="${pulseClass}"></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
}

function buildPopupContent(loc) {
  const goal = findGoalById(loc.goalId);
  const isGoalDone = goal ? isAllGoalItemsComplete(goal) : false;
  const doneTasks = goal ? goal.items.filter(it => appState.completedItems[it.id]).length : 0;
  const totalTasks = goal ? goal.items.length : 0;

  return `
    <div class="map-popup-card">
      ${goal && goal.image ? `
        <div class="map-popup-img-wrap">
          <img src="${goal.image}" alt="${loc.name}" class="map-popup-img" loading="lazy" />
          <span class="map-popup-tag">${loc.categoryLabel}</span>
        </div>
      ` : ''}
      <div class="map-popup-body">
        <div class="map-popup-header">
          <span class="map-popup-goal-num">Goal #${loc.goalNum}</span>
          <span class="map-popup-status ${isGoalDone ? 'status-done' : 'status-pending'}">
            ${isGoalDone ? '✓ COMPLETED' : `${doneTasks}/${totalTasks} Tasks Done`}
          </span>
        </div>
        <h4 class="map-popup-title">${loc.name}</h4>
        <div class="map-popup-state">📍 ${loc.state}</div>
        <p class="map-popup-desc">${loc.desc}</p>
        <div class="map-popup-highlight">
          <strong>⚡ Highlight:</strong> ${loc.highlight}
        </div>
        <div class="map-popup-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="jumpToGoalFromMap('${loc.goalId}')">
            🎯 View Goal #${loc.goalNum} in Roadmap
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderMapMarkers() {
  if (!leafletMap || typeof LOCATIONS_DATA === 'undefined') return;

  // Clear existing markers
  mapMarkers.forEach(m => leafletMap.removeLayer(m.marker));
  mapMarkers = [];

  LOCATIONS_DATA.forEach(loc => {
    const goal = findGoalById(loc.goalId);
    const isGoalDone = goal ? isAllGoalItemsComplete(goal) : false;

    const icon = createCustomMarkerIcon(loc, isGoalDone);
    const marker = L.marker(loc.coords, { icon: icon });

    marker.bindPopup(buildPopupContent(loc), {
      maxWidth: 320,
      className: 'custom-leaflet-popup'
    });

    marker.addTo(leafletMap);
    mapMarkers.push({ marker, data: loc });
  });
}

function updateMapMarkersState() {
  if (!leafletMap || mapMarkers.length === 0) return;

  mapMarkers.forEach(item => {
    const goal = findGoalById(item.data.goalId);
    const isGoalDone = goal ? isAllGoalItemsComplete(goal) : false;
    
    // Update marker icon
    const newIcon = createCustomMarkerIcon(item.data, isGoalDone);
    item.marker.setIcon(newIcon);

    // Update popup content
    item.marker.setPopupContent(buildPopupContent(item.data));
  });
}

function renderMapRoutes() {
  if (!leafletMap || typeof ROUTES_DATA === 'undefined') return;

  // Clear existing routes
  mapRouteLayers.forEach(r => leafletMap.removeLayer(r));
  mapRouteLayers = [];

  if (!appState.showMapRoutes) return;

  ROUTES_DATA.forEach(route => {
    const polyline = L.polyline(route.waypoints, {
      color: route.color,
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'epic-route-polyline'
    });

    polyline.bindPopup(`
      <div class="map-popup-card">
        <div class="map-popup-body">
          <div class="map-popup-header">
            <span class="map-popup-goal-num">Route #${route.goalNum}</span>
            <span class="map-popup-status" style="background: rgba(99, 102, 241, 0.2); color: #818cf8;">🚗 Epic Expedition</span>
          </div>
          <h4 class="map-popup-title" style="color: ${route.color};">${route.name}</h4>
          <div class="map-popup-state">${route.routeSubtitle}</div>
          <p class="map-popup-desc">${route.desc}</p>
          <div class="map-popup-actions">
            <button type="button" class="btn btn-primary btn-sm" onclick="jumpToGoalFromMap('${route.goalId}')">
              🎯 View Goal #${route.goalNum} in Roadmap
            </button>
          </div>
        </div>
      </div>
    `, {
      maxWidth: 320,
      className: 'custom-leaflet-popup'
    });

    polyline.addTo(leafletMap);
    mapRouteLayers.push(polyline);
  });
}

function zoomMapToRegion(regionKey) {
  if (!leafletMap) initAdventureMap();
  
  document.querySelectorAll('.map-region-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.map-region-btn[onclick*="${regionKey}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  switch (regionKey) {
    case 'india':
      leafletMap.flyTo([22.5, 78.9], 5, { duration: 1 });
      break;
    case 'himalayas':
      leafletMap.flyTo([32.2, 77.5], 7, { duration: 1 });
      break;
    case 'coastal':
      leafletMap.flyTo([13.5, 75.0], 6, { duration: 1 });
      break;
    case 'rajasthan':
      leafletMap.flyTo([26.5, 73.5], 7, { duration: 1 });
      break;
    case 'global':
      leafletMap.flyTo([25.0, 50.0], 3, { duration: 1.2 });
      break;
  }
}

function filterMapMarkers(catFilter) {
  appState.mapCategoryFilter = catFilter;

  if (!leafletMap || mapMarkers.length === 0) return;

  mapMarkers.forEach(item => {
    const shouldShow = (catFilter === 'all') || (item.data.category === catFilter);
    if (shouldShow) {
      if (!leafletMap.hasLayer(item.marker)) {
        leafletMap.addLayer(item.marker);
      }
    } else {
      if (leafletMap.hasLayer(item.marker)) {
        leafletMap.removeLayer(item.marker);
      }
    }
  });

  showToast(catFilter === 'all' ? 'Showing all destinations' : `Filtered: ${catFilter}`);
}

function toggleMapRoutes(show) {
  appState.showMapRoutes = show;
  renderMapRoutes();
  showToast(show ? 'Epic routes visible' : 'Epic routes hidden');
}

function focusLocationOnMap(locId) {
  const loc = LOCATIONS_DATA.find(l => l.id === locId);
  if (!loc) return;

  switchMainView('map');
  
  setTimeout(() => {
    if (!leafletMap) initAdventureMap();
    leafletMap.invalidateSize();
    leafletMap.flyTo(loc.coords, 10, { duration: 1.2 });

    const targetMarkerObj = mapMarkers.find(m => m.data.id === locId);
    if (targetMarkerObj && targetMarkerObj.marker) {
      setTimeout(() => {
        targetMarkerObj.marker.openPopup();
      }, 1200);
    }
    showToast(`Focused on ${loc.name}`);
  }, 100);
}

function focusGoalOnMap(goalId) {
  const spots = LOCATIONS_DATA.filter(l => l.goalId === goalId);
  if (spots.length === 0) return;

  switchMainView('map');

  setTimeout(() => {
    if (!leafletMap) initAdventureMap();
    leafletMap.invalidateSize();

    if (spots.length === 1) {
      leafletMap.flyTo(spots[0].coords, 9, { duration: 1.2 });
      const targetMarkerObj = mapMarkers.find(m => m.data.id === spots[0].id);
      if (targetMarkerObj) {
        setTimeout(() => targetMarkerObj.marker.openPopup(), 1200);
      }
    } else {
      const bounds = L.latLngBounds(spots.map(s => s.coords));
      leafletMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 8, animate: true, duration: 1.2 });
    }
    showToast(`Showing ${spots.length} destination spots for this goal`);
  }, 100);
}

function jumpToGoalFromMap(goalId) {
  switchMainView('list');

  setTimeout(() => {
    const goalEl = document.getElementById(`accordion-${goalId}`);
    if (goalEl) {
      goalEl.classList.add('open');
      appState.openedAccordions[goalId] = true;
      goalEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      goalEl.classList.add('highlight-pulse');
      setTimeout(() => goalEl.classList.remove('highlight-pulse'), 2500);
      showToast(`Opened Goal #${goalId.replace('goal-', '')}`);
    }
  }, 150);
}

function updateMapStats() {
  if (typeof LOCATIONS_DATA === 'undefined') return;

  const spotsCountBadge = document.getElementById('map-spots-count-badge');
  const visitedCountBadge = document.getElementById('map-visited-count-badge');
  const heroMapDestinations = document.getElementById('stat-map-destinations');

  let visitedCount = 0;
  LOCATIONS_DATA.forEach(loc => {
    const goal = findGoalById(loc.goalId);
    if (goal && isAllGoalItemsComplete(goal)) {
      visitedCount++;
    }
  });

  if (spotsCountBadge) spotsCountBadge.textContent = `${LOCATIONS_DATA.length} Destinations`;
  if (visitedCountBadge) visitedCountBadge.textContent = `${visitedCount} Explored`;
  if (heroMapDestinations) heroMapDestinations.textContent = `${LOCATIONS_DATA.length}+`;
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
    updateMapMarkersState();
    updateMapStats();
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


