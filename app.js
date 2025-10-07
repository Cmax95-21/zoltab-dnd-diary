class CampaignManager {
  constructor() {
    this.timeline = [];
    this.characters = new Map();
    this.locations = new Map();
    this.quests = new Map();
    this.organizations = new Map();

    this.currentDayIndex = 0;
    this.isMasterMode = true;
    this.unsavedChangesCount = 0;
    this.searchTerm = '';
    this.activeFilter = 'all';
    this.sortableInstance = null;
    this.currentSessionText = '';

    this.init();
  }

  init() {
    this.loadData();
    this.attachEventListeners();
    this.renderUI();
  }

  loadData() {
    try {
      const savedData = localStorage.getItem('campaignData');
      if (savedData) {
        const data = JSON.parse(savedData);
        this.timeline = data.timeline || [];
        this.characters = new Map(Object.entries(data.characters || {}));
        this.locations = new Map(Object.entries(data.locations || {}));
        this.quests = new Map(Object.entries(data.quests || {}));
        this.organizations = new Map(Object.entries(data.organizations || {}));
        this.currentDayIndex = data.currentDayIndex || 0;
        this.isMasterMode = data.isMasterMode || true;
      } else {
        this.initializeDefaultData();
      }
    } catch (err) {
      console.error("Errore nel caricamento dati:", err);
      this.initializeDefaultData();
    }
  }

  saveData() {
    try {
      const data = {
        timeline: this.timeline,
        characters: Object.fromEntries(this.characters),
        locations: Object.fromEntries(this.locations),
        quests: Object.fromEntries(this.quests),
        organizations: Object.fromEntries(this.organizations),
        currentDayIndex: this.currentDayIndex,
        isMasterMode: this.isMasterMode,
      };
      localStorage.setItem('campaignData', JSON.stringify(data));
      this.unsavedChangesCount = 0;
      this.updateUnsavedIndicator();
    } catch (err) {
      console.error("Errore nel salvataggio dati:", err);
    }
  }

  attachEventListeners() {
    document.getElementById('masterMode').addEventListener('change', (e) => {
      this.toggleMasterMode(e.target.checked);
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveData();
    });

    document.getElementById('backupBtn').addEventListener('click', () => {
      this.exportToJSON();
    });

    document.getElementById('restoreBtn').addEventListener('click', () => {
      document.getElementById('restoreInput').click();
    });

    document.getElementById('restoreInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            this.importFromJSON(data);
            this.renderUI();
          } catch (err) {
            alert('Errore nel caricamento del file: formato non valido.');
          }
        };
        reader.readAsText(file);
      }
    });

    document.getElementById('globalSearch').addEventListener('input', (e) => {
      this.searchTerm = e.target.value;
      this.searchGlobal();
    });

    document.querySelectorAll('.search-filters .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.search-filters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter;
        this.searchGlobal();
      });
    });

    document.getElementById('sessionParseButton').addEventListener('click', () => {
      const text = document.getElementById('sessionInput').value.trim();
      if (text.length === 0) return alert("Inserisci testo per analizzare.");

      this.currentSessionText = text;
      const suggestions = this.parseSessionText(text);
      this.confirmAssociations(suggestions);
    });

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.showTabContent(tab.dataset.tab);
      });
    });

    document.getElementById('addCharacterBtn').addEventListener('click', () => {
      const name = prompt("Nome nuovo personaggio:");
      if (name) this.addNewEntity('character', { name });
    });

    document.getElementById('addLocationBtn').addEventListener('click', () => {
      const name = prompt("Nome nuovo luogo:");
      if (name) this.addNewEntity('location', { name });
    });

    document.getElementById('addMissionBtn').addEventListener('click', () => {
      const name = prompt("Nome nuova missione:");
      if (name) this.addNewEntity('mission', { name, status: 'attiva' });
    });

    document.getElementById('addOrganizationBtn').addEventListener('click', () => {
      const name = prompt("Nome nuova organizzazione:");
      if (name) this.addNewEntity('organization', { name });
    });

    // inizializza la timeline drag & drop
    this.initializeSortableTimeline();
  }

  renderUI() {
    this.renderTimeline();
    this.renderCharacters();
    this.renderLocations();
    this.renderQuests();
    this.renderOrganizations();
  }

  initializeSortableTimeline() {
    const timelineContainer = document.getElementById('timelineContainer');
    if (!timelineContainer) return;

    if (this.sortableInstance) {
      this.sortableInstance.destroy();
    }

    this.sortableInstance = Sortable.create(timelineContainer, {
      animation: 150,
      direction: 'horizontal',
      onEnd: (evt) => {
        if (evt.oldIndex !== evt.newIndex) {
          this.reorderTimeline(evt.oldIndex, evt.newIndex);
        }
      },
      dragClass: 'dragging',
      chosenClass: 'chosen',
      forceFallback: true,
    });
  }

  reorderTimeline(oldIndex, newIndex) {
    if (oldIndex === newIndex) return;

    const movedDay = this.timeline.splice(oldIndex, 1)[0];
    this.timeline.splice(newIndex, 0, movedDay);

    this.timeline.forEach((day, idx) => {
      day.day = idx + 1;
    });

    this.saveData();
    this.renderTimeline();
  }

  renderTimeline() {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';

    this.timeline.forEach((day, index) => {
      const dayItem = document.createElement('div');
      dayItem.classList.add('timeline-day');
      dayItem.dataset.index = index;

      if (!day.active) {
        dayItem.classList.add('inactive');
      }

      const dayLabel = document.createElement('span');
      dayLabel.textContent = `Giorno ${day.day}: ${day.title}`;
      dayItem.appendChild(dayLabel);

      const detailsBtn = document.createElement('button');
      detailsBtn.textContent = 'Dettagli';
      detailsBtn.classList.add('btn', 'btn--small');
      detailsBtn.addEventListener('click', () => this.showDayDetails(day.id));
      dayItem.appendChild(detailsBtn);

      container.appendChild(dayItem);
    });

    this.initializeSortableTimeline();
  }

  renderCharacters() {
    const container = document.getElementById('charactersList');
    container.innerHTML = '';

    this.characters.forEach((char, id) => {
      const charDiv = document.createElement('div');
      charDiv.classList.add('character-card');

      if (this.isMasterMode) charDiv.classList.add('editable');

      const nameEl = document.createElement('h3');
      nameEl.textContent = char.name;
      charDiv.appendChild(nameEl);

      const roleEl = document.createElement('p');
      roleEl.textContent = `${char.race || ''} ${char.class || ''}`.trim();
      charDiv.appendChild(roleEl);

      if (this.isMasterMode) {
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn--small', 'edit-btn');
        editBtn.textContent = 'Modifica';
        editBtn.addEventListener('click', () => this.editCharacter(id));
        charDiv.appendChild(editBtn);
      }

      container.appendChild(charDiv);
    });
  }

  renderLocations() {
    const container = document.getElementById('locationsList');
    container.innerHTML = '';

    this.locations.forEach((loc, id) => {
      const locDiv = document.createElement('div');
      locDiv.classList.add('location-card');

      if (this.isMasterMode) locDiv.classList.add('editable');

      const nameEl = document.createElement('h3');
      nameEl.textContent = loc.name;
      locDiv.appendChild(nameEl);

      const descEl = document.createElement('p');
      descEl.textContent = loc.description || '';
      locDiv.appendChild(descEl);

      if (this.isMasterMode) {
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn--small', 'edit-btn');
        editBtn.textContent = 'Modifica';
        editBtn.addEventListener('click', () => this.editLocation(id));
        locDiv.appendChild(editBtn);
      }

      container.appendChild(locDiv);
    });
  }

  renderQuests() {
    const container = document.getElementById('missionsList');
    container.innerHTML = '';

    this.quests.forEach((quest, id) => {
      const questDiv = document.createElement('div');
      questDiv.classList.add('mission-card');

      if (this.isMasterMode) questDiv.classList.add('editable');

      const nameEl = document.createElement('h3');
      nameEl.textContent = quest.name;
      questDiv.appendChild(nameEl);

      const statusEl = document.createElement('p');
      statusEl.textContent = `Stato: ${quest.status || 'Non definito'}`;
      questDiv.appendChild(statusEl);

      if (this.isMasterMode) {
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn--small', 'edit-btn');
        editBtn.textContent = 'Modifica';
        editBtn.addEventListener('click', () => this.editQuest(id));
        questDiv.appendChild(editBtn);
      }

      container.appendChild(questDiv);
    });
  }

  renderOrganizations() {
    const container = document.getElementById('organizationsList');
    container.innerHTML = '';

    this.organizations.forEach((org, id) => {
      const orgDiv = document.createElement('div');
      orgDiv.classList.add('organization-card');

      if (this.isMasterMode) orgDiv.classList.add('editable');

      const nameEl = document.createElement('h3');
      nameEl.textContent = org.name;
      orgDiv.appendChild(nameEl);

      const descEl = document.createElement('p');
      descEl.textContent = org.description || '';
      orgDiv.appendChild(descEl);

      if (this.isMasterMode) {
        const editBtn = document.createElement('button');
        editBtn.classList.add('btn', 'btn--small', 'edit-btn');
        editBtn.textContent = 'Modifica';
        editBtn.addEventListener('click', () => this.editOrganization(id));
        orgDiv.appendChild(editBtn);
      }

      container.appendChild(orgDiv);
    });
  }

  // Altri metodi (edit, parse, confirm, addNewEntity, reorder, toggle modal, etc.)
  // Questi sono già stati forniti nelle risposte precedenti
  // Per brevità non li ripeto qui
}

window.onload = () => {
  window.campaignManager = new CampaignManager();
};
