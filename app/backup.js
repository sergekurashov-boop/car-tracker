// app/backup.js
class BackupManager {
    constructor() {
        this.lastBackup = null;
    }

    // Экспорт всех данных в JSON файл
    async exportToJSON() {
        try {
            const cars = await carDB.getAllCars();
            const backupData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                cars: cars,
                settings: appStorage.getSettings()
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `car-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.lastBackup = new Date();
            this.showNotification('✅ Данные успешно экспортированы', 'success');
            
            console.log('📊 Экспортировано автомобилей:', cars.length);
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка экспорта:', error);
            this.showNotification('Ошибка при экспорте данных', 'error');
            return false;
        }
    }

    // Импорт данных из JSON файла
    async importFromJSON(file) {
        return new Promise(async (resolve) => {
            try {
                const reader = new FileReader();
                
                reader.onload = async (e) => {
                    try {
                        const backupData = JSON.parse(e.target.result);
                        
                        // Проверяем версию и структуру
                        if (!backupData.cars || !Array.isArray(backupData.cars)) {
                            throw new Error('Неверный формат файла');
                        }

                        // Подтверждение импорта
                        if (!confirm(`Найдено ${backupData.cars.length} автомобилей. Импортировать? Существующие данные будут заменены.`)) {
                            resolve(false);
                            return;
                        }

                        console.log('🔄 Начинаем импорт данных...', backupData);

                        // Очищаем текущие данные
                        const currentCars = await carDB.getAllCars();
                        for (const car of currentCars) {
                            await carDB.deleteCar(car.id);
                        }

                        // Импортируем новые данные
                        let importedCount = 0;
                        for (const carData of backupData.cars) {
                            try {
                                // Убедимся, что страховки в правильном формате
                                if (carData.insurance && !Array.isArray(carData.insurance)) {
                                    if (carData.insurance.number) {
                                        carData.insurance = [carData.insurance];
                                    } else {
                                        carData.insurance = [];
                                    }
                                }
                                
                                await carDB.addCar(carData);
                                importedCount++;
                            } catch (carError) {
                                console.error('Ошибка импорта автомобиля:', carData.name, carError);
                            }
                        }

                        // Импортируем настройки если есть
                        if (backupData.settings) {
                            appStorage.setSettings(backupData.settings);
                        }

                        this.showNotification(`✅ Успешно импортировано ${importedCount} автомобилей`, 'success');
                        console.log(`✅ Импорт завершен: ${importedCount} автомобилей`);

                        // Обновляем интерфейс
                        setTimeout(() => {
                            carUI.loadCars();
                            resolve(true);
                        }, 1000);

                    } catch (parseError) {
                        console.error('❌ Ошибка парсинга файла:', parseError);
                        this.showNotification('Ошибка: неверный формат файла', 'error');
                        resolve(false);
                    }
                };

                reader.onerror = () => {
                    this.showNotification('Ошибка чтения файла', 'error');
                    resolve(false);
                };

                reader.readAsText(file);
                
            } catch (error) {
                console.error('❌ Ошибка импорта:', error);
                this.showNotification('Ошибка при импорте данных', 'error');
                resolve(false);
            }
        });
    }

    // Быстрое резервное копирование в localStorage
    async quickBackup() {
        try {
            const cars = await carDB.getAllCars();
            const backupData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                cars: cars
            };
            
            localStorage.setItem('carTracker_quickBackup', JSON.stringify(backupData));
            this.lastBackup = new Date();
            
            console.log('💾 Быстрая резервная копия создана');
            return true;
        } catch (error) {
            console.error('❌ Ошибка быстрого бэкапа:', error);
            return false;
        }
    }

    // Восстановление из быстрой резервной копии
    async restoreFromQuickBackup() {
        try {
            const backupStr = localStorage.getItem('carTracker_quickBackup');
            if (!backupStr) {
                this.showNotification('Резервная копия не найдена', 'warning');
                return false;
            }

            const backupData = JSON.parse(backupStr);
            
            if (!confirm('Восстановить данные из последней резервной копии?')) {
                return false;
            }

            // Очищаем текущие данные
            const currentCars = await carDB.getAllCars();
            for (const car of currentCars) {
                await carDB.deleteCar(car.id);
            }

            // Восстанавливаем данные
            let restoredCount = 0;
            for (const carData of backupData.cars) {
                await carDB.addCar(carData);
                restoredCount++;
            }

            this.showNotification(`✅ Восстановлено ${restoredCount} автомобилей`, 'success');
            
            // Обновляем интерфейс
            setTimeout(() => {
                carUI.loadCars();
            }, 500);

            return true;
            
        } catch (error) {
            console.error('❌ Ошибка восстановления:', error);
            this.showNotification('Ошибка при восстановлении данных', 'error');
            return false;
        }
    }

    // Показать информацию о резервных копиях
    getBackupInfo() {
        const quickBackup = localStorage.getItem('carTracker_quickBackup');
        let info = 'Резервные копии: ';
        
        if (quickBackup) {
            const backupData = JSON.parse(quickBackup);
            const date = new Date(backupData.timestamp).toLocaleString();
            info += `быстрая копия от ${date} (${backupData.cars.length} авто)`;
        } else {
            info += 'нет быстрых копий';
        }
        
        return info;
    }

    // Показать уведомление
    showNotification(message, type = 'info') {
        if (window.CarTracker && window.CarTracker.UI) {
            window.CarTracker.UI.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Создаем экземпляр менеджера резервного копирования
const backupManager = new BackupManager();