import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import { 
    getDatabase, ref, onValue, set, push, update, remove, off 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

import { 
    getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

import { 
    getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Config
const firebaseConfig = {
    apiKey: "AIzaSyAaJUsiPmok_yZfqmpMJ-5fmL6odPWty0s",
    authDomain: "dnd-campagna-collaborativa.firebaseapp.com",
    projectId: "dnd-campagna-collaborativa",
    storageBucket: "dnd-campagna-collaborativa.appspot.com",
    messagingSenderId: "800254099481",
    appId: "1:800254099481:web:e4fc7acd3d2203bff12a88",
    databaseURL: "https://dnd-campagna-collaborativa-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

class CampaignManager {
    constructor() {
        this.currentUser = '';
        this.isMaster = false;
        this.currentTab = 'timeline';
        this.currentEntityType = '';
        this.currentEntityId = '';
        this.sortableInstance = null;
        this.confirmCallback = null;
        this.parseData = null;

        this.data = {
            timeline: {},
            characters: {},
            locations: {},
            quests: {},
            organizations: {},
            map: null
        };

        this.init();
    }

    async init() {
        console.log('Initializing Campaign Manager...');
        this.setupEventListeners();
        this.setupFirebaseListeners();
        setTimeout(() => this.initializeSampleData(), 2000);

        // Show only the Google login button at startup
        const nicknameInput = document.getElementById('nicknameInput');
        const confirmNickname = document.getElementById('confirmNickname');
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        if (nicknameInput) nicknameInput.style.display = 'none';
        if (confirmNickname) confirmNickname.style.display = 'none';
        if (googleLoginBtn) googleLoginBtn.style.display = '';
    }

    setupEventListeners() {
        // Google login button
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.googleLogin());
        }

        // Nickname modal buttons and input
        const confirmNickname = document.getElementById('confirmNickname');
        const nicknameInput = document.getElementById('nicknameInput');
        if (confirmNickname) {
            confirmNickname.addEventListener('click', () => this.setNickname());
        }
        if (nicknameInput) {
            nicknameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.setNickname();
            });
        }

        // Master toggle
        const masterToggle = document.getElementById('masterToggle');
        if (masterToggle) {
            masterToggle.addEventListener('change', (e) => this.toggleMasterMode(e.target.checked));
        }

        // Header buttons
        const saveBtn = document.getElementById('saveBtn');
        const backupBtn = document.getElementById('backupBtn');
        const restoreBtn = document.getElementById('restoreBtn');
        const restoreFileInput = document.getElementById('restoreFileInput');

        if (saveBtn) saveBtn.addEventListener('click', () => this.saveData());
        if (backupBtn) backupBtn.addEventListener('click', () => this.exportData());
        if (restoreBtn) restoreBtn.addEventListener('click', () => this.importData());
        if (restoreFileInput) restoreFileInput.addEventListener('change', (e) => this.handleRestoreFile(e));

        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Global search input
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Add entity buttons
        const addTimelineBtn = document.getElementById('addTimelineBtn');
        const addCharacterBtn = document.getElementById('addCharacterBtn');
        const addLocationBtn = document.getElementById('addLocationBtn');
        const addQuestBtn = document.getElementById('addQuestBtn');
        const addOrganizationBtn = document.getElementById('addOrganizationBtn');

        if (addTimelineBtn) addTimelineBtn.addEventListener('click', () => this.openEntityModal('timeline'));
        if (addCharacterBtn) addCharacterBtn.addEventListener('click', () => this.openEntityModal('characters'));
        if (addLocationBtn) addLocationBtn.addEventListener('click', () => this.openEntityModal('locations'));
        if (addQuestBtn) addQuestBtn.addEventListener('click', () => this.openEntityModal('quests'));
        if (addOrganizationBtn) addOrganizationBtn.addEventListener('click', () => this.openEntityModal('organizations'));

        // Map controls
        const uploadMapBtn = document.getElementById('uploadMapBtn');
        const mapUpload = document.getElementById('mapUpload');
        const downloadMapBtn = document.getElementById('downloadMapBtn');

        if (uploadMapBtn) uploadMapBtn.addEventListener('click', () => mapUpload?.click());
        if (mapUpload) mapUpload.addEventListener('change', (e) => this.uploadMap(e.target.files[0]));
        if (downloadMapBtn) downloadMapBtn.addEventListener('click', () => this.downloadMap());

        // Session parsing button
        const parseSessionBtn = document.getElementById('parseSessionBtn');
        if (parseSessionBtn) parseSessionBtn.addEventListener('click', () => this.parseSession());

        // Modal buttons controls
        const saveEntity = document.getElementById('saveEntity');
        const cancelEntity = document.getElementById('cancelEntity');
        const confirmAction = document.getElementById('confirmAction');
        const cancelConfirm = document.getElementById('cancelConfirm');
        const confirmParse = document.getElementById('confirmParse');
        const cancelParse = document.getElementById('cancelParse');

        if (saveEntity) saveEntity.addEventListener('click', () => this.saveEntity());
        if (cancelEntity) cancelEntity.addEventListener('click', () => this.closeEntityModal());
        if (confirmAction) confirmAction.addEventListener('click', () => this.executeConfirmedAction());
        if (cancelConfirm) cancelConfirm.addEventListener('click', () => this.closeConfirmModal());
        if (confirmParse) confirmParse.addEventListener('click', () => this.confirmParsedEntities());
        if (cancelParse) cancelParse.addEventListener('click', () => this.closeParseModal());

        // Avatar upload input
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarUpload) avatarUpload.addEventListener('change', (e) => this.previewAvatar(e.target.files[0]));

        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Close modal buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        

        // Session detail modal backdrop click
        const sessionModal = document.getElementById('sessionDetailModal');
        if (sessionModal) {
            sessionModal.addEventListener('click', (e) => {
                if (e.target === sessionModal) {
                    this.closeSessionDetailModal();
                }
            });
        }
        console.log('Event listeners setup complete');
    }

    googleLogin() {
        signInWithPopup(auth, new GoogleAuthProvider())
            .then(result => {
                // Show nickname input after login
                const googleLoginBtn = document.getElementById('googleLoginBtn');
                const nicknameInput = document.getElementById('nicknameInput');
                const confirmNickname = document.getElementById('confirmNickname');
                if (googleLoginBtn) googleLoginBtn.style.display = 'none';
                if (nicknameInput) nicknameInput.style.display = '';
                if (confirmNickname) confirmNickname.style.display = '';
                nicknameInput?.focus();
            })
            .catch(error => {
                console.error('Errore login Google:', error);
                alert('Errore login Google: ' + error.message);
            });
    }

    // Placeholder for other methods of the CampaignManager class
    // setNickname(), toggleMasterMode(), saveData(), exportData(), importData(),
    // handleRestoreFile(), switchTab(), handleSearch(), openEntityModal(),
    // uploadMap(), downloadMap(), parseSession(), saveEntity(), closeEntityModal(),
    // executeConfirmedAction(), closeConfirmModal(), confirmParsedEntities(), closeParseModal(),
    // previewAvatar(), setupFirebaseListeners(), initializeSampleData()
  
    setupFirebaseListeners() {
        console.log('Setting up Firebase listeners...');
        
        // Listen for timeline changes
        const timelineRef = ref(database, 'timeline');
        onValue(timelineRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.data.timeline = data;
            this.enrichTimelineData();
            this.renderTimeline();
        }, (error) => {
            console.error('Timeline listener error:', error);
        });
        
        // Listen for characters changes
        const charactersRef = ref(database, 'characters');
        onValue(charactersRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.data.characters = data;
            this.renderCharacters();
        }, (error) => {
            console.error('Characters listener error:', error);
        });
        
        // Listen for locations changes
        const locationsRef = ref(database, 'locations');
        onValue(locationsRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.data.locations = data;
            this.renderLocations();
        }, (error) => {
            console.error('Locations listener error:', error);
        });
        
        // Listen for quests changes
        const questsRef = ref(database, 'quests');
        onValue(questsRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.data.quests = data;
            this.renderQuests();
        }, (error) => {
            console.error('Quests listener error:', error);
        });
        
        // Listen for organizations changes
        const organizationsRef = ref(database, 'organizations');
        onValue(organizationsRef, (snapshot) => {
            const data = snapshot.val() || {};
            this.data.organizations = data;
            this.renderOrganizations();
        }, (error) => {
            console.error('Organizations listener error:', error);
        });
        
        // Listen for map changes
        const mapRef = ref(database, 'map');
        onValue(mapRef, (snapshot) => {
            const data = snapshot.val();
            this.data.map = data;
            this.renderMap();
        }, (error) => {
            console.error('Map listener error:', error);
        });
    }
    
    async initializeSampleData() {
        // Check if we have any data, if not, add some sample data
        if (Object.keys(this.data.timeline).length === 0) {
            console.log('Initializing sample data...');
            
            const sampleData = {
                timeline: {
                    session1: {
                        id: 'session1',
                        session: 1,
                        day: 1,  // manteniamo per compatibilità
                        title: 'L\'Inizio della Campagna',
                        content: 'Prima sessione della campagna. I personaggi si incontrano a Elysium e iniziano la loro avventura. Durante questa sessione vengono stabiliti i primi contatti e alleanze.',
                        characters: ['Zoltab'],
                        locations: ['Elysium'],
                        active: true,
                        order: 0
                    }
                },
                characters: {
                    char1: {
                        id: 'char1',
                        name: 'Zoltab',
                        race: 'Aasimar',
                        class: 'Paladino Conquista',
                        description: 'Protagonista nato nell\'Elysium',
                        avatar: null
                    }
                },
                locations: {
                    loc1: {
                        id: 'loc1',
                        name: 'Elysium',
                        type: 'Piano Celestiale',
                        description: 'Piano di esistenza dei celestiali'
                    }
                }
            };
            
            try {
                await update(ref(database), sampleData);
                console.log('Sample data initialized');
            } catch (error) {
                console.error('Error initializing sample data:', error);
            }
        }
    }
    
    showNicknameModal() {
        const modal = document.getElementById('nicknameModal');
        const input = document.getElementById('nicknameInput');
        if (modal && input) {
            modal.classList.remove('hidden');
            input.focus();
        }
    }
    
    setNickname() {
        const nicknameInput = document.getElementById('nicknameInput');
        const nickname = nicknameInput ? nicknameInput.value.trim() : '';
        
        if (nickname) {
            this.currentUser = nickname;
            const userNickname = document.getElementById('userNickname');
            if (userNickname) {
                userNickname.textContent = nickname;
            }
            
            const modal = document.getElementById('nicknameModal');
            const mainApp = document.getElementById('mainApp');
            
            if (modal) modal.classList.add('hidden');
            if (mainApp) mainApp.classList.remove('hidden');
            
            console.log(`User set as: ${nickname}`);
        } else {
            alert('Inserisci un nickname valido');
        }
    }
    
    toggleMasterMode(isMaster) {
        console.log(`Toggle master mode: ${isMaster}`);
        this.isMaster = isMaster;
        
        // Add or remove the master-mode class from body
        const body = document.body;
        if (isMaster) {
            body.classList.add('master-mode');
        } else {
            body.classList.remove('master-mode');
        }
        
        // Update sortable instance if timeline is active
        if (this.currentTab === 'timeline' && this.sortableInstance) {
            this.sortableInstance.option('disabled', !isMaster);
        }
    }
    
    switchTab(tabName) {
        console.log(`Switching to tab: ${tabName}`);
        
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const activeContent = document.getElementById(tabName);
        if (activeContent) activeContent.classList.add('active');
        
        this.currentTab = tabName;
        
        // Initialize timeline sortable if switching to timeline
        if (tabName === 'timeline') {
            setTimeout(() => this.initializeTimelineSortable(), 100);
        }
    }
    
    initializeTimelineSortable() {
        const container = document.getElementById('timelineContainer');
        if (!container) return;

        if (this.sortableInstance) {
            this.sortableInstance.destroy();
        }

        this.sortableInstance = Sortable.create(container, {
            animation: 200,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            disabled: !this.isMaster,
            onEnd: (evt) => {
                this.updateTimelineOrder();
            }
        });

        console.log('Timeline sortable initialized for grid layout');
    }
    
    async async updateTimelineOrder() {
        const timelineItems = document.querySelectorAll('.timeline-session');
        const updates = {};

        timelineItems.forEach((item, index) => {
            const sessionId = item.dataset.sessionId;
            if (this.data.timeline[sessionId]) {
                updates[`timeline/${sessionId}/order`] = index;
            }
        });

        try {
            await update(ref(database), updates);
            console.log('Timeline order updated');
        } catch (error) {
            console.error('Error updating timeline order:', error);
        }
    }
    
    handleSearch(query) {
        if (!query.trim()) {
            this.clearSearch();
            return;
        }
        
        const normalizedQuery = query.toLowerCase();
        console.log(`Searching for: ${normalizedQuery}`);
        
        // Search in all data sections
        document.querySelectorAll('.card, .timeline-day').forEach(element => {
            const text = element.textContent.toLowerCase();
            if (text.includes(normalizedQuery)) {
                element.style.display = '';
                element.classList.add('search-highlight');
            } else {
                element.style.display = 'none';
                element.classList.remove('search-highlight');
            }
        });
    }
    
    clearSearch() {
        document.querySelectorAll('.card, .timeline-day').forEach(element => {
            element.style.display = '';
            element.classList.remove('search-highlight');
        });
    }
    
    openEntityModal(entityType, entityId = null) {
        console.log(`Opening entity modal for: ${entityType}, ID: ${entityId}`);
        
        this.currentEntityType = entityType;
        this.currentEntityId = entityId;
        
        const modal = document.getElementById('entityModal');
        const title = document.getElementById('entityModalTitle');
        const form = document.getElementById('entityForm');
        const additionalFields = document.getElementById('additionalFields');
        const avatarGroup = document.getElementById('avatarUploadGroup');
        
        if (!modal || !title || !form) {
            console.error('Modal elements not found');
            return;
        }
        
        // Reset form
        form.reset();
        if (additionalFields) additionalFields.innerHTML = '';
        const avatarPreview = document.getElementById('avatarPreview');
        if (avatarPreview) avatarPreview.innerHTML = '';
        
        // Set title
        if (entityId) {
            title.textContent = `Modifica ${this.getEntityTypeName(entityType)}`;
            this.populateEntityForm(entityType, entityId);
        } else {
            title.textContent = `Aggiungi ${this.getEntityTypeName(entityType)}`;
        }
        
        // Add additional fields based on entity type
        if (additionalFields) {
            this.addEntitySpecificFields(entityType, additionalFields);
        }
        
        // Show/hide avatar upload based on entity type
        if (avatarGroup) {
            if (entityType === 'characters') {
                avatarGroup.classList.remove('hidden');
            } else {
                avatarGroup.classList.add('hidden');
            }
        }
        
        modal.classList.remove('hidden');
        
        // Focus on name input
        const nameInput = document.getElementById('entityName');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    }
    
    getEntityTypeName(type) {
        const names = {
            timeline: 'Sessione',
            characters: 'Personaggio',
            locations: 'Luogo',
            quests: 'Missione',
            organizations: 'Organizzazione'
        };
        return names[type] || type;
    }
    
    addEntitySpecificFields(entityType, container) {
        switch (entityType) {
            case 'characters':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="characterRace">Razza</label>
                        <input type="text" id="characterRace" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="characterClass">Classe</label>
                        <input type="text" id="characterClass" class="form-control">
                    </div>
                `;
                break;
            case 'locations':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="locationType">Tipo</label>
                        <input type="text" id="locationType" class="form-control" placeholder="CittÃ , Dungeon, Piano...">
                    </div>
                `;
                break;
            case 'quests':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="questStatus">Stato</label>
                        <select id="questStatus" class="form-control">
                            <option value="active">Attiva</option>
                            <option value="completed">Completata</option>
                            <option value="failed">Fallita</option>
                            <option value="paused">In Pausa</option>
                        </select>
                    </div>
                `;
                break;
            case 'organizations':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="organizationType">Tipo</label>
                        <input type="text" id="organizationType" class="form-control" placeholder="Gilda, Ordine, Culto...">
                    </div>
                `;
                break;
            case 'timeline':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="sessionNumber">Sessione</label>
                        <input type="number" id="sessionNumber" class="form-control" min="1" value="${Object.keys(this.data.timeline).length + 1}">
                    </div>
                `;
                break;
        }
    }
    
    populateEntityForm(entityType, entityId) {
        const entity = this.data[entityType][entityId];
        if (!entity) return;
        
        const nameInput = document.getElementById('entityName');
        const descriptionInput = document.getElementById('entityDescription');
        
        if (nameInput) nameInput.value = entity.name || entity.title || '';
        if (descriptionInput) descriptionInput.value = entity.description || entity.content || '';
        
        // Populate specific fields
        switch (entityType) {
            case 'characters':
                const raceInput = document.getElementById('characterRace');
                const classInput = document.getElementById('characterClass');
                if (raceInput) raceInput.value = entity.race || '';
                if (classInput) classInput.value = entity.class || '';
                if (entity.avatar) {
                    this.showAvatarPreview(entity.avatar);
                }
                break;
            case 'locations':
                const typeInput = document.getElementById('locationType');
                if (typeInput) typeInput.value = entity.type || '';
                break;
            case 'quests':
                const statusInput = document.getElementById('questStatus');
                if (statusInput) statusInput.value = entity.status || 'active';
                break;
            case 'organizations':
                const orgTypeInput = document.getElementById('organizationType');
                if (orgTypeInput) orgTypeInput.value = entity.type || '';
                break;
            case 'timeline':
                const sessionInput = document.getElementById('sessionNumber');
                if (sessionInput) sessionInput.value = entity.day || '';
                break;
        }
    }
    
    async saveEntity() {
        console.log('Saving entity...');
        this.showLoading();
        
        try {
            const nameInput = document.getElementById('entityName');
            const descriptionInput = document.getElementById('entityDescription');
            
            const name = nameInput ? nameInput.value.trim() : '';
            const description = descriptionInput ? descriptionInput.value.trim() : '';
            
            if (!name) {
                alert('Il nome Ã¨ obbligatorio');
                this.hideLoading();
                return;
            }
            
            let entityData = {
                name: name,
                description: description,
                updatedBy: this.currentUser,
                updatedAt: Date.now()
            };
            
            // Add specific fields
            switch (this.currentEntityType) {
                case 'characters':
                    const raceInput = document.getElementById('characterRace');
                    const classInput = document.getElementById('characterClass');
                    entityData.race = raceInput ? raceInput.value : '';
                    entityData.class = classInput ? classInput.value : '';
                    break;
                case 'locations':
                    const typeInput = document.getElementById('locationType');
                    entityData.type = typeInput ? typeInput.value : '';
                    break;
                case 'quests':
                    const statusInput = document.getElementById('questStatus');
                    entityData.status = statusInput ? statusInput.value : 'active';
                    break;
                case 'organizations':
                    const orgTypeInput = document.getElementById('organizationType');
                    entityData.type = orgTypeInput ? orgTypeInput.value : '';
                    break;
                case 'timeline':
                    const sessionInput = document.getElementById('sessionNumber');
                    entityData = {
                        title: name,
                        content: description,
                        day: sessionInput ? parseInt(sessionInput.value) || 1 : 1,
                        active: true,
                        characters: [],
                        locations: [],
                        order: Object.keys(this.data.timeline).length,
                        updatedBy: this.currentUser,
                        updatedAt: Date.now()
                    };
                    break;
            }
            
            // Handle avatar upload for characters
            if (this.currentEntityType === 'characters') {
                const avatarInput = document.getElementById('avatarUpload');
                const avatarFile = avatarInput ? avatarInput.files[0] : null;
                
                if (avatarFile) {
                    entityData.avatar = await this.uploadAvatar(avatarFile, name);
                } else if (this.currentEntityId && this.data.characters[this.currentEntityId]?.avatar) {
                    entityData.avatar = this.data.characters[this.currentEntityId].avatar;
                }
            }
            
            // Save to Firebase
            let entityRef;
            if (this.currentEntityId) {
                // Update existing
                entityData.id = this.currentEntityId;
                entityRef = ref(database, `${this.currentEntityType}/${this.currentEntityId}`);
                await update(entityRef, entityData);
                console.log('Entity updated successfully');
            } else {
                // Create new
                entityRef = push(ref(database, this.currentEntityType));
                entityData.id = entityRef.key;
                await set(entityRef, entityData);
                console.log('Entity created successfully');
            }
            
            this.closeEntityModal();
            
        } catch (error) {
            console.error('Error saving entity:', error);
            alert('Errore durante il salvataggio: ' + error.message);
        }
        
        this.hideLoading();
    }
    
    closeEntityModal() {
        const modal = document.getElementById('entityModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.currentEntityType = '';
        this.currentEntityId = '';
    }
    
    async deleteEntity(entityType, entityId) {
        this.showConfirmModal(
            'Sei sicuro di voler eliminare questo elemento?',
            async () => {
                this.showLoading();
                try {
                    // Delete avatar if it's a character
                    if (entityType === 'characters' && this.data.characters[entityId]?.avatar) {
                        await this.deleteAvatar(this.data.characters[entityId].avatar);
                    }
                    
                    await remove(ref(database, `${entityType}/${entityId}`));
                    console.log('Entity deleted successfully');
                } catch (error) {
                    console.error('Error deleting entity:', error);
                    alert('Errore durante l\'eliminazione: ' + error.message);
                }
                this.hideLoading();
            }
        );
    }
    
    showConfirmModal(message, onConfirm) {
        const modal = document.getElementById('confirmModal');
        const messageElement = document.getElementById('confirmMessage');
        
        if (modal && messageElement) {
            messageElement.textContent = message;
            modal.classList.remove('hidden');
            this.confirmCallback = onConfirm;
        }
    }
    
    closeConfirmModal() {
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.confirmCallback = null;
    }

    openSessionDetailModal(sessionId) {
        console.log('Opening session detail modal for:', sessionId);
        const session = this.data.timeline[sessionId];
        if (!session) return;

        const modal = document.getElementById('sessionDetailModal');
        const title = document.getElementById('sessionDetailTitle');
        const meta = document.getElementById('sessionDetailMeta');
        const content = document.getElementById('sessionDetailContent');
        const tags = document.getElementById('sessionDetailTags');
        const editBtn = document.getElementById('editSessionBtn');
        const deleteBtn = document.getElementById('deleteSessionBtn');

        if (!modal) return;

        // Popola il contenuto del modal
        if (title) title.textContent = session.title || 'Sessione senza titolo';
        if (meta) meta.textContent = `Sessione ${session.day || session.session || 1}`;
        if (content) content.innerHTML = session.content ? session.content.replace(/\n/g, '<br>') : 'Nessun contenuto disponibile';

        // Popola i tag
        if (tags) {
            const allTags = [];

            if (session.characters && session.characters.length > 0) {
                session.characters.forEach(char => {
                    if (typeof char === 'object' && char.name) {
                        allTags.push(`<span class="session-detail-tag characters" data-type="characters" data-name="${char.name}">👤 ${char.name}</span>`);
                    }
                });
            }

            if (session.locations && session.locations.length > 0) {
                session.locations.forEach(loc => {
                    if (typeof loc === 'object' && loc.name) {
                        allTags.push(`<span class="session-detail-tag locations" data-type="locations" data-name="${loc.name}">🏞️ ${loc.name}</span>`);
                    }
                });
            }

            if (session.organizations && session.organizations.length > 0) {
                session.organizations.forEach(org => {
                    if (typeof org === 'object' && org.name) {
                        allTags.push(`<span class="session-detail-tag organizations" data-type="organizations" data-name="${org.name}">⚜️ ${org.name}</span>`);
                    }
                });
            }

            tags.innerHTML = allTags.join('');

            // Aggiungi event listeners ai tag
            tags.querySelectorAll('.session-detail-tag').forEach(tag => {
                tag.addEventListener('click', (e) => {
                    const type = e.target.dataset.type;
                    const name = e.target.dataset.name;
                    this.closeSessionDetailModal();
                    this.switchTab(type);
                    setTimeout(() => {
                        const cards = document.querySelectorAll(`#${type}Container .card-title`);
                        cards.forEach(card => {
                            if (card.textContent.trim() === name) {
                                card.scrollIntoView({behavior: 'smooth', block: 'center'});
                                card.parentElement.classList.add('highlight');
                                setTimeout(() => card.parentElement.classList.remove('highlight'), 1500);
                            }
                        });
                    }, 250);
                });
            });
        }

        // Event listeners per i bottoni
        if (editBtn) {
            editBtn.onclick = () => {
                this.closeSessionDetailModal();
                this.openEntityModal('timeline', sessionId);
            };
        }

        if (deleteBtn) {
            deleteBtn.onclick = () => {
                this.closeSessionDetailModal();
                this.deleteEntity('timeline', sessionId);
            };
        }

        modal.classList.remove('hidden');
    }

    closeSessionDetailModal() {
        const modal = document.getElementById('sessionDetailModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    executeConfirmedAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
            this.closeConfirmModal();
        }
    }
    
    async uploadAvatar(file, characterName) {
        const avatarRef = storageRef(storage, `avatars/${Date.now()}_${characterName}`);
        const snapshot = await uploadBytes(avatarRef, file);
        return await getDownloadURL(snapshot.ref);
    }
    
    async deleteAvatar(avatarUrl) {
        try {
            const avatarRef = storageRef(storage, avatarUrl);
            await deleteObject(avatarRef);
        } catch (error) {
            console.warn('Could not delete avatar:', error);
        }
    }
    
    previewAvatar(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => this.showAvatarPreview(e.target.result);
            reader.readAsDataURL(file);
        }
    }
    
    showAvatarPreview(src) {
        const preview = document.getElementById('avatarPreview');
        if (preview) {
            preview.innerHTML = `<img src="${src}" alt="Avatar Preview">`;
        }
    }
    
    async uploadMap(file) {
        if (!file) return;
        
        this.showLoading();
        try {
            const mapRef = storageRef(storage, `maps/campaign_map_${Date.now()}`);
            const snapshot = await uploadBytes(mapRef, file);
            const url = await getDownloadURL(snapshot.ref);
            
            await set(ref(database, 'map'), {
                url: url,
                name: file.name,
                uploadedBy: this.currentUser,
                uploadedAt: Date.now()
            });
            
            console.log('Map uploaded successfully');
            
        } catch (error) {
            console.error('Error uploading map:', error);
            alert('Errore durante il caricamento della mappa: ' + error.message);
        }
        this.hideLoading();
    }
    
    downloadMap() {
        if (this.data.map?.url) {
            const link = document.createElement('a');
            link.href = this.data.map.url;
            link.download = this.data.map.name || 'mappa.png';
            link.target = '_blank';
            link.click();
        } else {
            alert('Nessuna mappa disponibile per il download');
        }
    }
    
    parseSession() {
        const titleInput = document.getElementById('sessionTitle');
        const contentInput = document.getElementById('sessionContent');
        
        const title = titleInput ? titleInput.value.trim() : '';
        const content = contentInput ? contentInput.value.trim() : '';
        
        if (!content) {
            alert('Inserisci il contenuto della sessione per l\'analisi');
            return;
        }
        
        console.log('Parsing session content...');
        
        const patterns = [
            /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
            /(?:a|in|da|verso|per|presso)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
            /(?:Ordine|Regno|Impero|Gilda|Culto)\s+(?:di\s+|del\s+|della\s+)?([A-Z][a-z]+)/g
        ];
        
        const detectedEntities = new Set();
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const entity = match[1].trim();
                if (entity.length > 2 && !this.isCommonWord(entity)) {
                    detectedEntities.add(entity);
                }
            }
        });
        
        this.showParseResults(Array.from(detectedEntities), title, content);
    }
    
    isCommonWord(word) {
        const commonWords = [
            'Dopo', 'Prima', 'Durante', 'Mentre', 'Quando', 'Dove', 'Come', 'PerchÃ©',
            'Questo', 'Quello', 'Questi', 'Quelli', 'Molto', 'Poco', 'Tanto', 'Tutto',
            'Anche', 'Ancora', 'Sempre', 'Mai', 'GiÃ ', 'Subito', 'Presto', 'Tardi'
        ];
        return commonWords.includes(word);
    }
    
    showParseResults(entities, title, content) {
        const modal = document.getElementById('parseModal');
        const resultsList = document.getElementById('parseResultsList');
        
        if (!modal || !resultsList) return;
        
        resultsList.innerHTML = '';
        
        if (entities.length === 0) {
            resultsList.innerHTML = '<p>Nessuna entitÃ  rilevata nel testo.</p>';
        } else {
            entities.forEach(entity => {
                const div = document.createElement('div');
                div.className = 'parse-entity';
                div.innerHTML = `
                    <div class="parse-entity-info">
                        <div class="parse-entity-name">${entity}</div>
                        <div class="parse-entity-type">Rilevato come: 
                            <select class="form-control entity-type-select" data-entity="${entity}" style="width: auto; display: inline-block; margin-left: 0.5rem;">
                                <option value="characters">Personaggio</option>
                                <option value="locations">Luogo</option>
                                <option value="organizations">Organizzazione</option>
                            </select>
                        </div>
                    </div>
                    <div class="parse-entity-actions">
                        <input type="checkbox" class="entity-checkbox" data-entity="${entity}" checked>
                        <label style="margin-left: 0.5rem;">Crea</label>
                    </div>
                `;
                resultsList.appendChild(div);
            });
        }
        
        this.parseData = { title, content, entities };
        modal.classList.remove('hidden');
    }
    
    closeParseModal() {
        const modal = document.getElementById('parseModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.parseData = null;
    }
    
    async confirmParsedEntities() {
        if (!this.parseData) return;
        
        this.showLoading();
        
        try {
            const { title, content } = this.parseData;
            const checkedEntities = document.querySelectorAll('.entity-checkbox:checked');
            
            // Create timeline entry
            const timelineRef = push(ref(database, 'timeline'));
            const timelineData = {
                id: timelineRef.key,
                title: title || 'Sessione senza titolo',
                content: content,
                day: Object.keys(this.data.timeline).length + 1,
                active: true,
                characters: [],
                locations: [],
                order: Object.keys(this.data.timeline).length,
                createdBy: this.currentUser,
                createdAt: Date.now()
            };
            
            // Create selected entities
            for (const checkbox of checkedEntities) {
                const entityName = checkbox.dataset.entity;
                const entityTypeSelect = document.querySelector(`[data-entity="${entityName}"]`);
                const entityType = entityTypeSelect ? entityTypeSelect.value : 'characters';
                
                const entityRef = push(ref(database, entityType));
                const entityData = {
                    id: entityRef.key,
                    name: entityName,
                    description: `Creato automaticamente dalla sessione: ${title || 'Sessione senza titolo'}`,
                    createdBy: this.currentUser,
                    createdAt: Date.now()
                };
                
                // Add specific fields based on type
                if (entityType === 'characters') {
                    entityData.race = '';
                    entityData.class = '';
                    timelineData.characters.push(entityName);
                } else if (entityType === 'locations') {
                    entityData.type = '';
                    timelineData.locations.push(entityName);
                } else if (entityType === 'organizations') {
                    entityData.type = '';
                } else if (entityType === 'quests') {
                    entityData.status = 'active';
                }
                
                await set(entityRef, entityData);
            }
            
            await set(timelineRef, timelineData);
            
            // Clear session form
            const titleInput = document.getElementById('sessionTitle');
            const contentInput = document.getElementById('sessionContent');
            if (titleInput) titleInput.value = '';
            if (contentInput) contentInput.value = '';
            
            this.closeParseModal();
            this.switchTab('timeline');
            
            console.log('Parsed entities created successfully');
            
        } catch (error) {
            console.error('Error creating parsed entities:', error);
            alert('Errore durante la creazione delle entitÃ : ' + error.message);
        }
        
        this.hideLoading();
    }
    
    async saveData() {
        this.showLoading();
        try {
            // Data is automatically saved via Firebase listeners
            // This just provides user feedback
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Dati salvati con successo!');
            console.log('Data save confirmed');
        } catch (error) {
            alert('Errore durante il salvataggio: ' + error.message);
        }
        this.hideLoading();
    }
    
    exportData() {
        console.log('Exporting data...');
        
        const exportData = {
            timeline: this.data.timeline,
            characters: this.data.characters,
            locations: this.data.locations,
            quests: this.data.quests,
            organizations: this.data.organizations,
            map: this.data.map,
            exportedBy: this.currentUser,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `campaign_backup_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        console.log('Data exported successfully');
    }
    
    importData() {
        const input = document.getElementById('restoreFileInput');
        if (input) {
            input.click();
        }
    }
    
    async handleRestoreFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('Restoring data from file...');
        this.showLoading();
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate data structure
            const requiredSections = ['timeline', 'characters', 'locations', 'quests', 'organizations'];
            const hasValidStructure = requiredSections.every(section => 
                importData.hasOwnProperty(section)
            );
            
            if (!hasValidStructure) {
                throw new Error('File di backup non valido');
            }
            
            // Import data to Firebase
            const updates = {};container.appendChild(dayElement)
            requiredSections.forEach(section => {
                if (importData[section]) {
                    updates[section] = importData[section];
                }
            });
            
            if (importData.map) {
                updates.map = importData.map;
            }
            
            await update(ref(database), updates);
            alert('Dati ripristinati con successo!');
            console.log('Data restored successfully');
            
        } catch (error) {
            console.error('Error importing data:', error);
            alert('Errore durante il ripristino: ' + error.message);
        }
        
        this.hideLoading();
        event.target.value = '';
    }

    enrichTimelineData() {
  const enrichedTimeline = {};

  Object.entries(this.data.timeline).forEach(([dayKey, day]) => {
    const enrichedChars = (day.characters || []).map(charName => {
      const foundCharEntry = Object.entries(this.data.characters || {}).find(([key, c]) => c.name === charName);
      const foundCharKey = foundCharEntry ? foundCharEntry[0] : charName;
      const foundChar = foundCharEntry ? foundCharEntry[1] : { id: charName, name: charName };
      return { id: foundCharKey, name: foundChar.name };
    });

    const enrichedLocs = (day.locations || []).map(locName => {
      const foundLocEntry = Object.entries(this.data.locations || {}).find(([key, l]) => l.name === locName);
      const foundLocKey = foundLocEntry ? foundLocEntry[0] : locName;
      const foundLoc = foundLocEntry ? foundLocEntry[1] : { id: locName, name: locName };
      return { id: foundLocKey, name: foundLoc.name };
    });

    const enrichedOrgs = (day.organizations || []).map(orgName => {
      const foundOrgEntry = Object.entries(this.data.organizations || {}).find(([key, o]) => o.name === orgName);
      const foundOrgKey = foundOrgEntry ? foundOrgEntry[0] : orgName;
      const foundOrg = foundOrgEntry ? foundOrgEntry[1] : { id: orgName, name: orgName };
      return { id: foundOrgKey, name: foundOrg.name };
    });

    enrichedTimeline[dayKey] = {
      ...day,
      characters: enrichedChars,
      locations: enrichedLocs,
      organizations: enrichedOrgs,
    };
  });

  this.data.timeline = enrichedTimeline;
}
    
    renderTimeline() {
        console.log('Rendering timeline...');
        const container = document.getElementById('timelineContainer');
        if (!container) return;

        container.innerHTML = '';

        if (!this.data.timeline || Object.keys(this.data.timeline).length === 0) {
            container.innerHTML = '<div class="empty-state">Nessuna sessione ancora creata. Usa il tasto "Aggiungi Sessione" per iniziare.</div>';
            return;
        }

        // Ordina le sessioni per ordine
        const sortedSessions = Object.values(this.data.timeline)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        sortedSessions.forEach(session => {
            const sessionElement = document.createElement('div');
            sessionElement.className = 'timeline-session';
            sessionElement.dataset.sessionId = session.id;
            if (session.active) sessionElement.classList.add('active');

            // Crea il riassunto (prime 150 caratteri del contenuto)
            const summary = session.content ? 
                (session.content.length > 150 ? session.content.substring(0, 150) + '...' : session.content) 
                : 'Nessun contenuto disponibile';

            // Combina tutti i tag delle entità
            const allTags = [];
            if (session.characters && session.characters.length > 0) {
                session.characters.forEach(char => {
                    if (typeof char === 'object' && char.name) {
                        allTags.push({name: char.name, type: 'characters'});
                    }
                });
            }
            if (session.locations && session.locations.length > 0) {
                session.locations.forEach(loc => {
                    if (typeof loc === 'object' && loc.name) {
                        allTags.push({name: loc.name, type: 'locations'});
                    }
                });
            }
            if (session.organizations && session.organizations.length > 0) {
                session.organizations.forEach(org => {
                    if (typeof org === 'object' && org.name) {
                        allTags.push({name: org.name, type: 'organizations'});
                    }
                });
            }

            // Limita i tag mostrati a 6
            const visibleTags = allTags.slice(0, 6);
            const tagsHtml = visibleTags.map(tag => 
                `<span class="session-tag ${tag.type}" data-type="${tag.type}" data-name="${tag.name}">${tag.name}</span>`
            ).join('');

            sessionElement.innerHTML = `
                <div class="session-number">Sessione ${session.day || session.session || 1}</div>
                <div class="session-title">${session.title || 'Sessione senza titolo'}</div>
                <div class="session-summary">${summary}</div>
                <div class="session-tags">${tagsHtml}${allTags.length > 6 ? '<span class="session-tag">+' + (allTags.length - 6) + '</span>' : ''}</div>
            `;

            // Event listener per aprire il modal
            sessionElement.addEventListener('click', () => {
                this.openSessionDetailModal(session.id);
            });

            container.appendChild(sessionElement);
        });

        // Reinizializza sortable per la nuova griglia
        if (this.currentTab === 'timeline') {
            setTimeout(() => this.initializeTimelineSortable(), 100);
        }
    }

  attachTagClickListeners() {
  const tags = document.querySelectorAll('.clickable-tag');
  tags.forEach(tag => {
    tag.addEventListener('click', e => {
      const target = e.currentTarget;
      const type = target.dataset.type;
      const id = target.dataset.id;
      const name = target.textContent.trim();

      if (type && id) {
        this.showEntityDetails(type, id);
      }

      // Switch tab e scroll sulla card corrispondente
      if (type && name) {
        this.switchTab(type);
        setTimeout(() => {
          const cards = document.querySelectorAll(`#${type}Container .card-title`);
          cards.forEach(card => {
            if (card.textContent.trim() === name) {
              card.scrollIntoView({behavior: 'smooth', block: 'center'});
              card.parentElement.classList.add('highlight');
              setTimeout(() => card.parentElement.classList.remove('highlight'), 1500);
            }
          });
        }, 250);
      }
    });
  });
}
    
	loadDaySummary(dayId) {
    const summaryRef = ref(database, `summaries/${dayId}`);
    onValue(summaryRef, (snapshot) => {
      const summary = snapshot.val() || "";
      const textarea = document.getElementById(`summary-${dayId}`);
      if (textarea) textarea.value = summary;
    });
  }

  saveDaySummary(dayId, text) {
    const summaryRef = ref(database, `summaries/${dayId}`);
    set(summaryRef, text).catch(console.error);
  }

  attachSummaryListeners(dayId) {
    const textarea = document.getElementById(`summary-${dayId}`);
    if (!textarea) return;

    textarea.addEventListener("blur", () => {
      this.saveDaySummary(dayId, textarea.value);
    });
  }

showEntityDetails(type, id) {
  console.log('DEBUG showEntityDetails called with:', type, id);

  const entity = this.data[type][id];
  console.log('DEBUG entity:', entity);
  if (!entity) return;

  const modal = document.getElementById('entityViewModal');
  console.log('DEBUG modal:', modal);
  if (!modal) return;

  try {
    const nameNode = modal.querySelector('.entity-name');
    const descNode = modal.querySelector('.entity-description');
    const metaNode = modal.querySelector('.entity-meta');
    const avatarNode = modal.querySelector('.entity-avatar');
    console.log('DEBUG nodes:', {nameNode, descNode, metaNode, avatarNode});

    if (nameNode) nameNode.textContent = entity.name || entity.title || '';
    if (descNode) descNode.textContent = entity.description || entity.content || '';

    let meta = '';
    if (type === 'characters') {
      meta = `${entity.race || ''} ${entity.class || ''}`.trim();
      if (avatarNode) {
        if (entity.avatar) {
          avatarNode.src = entity.avatar;
          avatarNode.style.display = '';
        } else {
          avatarNode.style.display = 'none';
        }
      }
    } else if (type === 'locations' || type === 'organizations') {
      meta = entity.type || '';
      if (avatarNode) avatarNode.style.display = 'none';
    }
    if (metaNode) metaNode.textContent = meta;
    console.log('DEBUG before remove hidden:', modal.className);

    modal.classList.remove('hidden');
    console.log('DEBUG after remove hidden:', modal.className);

  } catch (e) {
    console.error('DEBUG ERROR in showEntityDetails:', e);
  }
}

closeEntityViewModal() {
  const modal = document.getElementById('entityViewModal');
  if (modal) modal.classList.add('hidden');
}

    renderCharacters() {
        const container = document.getElementById('charactersContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.values(this.data.characters).forEach(character => {
            const card = document.createElement('div');
            card.className = 'card';
            
            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <div class="card-title">${character.name}</div>
                        <div class="card-subtitle">${character.race} ${character.class}</div>
                    </div>
                    ${character.avatar ? `<img src="${character.avatar}" class="card-avatar" alt="${character.name}">` : ''}
                </div>
                <div class="card-description">${character.description}</div>
                <div class="card-actions master-only">
                    <button class="btn btn--small btn--secondary" onclick="campaignManager.openEntityModal('characters', '${character.id}')">Modifica</button>
                    <button class="btn btn--small btn--danger" onclick="campaignManager.deleteEntity('characters', '${character.id}')">Elimina</button>
                </div>
            `;
            
            container.appendChild(card);
        });
    }
    
    renderLocations() {
        const container = document.getElementById('locationsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.values(this.data.locations).forEach(location => {
            const card = document.createElement('div');
            card.className = 'card';
            
            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <div class="card-title">${location.name}</div>
                        <div class="card-subtitle">${location.type || 'Luogo'}</div>
                    </div>
                </div>
                <div class="card-description">${location.description}</div>
                <div class="card-actions master-only">
                    <button class="btn btn--small btn--secondary" onclick="campaignManager.openEntityModal('locations', '${location.id}')">Modifica</button>
                    <button class="btn btn--small btn--danger" onclick="campaignManager.deleteEntity('locations', '${location.id}')">Elimina</button>
                </div>
            `;
            
            container.appendChild(card);
        });
    }
    
    renderQuests() {
        const container = document.getElementById('questsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.values(this.data.quests).forEach(quest => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const statusClass = {
                active: 'status--success',
                completed: 'status--info',
                failed: 'status--error',
                paused: 'status--warning'
            }[quest.status] || 'status--info';
            
            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <div class="card-title">${quest.name}</div>
                        <div class="status ${statusClass}">${this.getQuestStatusText(quest.status)}</div>
                    </div>
                </div>
                <div class="card-description">${quest.description}</div>
                <div class="card-actions master-only">
                    <button class="btn btn--small btn--secondary" onclick="campaignManager.openEntityModal('quests', '${quest.id}')">Modifica</button>
                    <button class="btn btn--small btn--danger" onclick="campaignManager.deleteEntity('quests', '${quest.id}')">Elimina</button>
                </div>
            `;
            
            container.appendChild(card);
        });
    }
    
    renderOrganizations() {
        const container = document.getElementById('organizationsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.values(this.data.organizations).forEach(org => {
            const card = document.createElement('div');
            card.className = 'card';
            
            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <div class="card-title">${org.name}</div>
                        <div class="card-subtitle">${org.type || 'Organizzazione'}</div>
                    </div>
                </div>
                <div class="card-description">${org.description}</div>
                <div class="card-actions master-only">
                    <button class="btn btn--small btn--secondary" onclick="campaignManager.openEntityModal('organizations', '${org.id}')">Modifica</button>
                    <button class="btn btn--small btn--danger" onclick="campaignManager.deleteEntity('organizations', '${org.id}')">Elimina</button>
                </div>
            `;
            
            container.appendChild(card);
        });
    }
    
    renderMap() {
        const container = document.getElementById('mapContainer');
        if (!container) return;
        
        if (this.data.map?.url) {
            container.innerHTML = `<img src="${this.data.map.url}" class="map-image" alt="Campaign Map">`;
        } else {
            container.innerHTML = '<div class="map-placeholder">Nessuna mappa caricata</div>';
        }
    }
    
    getQuestStatusText(status) {
        const statusTexts = {
            active: 'Attiva',
            completed: 'Completata',
            failed: 'Fallita',
            paused: 'In Pausa'
        };
        return statusTexts[status] || 'Sconosciuto';
    }
    
    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.remove('hidden');
        }
    }
    
    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.add('hidden');
        }
    }
}

// Outside the class scope: Authentication state change listener
onAuthStateChanged(auth, user => {
    if (user) {
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        const nicknameInput = document.getElementById('nicknameInput');
        const confirmNickname = document.getElementById('confirmNickname');
        if (googleLoginBtn) googleLoginBtn.style.display = 'none';
        if (nicknameInput) nicknameInput.style.display = '';
        if (confirmNickname) confirmNickname.style.display = '';
        nicknameInput?.focus();
        console.log("UID Firebase:", user.uid);
    }
});
// Initialize the application
const campaignManager = new CampaignManager();

// Make it globally available for onclick handlers
window.campaignManager = campaignManager;














