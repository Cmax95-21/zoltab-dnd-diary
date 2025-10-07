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

// --- Boot Firebase ---
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

let currentUser = '';
let isMasterMode = false;
let campaignId = 'default-campaign'; // Puoi cambiare se vuoi sessioni diverse

// --- Modal Nickname ---
const nicknameModal = document.getElementById('nicknameModal');
const nicknameInput = document.getElementById('nicknameInput');
const joinCampaignBtn = document.getElementById('joinCampaign');

joinCampaignBtn.onclick = () => {
  const nick = nicknameInput.value.trim();
  if (!nick) return;
  currentUser = nick;
  document.getElementById('currentUser').textContent = nick;
  nicknameModal.style.display = 'none';
  document.body.style.overflow = '';
};

// Mostra la modal se utente non registrato
window.onload = () => {
  nicknameModal.style.display = '';
  document.body.style.overflow = 'hidden';
};

// --- Modalità Master ---
document.getElementById('masterMode').onchange = (e) => {
  isMasterMode = e.target.checked;
  document.getElementById('modeText').textContent = isMasterMode ? "Modalità Master" : "Modalità Giocatore";
};

// --- CRUD Entity ---
function addEntity(type, data) {
  const entityRef = ref(db, `${campaignId}/${type}/`);
  const newRef = push(entityRef);
  set(newRef, data);
}

function updateEntity(type, id, data) {
  update(ref(db, `${campaignId}/${type}/${id}`), data);
}

function deleteEntity(type, id) {
  remove(ref(db, `${campaignId}/${type}/${id}`));
}

// --- LIVE SYNC ---
// Carica timeline dal DB e renderizza
onValue(ref(db, `${campaignId}/timeline`), (snap) => {
  const arr = [];
  snap.forEach(d => arr.push({id: d.key, ...d.val()}));
  renderTimeline(arr);
});

// --- RENDER TIMELINE ---
function renderTimeline(daysArr) {
  const container = document.getElementById('timelineContainer');
  container.innerHTML = '';
  daysArr.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = 'timeline-day';
    dayEl.textContent = `Giorno ${day.day}: ${day.title}`;
    container.appendChild(dayEl);
  });
  // Drag & drop (riordino)
  new Sortable(container, {
    animation: 150,
    direction: 'horizontal',
    onEnd: (evt) => {
      // Riordino giorni in DB
      // (Implementa qui la funzione di riordino e update su Firebase)
    }
  });
}

// --- Parsing automatico Sessione ---
// Implementa qui le funzioni parsi NLP, conferma e salvataggio

// --- Altri metodi CRUD, upload img, backup/restore... ---
// (a seconda delle esigenze puoi estendere e modularizzare)

// --- Eventi tab navigation ---
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById(tab.dataset.tab).classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  };
});

// --- Backup/Restore/Persistenza ---
// Aggiungi qui le funzioni di export/import JSON se vuoi usarle

// Per estendere: aggiungi rendering delle altre entità (personaggi, luoghi ...), parsing NLP, modalità master/giocatore, sync immagini.

// --- FINE FILE ---

