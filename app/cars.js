// app/cars.js
class CarManager {
    constructor() {
        this.cars = [];
        this.templates = this.getCarTemplates();
    }

    // Шаблоны автомобилей
    getCarTemplates() {
        return {
            jeepLiberty: {
                name: "JEEP LIBERTY KK 2,8 CRD",
                year: 2008,
                intervals: {
                    engineOil: { mileage: 10000, months: 12 },
                    atf: { mileage: 60000, months: 36 },
                    rearDiff: { mileage: 60000, months: 36 },
                    transferCase: { mileage: 60000, months: 36 },
                    timingBelt: { mileage: 80000, months: 60 },
                    fuelFilter: { mileage: 20000, months: 12 },
                    turboInspection: { mileage: 40000, months: 24 },
                    intercoolerCleaning: { mileage: 80000, months: 48 },
                    glowPlugs: { mileage: 80000, months: 60 },
                    airFilter: { mileage: 20000, months: 12 },
                    cabinFilter: { mileage: 15000, months: 12 },
                    brakeFluid: { mileage: 40000, months: 24 },
                    coolant: { mileage: 80000, months: 48 }
                }
            },

            volvoXC90: {
                name: "VOLVO XC90 2,5T",
                year: 2007,
                intervals: {
                    engineOil: { mileage: 10000, months: 12 },
                    atf: { mileage: 60000, months: 36 },
                    rearDiff: { mileage: 60000, months: 36 },
                    timingBelt: { mileage: 100000, months: 60 },
                    haldexOil: { mileage: 30000, months: 24 },
                    haldexFilter: { mileage: 60000, months: 36 },
                    turboInspection: { mileage: 50000, months: 24 },
                    egrCleaning: { mileage: 80000, months: 48 },
                    airFilter: { mileage: 20000, months: 12 },
                    cabinFilter: { mileage: 15000, months: 12 },
                    brakeFluid: { mileage: 40000, months: 24 },
                    coolant: { mileage: 80000, months: 48 }
                }
            },

            hyundaiCreta: {
                name: "HYUNDAI CRETA 2,0",
                year: 2018,
                intervals: {
                    engineOil: { mileage: 10000, months: 12 },
                    atf: { mileage: 60000, months: 36 },
                    rearDiff: { mileage: 60000, months: 36 },
                    timingBelt: { mileage: 120000, months: 72 },
                    airFilter: { mileage: 20000, months: 12 },
                    cabinFilter: { mileage: 15000, months: 12 },
                    brakeFluid: { mileage: 40000, months: 24 },
                    coolant: { mileage: 80000, months: 48 }
                }
            }
        };
    }

    // Инициализация
    async init() {
        try {
            this.cars = await carDB.getAllCars();
            console.log('Загружено автомобилей:', this.cars.length);
            
            // Конвертируем старые данные страховок в новый формат
            await this.migrateInsuranceData();
            
            // Загружаем начальные данные если база пустая
            await this.loadInitialData();
            
            // Обновляем список после загрузки начальных данных
            this.cars = await carDB.getAllCars();
            console.log('Итоговое количество автомобилей:', this.cars.length);
            
            return this.cars;
        } catch (error) {
            console.error('Ошибка загрузки автомобилей:', error);
            return [];
        }
    }

    // Загрузка начальных данных если база пустая
    async loadInitialData() {
        try {
            const existingCars = await carDB.getAllCars();
            
            // Если база пустая - загружаем начальные данные
            if (existingCars.length === 0) {
                console.log('🔄 База пустая, загружаем начальные данные...');
                
                if (typeof InitialData !== 'undefined' && InitialData.getCars) {
                    const initialCars = InitialData.getCars();
                    
                    for (const carData of initialCars) {
                        await carDB.addCar(carData);
                        console.log(`✅ Добавлен: ${carData.name}`);
                    }
                    
                    console.log('✅ Начальные данные загружены:', initialCars.length, 'автомобилей');
                    return true;
                } else {
                    console.log('ℹ️ InitialData не найден, пропускаем загрузку начальных данных');
                }
            } else {
                console.log('📊 В базе уже есть данные:', existingCars.length, 'автомобилей');
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки начальных данных:', error);
            return false;
        }
    }

    // Миграция данных страховок из старого формата в новый
    async migrateInsuranceData() {
        let needsMigration = false;
        
        for (const car of this.cars) {
            // Если страховка - объект (старый формат), конвертируем в массив
            if (car.insurance && !Array.isArray(car.insurance)) {
                console.log(`Миграция страховки для автомобиля ${car.name}`, car.insurance);
                
                if (car.insurance.number || car.insurance.company) {
                    // Есть данные - сохраняем их в массиве
                    car.insurance = [car.insurance];
                } else {
                    // Нет данных - создаем пустой массив
                    car.insurance = [];
                }
                needsMigration = true;
                
                // Сохраняем обратно в базу
                await carDB.updateCar(car.id, { insurance: car.insurance });
            }
        }
        
        if (needsMigration) {
            console.log('Миграция данных страховок завершена');
        }
    }

    // Создать автомобиль из шаблона
    createCarFromTemplate(templateKey, carData) {
        const template = this.templates[templateKey];
        if (!template) {
            throw new Error(`Шаблон ${templateKey} не найден`);
        }

        const baseCar = {
            name: carData.name || template.name,
            year: carData.year || template.year,
            plate: carData.plate || '',
            vin: carData.vin || '',
            color: carData.color || '',
            photo: null,
            currentMileage: carData.currentMileage || 0,
            lastMileageUpdate: carData.lastMileageUpdate || new Date().toISOString().split('T')[0],
            insurance: [], // Теперь массив вместо объекта
            intervals: { ...template.intervals },
            lastChanges: {},
            customMetrics: [],
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return baseCar;
    }

    // Добавить автомобиль
    async addCar(carData) {
        console.log('🔄 addCar вызван с данными:', carData);
        
        try {
            // Убедимся, что страховка - массив
            if (carData.insurance && !Array.isArray(carData.insurance)) {
                if (carData.insurance.number) {
                    carData.insurance = [carData.insurance];
                } else {
                    carData.insurance = [];
                }
            }
            
            const carId = await carDB.addCar(carData);
            console.log('✅ Автомобиль добавлен в базу с ID:', carId);
            
            const newCar = { ...carData, id: carId };
            this.cars.push(newCar);
            
            console.log('📝 Обновлен список автомобилей в manager:', this.cars);
            
            this.showNotification('Автомобиль добавлен', 'success');
            return newCar;
        } catch (error) {
            console.error('❌ Ошибка добавления автомобиля:', error);
            this.showNotification('Ошибка добавления автомобиля', 'error');
            throw error;
        }
    }

    // Обновить автомобиль
    async updateCar(id, carData) {
        try {
            // Убедимся, что страховка - массив при обновлении
            if (carData.insurance && !Array.isArray(carData.insurance)) {
                if (carData.insurance.number) {
                    carData.insurance = [carData.insurance];
                } else {
                    carData.insurance = [];
                }
            }
            
            await carDB.updateCar(id, carData);
            const index = this.cars.findIndex(car => car.id === id);
            if (index !== -1) {
                this.cars[index] = { ...this.cars[index], ...carData, updatedAt: new Date().toISOString() };
            }
            return true;
        } catch (error) {
            console.error('Ошибка обновления автомобиля:', error);
            this.showNotification('Ошибка обновления автомобиля', 'error');
            throw error;
        }
    }

    // Получить автомобиль по ID
    getCar(id) {
        const car = this.cars.find(car => car.id === id);
        
        // Гарантируем, что страховка всегда массив
        if (car && car.insurance && !Array.isArray(car.insurance)) {
            if (car.insurance.number) {
                car.insurance = [car.insurance];
            } else {
                car.insurance = [];
            }
        }
        
        return car;
    }

    // Получить все автомобили
    getAllCars() {
        const activeCars = this.cars.filter(car => car.isActive);
        
        // Гарантируем, что у всех автомобилей страховка - массив
        activeCars.forEach(car => {
            if (car.insurance && !Array.isArray(car.insurance)) {
                if (car.insurance.number) {
                    car.insurance = [car.insurance];
                } else {
                    car.insurance = [];
                }
            }
        });
        
        return activeCars;
    }

    // Удалить автомобиль (мягкое удаление)
    async deleteCar(id) {
        try {
            await this.updateCar(id, { isActive: false });
            this.cars = this.cars.filter(car => car.id !== id);
            this.showNotification('Автомобиль удален', 'success');
            return true;
        } catch (error) {
            console.error('Ошибка удаления автомобиля:', error);
            this.showNotification('Ошибка удаления автомобиля', 'error');
            throw error;
        }
    }

    // Методы для работы со страховками
    
    // Добавить страховку
    async addInsurance(carId, insuranceData) {
        try {
            const car = this.getCar(carId);
            if (!car) {
                throw new Error('Автомобиль не найден');
            }
            
            if (!insuranceData.number) {
                throw new Error('Номер полиса обязателен');
            }
            
            const newInsurance = {
                id: Date.now(), // Простой ID на основе времени
                number: insuranceData.number,
                company: insuranceData.company || '',
                type: insuranceData.type || 'osago',
                startDate: insuranceData.startDate || new Date().toISOString().split('T')[0],
                endDate: insuranceData.endDate,
                cost: insuranceData.cost || 0,
                isActive: insuranceData.endDate ? new Date(insuranceData.endDate) > new Date() : false
            };
            
            const updatedInsurance = [...(car.insurance || []), newInsurance];
            await this.updateCar(carId, { insurance: updatedInsurance });
            
            return newInsurance;
        } catch (error) {
            console.error('Ошибка добавления страховки:', error);
            throw error;
        }
    }

    // Обновить страховку
    async updateInsurance(carId, insuranceId, insuranceData) {
        try {
            const car = this.getCar(carId);
            if (!car) {
                throw new Error('Автомобиль не найден');
            }
            
            const insuranceArray = car.insurance || [];
            const index = insuranceArray.findIndex(ins => ins.id === insuranceId || ins.number === insuranceId);
            
            if (index === -1) {
                throw new Error('Страховка не найдена');
            }
            
            const updatedInsurance = {
                ...insuranceArray[index],
                ...insuranceData,
                isActive: insuranceData.endDate ? new Date(insuranceData.endDate) > new Date() : insuranceArray[index].isActive
            };
            
            insuranceArray[index] = updatedInsurance;
            await this.updateCar(carId, { insurance: insuranceArray });
            
            return updatedInsurance;
        } catch (error) {
            console.error('Ошибка обновления страховки:', error);
            throw error;
        }
    }

    // Удалить страховку
    async deleteInsurance(carId, insuranceId) {
        try {
            const car = this.getCar(carId);
            if (!car) {
                throw new Error('Автомобиль не найден');
            }
            
            const insuranceArray = car.insurance || [];
            const updatedInsurance = insuranceArray.filter(ins => 
                !(ins.id === insuranceId || ins.number === insuranceId)
            );
            
            await this.updateCar(carId, { insurance: updatedInsurance });
            return true;
        } catch (error) {
            console.error('Ошибка удаления страховки:', error);
            throw error;
        }
    }

    // Получить активную страховку
    getActiveInsurance(carId) {
        const car = this.getCar(carId);
        if (!car || !car.insurance) return null;
        
        const now = new Date();
        return car.insurance.find(ins => 
            ins.endDate && new Date(ins.endDate) > now
        );
    }

    // Проверить лимит автомобилей
    canAddMoreCars() {
        return this.getAllCars().length < 3;
    }

    // Показать уведомление
    showNotification(message, type = 'info') {
        if (window.CarTracker && window.CarTracker.UI) {
            window.CarTracker.UI.showNotification(message, type);
        } else {
            // Fallback уведомление
            alert(message);
        }
    }
}

// Создаем экземпляр менеджера автомобилей
const carManager = new CarManager();