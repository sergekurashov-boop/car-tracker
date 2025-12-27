// app/database.js
class CarDatabase {
    constructor() {
        this.dbName = 'CarTrackerDB';
        this.version = 3; // Изменил на 3, чтобы совпадало с существующей базой
        this.db = null;
        this.initialized = false;
    }

    // Инициализация базы данных
    async init() {
        if (this.initialized && this.db) {
            console.log('✅ База данных уже инициализирована');
            return this.db;
        }
        
        return new Promise((resolve, reject) => {
            console.log(`🔄 Открытие базы данных ${this.dbName} версия ${this.version}...`);
            
            // ВАЖНО: Без обработчика блокировки версии
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('❌ Ошибка открытия базы данных:', event.target.error);
                
                // Проверяем ошибку версии
                if (event.target.error.name === 'VersionError') {
                    console.warn('⚠️ Ошибка версии. Пытаемся открыть без указания версии...');
                    
                    // Пробуем открыть без указания версии
                    const fallbackRequest = indexedDB.open(this.dbName);
                    
                    fallbackRequest.onerror = (e) => {
                        console.error('❌ Ошибка fallback открытия:', e.target.error);
                        reject(e.target.error);
                    };
                    
                    fallbackRequest.onsuccess = (e) => {
                        this.db = e.target.result;
                        this.initialized = true;
                        console.log(`✅ База данных открыта (версия ${this.db.version})`);
                        resolve(this.db);
                    };
                } else {
                    reject(event.target.error);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.initialized = true;
                console.log(`✅ База данных успешно открыта (версия ${this.db.version})`);
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                console.log(`🔄 Обновление базы с ${event.oldVersion} на ${event.newVersion}`);
                const db = event.target.result;
                this.createStores(db, event.oldVersion);
                console.log('✅ Структура базы данных создана/обновлена');
            };
            
            request.onblocked = (event) => {
                console.warn('⚠️ База данных заблокирована другими вкладками');
                alert('Другие вкладки используют базу данных. Закройте их и обновите страницу.');
            };
        });
    }

    // Создание хранилищ с поддержкой миграций
    createStores(db, oldVersion = 0) {
        console.log(`🔄 Миграция с версии ${oldVersion}...`);
        
        // Миграция с версии 0 (новая база)
        if (oldVersion < 1) {
            // Хранилище автомобилей
            if (!db.objectStoreNames.contains('cars')) {
                const carsStore = db.createObjectStore('cars', { 
                    keyPath: 'id'
                });
                carsStore.createIndex('name', 'name', { unique: false });
                carsStore.createIndex('plate', 'plate', { unique: false });
                carsStore.createIndex('isActive', 'isActive', { unique: false });
                console.log('✅ Хранилище cars создано');
            }
        }
        
        // Миграция с версии 1
        if (oldVersion < 2) {
            // Хранилище истории ТО
            if (!db.objectStoreNames.contains('maintenance')) {
                const maintenanceStore = db.createObjectStore('maintenance', {
                    keyPath: 'id'
                });
                maintenanceStore.createIndex('carId', 'carId', { unique: false });
                maintenanceStore.createIndex('date', 'date', { unique: false });
                maintenanceStore.createIndex('type', 'type', { unique: false });
                console.log('✅ Хранилище maintenance создано');
            }
        }
        
        // Миграция с версии 2
        if (oldVersion < 3) {
            // Хранилище напоминаний
            if (!db.objectStoreNames.contains('reminders')) {
                const remindersStore = db.createObjectStore('reminders', {
                    keyPath: 'id'
                });
                remindersStore.createIndex('carId', 'carId', { unique: false });
                remindersStore.createIndex('dueDate', 'dueDate', { unique: false });
                remindersStore.createIndex('status', 'status', { unique: false });
                console.log('✅ Хранилище reminders создано');
            }
            
            // Хранилище страховок (добавляем в версии 3)
            if (!db.objectStoreNames.contains('insurances')) {
                const insurancesStore = db.createObjectStore('insurances', {
                    keyPath: 'id'
                });
                insurancesStore.createIndex('carId', 'carId', { unique: false });
                insurancesStore.createIndex('type', 'type', { unique: false });
                insurancesStore.createIndex('endDate', 'endDate', { unique: false });
                console.log('✅ Хранилище insurances создано');
            }
        }
    }

    // Добавление данных
    async add(storeName, data) {
        if (!this.initialized) await this.init();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // Генерируем ID если нет
                if (!data.id) {
                    data.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                }
                
                const request = store.add(data);

                request.onsuccess = () => {
                    console.log(`✅ Данные добавлены в ${storeName}, ID:`, data.id);
                    resolve(data.id);
                };
                
                request.onerror = (event) => {
                    console.error(`❌ Ошибка добавления в ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`❌ Исключение при добавлении в ${storeName}:`, error);
                reject(error);
            }
        });
    }

    // Получение данных по ID
    async get(storeName, id) {
        if (!this.initialized) await this.init();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(id);

                request.onsuccess = () => {
                    resolve(request.result);
                };
                request.onerror = (event) => {
                    console.error(`❌ Ошибка чтения из ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`❌ Исключение при чтении из ${storeName}:`, error);
                reject(error);
            }
        });
    }

    // Получение всех данных
    async getAll(storeName, indexName = null, keyRange = null) {
        if (!this.initialized) await this.init();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const target = indexName ? store.index(indexName) : store;
                const request = target.getAll(keyRange);

                request.onsuccess = () => {
                    resolve(request.result || []);
                };
                request.onerror = (event) => {
                    console.error(`❌ Ошибка чтения всех данных из ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`❌ Исключение при чтении всех данных из ${storeName}:`, error);
                reject(error);
            }
        });
    }

    // Обновление данных
    async update(storeName, id, data) {
        if (!this.initialized) await this.init();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // Получаем существующие данные
                const getRequest = store.get(id);
                
                getRequest.onsuccess = () => {
                    const existing = getRequest.result;
                    if (!existing) {
                        reject(new Error(`Запись с ID ${id} не найдена в ${storeName}`));
                        return;
                    }
                    
                    // Объединяем с новыми данными
                    const updated = { 
                        ...existing, 
                        ...data, 
                        updatedAt: new Date().toISOString() 
                    };
                    
                    const putRequest = store.put(updated);
                    
                    putRequest.onsuccess = () => {
                        console.log(`✅ Данные обновлены в ${storeName}, ID:`, id);
                        resolve(id);
                    };
                    
                    putRequest.onerror = (event) => {
                        console.error(`❌ Ошибка обновления в ${storeName}:`, event.target.error);
                        reject(event.target.error);
                    };
                };
                
                getRequest.onerror = (event) => {
                    console.error(`❌ Ошибка получения данных для обновления:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`❌ Исключение при обновлении в ${storeName}:`, error);
                reject(error);
            }
        });
    }

    // Удаление данных
    async delete(storeName, id) {
        if (!this.initialized) await this.init();
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);

                request.onsuccess = () => {
                    console.log(`✅ Данные удалены из ${storeName}, ID:`, id);
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.error(`❌ Ошибка удаления из ${storeName}:`, event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error(`❌ Исключение при удалении из ${storeName}:`, error);
                reject(error);
            }
        });
    }

    // Специфичные методы для автомобилей
    async getAllCars(includeInactive = false) {
        const allCars = await this.getAll('cars');
        
        if (includeInactive) {
            console.log(`🚗 Все автомобили: ${allCars.length}`);
            return allCars;
        }
        
        // Фильтруем только активные автомобили
        const activeCars = allCars.filter(car => car.isActive !== false);
        console.log(`🚗 Активные автомобили: ${activeCars.length} из ${allCars.length}`);
        return activeCars;
    }

    async getCar(id) {
        return this.get('cars', id);
    }

    async addCar(carData) {
        const data = {
            ...carData,
            id: carData.id || 'car_' + Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
        };
        return this.add('cars', data);
    }

    async updateCar(id, carData) {
        return this.update('cars', id, carData);
    }

    async deleteCar(id) {
        // Мягкое удаление - помечаем как неактивный
        return this.update('cars', id, { 
            isActive: false,
            deletedAt: new Date().toISOString() 
        });
    }

    // Жесткое удаление
    async hardDeleteCar(id) {
        return this.delete('cars', id);
    }

    // Методы для страховок
    async getCarInsurances(carId) {
        return this.getAll('insurances', 'carId', IDBKeyRange.only(carId));
    }
    
    async addInsurance(insuranceData) {
        const data = {
            ...insuranceData,
            id: insuranceData.id || 'ins_' + Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return this.add('insurances', data);
    }
    
    async updateInsurance(id, insuranceData) {
        return this.update('insurances', id, insuranceData);
    }

    // Проверка подключения к базе
    async testConnection() {
        try {
            await this.init();
            console.log('✅ Подключение к базе данных успешно');
            return true;
        } catch (error) {
            console.error('❌ Ошибка подключения к базе данных:', error);
            return false;
        }
    }

    // Очистка всей базы данных
    async clearDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);
            
            request.onsuccess = () => {
                console.log('✅ База данных удалена');
                this.initialized = false;
                this.db = null;
                resolve(true);
            };
            
            request.onerror = (event) => {
                console.error('❌ Ошибка удаления базы данных:', event.target.error);
                reject(event.target.error);
            };
            
            request.onblocked = () => {
                console.warn('⚠️ Не удалось удалить: база заблокирована');
                reject(new Error('База данных заблокирована другими вкладками'));
            };
        });
    }

    // Получение информации о базе
    getDatabaseInfo() {
        if (!this.db) return 'База не инициализирована';
        
        return {
            name: this.db.name,
            version: this.db.version,
            objectStores: Array.from(this.db.objectStoreNames),
            isInitialized: this.initialized
        };
    }
}

// НЕ создаем экземпляр здесь! Он будет создан в index.html
// Просто экспортируем класс
// window.CarDatabase = CarDatabase; // Это делается в index.html