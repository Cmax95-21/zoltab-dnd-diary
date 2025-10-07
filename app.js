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
        // Toggle modalità Master/Giocatore
        document.getElementById('modeToggle').addEventListener('click', () => {
            const newMode = !this.isMasterMode;
            this.toggleMasterMode(newMode);
            document.getElementById('modeText').textContent = newMode ? 'Master' : 'Giocatore';
        });

        // Pulsante Salva 
        document.getElementById('saveChanges').addEventListener('click', () => {
             this.saveData();
        });
        
        // Pulsante analizza sessione
        document.getElementById('sessionParseButton').addEventListener('click', () => {
            const textarea = document.getElementById('sessionInput');
            const text = textarea.value;
            this.currentSessionText = text; 
            const suggestions = this.parseSessionText(text);
            this.confirmAssociations(suggestions);
        });
        
        // Eventi per tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(tabName).classList.add('active');
            });
        });
    }

    toggleMasterMode(isMaster) {
        this.isMasterMode = isMaster;
        this.renderUI();
    }
    
    // --- 3. LOGICA DI PARSING & INSERIMENTO (Placeholder Semplificato) ---
    
    // NOTA: Qui andrebbe la logica Regex completa come analizzato in precedenza.
    parseSessionText(text) {
        // Placeholder: in un'app funzionante, questo userebbe Regex.
        const suggestions = { characters: new Set(), locations: new Set(), organizations: new Set(), missions: new Set() };
        // Simula il risultato del parsing
        if (text.includes("Zoltab")) suggestions.characters.add("Zoltab");
        if (text.includes("Holran")) suggestions.locations.add("Holran");
        return suggestions;
    }

    confirmAssociations(suggestions) {
        const container = document.getElementById('sessionParseResults');
        container.innerHTML = '<h4>Associazioni Trovate:</h4>';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Conferma e Crea Giorno';
        confirmBtn.classList.add('btn', 'btn--primary');
        
        confirmBtn.addEventListener('click', () => {
             // In una versione reale, qui si raccolgono le checkbox. Usiamo i suggerimenti trovati.
             this.applyAssociations({ 
                 characters: Array.from(suggestions.characters), 
                 locations: Array.from(suggestions.locations), 
                 missions: [], organizations: [], events: [] 
             }); 
             document.getElementById('sessionParseResults').innerHTML = '';
             document.getElementById('sessionInput').value = ''; 
        });
        container.appendChild(confirmBtn);
    }

    applyAssociations(selected) {
        // Crea entità e assegna riferimenti bidirezionali (Logica omessa per brevità)
        
        const newDayId = Date.now(); // ID univoco
        const newDay = {
            id: newDayId, 
            day: this.timeline.length + 1, 
            title: `Giornata ${this.timeline.length + 1}`, 
            content: this.currentSessionText || '',
            characters: selected.characters, 
            locations: selected.locations, 
            events: selected.events || [], // Aggiungiamo eventi
            organizations: selected.organizations || [],
            active: true,
        };
        this.timeline.push(newDay);

        // Aggiorna i personaggi esistenti con la nuova apparizione
        selected.characters.forEach(name => {
            const char = this.characters.get(name);
            if (char) {
                if (!char.appearancesDays) char.appearancesDays = [];
                char.appearancesDays.push(newDay.day);
                this.characters.set(name, char);
            } else {
                 // Aggiungi un nuovo personaggio se non esiste
                 this.addNewEntity('character', { name: name, appearancesDays: [newDay.day] });
            }
        });

        this.saveData();
        this.renderUI();
    }

    addNewEntity(type, data) {
        const id = data.name.toLowerCase().replace(/\s/g, '-');
        const newEntity = Object.assign({ id }, data);

        switch (type) {
            case 'character':
                this.characters.set(data.name, newEntity);
                break;
            case 'location':
                this.locations.set(data.name, newEntity);
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
    
    // Implementazione del rendering della timeline e del click per i dettagli
    renderTimeline() {
        const container = document.getElementById('timelineContainer');
        container.innerHTML = '';
        
        this.timeline.forEach((day, index) => {
            const dayItem = document.createElement('div');
            dayItem.classList.add('timeline-day');
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

    // Implementazione del riordino con SortableJS
    initializeSortableTimeline() {
        const timelineContainer = document.getElementById('timelineContainer');
        if (!timelineContainer) return;

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

    // Metodo per aggiornare l'array dopo il Drag & Drop
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
    
    // Implementazione del rendering delle schede personaggi (come da screenshot)
    renderCharacters() {
        const container = document.getElementById('charactersList');
        container.innerHTML = ''; 
        
        // Usiamo un container per le schede per migliorare lo stile (necessita di CSS per 'entity-grid')
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
    
    // Implementazione del pannello di dettaglio della giornata (come da screenshot)
    showDayDetails(dayId) {
        const day = this.timeline.find(d => d.id === dayId);
        if (!day) return;
        this.activeDayId = dayId; // Aggiorna lo stato del giorno attivo

        const detailsContainer = document.getElementById('dayDetailsPanel'); 
        if (!detailsContainer) {
            console.error("Manca l'elemento #dayDetailsPanel nell'HTML.");
            return;
        }
        
        let detailHTML = `
            <div class="day-detail-header">
                <h2>${day.title}</h2>
                <button class="btn btn--small">✏️ Modifica</button>
            </div>
        `;
        
        // --- 1. Sezione Contenuto (Testo della Sessione Interattivo) ---
        let content = day.content;
        
        // Evidenzia e rende interattivi i nomi delle entità nel testo
        const allEntities = [...day.characters, ...day.locations, ...day.organizations];
        allEntities.forEach(name => {
            // Sostituzione con una funzione di callback per gestire la classe CSS
            const type = day.characters.includes(name) ? 'entity-character' : 'entity-location'; // Semplificato
            
            // Usa una regex per evitare di sostituire parti di parole
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
                ${this.createAssocBox('Personaggi', day.characters, 'tag-char')}
                ${this.createAssocBox('Luoghi', day.locations, 'tag-loc')}
                ${this.createAssocBox('Eventi', day.events, 'tag-event')}
                ${this.createAssocBox('Organizzazioni', day.organizations, 'tag-org')}
            </div>
        `;

        detailsContainer.innerHTML = detailHTML;
    }
    
    // Metodo helper per creare i box di associazione
    createAssocBox(title, items, tagClass) {
        if (!items || items.length === 0) return '';
        
        const tags = items.map(name => `<span class="entity-tag ${tagClass}">${name}</span>`).join('');
        
        return `
            <div class="assoc-box">
                <h4>${title}</h4>
                <div class="tag-list">${tags}</div>
            </div>
        `;
    }

    // --- 5. METODI PLACEHOLDER ---

    // Dati di default iniziali (per non iniziare con una app vuota)
    initializeDefaultData() {
        this.timeline = [
            { id: 1, day: 1, title: 'Inizio Campagna', content: 'Inizio della grande avventura.', characters: ['Zoltab'], locations: ['Elysium'], active: true }
        ];
        this.addNewEntity('character', { name: 'Zoltab', race: 'Aasimar', class: 'Paladino', description: 'Eroe/Antagonista principale', appearancesDays: [1] });
    }
    
    // Mostra i dettagli di un'entità (Personaggio, Luogo, Missione...)
    showEntityDetails(name, type) {
        console.log(`Mostra dettagli per ${name} (${type}).`);
        // Qui si aprirebbe una modale o un pannello laterale con tutti i dettagli
    }
}

// Inizializza l'applicazione al caricamento della pagina
const app = new CampaignManager();
