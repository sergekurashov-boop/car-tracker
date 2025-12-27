class CarTracker {
    constructor() {
        this.db = null;
        this.currentCarId = null;
        this.init();
    }

    async init() {
        await this.initDB();
        await this.loadCars();
        this.setupNavigation();
        this.setupEventListeners();
    }

    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('CarTrackerDB', 3);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('cars')) {
                    const store = db.createObjectStore('cars', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('model', 'model', { unique: false });
                    
                    // Добавляем начальные данные
                    const defaultCars = [
                        {
                            model: 'Jeep Grand Cherokee',
                            year: 2020,
                            vin: '1C4RJFAG0LC123456',
                            insurance: [
                                {
                                    id: 1,
                                    number: "ОСАГО123456",
                                    company: "ИНГОССТРАХ",
                                    type: "osago",
                                    startDate: "2024-01-15",
                                    endDate: "2025-01-14",
                                    isActive: true
                                }
                            ],
                            maintenance: []
                        },
                        {
                            model: 'Volvo XC90',
                            year: 2021,
                            vin: 'YV4A22PK0M1234567',
                            insurance: [],
                            maintenance: []
                        },
                        {
                            model: 'Hyundai Creta',
                            year: 2022,
                            vin: 'ZXYCreta2022001',
                            insurance: [],
                            maintenance: []
                        }
                    ];

                    defaultCars.forEach(car => store.add(car));
                }
            };
        });
    }

    setupNavigation() {
        window.addEventListener('hashchange', () => this.route());
        this.route();
    }

    setupEventListeners() {
        // Кнопка добавления авто
        document.getElementById('addCarBtn')?.addEventListener('click', () => this.showCarForm());
        
        // Форма авто
        document.getElementById('carForm')?.addEventListener('submit', (e) => this.saveCar(e));
        document.getElementById('cancelCarBtn')?.addEventListener('click', () => this.hideCarForm());
        
        // Форма ТО
        document.getElementById('maintenanceForm')?.addEventListener('submit', (e) => this.saveMaintenance(e));
        document.getElementById('cancelMaintenanceBtn')?.addEventListener('click', () => this.hideMaintenanceForm());
        
        // Форма страховки
        document.getElementById('insuranceForm')?.addEventListener('submit', (e) => this.saveInsurance(e));
        document.getElementById('cancelInsuranceBtn')?.addEventListener('click', () => this.hideInsuranceForm());
        
        // Модальные окна
        document.getElementById('carModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideCarForm();
        });
        
        document.getElementById('maintenanceModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideMaintenanceForm();
        });
        
        document.getElementById('insuranceModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.hideInsuranceForm();
        });
    }

    route() {
        const hash = window.location.hash.substring(1);
        
        if (hash.startsWith('car-')) {
            const carId = parseInt(hash.split('-')[1]);
            this.showCarDetail(carId);
        } else {
            this.showCarList();
        }
    }

    async showCarList() {
        const cars = await this.getAllCars();
        
        const carsHTML = cars.map(car => `
            <div class="car-card" onclick="app.showCarDetail(${car.id})">
                <h3>${car.model}</h3>
                <div class="car-info">
                    <div>Год: ${car.year}</div>
                    <div>VIN: ${car.vin}</div>
                    <div>Страховок: ${car.insurance?.length || 0}</div>
                    <div>Записей ТО: ${car.maintenance?.length || 0}</div>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); app.editCar(${car.id})">Редактировать</button>
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); app.deleteCar(${car.id})">Удалить</button>
                </div>
            </div>
        `).join('');

        document.getElementById('app').innerHTML = `
            <div class="header">
                <div class="container">
                    <h1>Мои автомобили</h1>
                </div>
            </div>
            <div class="container">
                <button class="btn" id="showAddCarBtn">Добавить автомобиль</button>
                <div class="car-grid">
                    ${carsHTML}
                </div>
            </div>
        `;

        document.getElementById('showAddCarBtn').addEventListener('click', () => this.showCarForm());
    }

    async showCarDetail(carId) {
        const car = await this.getCar(carId);
        if (!car) return;

        this.currentCarId = carId;

        const activeTab = window.location.hash.split('-')[2] || 'maintenance';
        
        const insuranceCards = car.insurance && car.insurance.length > 0 
            ? car.insurance.map(insurance => {
                const isActive = new Date(insurance.endDate) > new Date();
                const statusClass = isActive ? 'status-active' : 'status-expired';
                const statusText = isActive ? 'Активна' : 'Истекла';
                
                return `
                    <div class="insurance-card ${isActive ? 'active' : 'expired'}">
                        <div class="insurance-header">
                            <span class="insurance-type ${insurance.type}">${insurance.type === 'osago' ? 'ОСАГО' : 'КАСКО'}</span>
                            <span class="insurance-status ${statusClass}">${statusText}</span>
                        </div>
                        <div class="insurance-number">${insurance.number}</div>
                        <div class="insurance-company">${insurance.company}</div>
                        <div class="insurance-dates">
                            ${this.formatDate(insurance.startDate)} - ${this.formatDate(insurance.endDate)}
                        </div>
                        <div class="insurance-actions">
                            <button class="btn btn-secondary btn-sm" onclick="app.editInsurance(${carId}, ${insurance.id})">Редактировать</button>
                            <button class="btn btn-danger btn-sm" onclick="app.deleteInsurance(${carId}, ${insurance.id})">Удалить</button>
                        </div>
                    </div>
                `;
            }).join('')
            : `<div class="empty-state">
                   <div>📄</div>
                   <p>Нет добавленных страховок</p>
               </div>`;

        const maintenanceItems = car.maintenance && car.maintenance.length > 0 
            ? car.maintenance.map(maint => `
                <div class="maintenance-item">
                    <div class="maintenance-header">
                        <span class="maintenance-date">${this.formatDate(maint.date)}</span>
                        <span class="maintenance-mileage">${maint.mileage.toLocaleString()} км</span>
                    </div>
                    <div class="maintenance-oil">Масло: ${maint.oilBrand}</div>
                    ${maint.notes ? `<div class="maintenance-notes">${maint.notes}</div>` : ''}
                </div>
            `).join('')
            : `<div class="empty-state">
                   <div>🔧</div>
                   <p>Нет записей о техническом обслуживании</p>
               </div>`;

        document.getElementById('app').innerHTML = `
            <div class="header">
                <div class="container">
                    <h1>${car.model} ${car.year}</h1>
                </div>
            </div>
            <div class="container">
                <div class="detail-header">
                    <a href="#" class="btn btn-secondary">← Назад</a>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn" onclick="app.showMaintenanceForm()">Добавить ТО</button>
                        <button class="btn" onclick="app.showInsuranceForm()">Добавить страховку</button>
                    </div>
                </div>

                <div class="tabs">
                    <button class="tab ${activeTab === 'maintenance' ? 'active' : ''}" 
                            onclick="app.switchTab('maintenance')">Техническое обслуживание</button>
                    <button class="tab ${activeTab === 'insurance' ? 'active' : ''}" 
                            onclick="app.switchTab('insurance')">Страховки</button>
                </div>

                <div id="maintenanceTab" class="tab-content ${activeTab === 'maintenance' ? 'active' : ''}">
                    <div class="section">
                        <h3>История ТО</h3>
                        ${maintenanceItems}
                    </div>
                </div>

                <div id="insuranceTab" class="tab-content ${activeTab === 'insurance' ? 'active' : ''}">
                    <div class="section">
                        <h3>Страховые полисы</h3>
                        <div class="insurance-grid">
                            ${insuranceCards}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.querySelector('a[href="#"]').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '';
        });
    }

    switchTab(tabName) {
        window.location.hash = `car-${this.currentCarId}-${tabName}`;
    }

    // ===== CRUD для автомобилей =====
    async getAllCars() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cars'], 'readonly');
            const store = transaction.objectStore('cars');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getCar(carId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cars'], 'readonly');
            const store = transaction.objectStore('cars');
            const request = store.get(carId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveCar(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const carData = {
            model: formData.get('model'),
            year: parseInt(formData.get('year')),
            vin: formData.get('vin'),
            insurance: [],
            maintenance: []
        };

        const carId = document.getElementById('carId').value;

        if (carId) {
            // Редактирование
            const existingCar = await this.getCar(parseInt(carId));
            carData.insurance = existingCar.insurance;
            carData.maintenance = existingCar.maintenance;
            await this.updateCar(parseInt(carId), carData);
        } else {
            // Добавление
            await this.addCar(carData);
        }

        this.hideCarForm();
        await this.loadCars();
    }

    async addCar(carData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cars'], 'readwrite');
            const store = transaction.objectStore('cars');
            const request = store.add(carData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateCar(carId, carData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cars'], 'readwrite');
            const store = transaction.objectStore('cars');
            const request = store.put({ ...carData, id: carId });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteCar(carId) {
        if (!confirm('Вы уверены, что хотите удалить этот автомобиль?')) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cars'], 'readwrite');
            const store = transaction.objectStore('cars');
            const request = store.delete(carId);

            request.onsuccess = () => {
                this.showCarList();
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    // ===== CRUD для ТО =====
    async saveMaintenance(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const maintenanceData = {
            date: formData.get('date'),
            mileage: parseInt(formData.get('mileage')),
            oilBrand: formData.get('oilBrand'),
            notes: formData.get('notes')
        };

        const car = await this.getCar(this.currentCarId);
        if (!car.maintenance) car.maintenance = [];
        
        car.maintenance.push(maintenanceData);
        await this.updateCar(this.currentCarId, car);

        this.hideMaintenanceForm();
        this.showCarDetail(this.currentCarId);
    }

    // ===== CRUD для страховок =====
    async saveInsurance(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const insuranceData = {
            id: parseInt(formData.get('insuranceId')) || Date.now(),
            number: formData.get('number'),
            company: formData.get('company'),
            type: formData.get('type'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            isActive: new Date(formData.get('endDate')) > new Date()
        };

        const car = await this.getCar(this.currentCarId);
        if (!car.insurance) car.insurance = [];
        
        const insuranceId = document.getElementById('insuranceId').value;
        if (insuranceId) {
            // Редактирование
            const index = car.insurance.findIndex(ins => ins.id === parseInt(insuranceId));
            if (index !== -1) {
                car.insurance[index] = insuranceData;
            }
        } else {
            // Добавление
            car.insurance.push(insuranceData);
        }
        
        await this.updateCar(this.currentCarId, car);
        this.hideInsuranceForm();
        this.showCarDetail(this.currentCarId);
    }

    async editInsurance(carId, insuranceId) {
        const car = await this.getCar(carId);
        const insurance = car.insurance.find(ins => ins.id === insuranceId);
        
        if (insurance) {
            this.showInsuranceForm(insurance);
        }
    }

    async deleteInsurance(carId, insuranceId) {
        if (!confirm('Вы уверены, что хотите удалить эту страховку?')) return;

        const car = await this.getCar(carId);
        car.insurance = car.insurance.filter(ins => ins.id !== insuranceId);
        
        await this.updateCar(carId, car);
        this.showCarDetail(carId);
    }

    // ===== UI методы =====
    showCarForm(car = null) {
        const modal = document.getElementById('carModal');
        const form = document.getElementById('carForm');
        
        if (car) {
            document.getElementById('carId').value = car.id;
            document.getElementById('model').value = car.model;
            document.getElementById('year').value = car.year;
            document.getElementById('vin').value = car.vin;
            document.querySelector('#carModal h3').textContent = 'Редактировать автомобиль';
        } else {
            form.reset();
            document.getElementById('carId').value = '';
            document.querySelector('#carModal h3').textContent = 'Добавить автомобиль';
        }
        
        modal.classList.add('active');
    }

    hideCarForm() {
        document.getElementById('carModal').classList.remove('active');
    }

    showMaintenanceForm() {
        document.getElementById('maintenanceForm').reset();
        document.getElementById('maintenanceModal').classList.add('active');
    }

    hideMaintenanceForm() {
        document.getElementById('maintenanceModal').classList.remove('active');
    }

    showInsuranceForm(insurance = null) {
        const form = document.getElementById('insuranceForm');
        
        if (insurance) {
            document.getElementById('insuranceId').value = insurance.id;
            document.getElementById('number').value = insurance.number;
            document.getElementById('company').value = insurance.company;
            document.getElementById('type').value = insurance.type;
            document.getElementById('startDate').value = insurance.startDate;
            document.getElementById('endDate').value = insurance.endDate;
            document.querySelector('#insuranceModal h3').textContent = 'Редактировать страховку';
        } else {
            form.reset();
            document.getElementById('insuranceId').value = '';
            document.querySelector('#insuranceModal h3').textContent = 'Добавить страховку';
            
            // Установка дат по умолчанию
            const today = new Date().toISOString().split('T')[0];
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            const nextYearStr = nextYear.toISOString().split('T')[0];
            
            document.getElementById('startDate').value = today;
            document.getElementById('endDate').value = nextYearStr;
        }
        
        document.getElementById('insuranceModal').classList.add('active');
    }

    hideInsuranceForm() {
        document.getElementById('insuranceModal').classList.remove('active');
    }

    async editCar(carId) {
        const car = await this.getCar(carId);
        this.showCarForm(car);
    }

    async loadCars() {
        if (!window.location.hash || window.location.hash === '#') {
            this.showCarList();
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }
}

// Модальные окна и формы
document.addEventListener('DOMContentLoaded', function() {
    const modals = `
        <!-- Модальное окно добавления/редактирования автомобиля -->
        <div class="modal" id="carModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Добавить автомобиль</h3>
                    <button class="close">&times;</button>
                </div>
                <form id="carForm">
                    <input type="hidden" id="carId" name="carId">
                    <div class="form-group">
                        <label for="model">Модель автомобиля</label>
                        <input type="text" id="model" name="model" required>
                    </div>
                    <div class="form-group">
                        <label for="year">Год выпуска</label>
                        <input type="number" id="year" name="year" min="1990" max="2030" required>
                    </div>
                    <div class="form-group">
                        <label for="vin">VIN номер</label>
                        <input type="text" id="vin" name="vin" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelCarBtn">Отмена</button>
                        <button type="submit" class="btn">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Модальное окно добавления ТО -->
        <div class="modal" id="maintenanceModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Добавить запись ТО</h3>
                    <button class="close">&times;</button>
                </div>
                <form id="maintenanceForm">
                    <div class="form-group">
                        <label for="date">Дата обслуживания</label>
                        <input type="date" id="date" name="date" required>
                    </div>
                    <div class="form-group">
                        <label for="mileage">Пробег (км)</label>
                        <input type="number" id="mileage" name="mileage" required>
                    </div>
                    <div class="form-group">
                        <label for="oilBrand">Марка масла</label>
                        <input type="text" id="oilBrand" name="oilBrand" required>
                    </div>
                    <div class="form-group">
                        <label for="notes">Заметки</label>
                        <textarea id="notes" name="notes"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelMaintenanceBtn">Отмена</button>
                        <button type="submit" class="btn">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Модальное окно добавления/редактирования страховки -->
        <div class="modal" id="insuranceModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Добавить страховку</h3>
                    <button class="close">&times;</button>
                </div>
                <form id="insuranceForm">
                    <input type="hidden" id="insuranceId" name="insuranceId">
                    <div class="form-group">
                        <label for="number">Номер полиса</label>
                        <input type="text" id="number" name="number" required>
                    </div>
                    <div class="form-group">
                        <label for="company">Страховая компания</label>
                        <input type="text" id="company" name="company" required>
                    </div>
                    <div class="form-group">
                        <label for="type">Тип страховки</label>
                        <select id="type" name="type" required>
                            <option value="osago">ОСАГО</option>
                            <option value="kasko">КАСКО</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="startDate">Дата начала</label>
                        <input type="date" id="startDate" name="startDate" required>
                    </div>
                    <div class="form-group">
                        <label for="endDate">Дата окончания</label>
                        <input type="date" id="endDate" name="endDate" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" id="cancelInsuranceBtn">Отмена</button>
                        <button type="submit" class="btn">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modals);

    // Инициализация приложения
    window.app = new CarTracker();
});
// ==================== database.js ====================
class CarDatabase {
    async init() {
        console.log('📦 CarDatabase: Инициализация...');
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('CarTrackerDB', 3);
            
            request.onerror = (event) => {
                console.error('Ошибка IndexedDB:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ CarDatabase: База данных открыта');
                resolve(this);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем хранилища
                if (!db.objectStoreNames.contains('cars')) {
                    const carsStore = db.createObjectStore('cars', { keyPath: 'id' });
                    carsStore.createIndex('name', 'name', { unique: false });
                    carsStore.createIndex('plate', 'plate', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('services')) {
                    const servicesStore = db.createObjectStore('services', { keyPath: 'id' });
                    servicesStore.createIndex('carId', 'carId', { unique: false });
                    servicesStore.createIndex('date', 'date', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('insurances')) {
                    const insurancesStore = db.createObjectStore('insurances', { keyPath: 'id' });
                    insurancesStore.createIndex('carId', 'carId', { unique: false });
                    insurancesStore.createIndex('type', 'type', { unique: false });
                }
                
                console.log('🔄 CarDatabase: Схема базы данных обновлена');
            };
        });
    }

    async getAllCars() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cars'], 'readonly');
            const store = transaction.objectStore('cars');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveCar(car) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cars'], 'readwrite');
            const store = transaction.objectStore('cars');
            
            if (!car.id) {
                car.id = 'car_' + Date.now();
                car.createdAt = new Date().toISOString();
            }
            
            car.updatedAt = new Date().toISOString();
            
            const request = store.put(car);
            
            request.onsuccess = () => resolve(car);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteCar(carId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['cars'], 'readwrite');
            const store = transaction.objectStore('cars');
            const request = store.delete(carId);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
}

// ==================== storage.js ====================
class AppStorage {
    constructor() {
        this.prefix = 'cartracker_';
    }

    setItem(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Ошибка записи в localStorage:', error);
            return false;
        }
    }

    getItem(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(this.prefix + key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('Ошибка чтения из localStorage:', error);
            return defaultValue;
        }
    }

    removeItem(key) {
        localStorage.removeItem(this.prefix + key);
    }

    clear() {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
        keys.forEach(key => localStorage.removeItem(key));
    }
}

// ==================== initial-data.js ====================
const initialData = {
    templates: {
        'jeepLiberty': {
            name: 'Jeep Liberty KK 2.8 CRD',
            year: 2010,
            services: [
                { name: 'Замена масла ДВС', interval: 10000 },
                { name: 'Замена масла АКПП', interval: 60000 },
                { name: 'Замена топливного фильтра', interval: 30000 },
                { name: 'Замена воздушного фильтра', interval: 20000 }
            ]
        },
        'volvoXC90': {
            name: 'Volvo XC90 2.5T',
            year: 2007,
            services: [
                { name: 'Замена масла ДВС', interval: 15000 },
                { name: 'Замена масла АКПП', interval: 60000 },
                { name: 'Замена ремня ГРМ', interval: 120000 },
                { name: 'Замена свечей зажигания', interval: 60000 }
            ]
        },
        'hyundaiCreta': {
            name: 'Hyundai Creta 2.0',
            year: 2020,
            services: [
                { name: 'Замена масла ДВС', interval: 15000 },
                { name: 'Замена масла в коробке', interval: 60000 },
                { name: 'Замена салонного фильтра', interval: 15000 },
                { name: 'Замена воздушного фильтра', interval: 30000 }
            ]
        }
    }
};

// ==================== cars.js ====================
class CarManager {
    constructor() {
        this.cars = [];
    }

    async init() {
        try {
            console.log('🚗 CarManager: Загрузка автомобилей...');
            this.cars = await carDB.getAllCars();
            console.log(`✅ CarManager: Загружено ${this.cars.length} автомобилей`);
            return this.cars;
        } catch (error) {
            console.error('❌ CarManager: Ошибка загрузки автомобилей:', error);
            this.cars = [];
            return [];
        }
    }

    async addCar(carData) {
        try {
            const car = {
                ...carData,
                id: 'car_' + Date.now(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                currentMileage: carData.currentMileage || 0,
                services: [],
                insurances: []
            };

            // Если выбран шаблон, добавляем стандартные сервисы
            if (carData.template && carData.template !== 'custom' && initialData.templates[carData.template]) {
                const template = initialData.templates[carData.template];
                car.services = template.services.map(service => ({
                    ...service,
                    id: 'service_' + Date.now() + Math.random(),
                    lastDate: null,
                    lastMileage: 0,
                    nextDate: null,
                    nextMileage: 0
                }));
            }

            const savedCar = await carDB.saveCar(car);
            this.cars.push(savedCar);
            return savedCar;
        } catch (error) {
            console.error('❌ CarManager: Ошибка добавления автомобиля:', error);
            throw error;
        }
    }

    async updateCar(carId, updates) {
        try {
            const car = this.cars.find(c => c.id === carId);
            if (!car) throw new Error('Автомобиль не найден');

            const updatedCar = {
                ...car,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            const savedCar = await carDB.saveCar(updatedCar);
            const index = this.cars.findIndex(c => c.id === carId);
            if (index !== -1) {
                this.cars[index] = savedCar;
            }
            
            return savedCar;
        } catch (error) {
            console.error('❌ CarManager: Ошибка обновления автомобиля:', error);
            throw error;
        }
    }

    async deleteCar(carId) {
        try {
            await carDB.deleteCar(carId);
            this.cars = this.cars.filter(c => c.id !== carId);
            return true;
        } catch (error) {
            console.error('❌ CarManager: Ошибка удаления автомобиля:', error);
            throw error;
        }
    }

    getCar(carId) {
        return this.cars.find(c => c.id === carId);
    }

    getAllCars() {
        return [...this.cars];
    }
}

// ==================== backup.js ====================
class BackupManager {
    constructor() {
        this.storage = new AppStorage();
        this.backupKey = 'backups';
    }

    async exportToJSON() {
        try {
            const data = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                cars: await carDB.getAllCars()
            };

            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `car-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка экспорта:', error);
            return false;
        }
    }

    async importFromJSON(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('Файл не выбран'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (!data.cars || !Array.isArray(data.cars)) {
                        throw new Error('Некорректный формат файла');
                    }

                    // Очищаем текущие данные
                    await this.clearAllData();
                    
                    // Импортируем автомобили
                    for (const car of data.cars) {
                        await carDB.saveCar(car);
                    }
                    
                    // Обновляем список автомобилей
                    await carManager.init();
                    
                    // Обновляем UI
                    if (window.carUI && carUI.refreshCars) {
                        carUI.refreshCars();
                    }
                    
                    alert(`✅ Импорт успешен! Загружено ${data.cars.length} автомобилей`);
                    resolve(true);
                } catch (error) {
                    console.error('❌ Ошибка импорта:', error);
                    alert(`Ошибка импорта: ${error.message}`);
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    }

    async clearAllData() {
        try {
            const transaction = carDB.db.transaction(['cars', 'services', 'insurances'], 'readwrite');
            
            ['cars', 'services', 'insurances'].forEach(storeName => {
                const store = transaction.objectStore(storeName);
                store.clear();
            });
            
            return true;
        } catch (error) {
            console.error('Ошибка очистки данных:', error);
            return false;
        }
    }

    async quickBackup() {
        try {
            const data = {
                cars: await carDB.getAllCars(),
                timestamp: new Date().toISOString()
            };
            
            this.storage.setItem('quick_backup', data);
            console.log('💾 Быстрая копия создана');
            return true;
        } catch (error) {
            console.error('Ошибка создания быстрой копии:', error);
            return false;
        }
    }

    async restoreFromQuickBackup() {
        try {
            const backup = this.storage.getItem('quick_backup');
            if (!backup || !backup.cars) {
                throw new Error('Нет данных для восстановления');
            }

            if (!confirm(`Восстановить данные из резервной копии от ${new Date(backup.timestamp).toLocaleString()}?`)) {
                return false;
            }

            await this.clearAllData();
            
            for (const car of backup.cars) {
                await carDB.saveCar(car);
            }
            
            await carManager.init();
            
            if (window.carUI && carUI.refreshCars) {
                carUI.refreshCars();
            }
            
            alert(`✅ Восстановлено ${backup.cars.length} автомобилей`);
            return true;
        } catch (error) {
            console.error('Ошибка восстановления:', error);
            alert(`Ошибка восстановления: ${error.message}`);
            return false;
        }
    }

    getBackupInfo() {
        const backup = this.storage.getItem('quick_backup');
        if (backup && backup.timestamp) {
            const date = new Date(backup.timestamp);
            return `Последняя резервная копия: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        }
        return 'Резервных копий нет';
    }
}

// ==================== ui.js ====================
class CarUI {
    constructor() {
        this.carManager = window.carManager;
    }

    async init() {
        console.log('🎨 CarUI: Инициализация интерфейса...');
        
        // Инициализируем менеджер автомобилей, если он еще не инициализирован
        if (!this.carManager || !this.carManager.cars) {
            await carManager.init();
        }
        
        this.bindEvents();
        await this.refreshCars();
        
        console.log('✅ CarUI: Интерфейс готов');
    }

    bindEvents() {
        // Кнопка добавления автомобиля
        document.getElementById('addCarBtn')?.addEventListener('click', () => this.showCarModal());
        document.getElementById('addFirstCarBtn')?.addEventListener('click', () => this.showCarModal());
        
        // Модальное окно
        const modal = document.getElementById('carModal');
        const closeBtn = modal?.querySelector('.close');
        const cancelBtn = document.getElementById('cancelBtn');
        
        closeBtn?.addEventListener('click', () => this.hideCarModal());
        cancelBtn?.addEventListener('click', () => this.hideCarModal());
        
        // Форма
        document.getElementById('carForm')?.addEventListener('submit', (e) => this.handleCarFormSubmit(e));
        
        // Закрытие по клику вне окна
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideCarModal();
            }
        });
    }

    async refreshCars() {
        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('emptyState');
        const carList = document.getElementById('carList');
        
        if (!this.carManager || !this.carManager.cars) {
            await carManager.init();
        }
        
        const cars = this.carManager.getAllCars();
        
        if (loading) loading.style.display = 'none';
        
        if (cars.length === 0) {
            emptyState.style.display = 'block';
            carList.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            carList.style.display = 'grid';
            this.renderCars(cars);
        }
    }

    renderCars(cars) {
        const carList = document.getElementById('carList');
        if (!carList) return;
        
        carList.innerHTML = cars.map(car => this.createCarCard(car)).join('');
        
        // Добавляем обработчики для кнопок
        cars.forEach(car => {
            const editBtn = document.getElementById(`edit-car-${car.id}`);
            const deleteBtn = document.getElementById(`delete-car-${car.id}`);
            
            editBtn?.addEventListener('click', () => this.showCarModal(car));
            deleteBtn?.addEventListener('click', () => this.deleteCar(car.id));
        });
    }

    createCarCard(car) {
        const hasActiveInsurance = car.insurances?.some(i => new Date(i.endDate) > new Date());
        const insuranceCount = car.insurances?.length || 0;
        
        return `
            <div class="car-card">
                <div class="car-card-header">
                    <h3>${car.name}</h3>
                    <span class="car-year">${car.year || 'Год не указан'}</span>
                </div>
                
                <div class="car-card-body">
                    <p class="car-plate">${car.plate || 'Госномер не указан'}</p>
                    <p class="car-mileage">Пробег: ${car.currentMileage?.toLocaleString() || 0} км</p>
                    
                    <div class="insurance-preview">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="insurance-count">Страховок: ${insuranceCount}</span>
                            ${hasActiveInsurance ? 
                                '<span class="insurance-active-text">✓ Есть активная</span>' : 
                                '<span class="insurance-none-text">✗ Нет активной</span>'
                            }
                        </div>
                    </div>
                    
                    <div class="car-actions">
                        <button class="btn-small" id="edit-car-${car.id}">✏️ Редактировать</button>
                        <button class="btn-small btn-danger" id="delete-car-${car.id}">🗑️ Удалить</button>
                    </div>
                </div>
            </div>
        `;
    }

    showCarModal(car = null) {
        const modal = document.getElementById('carModal');
        const title = document.getElementById('carModalTitle');
        const form = document.getElementById('carForm');
        
        if (car) {
            title.textContent = 'Редактировать автомобиль';
            document.getElementById('carId').value = car.id;
            document.getElementById('carName').value = car.name || '';
            document.getElementById('carPlate').value = car.plate || '';
            document.getElementById('carYear').value = car.year || '';
            document.getElementById('currentMileage').value = car.currentMileage || '';
            document.getElementById('carTemplate').value = 'custom';
        } else {
            title.textContent = 'Добавить автомобиль';
            form.reset();
            document.getElementById('carId').value = '';
            document.getElementById('carTemplate').value = 'custom';
        }
        
        modal.style.display = 'block';
    }

    hideCarModal() {
        const modal = document.getElementById('carModal');
        modal.style.display = 'none';
        document.getElementById('carForm').reset();
    }

    async handleCarFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const carId = document.getElementById('carId').value;
        const carData = {
            name: document.getElementById('carName').value.trim(),
            plate: document.getElementById('carPlate').value.trim(),
            year: document.getElementById('carYear').value ? parseInt(document.getElementById('carYear').value) : null,
            currentMileage: document.getElementById('currentMileage').value ? parseInt(document.getElementById('currentMileage').value) : 0,
            template: document.getElementById('carTemplate').value
        };
        
        if (!carData.name) {
            alert('Пожалуйста, введите название автомобиля');
            return;
        }
        
        try {
            if (carId) {
                await carManager.updateCar(carId, carData);
                alert('Автомобиль обновлен!');
            } else {
                await carManager.addCar(carData);
                alert('Автомобиль добавлен!');
            }
            
            this.hideCarModal();
            await this.refreshCars();
            
        } catch (error) {
            console.error('Ошибка сохранения автомобиля:', error);
            alert('Ошибка сохранения автомобиля: ' + error.message);
        }
    }

    async deleteCar(carId) {
        if (!confirm('Вы уверены, что хотите удалить этот автомобиль? Все связанные данные будут удалены.')) {
            return;
        }
        
        try {
            await carManager.deleteCar(carId);
            await this.refreshCars();
            alert('Автомобиль удален!');
        } catch (error) {
            console.error('Ошибка удаления автомобиля:', error);
            alert('Ошибка удаления автомобиля: ' + error.message);
        }
    }
}