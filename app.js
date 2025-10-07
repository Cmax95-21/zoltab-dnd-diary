class CampaignManager {
    constructor() {
        this.timeline = []; 
        this.characters = new Map(); 
        this.locations = new Map(); 
        this.quests = new Map(); 
        this.organizations = new Map(); 
        
        this.isMasterMode = false;
        this.currentSessionText = ''; 
        this.sortableInstance = null;
        this.activeDayId = null;

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
                
                if (tabName === 'characters') this.renderCharacters();
                if (tabName === 'timeline') this.renderTimeline();
            });
        });

        // Listener per chiudere la Modale (Funzionalità)
        const closeModalBtn = document.getElementById('closeModalBtn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                const modal = document.getElementById('entityModal');
                if (modal) modal.classList.add('hidden');
            });
        }
    }

    toggleMasterMode(isMaster) {
        this.isMasterMode = isMaster;
        this.renderUI();
    }
    
    // --- 3. LOGICA DI PARSING & INSERIMENTO (Placeholder) ---
    
    parseSessionText(text) {
        const suggestions = { characters: new Set(), locations: new Set(), organizations: new Set(), missions: new Set() };
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
        confirmBtn.classList.add('btn', 'btn--primary', 'master-only');
        
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
        const newDayId = Date.now();
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

        selected.characters.forEach(name => {
            let char = this.characters.get(name);
            if (!char) {
                 this.addNewEntity('character', { name: name });
                 char = this.characters.get(name);
            }
            if (char) {
                if (!char.appearancesDays) char.appearancesDays = [];
                char.appearancesDays.push(newDay.day);
                this.characters.set(name, char);
            }
        });

        this.saveData();
        this.renderUI();
    }

    addNewEntity(type, data) {
        const nameKey = data.name;

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
        }
    }

    // --- 4. LOGICA DI RENDERING E INTERATTIVITÀ ---

    renderUI() {
        this.renderTimeline();
        this.renderCharacters();
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
                 dayItem.classList.add('active'); 
            }
            dayItem.dataset.dayId = day.id; 
            
            const dayLabel = document.createElement('span');
            dayLabel.innerHTML = `<strong>Giorno ${day.day}</strong>: ${day.title}`;
            dayItem.appendChild(dayLabel);
            
            dayItem.addEventListener('click', () => {
                 this.showDayDetails(day.id); 
            });

            container.appendChild(dayItem);
        });

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
                this.reorderTimeline(evt.oldIndex, evt.newIndex);
            },
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
    
    renderCharacters() {
        const container = document.getElementById('charactersList');
        if (!container) return;
        
        container.innerHTML = ''; 
        const grid = document.createElement('div');
        grid.classList.add('entity-grid'); 

        this.characters.forEach(entity => {
            const card = document.createElement('div');
            card.classList.add('entity-card');
            
            const header = document.createElement('h3');
            header.textContent = entity.name;
            card.appendChild(header);

            const details = document.createElement('p');
            details.innerHTML = `
                <strong>${entity.class || 'N.D.'}</strong> | 
                <span>${entity.race || 'Sconosciuta'}</span><br>
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
    
    showDayDetails(dayId) {
        const day = this.timeline.find(d => d.id === dayId);
        if (!day) return;
        this.activeDayId = dayId;
        
        // Aggiorna lo stato "active" della timeline in modo non ricorsivo
        document.querySelectorAll('.timeline-day').forEach(item => {
             item.classList.remove('active');
             if (item.dataset.dayId == dayId) {
                 item.classList.add('active');
             }
        });

        const detailsContainer = document.getElementById('dayDetailsPanel'); 
        if (!detailsContainer) return;
        
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
        
        let content = day.content;
        
        // 1. Evidenzia Entità nel testo (prepara i link)
        const allEntities = [...characters, ...locations, ...organizations];
        allEntities.forEach(name => {
            const type = characters.includes(name) ? 'entity-character' : 'entity-location';
            content = content.replace(new RegExp(`\\b${name}\\b`, 'gi'), `<span class="entity-link ${type}" data-entity-name="${name}" data-entity-type="${type.includes('character') ? 'character' : 'location'}">${name}</span>`);
        });

        detailHTML += `
            <div class="day-content-section">
                <h3>Testo della Sessione</h3> 
                <p class="day-content-text">${content.replace(/\n/g, '<br>')}</p>
            </div>
        `;

        // 2. Sezione Riferimenti
        detailHTML += `
            <div class="day-associations-grid">
                ${this.createAssocBox('Personaggi', characters, 'tag-char')}
                ${this.createAssocBox('Luoghi', locations, 'tag-loc')}
                ${this.createAssocBox('Eventi', events, 'tag-event')}
                ${this.createAssocBox('Organizzazioni', organizations, 'tag-org')}
            </div>
        `;

        detailsContainer.innerHTML = detailHTML;

        // 3. Attiva i listener sui link appena caricati
        detailsContainer.querySelectorAll('.entity-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const name = e.target.dataset.entityName;
                const type = e.target.dataset.entityType;
                this.showEntityDetails(name, type);
            });
        });
    }
    
    createAssocBox(title, items, tagClass) {
        if (!items || !Array.isArray(items) || items.length === 0) return '';
        
        const tags = items.map(name => `<span class="entity-tag ${tagClass}">${name}</span>`).join('');
        
        return `
            <div class="assoc-box">
                <h4>${title}</h4>
                <div class="tag-list">${tags}</div>
            </div>
        `;
    }

    showEntityDetails(name, type) {
        const modal = document.getElementById('entityModal');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalBody) return;

        let entity = (type === 'character' ? this.characters.get(name) : this.locations.get(name));
        let appearances = (entity && entity.appearancesDays) || [];
        
        if (!entity) {
            modalBody.innerHTML = `<h2>Errore</h2><p>Dettagli per "${name}" non trovati in ${type}.</p>`;
        } else {
            modalBody.innerHTML = `
                <h2 class="modal-title">${entity.name}</h2>
                <p><strong>Tipo:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
                
                ${entity.class ? `<p><strong>Classe:</strong> ${entity.class}</p>` : ''}
                ${entity.race ? `<p><strong>Razza:</strong> ${entity.race}</p>` : ''}
                ${entity.status ? `<p><strong>Stato:</strong> ${entity.status}</p>` : ''}
                
                <h3>Descrizione:</h3>
                <p>${entity.description || 'Nessuna descrizione disponibile.'}</p>
                
                <hr style="border-color: rgba(255, 255, 255, 0.1);">
                
                <h3>Appare nei giorni:</h3>
                <p>${appearances.length > 0 ? appearances.map(day => `Giorno ${day}`).join(', ') : 'Nessuna apparizione registrata.'}</p>

                <button class="btn btn--primary master-only" style="margin-top: 15px;">Modifica Scheda</button>
            `;
        }

        modal.classList.remove('hidden');
        document.querySelectorAll('.master-only').forEach(el => {
            el.classList.toggle('hidden', !this.isMasterMode);
        });
    }

    // --- 5. DATI DI DEFAULT ---

    initializeDefaultData() {
        const initialData = {
            "timeline": [
                { "id": 1, "day": 1, "title": "L'Inizio della Mia Nuova Via", "content": "Io, Zoltab, sono nato sotto il segno della luce nei Campi Benedetti dell’Elysium...", "characters": ["Zoltab"], "locations": ["Elysium"], "events": ["Nascita", "Esilio", "Massacro"], "active": true, "organizations": [] },
                { "id": 2, "day": 2, "title": "Il Piano Materiale", "content": "Attraverso un portale, arrivai al Piano Materiale, un luogo di caos...", "characters": ["Zoltab", "Grass", "Lord Garli"], "locations": ["Holran", "Regno di Nielwenward "], "events": ["Attraversamento portale", "Primo contatto con la città di Holran"], "active": true, "organizations": [] },
                { "id": 3, "day": 3, "title": "Un Nuovo Compito e un'Offerta di Alleanza", "content": "Il mattino seguente mi presentai a Lord Garli nella sua villa con giardino curato...", "events": ["Accettata la missione di Garli per ritrovare Shanas", "Incontro con Alber e Crowlei"], "characters": ["Zoltab", "Alber", "Lord Garli", "Crowlei", "Ruth", "Olidam"], "locations": ["Holran", "Augen", "Saingol"], "organizations": ["Compagnia della Bilancia"], "active": true }
            ],
            "characters": {
                "Zoltab": { "id": "zoltab", "name": "Zoltab", "race": "Aasimar", "class": "Paladino della Conquista", "status": "Protagonista", "description": "Nato nell'Elysium, ora fondatore dell'Ordine Cinereo", "appearancesDays": [ 1, 2, 3 ] },
                "Grass": { "id": "grass", "name": "Grass", "race": "Umano", "class": "Locandiere", "status": "Alleato", "appearancesDays": [ 2 ], "description": "Proprietario della taverna Fiasco Frisco" },
                "Alber": { "id": "alber", "name": "Alber", "race": "Satiro", "class": "Warlock", "status": "Alleato", "appearancesDays": [ 3 ], "description": "Satiro della Selva Fatata" },
                "Lord Garli": { "id": "lord-garli", "name": "Lord Garli", "race": "Umano", "class": "", "status": "PNG Importante", "appearancesDays": [ 2, 3 ], "description": "Vecchio umano, ex-avventuriero..." },
                "Crowlei": { "id": "crowlei", "name": "Crowlei", "race": "Firbolg", "class": "Chierico", "status": "Alleato", "appearancesDays": [ 3 ], "description": "Chierico Firbolg" },
                "Ruth": { "id": "ruth", "name": "Ruth", "race": "Umano", "class": "Paladino", "status": "PNG Secondario", "appearancesDays": [ 3 ], "description": "Vecchio paladino ex-avventuriero compagno di Lord Garli" },
                "Olidam": { "id": "olidam", "name": "Olidam", "race": "Halfling", "class": "Ladro", "status": "Alleato", "appearancesDays": [ 3 ], "description": "Misterioso mezz’uomo..." }
            },
            "locations": {
                "Elysium": { "id": "elysium", "name": "Elysium", "type": "", "description": "Piano di nascita di Zoltab", "appearancesDays": [ 1 ] },
                "Holran": { "id": "holran", "name": "Holran", "type": "Città", "description": "Prima città visitata nel Piano Materiale", "appearancesDays": [ 2, 3 ] },
                "Augen": { "id": "augen", "name": "Augen", "type": "Città", "description": "Città dotata di cerchi di teletrasporto", "appearancesDays": [ 3 ] },
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
        this.activeDayId = initialData.timeline[initialData.timeline.length - 1].id;
    }
}

// Inizializza l'applicazione al caricamento della pagina
window.onload = () => {
    const app = new CampaignManager();
};
