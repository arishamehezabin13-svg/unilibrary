/**
 * storage.js - Centralized Cloud Database (Firebase) & LocalStorage Engine for UniLibrary
 * Automatically synchronizes Books, Students, Issued Loans, Stats, Profile, and Activity Logs
 * across all pages and multiple PCs/Laptops using Firebase Realtime Database REST API.
 */

const FIREBASE_DATABASE_URL = "https://unilibrary-dae70-default-rtdb.firebaseio.com";

const STORAGE_KEYS = {
    BOOKS: 'unilibrary_books',
    STUDENTS: 'unilibrary_students',
    ISSUED: 'unilibrary_issued',
    STATS: 'unilibrary_stats',
    PROFILE: 'unilibrary_profile',
    ACTIVITIES: 'unilibrary_activities',
    FIREBASE_URL: 'unilibrary_firebase_url',
    UPDATED_AT: 'unilibrary_updated_at'
};

const DEFAULT_DATA = {
    BOOKS: [
        { id: 'LIB-1001', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science', quantity: 12 },
        { id: 'LIB-1002', title: 'The Art of Computer Programming', author: 'Donald Knuth', category: 'Computer Science', quantity: 5 },
        { id: 'LIB-1003', title: 'Calculus: Early Transcendentals', author: 'James Stewart', category: 'Mathematics', quantity: 20 },
        { id: 'LIB-1004', title: 'University Physics', author: 'Hugh D. Young', category: 'Physics', quantity: 15 },
        { id: 'LIB-1005', title: 'Clean Code', author: 'Robert C. Martin', category: 'Computer Science', quantity: 8 },
        { id: 'LIB-1006', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Literature', quantity: 25 }
    ],
    STUDENTS: [
        { id: 'STU-2024-001', name: 'Alexander Pierce', department: 'Computer Science', semester: 6, phone: '+1-555-0101' },
        { id: 'STU-2024-042', name: 'Sarah Jenkins', department: 'Business Admin', semester: 4, phone: '+1-555-0212' },
        { id: 'STU-2023-118', name: 'David Chen', department: 'Engineering', semester: 8, phone: '+1-555-0345' },
        { id: 'STU-2024-055', name: 'Emily Watson', department: 'Arts & Design', semester: 2, phone: '+1-555-0567' }
    ],
    ISSUED: [
        { id: 'TX-8821', studentId: 'STU-2024-001', studentName: 'Alexander Pierce', bookId: 'LIB-1006', bookTitle: 'The Great Gatsby', issueDate: '2023-10-12', dueDate: '2023-10-26', status: 'Overdue' },
        { id: 'TX-8845', studentId: 'STU-2024-042', studentName: 'Sarah Jenkins', bookId: 'LIB-1001', bookTitle: 'Introduction to Algorithms', issueDate: '2023-11-01', dueDate: '2023-11-15', status: 'Issued' },
        { id: 'TX-8902', studentId: 'STU-2023-118', studentName: 'David Chen', bookId: 'LIB-1005', bookTitle: 'Clean Code', issueDate: '2023-11-05', dueDate: '2023-11-19', status: 'Issued' }
    ],
    STATS: { returnedToday: 28 },
    PROFILE: { name: 'University Librarian', role: 'Administrator' },
    ACTIVITIES: [
        { id: 1, type: 'borrow', user: 'Alex Johnson', book: 'The Great Gatsby', time: '10 mins ago', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop' },
        { id: 2, type: 'return', user: 'Maria Garcia', book: 'Quantum Physics Intro', time: '25 mins ago', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
        { id: 3, type: 'borrow', user: 'James Smith', book: 'A Tale of Two Cities', time: '42 mins ago', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop' },
        { id: 4, type: 'warning', user: 'System', book: 'Late Return Policy Update', time: '1 hour ago', icon: 'info' },
        { id: 5, type: 'borrow', user: 'Sarah Wilson', book: 'Organic Chemistry II', time: '2 hours ago', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' }
    ]
};

const SYNCED_KEYS = [
    STORAGE_KEYS.BOOKS,
    STORAGE_KEYS.STUDENTS,
    STORAGE_KEYS.ISSUED,
    STORAGE_KEYS.STATS,
    STORAGE_KEYS.PROFILE,
    STORAGE_KEYS.ACTIVITIES
];

// Keep native localStorage methods
const rawGetItem = Storage.prototype.getItem.bind(window.localStorage);
const rawSetItem = Storage.prototype.setItem.bind(window.localStorage);
const rawRemoveItem = Storage.prototype.removeItem.bind(window.localStorage);

const UniLibraryDB = {
    enableInterceptor: false,
    isApplyingCloudData: false,
    pushTimer: null,
    pollTimer: null,
    status: 'local', // 'local', 'syncing', 'connected', 'error'
    lastSyncTime: null,
    lastError: '',

    normalizeUrl(url) {
        if (!url || typeof url !== 'string') return '';
        let cleaned = url.trim();
        if (!cleaned) return '';
        if (!/^https?:\/\//i.test(cleaned)) {
            cleaned = 'https://' + cleaned;
        }
        cleaned = cleaned.replace(/\/unilibrary\.json\/?$/i, '');
        cleaned = cleaned.replace(/\.json\/?$/i, '');
        cleaned = cleaned.replace(/\/+$/, '');
        return cleaned;
    },

    getDatabaseUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            const qp = params.get('db');
            if (qp) {
                const norm = this.normalizeUrl(qp);
                if (norm) {
                    rawSetItem(STORAGE_KEYS.FIREBASE_URL, norm);
                    return norm;
                }
            }
        } catch (_e) {}

        // 1. Check if a custom URL was pasted via the popup/settings on this PC
        const customUrl = this.normalizeUrl(rawGetItem(STORAGE_KEYS.FIREBASE_URL) || '');
        if (customUrl) {
            return customUrl;
        }

        // 2. Otherwise use the hardcoded default Firebase URL automatically
        if (FIREBASE_DATABASE_URL && FIREBASE_DATABASE_URL.trim() !== '') {
            return this.normalizeUrl(FIREBASE_DATABASE_URL);
        }

        return '';
    },

    setDatabaseUrl(url) {
        const norm = this.normalizeUrl(url);
        if (norm) {
            rawSetItem(STORAGE_KEYS.FIREBASE_URL, norm);
        } else {
            rawRemoveItem(STORAGE_KEYS.FIREBASE_URL);
        }
        return norm;
    },

    seedLocalDefaultsSilently() {
        if (rawGetItem(STORAGE_KEYS.BOOKS) === null) {
            rawSetItem(STORAGE_KEYS.BOOKS, JSON.stringify(DEFAULT_DATA.BOOKS));
        }
        if (rawGetItem(STORAGE_KEYS.STUDENTS) === null) {
            rawSetItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEFAULT_DATA.STUDENTS));
        }
        if (rawGetItem(STORAGE_KEYS.ISSUED) === null) {
            rawSetItem(STORAGE_KEYS.ISSUED, JSON.stringify(DEFAULT_DATA.ISSUED));
        }
        if (rawGetItem(STORAGE_KEYS.STATS) === null) {
            rawSetItem(STORAGE_KEYS.STATS, JSON.stringify(DEFAULT_DATA.STATS));
        }
        if (rawGetItem(STORAGE_KEYS.PROFILE) === null) {
            rawSetItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_DATA.PROFILE));
        }
        if (rawGetItem(STORAGE_KEYS.ACTIVITIES) === null) {
            rawSetItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(DEFAULT_DATA.ACTIVITIES));
        }
    },

    getLocalPayload() {
        return {
            initialized: true,
            updatedAt: rawGetItem(STORAGE_KEYS.UPDATED_AT) || new Date().toISOString(),
            books: JSON.parse(rawGetItem(STORAGE_KEYS.BOOKS) || '[]'),
            students: JSON.parse(rawGetItem(STORAGE_KEYS.STUDENTS) || '[]'),
            issued: JSON.parse(rawGetItem(STORAGE_KEYS.ISSUED) || '[]'),
            stats: JSON.parse(rawGetItem(STORAGE_KEYS.STATS) || '{"returnedToday":28}'),
            profile: JSON.parse(rawGetItem(STORAGE_KEYS.PROFILE) || '{"name":"University Librarian","role":"Administrator"}'),
            activities: JSON.parse(rawGetItem(STORAGE_KEYS.ACTIVITIES) || '[]')
        };
    },

    applyCloudPayloadToLocal(cloudData) {
        if (!cloudData || typeof cloudData !== 'object') return false;
        this.isApplyingCloudData = true;
        try {
            const books = Array.isArray(cloudData.books)
                ? cloudData.books.map(b => ({ ...b, title: b.title || b.name || 'Untitled' }))
                : [];
            const students = Array.isArray(cloudData.students) ? cloudData.students : [];
            const issued = Array.isArray(cloudData.issued)
                ? cloudData.issued.map(tx => ({ ...tx, id: tx.id || tx.transactionId }))
                : [];
            const stats = cloudData.stats && typeof cloudData.stats === 'object'
                ? cloudData.stats
                : { returnedToday: 28 };
            const profile = cloudData.profile && typeof cloudData.profile === 'object'
                ? cloudData.profile
                : DEFAULT_DATA.PROFILE;
            const activities = Array.isArray(cloudData.activities)
                ? cloudData.activities
                : DEFAULT_DATA.ACTIVITIES;

            rawSetItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
            rawSetItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
            rawSetItem(STORAGE_KEYS.ISSUED, JSON.stringify(issued));
            rawSetItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
            rawSetItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
            rawSetItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
            if (cloudData.updatedAt) {
                rawSetItem(STORAGE_KEYS.UPDATED_AT, cloudData.updatedAt);
            }
        } finally {
            this.isApplyingCloudData = false;
        }
        return true;
    },

    recordActivityFromDiff(key, oldValStr, newValStr) {
        try {
            const activities = JSON.parse(rawGetItem(STORAGE_KEYS.ACTIVITIES) || '[]');
            if (key === STORAGE_KEYS.ISSUED) {
                const oldList = JSON.parse(oldValStr || '[]');
                const newList = JSON.parse(newValStr || '[]');
                if (newList.length === oldList.length + 1 && newList[0]) {
                    const tx = newList[0];
                    activities.unshift({
                        id: Date.now(),
                        type: 'borrow',
                        user: tx.studentName || 'Student',
                        book: tx.bookTitle || 'Book',
                        time: 'Just now',
                        icon: 'outbound'
                    });
                    rawSetItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities.slice(0, 15)));
                } else if (newList.length === oldList.length - 1) {
                    const returnedTx = oldList.find(o => !newList.some(n => n.id === o.id)) || oldList[0];
                    if (returnedTx) {
                        activities.unshift({
                            id: Date.now(),
                            type: 'return',
                            user: returnedTx.studentName || 'Student',
                            book: returnedTx.bookTitle || 'Book',
                            time: 'Just now',
                            icon: 'assignment_returned'
                        });
                        rawSetItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities.slice(0, 15)));
                    }
                }
            } else if (key === STORAGE_KEYS.BOOKS) {
                const oldBooks = JSON.parse(oldValStr || '[]');
                const newBooks = JSON.parse(newValStr || '[]');
                if (newBooks.length === oldBooks.length + 1) {
                    const added = newBooks.find(n => !oldBooks.some(o => o.id === n.id)) || newBooks[0];
                    if (added) {
                        activities.unshift({
                            id: Date.now(),
                            type: 'borrow',
                            user: 'Librarian (Catalog)',
                            book: added.title || added.name || 'New Book',
                            time: 'Just now',
                            icon: 'menu_book'
                        });
                        rawSetItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities.slice(0, 15)));
                    }
                }
            }
        } catch (_e) {}
    },

    schedulePushToCloud() {
        const dbUrl = this.getDatabaseUrl();
        if (!dbUrl) {
            this.updateBadgeUI('local');
            return;
        }
        if (this.pushTimer) clearTimeout(this.pushTimer);
        this.updateBadgeUI('syncing');
        this.pushTimer = setTimeout(() => {
            this.pushToCloud();
        }, 60);
    },

    async pushToCloud() {
        const dbUrl = this.getDatabaseUrl();
        if (!dbUrl) {
            this.updateBadgeUI('local');
            return false;
        }
        this.updateBadgeUI('syncing');
        const nowIso = new Date().toISOString();
        rawSetItem(STORAGE_KEYS.UPDATED_AT, nowIso);
        const payload = this.getLocalPayload();

        try {
            const response = await fetch(`${dbUrl}/unilibrary.json`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Check Firebase Rules (set read/write to true)`);
            }
            this.lastSyncTime = new Date();
            this.lastError = '';
            this.updateBadgeUI('connected');
            return true;
        } catch (err) {
            console.error('[UniLibraryDB] Cloud push error:', err);
            this.lastError = err.message || 'Connection failed';
            this.updateBadgeUI('error');
            return false;
        }
    },

    async pullFromCloud(silent = false) {
        const dbUrl = this.getDatabaseUrl();
        if (!dbUrl) {
            this.updateBadgeUI('local');
            return false;
        }
        if (!silent) this.updateBadgeUI('syncing');

        try {
            const response = await fetch(`${dbUrl}/unilibrary.json`, {
                method: 'GET',
                cache: 'no-store'
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Make sure Realtime Database is in Test Mode`);
            }
            const cloudData = await response.json();

            if (cloudData === null || (!cloudData.initialized && !cloudData.books && !cloudData.students)) {
                await this.pushToCloud();
                this.refreshCurrentPageUI();
                return true;
            }

            const localUpdated = rawGetItem(STORAGE_KEYS.UPDATED_AT) || '';
            const cloudUpdated = cloudData.updatedAt || '';

            if (!silent || cloudUpdated !== localUpdated) {
                this.applyCloudPayloadToLocal(cloudData);
                this.refreshCurrentPageUI();
            }

            this.lastSyncTime = new Date();
            this.lastError = '';
            this.updateBadgeUI('connected');
            return true;
        } catch (err) {
            console.error('[UniLibraryDB] Cloud pull error:', err);
            this.lastError = err.message || 'Could not reach Firebase URL';
            this.updateBadgeUI('error');
            return false;
        }
    },

    refreshCurrentPageUI() {
        try {
            const savedProfile = JSON.parse(rawGetItem(STORAGE_KEYS.PROFILE) || 'null') || DEFAULT_DATA.PROFILE;
            ['sidebar-profile-name', 'header-profile-name'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = savedProfile.name;
            });
            ['sidebar-profile-role', 'header-profile-role'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = savedProfile.role;
            });

            if (typeof window.updateDashboard === 'function') {
                window.updateDashboard();
            }

            if (typeof window.renderBooks === 'function') {
                window.renderBooks(false);
            }

            if (typeof window.renderTable === 'function') {
                const searchInput = document.getElementById('directorySearch');
                window.renderTable(searchInput ? searchInput.value : '');
            }

            if (typeof window.populateDropdowns === 'function' && typeof window.updateStats === 'function') {
                const studentSelect = document.getElementById('studentSelect');
                const bookSelect = document.getElementById('bookSelect');
                const prevStudent = studentSelect ? studentSelect.value : '';
                const prevBook = bookSelect ? bookSelect.value : '';
                window.populateDropdowns();
                if (studentSelect && prevStudent) studentSelect.value = prevStudent;
                if (bookSelect && prevBook) bookSelect.value = prevBook;
                window.updateStats();
                if (typeof window.renderRecentIssues === 'function') window.renderRecentIssues();
            }

            if (typeof window.TransactionManager !== 'undefined' && window.TransactionManager) {
                window.TransactionManager.loadData();
                window.TransactionManager.render();
            }

            if (typeof window.renderSettingsOverview === 'function') {
                window.renderSettingsOverview();
            }
        } catch (err) {
            console.warn('[UniLibraryDB] UI refresh warning:', err);
        }
    },

    updateBadgeUI(state) {
        this.status = state;
        const badge = document.getElementById('unilibrary-cloud-badge');
        const modalStatus = document.getElementById('cloud-modal-status-banner');
        const settingsStatus = document.getElementById('settings-cloud-status-badge');

        const configs = {
            connected: {
                text: 'Cloud DB: Synced',
                icon: 'cloud_done',
                classes: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
                dot: 'bg-emerald-500 animate-pulse',
                detail: 'Connected & Synced'
            },
            syncing: {
                text: 'Cloud DB: Syncing...',
                icon: 'sync',
                classes: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100',
                dot: 'bg-blue-500 animate-ping',
                detail: 'Connecting & synchronizing...'
            },
            error: {
                text: 'Cloud DB: Error',
                icon: 'cloud_off',
                classes: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100',
                dot: 'bg-red-500',
                detail: `Error: ${this.lastError || 'Check your Firebase URL.'}`
            },
            local: {
                text: 'Connect Cloud DB',
                icon: 'cloud_upload',
                classes: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
                dot: 'bg-amber-500',
                detail: ''
            }
        };

        const cfg = configs[state] || configs.local;

        if (badge) {
            badge.className = `flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm ${cfg.classes}`;
            badge.innerHTML = `
                <span class="w-2 h-2 rounded-full ${cfg.dot}"></span>
                <span class="material-symbols-outlined text-[16px]">${cfg.icon}</span>
                <span class="hidden sm:inline">${cfg.text}</span>
            `;
        }

        if (modalStatus) {
            if (cfg.detail) {
                modalStatus.className = `mt-3 p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${cfg.classes}`;
                modalStatus.innerHTML = `
                    <span class="material-symbols-outlined text-[16px]">${cfg.icon}</span>
                    <span>${cfg.detail}</span>
                `;
            } else {
                modalStatus.className = 'hidden';
                modalStatus.innerHTML = '';
            }
        }

        if (settingsStatus) {
            settingsStatus.className = `px-3 py-1 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5 ${cfg.classes}`;
            settingsStatus.innerHTML = `
                <span class="w-2 h-2 rounded-full ${cfg.dot}"></span>
                <span>${cfg.text}</span>
            `;
        }
    },

    injectCloudUI() {
        // 1. Inject Top Bar Status Button
        const headerRight = document.querySelector('header .flex.items-center.gap-4, header .flex.items-center.gap-stack-md, nav .flex.items-center.gap-6');
        if (headerRight && !document.getElementById('unilibrary-cloud-badge')) {
            const btn = document.createElement('button');
            btn.id = 'unilibrary-cloud-badge';
            btn.type = 'button';
            btn.title = 'Connect Database';
            btn.onclick = () => this.openModal();
            headerRight.insertBefore(btn, headerRight.firstChild);
        }

        // 2. Inject Minimal Cloud Setup Modal (Title, Subtitle, Input, Connect Button)
        if (!document.getElementById('unilibrary-cloud-modal')) {
            const modal = document.createElement('div');
            modal.id = 'unilibrary-cloud-modal';
            modal.className = 'fixed inset-0 z-[100] hidden flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm';
            modal.innerHTML = `
                <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-bold text-slate-900">Connect Database</h3>
                            <p class="text-xs text-slate-500 mt-0.5">Paste your Firebase Realtime Database link below to connect.</p>
                        </div>
                        <button type="button" onclick="UniLibraryDB.closeModal()" class="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                            <span class="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                    <div class="space-y-3">
                        <input id="cloud-modal-url-input" type="url"
                            placeholder="https://your-project-default-rtdb.firebaseio.com"
                            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none" />
                        <button type="button" onclick="UniLibraryDB.saveUrlFromModal()"
                            class="w-full py-2.5 bg-[#004ac6] hover:bg-blue-800 text-white font-semibold rounded-xl text-sm shadow transition-all active:scale-95">
                            Connect
                        </button>
                    </div>
                    <div id="cloud-modal-status-banner" class="hidden"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        this.updateBadgeUI(this.getDatabaseUrl() ? this.status : 'local');
    },

    openModal() {
        const modal = document.getElementById('unilibrary-cloud-modal');
        const input = document.getElementById('cloud-modal-url-input');
        if (input) input.value = this.getDatabaseUrl();
        this.updateBadgeUI(this.getDatabaseUrl() ? this.status : 'local');
        if (modal) modal.classList.remove('hidden');
    },

    closeModal() {
        const modal = document.getElementById('unilibrary-cloud-modal');
        if (modal) modal.classList.add('hidden');
    },

    async saveUrlFromModal() {
        const input = document.getElementById('cloud-modal-url-input');
        if (!input) return;
        const cleaned = this.setDatabaseUrl(input.value);
        input.value = cleaned;
        const settingsInput = document.getElementById('settingsFirebaseUrl');
        if (settingsInput) settingsInput.value = cleaned;

        if (!cleaned) {
            this.updateBadgeUI('local');
            return;
        }
        const ok = await this.pullFromCloud(false);
        if (ok) {
            this.startPolling();
        }
    },

    startPolling() {
        if (this.pollTimer) clearInterval(this.pollTimer);
        if (!this.getDatabaseUrl()) return;
        this.pollTimer = setInterval(() => {
            if (!document.hidden && this.getDatabaseUrl() && !this.pushTimer) {
                this.pullFromCloud(true);
            }
        }, 4000);
    },

    init() {
        this.seedLocalDefaultsSilently();

        const self = this;
        Storage.prototype.setItem = function(key, value) {
            const oldVal = rawGetItem(key);
            rawSetItem(key, value);
            if (
                this === window.localStorage &&
                self.enableInterceptor &&
                !self.isApplyingCloudData &&
                SYNCED_KEYS.includes(key)
            ) {
                self.recordActivityFromDiff(key, oldVal, value);
                self.schedulePushToCloud();
            }
        };

        document.addEventListener('DOMContentLoaded', () => {
            this.injectCloudUI();
            setTimeout(() => {
                this.enableInterceptor = true;
                if (this.getDatabaseUrl()) {
                    this.pullFromCloud(false);
                    this.startPolling();
                }
            }, 120);
        });

        window.addEventListener('focus', () => {
            if (this.getDatabaseUrl()) {
                this.pullFromCloud(true);
            }
        });
    }
};

const StorageManager = {
    init() {
        UniLibraryDB.seedLocalDefaultsSilently();
    },
    get(key) {
        return JSON.parse(localStorage.getItem(key) || '[]');
    },
    set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },
    getData(key) {
        return this.get(key);
    },
    saveData(key, data) {
        this.set(key, data);
    }
};

window.UniLibraryDB = UniLibraryDB;
window.StorageManager = StorageManager;
UniLibraryDB.init();
