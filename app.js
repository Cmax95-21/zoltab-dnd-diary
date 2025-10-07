// Firebase modular v9 - Import SDKs (già inclusi via script <script type="module"> in index.html)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

class CampaignManager {
  constructor() {
    this.timeline = {};
    this.characters = {};
    this.locations = {};
    this.quests = {};
    this.organizations = {};
    this.isMasterMode = false;
    this.currentSessionText = '';
    this.attachFirebaseListeners();
    this.init();
  }

  attachFirebaseListeners() {
    onValue(ref(db, "timeline"), snapshot => {
      this.timeline = snapshot.val() || {};
      this.renderTimeline();
    });
    onValue(ref(db, "characters"), snapshot => {
      this.characters = snapshot.val() || {};
      this.renderCharacters();
    });
    onValue(ref(db, "locations"), snapshot => {
      this.locations = snapshot.val() || {};
      this.renderLocations();
    });
    onValue(ref(db, "quests"), snapshot => {
      this.quests = snapshot.val() || {};
      this.renderQuests();
    });
    onValue(ref(db, "organizations"), snapshot => {
      this.organizations = snapshot.val() || {};
      this.renderOrganizations();
    });
  }

  saveEntity(type, obj) {
    if (!obj.id) obj.id = Date.now().toString();
    set(ref(db, `${type}/${obj.id}`), obj);
  }
  deleteEntity(type, id) {
    remove(ref(db, `${type}/${id}`));
  }

  init() {
    document.getElementById('nicknameModal').style.display='flex';
    document.body.style.overflow='hidden';
    document.getElementById('joinCampaign').onclick = () => {
      const nick = document.getElementById('nicknameInput').value.trim();
      if (!nick) return;
      document.getElementById('currentUser').textContent = nick;
      document.getElementById('nicknameModal').style.display='none';
      document.body.style.overflow='';
      this.attachListeners();
      this.renderUI();
    };
  }

  attachListeners() {
    document.getElementById('masterMode').onchange = (e) => {
      this.isMasterMode = e.target.checked;
      this.renderUI();
    };

    document.getElementById('addCharacterBtn').onclick = () => {
      if (!this.isMasterMode) return;
      const name = prompt("Nome nuovo personaggio:");
      if (name) this.saveEntity("characters", {id: Date.now().toString(), name});
    };

    document.getElementById('addLocationBtn').onclick = () => {
      if (!this.isMasterMode) return;
      const name = prompt("Nome nuovo luogo:");
      if (name) this.saveEntity("locations", {id: Date.now().toString(), name});
    };

    document.getElementById('addQuestBtn').onclick = () => {
      if (!this.isMasterMode) return;
      const name = prompt("Nome nuova missione:");
      if (name) this.saveEntity("quests", {id: Date.now().toString(), name});
    };

    document.getElementById('addOrganizationBtn').onclick = () => {
      if (!this.isMasterMode) return;
      const name = prompt("Nome nuova organizzazione:");
      if (name) this.saveEntity("organizations", {id: Date.now().toString(), name});
    };

    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(tab.dataset.tab).classList.add('active');
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      };
    });

    document.getElementById('sessionParseButton').onclick = () => {
      const text = document.getElementById('sessionInput').value;
      if (!text) return alert("Inserisci testo");
      const chars = [...text.matchAll(/\b([A-Z][a-z]+)\b/g)].map(m=>m[1]);
      const panel = document.getElementById('sessionParseResults');
      panel.innerHTML='';
      let ul = document.createElement('ul');
      chars.forEach(name=> {
        let li=document.createElement('li');
        li.innerHTML=`<label><input type="checkbox" checked value="${name}">${name}</label>`;
        ul.appendChild(li);
      });
      panel.appendChild(ul);
      let btn = document.createElement('button');
      btn.textContent="Conferma";
      btn.className="btn btn--primary";
      btn.onclick = () => {
        [...panel.querySelectorAll('input[type=checkbox]')].forEach(inp=>{
          if(inp.checked && !Object.values(this.characters).some(c=>c.name===inp.value)){
            this.saveEntity("characters", {id:Date.now().toString(),name:inp.value});
          }
        });
        this.saveEntity("timeline", {
          id: Date.now().toString(),
          day: Object.keys(this.timeline).length+1,
          title: `Giornata ${Object.keys(this.timeline).length+1}`,
          content: text,
          characters: chars.filter(c=>panel.querySelector(`input[value="${c}"]`).checked),
          active: true
        });
        panel.innerHTML='';
        document.getElementById('sessionInput').value='';
      };
      panel.appendChild(btn);
    };

    new Sortable(document.getElementById('timelineContainer'), {
      animation: 150,
      direction: 'horizontal',
      onEnd: evt => {
        let arr = Object.values(this.timeline);
        const moved = arr.splice(evt.oldIndex, 1)[0];
        arr.splice(evt.newIndex, 0, moved);
        arr.forEach((d,i) => d.day=i+1);
        arr.forEach(day => this.saveEntity("timeline", day));
        this.renderTimeline();
      }
    });
  }

  renderUI() {
    this.renderTimeline();
    this.renderCharacters();
    this.renderLocations();
    this.renderQuests();
    this.renderOrganizations();
  }

  renderTimeline() {
    const c=document.getElementById('timelineContainer'); c.innerHTML='';
    Object.values(this.timeline).sort((a,b)=>a.day-b.day).forEach(day=>{
      const d=document.createElement('div');
      d.className='timeline-day';
      d.textContent=`Giorno ${day.day}: ${day.title}`;
      let btn=document.createElement('button');
      btn.textContent="Dettagli";
      btn.className="btn btn--small";
      btn.onclick = ()=>alert(`Dettagli:\n${day.content}`);
      d.appendChild(btn);
      c.appendChild(d);
    });
  }

  renderCharacters() {
    const c=document.getElementById('charactersList'); c.innerHTML='';
    Object.values(this.characters).forEach(char=>{
      let div=document.createElement('div');
      div.className='character-card';
      let h3=document.createElement('h3');
      h3.textContent=char.name;
      div.appendChild(h3);
      c.appendChild(div);
    });
  }

  renderLocations() {
    const c=document.getElementById('locationsList'); c.innerHTML='';
    Object.values(this.locations).forEach(loc=>{
      let div=document.createElement('div');
      div.className='location-card';
      let h3=document.createElement('h3');
      h3.textContent=loc.name;
      div.appendChild(h3);
      c.appendChild(div);
    });
  }

  renderQuests() {
    const c=document.getElementById('questsList'); c.innerHTML='';
    Object.values(this.quests).forEach(q=>{
      let div=document.createElement('div');
      div.className='mission-card';
      let h3=document.createElement('h3');
      h3.textContent=q.name;
      div.appendChild(h3);
      c.appendChild(div);
    });
  }

  renderOrganizations() {
    const c=document.getElementById('organizationsList'); c.innerHTML='';
    Object.values(this.organizations).forEach(org=>{
      let div=document.createElement('div');
      div.className='organization-card';
      let h3=document.createElement('h3');
      h3.textContent=org.name;
      div.appendChild(h3);
      c.appendChild(div);
    });
  }
}

window.onload = () => { window.campaignManager = new CampaignManager(); };
