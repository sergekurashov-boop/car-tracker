// app/storage.js
class AppStorage {
    constructor() {
        this.prefix = 'carTracker_';
    }

    // Получить значение
    get(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Ошибка чтения из localStorage:', error);
            return null;
        }
    }

    // Установить значение
    set(key, value) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Ошибка записи в localStorage:', error);
            return false;
        }
    }

    // Удалить значение
    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
            return true;
        } catch (error) {
            console.error('Ошибка удаления из localStorage:', error);
            return false;
        }
    }

    // Настройки приложения
    getSettings() {
        return this.get('settings') || {
            theme: 'light',
            language: 'ru',
            notifications: true,
            mileageUnit: 'km',
            defaultCarId: null
        };
    }

    setSettings(settings) {
        return this.set('settings', settings);
    }

    // Информация о синхронизации
    getLastSync() {
        return this.get('lastSync');
    }

    setLastSync(date = new Date()) {
        return this.set('lastSync', date.toISOString());
    }

    // Информация о резервных копиях
    getBackupInfo() {
        return this.get('backupInfo') || {
            lastBackup: null,
            backupCount: 0
        };
    }

    setBackupInfo(info) {
        return this.set('backupInfo', info);
    }
}

// Создаем экземпляр хранилища
const appStorage = new AppStorage();