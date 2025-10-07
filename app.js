class CampaignManager {
    constructor() {
        // Mappe principali per la gestione delle entità
        this.timeline = []; 
        this.characters = new Map(); 
        this.locations = new Map(); 
        this.quests = new Map(); 
        this.organizations = new Map(); 
        
        // Variabili di stato
        this.isMasterMode = false;
        this.currentSessionText = ''; 
        this.sortableInstance = null; // Per SortableJS
        this.activeDayId = null; // ID della giornata attualmente mostrata nel pannello dettagli

        this.init();
    }

    init() {
        this.loadData();
        this.attachEventListeners();
        this.renderUI();
    }

    // --- 1. PERSISTENZA DATI ---

    loadData() {
        try {
            const savedData = localStorage.getItem('campaignData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.timeline = data.timeline || [];
                // Ricostruiamo le Map dagli oggetti salvati
                this.characters = new Map(Object.entries(data.characters || {}));
                this.locations = new Map(Object.entries(data.locations || {}));
                this.quests = new Map(Object.entries(data.quests || {}));
                this.organizations = new Map(Object.entries(data.organizations || {}));
                this.isMasterMode = data.isMasterMode || false;
            } else {
                this.initializeDefaultData();
            }
        } catch (err) {
            console.error("Errore durante il caricamento dei dati:", err);
            // Se c'è un errore grave, usa i dati di default
            this.initializeDefaultData();
        }
    }

    saveData() {
        try {
            const data = {
                timeline: this.timeline,
                // Convertiamo le Map in oggetti per il salvataggio in JSON
                characters: Object.fromEntries(this.characters),
                locations: Object.fromEntries(this.locations),
                quests: Object.fromEntries(this.quests),
                organizations: Object.fromEntries(this.organizations),
                isMasterMode: this.isMasterMode,
            };
            localStorage.setItem('campaignData', JSON.stringify(data));
        } catch (err) {
            console.error("Errore durante il salvataggio dei dati:", err);
        }
    }
    
    // --- 2. GESTIONE INTERATTIVITÀ ---

    attachEventListeners() {
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
             modeToggle.addEventListener('click', () => {
                const newMode = !this.isMasterMode;
                this.toggleMasterMode(newMode);
                document.getElementById('modeText').textContent = newMode ? 'Master' : 'Giocatore';
            });
        }
       
        const saveChanges = document.getElementById('saveChanges');
        if (saveChanges) {
             saveChanges.addEventListener('click', () => {
                 this.saveData();
             });
        }
        
        const parseButton = document.getElementById('sessionParseButton');
        if (parseButton) {
            parseButton.addEventListener('click', () => {
                const textarea = document.getElementById('sessionInput');
                const text = textarea.value;
                this.currentSessionText = text; 
                const suggestions = this.parseSessionText(text);
                this.confirmAssociations(suggestions);
            });
        }
        
        // Eventi per tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                const contentElement = document.getElementById(tabName);
                if (contentElement) {
                    contentElement.classList.add('active');
                }
                
                // Forzo il rendering se si va in Personaggi/Timeline
                if (tabName === 'characters') this.renderCharacters();
                if (tabName === 'timeline') this.renderTimeline();
            });
        });
    }

    toggleMasterMode(isMaster) {
        this.isMasterMode = isMaster;
        this.renderUI();
    }
    
    // --- 3. LOGICA DI PARSING & INSERIMENTO (Placeholder Semplificato) ---
    
    parseSessionText(text) {
        // Placeholder: in un'app funzionante, questo userebbe Regex.
        const suggestions = { characters: new Set(), locations: new Set(), organizations: new Set(), missions: new Set() };
        // Simula il risultato del parsing basato su nomi noti
        if (text.toLowerCase().includes("zoltab")) suggestions.characters.add("Zoltab");
        if (text.toLowerCase().includes("holran")) suggestions.locations.add("Holran");
        return suggestions;
    }

    confirmAssociations(suggestions) {
        const container = document.getElementById('sessionParseResults');
        if (!container) return;
        
        container.innerHTML = '<h4>Associazioni Trovate:</h4>';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Conferma e Crea Giorno';
        confirmBtn.classList.add('btn', 'btn--primary');
        
        confirmBtn.addEventListener('click', () => {
             this.applyAssociations({ 
                 characters: Array.from(suggestions.characters), 
                 locations: Array.from(suggestions.locations), 
                 missions: [], organizations: [], events: [] 
             }); 
             document.getElementById('sessionParseResults').innerHTML = '';
             const textarea = document.getElementById('sessionInput');
             if (textarea) textarea.value = '';
        });
        container.appendChild(confirmBtn);
    }

    applyAssociations(selected) {
        const newDayId = Date.now(); // ID univoco
        const newDay = {
            id: newDayId, 
            day: this.timeline.length + 1, 
            title: `Giornata ${this.timeline.length + 1}`, 
            content: this.currentSessionText || '',
            characters: selected.characters, 
            locations: selected.locations, 
            events: selected.events || [], 
            organizations: selected.organizations || [],
            active: true,
        };
        this.timeline.push(newDay);

        // Aggiorna i personaggi esistenti con la nuova apparizione
        selected.characters.forEach(name => {
            let char = this.characters.get(name);
            if (char) {
                if (!char.appearancesDays) char.appearancesDays = [];
                char.appearancesDays.push(newDay.day);
            } else {
                 // Aggiungi un nuovo personaggio se non esiste
                 this.addNewEntity('character', { name: name, appearancesDays: [newDay.day] });
                 char = this.characters.get(name); // Rileggo l'oggetto creato
            }
            if (char) this.characters.set(name, char); // Aggiorno la Map
        });

        this.saveData();
        this.renderUI();
    }

    addNewEntity(type, data) {
        // Crea una chiave uniforme
        const nameKey = data.name;

        // Dati minimi di default per la nuova entità
        const newEntity = Object.assign({ 
            id: nameKey.toLowerCase().replace(/\s/g, '-'), 
            race: 'Sconosciuta', 
            class: 'N.D.', 
            description: 'Aggiungere descrizione...',
            appearancesDays: [],
        }, data);

        switch (type) {
            case 'character':
                this.characters.set(nameKey, newEntity);
                break;
            case 'location':
                this.locations.set(nameKey, newEntity);
                break;
            // ... altri tipi
        }
    }

    // --- 4. LOGICA DI RENDERING E RIORDINO ---

    renderUI() {
        this.renderTimeline();
        this.renderCharacters();
        // Nascondi/Mostra elementi Master-only in base allo stato
        document.querySelectorAll('.master-only').forEach(el => {
            el.classList.toggle('hidden', !this.isMasterMode);
        });
    }
    
    renderTimeline() {
        const container = document.getElementById('timelineContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.timeline.forEach((day) => {
            const dayItem = document.createElement('div');
            dayItem.classList.add('timeline-day');
            if (day.id === this.activeDayId) {
                 dayItem.classList.add('active'); // Stile per il giorno selezionato
            }
            dayItem.dataset.dayId = day.id; 
            
            const dayLabel = document.createElement('span');
            dayLabel.innerHTML = `<strong>Giorno ${day.day}</strong>: ${day.title}`;
            dayItem.appendChild(dayLabel);
            
            // Aggiunge l'evento click per mostrare il pannello dei dettagli del giorno
            dayItem.addEventListener('click', () => {
                 this.showDayDetails(day.id); 
            });

            container.appendChild(dayItem);
        });

        // Inizializza Drag & Drop
        this.initializeSortableTimeline(); 
        
        // Mostra i dettagli dell'ultimo giorno per default o del giorno attivo
        const idToDisplay = this.activeDayId || (this.timeline.length > 0 ? this.timeline[this.timeline.length - 1].id : null);
        if (idToDisplay) {
            this.showDayDetails(idToDisplay);
        }
    }

    initializeSortableTimeline() {
        const timelineContainer = document.getElementById('timelineContainer');
        if (!timelineContainer || typeof Sortable === 'undefined') return;

        if (this.sortableInstance) this.sortableInstance.destroy();

        this.sortableInstance = Sortable.create(timelineContainer, {
            animation: 150,
            direction: 'horizontal',
            onEnd: (evt) => {
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;
                if (oldIndex !== newIndex) {
                    this.reorderTimeline(oldIndex, newIndex);
                }
            },
        });
    }

    reorderTimeline(oldIndex, newIndex) {
        if (oldIndex === newIndex) return;
        
        // Sposta l'elemento nell'array
        const movedDay = this.timeline.splice(oldIndex, 1)[0];
        this.timeline.splice(newIndex, 0, movedDay);

        // Riassegna i numeri sequenziali ai giorni
        this.timeline.forEach((day, idx) => {
            day.day = idx + 1;
        });

        this.saveData();
        this.renderTimeline(); 
    }
    
    renderCharacters() {
        const container = document.getElementById('charactersList');
        if (!container) return;
        
        container.innerHTML = ''; 
        
        // Usiamo un container per le schede per replicare lo stile dell'app
        const grid = document.createElement('div');
        grid.classList.add('entity-grid'); 

        this.characters.forEach(entity => {
            const card = document.createElement('div');
            card.classList.add('entity-card');
            
            // --- Contenuto della scheda ---
            const header = document.createElement('h3');
            header.textContent = entity.name;
            card.appendChild(header);

            const details = document.createElement('p');
            details.innerHTML = `
                <strong>${entity.class || 'Classe Sconosciuta'}</strong> | 
                <span>${entity.race || 'Razza Sconosciuta'}</span><br>
                <small>Apparizioni: ${entity.appearancesDays ? entity.appearancesDays.length : 0}</small>
            `;
            card.appendChild(details);

            const description = document.createElement('p');
            description.classList.add('entity-description');
            description.textContent = entity.description ? 
                (entity.description.substring(0, 100) + (entity.description.length > 100 ? '...' : '')) : 
                'Nessuna descrizione.';
            card.appendChild(description);

            const detailsBtn = document.createElement('button');
            detailsBtn.textContent = 'Scheda Dettagli';
            detailsBtn.classList.add('btn', 'btn--secondary');
            
            detailsBtn.addEventListener('click', () => {
                 this.showEntityDetails(entity.name, 'character'); 
            });
            
            card.appendChild(detailsBtn);
            grid.appendChild(card);
        });
        
        container.appendChild(grid);
    }
    
    // CORREZIONE CRITICA PER L'ERRORE "is not iterable"
    showDayDetails(dayId) {
        const day = this.timeline.find(d => d.id === dayId);
        if (!day) return;
        this.activeDayId = dayId; // Aggiorna lo stato del giorno attivo

        const detailsContainer = document.getElementById('dayDetailsPanel'); 
        if (!detailsContainer) {
            console.error("Manca l'elemento #dayDetailsPanel nell'HTML.");
            return;
        }
        
        // Assegnazione sicura con fallback a array vuoto per evitare l'errore "is not iterable"
        const characters = day.characters || [];
        const locations = day.locations || [];
        const events = day.events || [];
        const organizations = day.organizations || [];
        
        let detailHTML = `
            <div class="day-detail-header">
                <h2>Giorno ${day.day}: ${day.title}</h2>
                <button class="btn btn--small">✏️ Modifica</button>
            </div>
        `;
        
        // --- 1. Sezione Contenuto (Testo della Sessione Interattivo) ---
        let content = day.content;
        
        // Evidenzia e rende interattivi i nomi delle entità nel testo
        const allEntities = [...characters, ...locations, ...organizations];
        allEntities.forEach(name => {
            const type = characters.includes(name) ? 'entity-character' : 'entity-location';
            content = content.replace(new RegExp(`\\b${name}\\b`, 'gi'), `<span class="entity-link ${type}">${name}</span>`);
        });

        detailHTML += `
            <div class="day-content-section">
                <h3>Testo della Sessione</h3> 
                <p class="day-content-text">${content.replace(/\n/g, '<br>')}</p>
            </div>
        `;

        // --- 2. Sezione Riferimenti (Box a Destra) ---
        detailHTML += `
            <div class="day-associations-grid">
                ${this.createAssocBox('Personaggi', characters, 'tag-char')}
                ${this.createAssocBox('Luoghi', locations, 'tag-loc')}
                ${this.createAssocBox('Eventi', events, 'tag-event')}
                ${this.createAssocBox('Organizzazioni', organizations, 'tag-org')}
            </div>
        `;

        detailsContainer.innerHTML = detailHTML;
        this.renderTimeline(); // Rirenderizza la timeline per aggiornare la classe 'active'
    }
    
    // CORREZIONE CRITICA PER L'ERRORE "is not iterable"
    createAssocBox(title, items, tagClass) {
        // Gestione sicura: se items non è un array o è vuoto, restituisce stringa vuota
        if (!items || !Array.isArray(items) || items.length === 0) return '';
        
        const tags = items.map(name => `<span class="entity-tag ${tagClass}">${name}</span>`).join('');
        
        return `
            <div class="assoc-box">
                <h4>${title}</h4>
                <div class="tag-list">${tags}</div>
            </div>
        `;
    }

    // --- 5. DATI DI DEFAULT ---

    initializeDefaultData() {
        const initialData = {
            "timeline": [
                {
                  "id": 1,
                  "day": 1,
                  "title": "L'Inizio della Mia Nuova Via",
                  "content": "Io, Zoltab, sono nato sotto il segno della luce nei Campi Benedetti dell’Elysium, nello strato di Amoria... [continua nel file originale]",
                  "characters": ["Zoltab"],
                  "locations": ["Elysium"],
                  "events": ["Nascita", "Esilio", "Massacro"],
                  "active": true,
                  "organizations": []
                },
                {
                  "id": 2,
                  "day": 2,
                  "title": "Il Piano Materiale",
                  "content": "Attraverso un portale, arrivai al Piano Materiale, un luogo di caos e varietà razziale...",
                  "characters": ["Zoltab", "Grass", "Lord Garli"],
                  "locations": ["Holran", "Regno di Nielwenward ", "Impero Kalissiano "],
                  "events": ["Attraversamento portale", "Primo contatto con la città di Holran"],
                  "active": true,
                  "organizations": []
                },
                {
                  "id": 3,
                  "day": 3,
                  "title": "Un Nuovo Compito e un'Offerta di Alleanza",
                  "content": "Il mattino seguente mi presentai a Lord Garli nella sua villa con giardino curato. Mi offrì un’alleanza per cercare il figlio scomparso, Shanas...",
                  "events": ["Accettata la missione di Garli per ritrovare Shanas", "Incontro con Alber e Crowlei"],
                  "characters": ["Zoltab", "Alber", "Lord Garli", "Crowlei", "Ruth", "Olidam"],
                  "locations": ["Holran", "Augen", "Saingol"],
                  "organizations": ["Compagnia della Bilancia"],
                  "active": true
                }
            ],
            "characters": {
                "Zoltab": { "id": "zoltab", "name": "Zoltab", "race": "Aasimar", "class": "Paladino della Conquista", "status": "Protagonista", "description": "Nato nell'Elysium, ora fondatore dell'Ordine Cinereo", "appearancesDays": [ 1, 2, 3 ], "avatar": null },
                "Grass": { "id": "grass", "name": "Grass", "race": "Umano", "class": "Locandiere", "status": "Alleato", "appearancesDays": [ 2 ], "description": "Proprietario della taverna Fiasco Frisco", "avatar": null },
                "Alber": { "id": "alber", "name": "Alber", "race": "Satiro", "class": "Warlock", "status": "Alleato", "appearancesDays": [ 3 ], "description": "Satiro della Selva Fatata", "avatar": null },
                "Lord Garli": { "id": "lord-garli", "name": "Lord Garli", "race": "Umano", "class": "", "status": "PNG Importante", "appearancesDays": [ 2, 3 ], "description": "Vecchio umano, ex-avventuriero...", "avatar": null },
                "Crowlei": { "id": "crowlei", "name": "Crowlei", "race": "Firbolg", "class": "Chierico", "status": "Alleato", "appearancesDays": [ 3 ], "description": "Chierico Firbolg", "avatar": null },
                "Ruth": { "id": "ruth", "name": "Ruth", "race": "Umano", "class": "Paladino", "status": "PNG Secondario", "appearancesDays": [ 3 ], "description": "Vecchio paladino ex-avventuriero...", "avatar": null },
                "Olidam": { "id": "olidam", "name": "Olidam", "race": "Halfling", "class": "Ladro", "status": "Alleato", "appearancesDays": [ 3 ], "description": "Misterioso mezz’uomo...", "avatar": null }
            },
            "locations": {
                "Elysium": { "id": "elysium", "name": "Elysium", "type": "", "description": "Piano di nascita di Zoltab", "appearancesDays": [ 1 ] },
                "Holran": { "id": "holran", "name": "Holran", "type": "Città", "description": "Prima città visitata nel Piano Materiale", "appearancesDays": [ 2, 3 ] },
                "Saingol": { "id": "saingol", "name": "Saingol", "type": "Città", "description": "Capitale del Regno di Nielwenward", "appearancesDays": [ 3 ] }
            },
            "organizations": {
                 "Compagnia della Bilancia": { "id": "compagnia-della-bilancia", "name": "Compagnia della Bilancia", "type": "Compagnia", "attitude": "Sconosciuto", "description": "Spedizione che aveva assunto Shanas come traduttore." }
            }
        };

        this.timeline = initialData.timeline;
        this.characters = new Map(Object.entries(initialData.characters));
        this.locations = new Map(Object.entries(initialData.locations));
        this.organizations = new Map(Object.entries(initialData.organizations));
        // Imposto il giorno 3 come attivo
        this.activeDayId = initialData.timeline[2].id;
    }
    
    // Mostra i dettagli di un'entità (Personaggio, Luogo, Missione...)
    showEntityDetails(name, type) {
        // Implementazione futura per mostrare i dettagli dell'entità
        console.log(`Mostra dettagli per ${name} (${type}).`);
    }
}

// Inizializza l'applicazione al caricamento della pagina
window.onload = () => {
    const app = new CampaignManager();
};
