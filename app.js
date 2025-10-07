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

        this.init();
    }

    init() {
        this.loadData();
        this.attachEventListeners();
        this.renderUI();
    }

    // --- PERSISTENZA DATI ---

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
    
    // --- EVENT LISTENERS (INTERATTIVITÀ) ---

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
    
    // --- PARSING & INSERIMENTO DATI ---

    parseSessionText(text) {
        // Logica di parsing tramite Regex (come analizzato)
        const suggestions = { characters: new Set(), locations: new Set(), organizations: new Set(), missions: new Set() };
        // (La logica completa di parsing è omessa per brevità qui, ma va inserita completamente)
        return suggestions;
    }

    confirmAssociations(suggestions) {
        // Logica di rendering delle checkbox e del bottone "Conferma"
        const container = document.getElementById('sessionParseResults');
        container.innerHTML = '<h4>Associazioni Trovate:</h4>';

        // Placeholder per la conferma
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Conferma Provvisoria';
        confirmBtn.classList.add('btn', 'btn--primary');
        confirmBtn.addEventListener('click', () => {
             // In una versione reale, qui si raccolgono le checkbox. Usiamo un placeholder.
             this.applyAssociations({ characters: ['Zoltab'], locations: ['Nuovo Luogo'], missions: [] }); 
             document.getElementById('sessionParseResults').innerHTML = '';
             document.getElementById('sessionInput').value = ''; 
        });
        container.appendChild(confirmBtn);
    }

    applyAssociations(selected) {
        // Crea entità nuove (omesso per brevità)
        
        const newDayId = this.timeline.length + 1;
        const newDay = {
            id: newDayId, day: newDayId, title: `Giornata ${newDayId}`, content: this.currentSessionText || '',
            characters: selected.characters, locations: selected.locations, active: true,
        };
        this.timeline.push(newDay);

        // Aggiorna riferimenti bidirezionali (omesso per brevità)

        this.saveData();
        this.renderUI();
    }

    addNewEntity(type, data) {
        // Logica di creazione e assegnazione ID (omesso per brevità)
    }

    // --- RENDERING & RIORDINO ---

    renderUI() {
        this.renderTimeline();
        this.renderCharacters();
        // Nascondi/Mostra elementi Master-only
        document.querySelectorAll('.master-only').forEach(el => {
            el.classList.toggle('hidden', !this.isMasterMode);
        });
    }
    
    renderTimeline() {
        const container = document.getElementById('timelineContainer');
        container.innerHTML = '';

        this.timeline.forEach((day, index) => {
            const dayItem = document.createElement('div');
            dayItem.classList.add('timeline-day');
            dayItem.textContent = `Giorno ${day.day}: ${day.title}`;
            container.appendChild(dayItem);
        });
        
        this.initializeSortableTimeline();
    }

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
        container.innerHTML = '<h2>Personaggi</h2>';
        // Aggiungi un placeholder per vedere qualcosa
        if (this.characters.size === 0) {
            container.innerHTML += '<p>Nessun personaggio salvato.</p>';
        }
    }

    // --- METODI PLACEHOLDER MINIMI ---
    initializeDefaultData() {
        this.timeline = [
            { id: 1, day: 1, title: 'Lancio della Campagna', active: true }
        ];
    }
}

const app = new CampaignManager();