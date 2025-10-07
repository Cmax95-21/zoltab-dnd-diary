// Firebase modular v9 - Import SDKs (già inclusi via script <script type="module"> in index.html)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// --- CONFIGURAZIONE ---
// Sostituisci i valori con quelli del tuo progetto Firebase!
const firebaseConfig = {
  apiKey: "AIzaSyAaJusiPmok_yZfgmMJ-5fmL6odPWty0s",
  authDomain: "dnd-campagna-collaborativa.firebaseapp.com",
  projectId: "dnd-campagna-collaborativa",
  storageBucket: "dnd-campagna-collaborativa.appspot.com",
  messagingSenderId: "802254099481",
  appId: "1:802254099481:web:e4fc7acd3d2203bff12a88"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

let currentUser = '';
let isMasterMode = false;
let campaignId = 'default-campaign';

// Reference DOM
const nicknameModal = document.getElementById('nicknameModal');
const nicknameInput = document.getElementById('nicknameInput');
const joinCampaignBtn = document.getElementById('joinCampaign');

joinCampaignBtn.onclick = () => {
  const nick = nicknameInput.value.trim();
  if (!nick) return alert("Inserisci nickname");
  currentUser = nick;
  document.getElementById('currentUser').textContent = nick;
  nicknameModal.style.display = 'none';
  document.body.style.overflow = '';
  loadFirebaseData();
};

window.onload = () => {
  nicknameModal.style.display = '';
  document.body.style.overflow = 'hidden';
};

document.getElementById('masterMode').onchange = (e) => {
  isMasterMode = e.target.checked;
  document.getElementById('masterMode').nextSibling.textContent = isMasterMode ? "Modalità Master" : "Modalità Giocatore";
};

// Backup/Restore JSON
document.getElementById('backupBtn').addEventListener('click', backupToFile);
document.getElementById('restoreBtn').addEventListener('click', () => {
  document.getElementById('restoreInput').click();
});
document.getElementById('restoreInput').addEventListener('change', restoreFromFile);

async function backupToFile() {
  const data = await getAllDataCloud();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = `dnd_backup_${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function restoreFromFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    await saveAllDataCloud(data);
    alert("Ripristinato correttamente");
  } catch {
    alert("File JSON non valido");
  }
}

// Carica dati da Firebase in realtime e sincronizza la UI
function loadFirebaseData() {
  ['timeline', 'characters', 'locations', 'quests', 'organizations'].forEach(type => {
    const typeRef = ref(db, `${campaignId}/${type}`);
    onValue(typeRef, (snapshot) => {
      const val = snapshot.val() || {};
      let mapData = new Map();
      Object.entries(val).forEach(([k, v]) => mapData.set(k, {...v, id: k}));
      window.campaignManager[type] = mapData;
      window.campaignManager.renderAllByType(type);
    });
  });
}

async function getAllDataCloud() {
  const data = {};
  for (let type of ['timeline', 'characters', 'locations', 'quests', 'organizations']) {
    const snapshot = await get(ref(db, `${campaignId}/${type}`));
    data[type] = snapshot.val() || {};
  }
  return data;
}

async function saveAllDataCloud(data) {
  for (let type in data) {
    if (data.hasOwnProperty(type)) {
      await set(ref(db, `${campaignId}/${type}`), data[type]);
    }
  }
}

// Aggiungi nuova entità in Firebase
async function addEntityFirebase(type, data) {
  const newRef = push(ref(db, `${campaignId}/${type}`));
  await set(newRef, data);
}

// Aggiorna entità Firebase
async function updateEntityFirebase(type, id, data) {
  await update(ref(db, `${campaignId}/${type}/${id}`), data);
}

// Elimina entità Firebase
async function deleteEntityFirebase(type, id) {
  await remove(ref(db, `${campaignId}/${type}/${id}`));
}


// CampaignManager classe
class CampaignManager {
  constructor() {
    this.timeline = new Map();
    this.characters = new Map();
    this.locations = new Map();
    this.quests = new Map();
    this.organizations = new Map();
  }

  renderAllByType(type) {
    switch(type) {
      case 'timeline': this.renderTimeline(); break;
      case 'characters': this.renderCharacters(); break;
      case 'locations': this.renderLocations(); break;
      case 'quests': this.renderQuests(); break;
      case 'organizations': this.renderOrganizations(); break;
    }
  }

  renderTimeline() {
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';
    const arr = Array.from(this.timeline.values()).sort((a,b) => a.day - b.day);
    arr.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'timeline-day';
      if (!day.active) dayEl.classList.add('inactive');
      dayEl.textContent = `Giorno ${day.day}: ${day.title}`;

      const detBtn = document.createElement('button');
      detBtn.textContent = 'Dettagli';
      detBtn.className = 'btn btn--small';
      detBtn.onclick = () => alert(`Dettagli giornata:\n${day.content}`);

      dayEl.appendChild(detBtn);
      container.appendChild(dayEl);
    });

    // SortableJS Drag & Drop
    new Sortable(container, {
      animation: 150,
      direction: 'horizontal',
      onEnd: async evt => {
        if (evt.oldIndex !== evt.newIndex) {
          let arr = Array.from(this.timeline.values()).sort((a,b) => a.day - b.day);
          const moved = arr.splice(evt.oldIndex,1)[0];
          arr.splice(evt.newIndex,0,moved);
          arr.forEach((d,i) => d.day = i+1);

          // Aggiorna Firebase
          const updates = {};
          arr.forEach(d => updates[d.id] = d);
          await update(ref(db, `${campaignId}/timeline`), updates);
        }
      }
    });
  }

  renderCharacters() {
    const container = document.getElementById('charactersList');
    container.innerHTML = '';
    Array.from(this.characters.values()).forEach(char => {
      const div = document.createElement('div');
      div.className = 'character-card';
      if (isMasterMode) div.classList.add('editable');

      let h3 = document.createElement('h3');
      h3.textContent = char.name;
      div.appendChild(h3);

      if (char.description) {
        let p = document.createElement('p');
        p.textContent = char.description;
        div.appendChild(p);
      }

      // edit/delete buttons if master mode
      if (isMasterMode) {
        let editBtn = document.createElement('button');
        editBtn.textContent = 'Modifica';
        editBtn.className = 'btn btn--small';
        editBtn.onclick = () => this.editEntity('characters', char.id);
        div.appendChild(editBtn);

        let delBtn = document.createElement('button');
        delBtn.textContent = 'Elimina';
        delBtn.className = 'btn btn--small btn--danger';
        delBtn.onclick = () => this.deleteEntity('characters', char.id);
        div.appendChild(delBtn);
      }

      container.appendChild(div);
    });
  }

  renderLocations() {
    const container = document.getElementById('locationsList');
    container.innerHTML = '';
    Array.from(this.locations.values()).forEach(loc => {
      const div = document.createElement('div');
      div.className = 'location-card';
      if (isMasterMode) div.classList.add('editable');

      let h3 = document.createElement('h3');
      h3.textContent = loc.name;
      div.appendChild(h3);

      if (loc.description) {
        let p = document.createElement('p');
        p.textContent = loc.description;
        div.appendChild(p);
      }

      if (isMasterMode) {
        let editBtn = document.createElement('button');
        editBtn.textContent = 'Modifica';
        editBtn.className = 'btn btn--small';
        editBtn.onclick = () => this.editEntity('locations', loc.id);
        div.appendChild(editBtn);

        let delBtn = document.createElement('button');
        delBtn.textContent = 'Elimina';
        delBtn.className = 'btn btn--small btn--danger';
        delBtn.onclick = () => this.deleteEntity('locations', loc.id);
        div.appendChild(delBtn);
      }

      container.appendChild(div);
    });
  }

  renderQuests() {
    const container = document.getElementById('questsList');
    container.innerHTML = '';
    Array.from(this.quests.values()).forEach(quest => {
      const div = document.createElement('div');
      div.className = 'mission-card';
      if (isMasterMode) div.classList.add('editable');

      let h3 = document.createElement('h3');
      h3.textContent = quest.name;
      div.appendChild(h3);

      if (quest.status) {
        let p = document.createElement('p');
        p.textContent = `Stato: ${quest.status}`;
        div.appendChild(p);
      }

      if (isMasterMode) {
        let editBtn = document.createElement('button');
        editBtn.textContent = 'Modifica';
        editBtn.className = 'btn btn--small';
        editBtn.onclick = () => this.editEntity('quests', quest.id);
        div.appendChild(editBtn);

        let delBtn = document.createElement('button');
        delBtn.textContent = 'Elimina';
        delBtn.className = 'btn btn--small btn--danger';
        delBtn.onclick = () => this.deleteEntity('quests', quest.id);
        div.appendChild(delBtn);
      }

      container.appendChild(div);
    });
  }

  renderOrganizations() {
    const container = document.getElementById('organizationsList');
    container.innerHTML = '';
    Array.from(this.organizations.values()).forEach(org => {
      const div = document.createElement('div');
      div.className = 'organization-card';
      if (isMasterMode) div.classList.add('editable');

      let h3 = document.createElement('h3');
      h3.textContent = org.name;
      div.appendChild(h3);

      if (org.description) {
        let p = document.createElement('p');
        p.textContent = org.description;
        div.appendChild(p);
      }

      if (isMasterMode) {
        let editBtn = document.createElement('button');
        editBtn.textContent = 'Modifica';
        editBtn.className = 'btn btn--small';
        editBtn.onclick = () => this.editEntity('organizations', org.id);
        div.appendChild(editBtn);

        let delBtn = document.createElement('button');
        delBtn.textContent = 'Elimina';
        delBtn.className = 'btn btn--small btn--danger';
        delBtn.onclick = () => this.deleteEntity('organizations', org.id);
        div.appendChild(delBtn);
      }

      container.appendChild(div);
    });
  }

  async addNewEntity(type, data) {
    if (!data.id) {
      data.id = Date.now() + '-' + Math.floor(Math.random()*1000);
    }
    await addEntityFirebase(type, data);
  }

  async editEntity(type, id) {
    const map = this[type];
    const item = map.get(id);
    if (!item) return;

    let newName = prompt(`Modifica nome (${item.name})`, item.name);
    if (newName === null) return; // Cancelled
    newName = newName.trim();
    if (newName.length === 0) return alert("Nome non valido");

    const newDesc = prompt(`Descrizione (${item.description || ''})`, item.description || '');
    
    await updateEntityFirebase(type, id, { name: newName, description: newDesc });
  }

  async deleteEntity(type, id) {
    if (!confirm("Confermi eliminazione?")) return;
    await deleteEntityFirebase(type, id);
  }

  parseSessionText(text) {
    // Semplice parsing che estrae parole capitalizzate come personaggi
    const matches = [...text.matchAll(/\b[A-Z][a-z]+\b/g)];
    const unique = new Set(matches.map(m => m[0]));
    return {
      characters: unique,
      locations: new Set(),
      organizations: new Set(),
      quests: new Set()
    };
  }

  confirmAssociations(suggestions) {
    const container = document.getElementById('sessionParseResults');
    container.innerHTML = '';

    for (const [key, items] of Object.entries(suggestions)) {
      let section = document.createElement('div');
      let title = document.createElement('h4');
      title.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      section.appendChild(title);

      items.forEach(item => {
        let label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" checked data-type="${key}" value="${item}"> ${item}`;
        section.appendChild(label);
      });

      container.appendChild(section);
    }

    let confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Conferma';
    confirmBtn.className = 'btn btn--primary';
    confirmBtn.onclick = () => {
      let selected = {
        characters: [],
        locations: [],
        organizations: [],
        quests: []
      };
      container.querySelectorAll('input[type="checkbox"]').forEach(input => {
        if (input.checked) {
          selected[input.getAttribute('data-type')].push(input.value);
        }
      });
      this.applyAssociations(selected);
    };
    container.appendChild(confirmBtn);
  }

  async applyAssociations(selected) {
    const lastDay = Array.from(this.timeline.values()).reduce((acc, cur) => acc.day > cur.day ? acc : cur, {day:-1});
    const newDayNumber = lastDay.day + 1;

    // Aggiungi giorno timeline
    const dayData = {
      id: `${Date.now()}-${Math.floor(Math.random()*1000)}`,
      day: newDayNumber,
      title: `Giornata ${newDayNumber}`,
      content: this.currentSessionText,
      characters: selected.characters,
      locations: selected.locations,
      active: true
    };
    await addEntityFirebase('timeline', dayData);

    // Aggiungi personaggi e luoghi se non esistenti
    for (let charName of selected.characters) {
      if (![...this.characters.values()].some(c => c.name === charName)) {
        await this.addNewEntity('characters', { name: charName });
      }
    }
    for (let locName of selected.locations) {
      if (![...this.locations.values()].some(l => l.name === locName)) {
        await this.addNewEntity('locations', { name: locName });
      }
    }
    this.currentSessionText = '';
  }

  showTabContent(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const tab = document.getElementById(tabId);
    if(tab) tab.classList.add('active');
  }
}

window.campaignManager = new CampaignManager();
