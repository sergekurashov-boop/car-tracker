// app/initial-data.js
class InitialData {
    static getCars() {
        return [
            {
                name: "JEEP LIBERTY KK 2,8 CRD",
                year: 2008,
                plate: "P593BK39",
                currentMileage: 396,
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
                },
                insurance: [
                    {
                        number: "ОСАГО123456",
                        company: "ИНГОССТРАХ",
                        type: "osago",
                        startDate: "2024-01-15",
                        endDate: "2025-01-14",
                        isActive: true
                    },
                    {
                        number: "КАСКО789012",
                        company: "РЕСО",
                        type: "kasko", 
                        startDate: "2024-01-15",
                        endDate: "2025-01-14",
                        isActive: true
                    }
                ],
                lastChanges: {
                    engineOil: {
                        date: "2024-01-10",
                        mileage: 350,
                        oilBrand: "Mobil 1 5W-30",
                        notes: "Первая замена после покупки"
                    },
                    airFilter: {
                        date: "2024-01-10",
                        mileage: 350, 
                        oilBrand: "MANN FILTER",
                        notes: "Профилактическая замена"
                    },
                    cabinFilter: {
                        date: "2024-01-10",
                        mileage: 350,
                        oilBrand: "MANN FILTER",
                        notes: "Профилактическая замена"
                    }
                },
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: "VOLVO XC90 2,5T", 
                year: 2007,
                plate: "A123BC777",
                currentMileage: 185000,
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
                },
                insurance: [
                    {
                        number: "ОСАГО789012",
                        company: "РЕСО",
                        type: "osago", 
                        startDate: "2024-02-01",
                        endDate: "2025-02-01",
                        isActive: true
                    }
                ],
                lastChanges: {
                    engineOil: {
                        date: "2024-02-15",
                        mileage: 184500,
                        oilBrand: "Castrol 5W-40",
                        notes: "Плановая замена"
                    },
                    haldexOil: {
                        date: "2024-02-15", 
                        mileage: 184500,
                        oilBrand: "Volvo Haldex Oil",
                        notes: "Замена по регламенту"
                    },
                    haldexFilter: {
                        date: "2024-02-15",
                        mileage: 184500,
                        oilBrand: "Volvo Haldex Filter",
                        notes: "Замена по регламенту"
                    }
                },
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                name: "HYUNDAI CRETA 2,0",
                year: 2018, 
                plate: "E555XX99",
                currentMileage: 45000,
                intervals: {
                    engineOil: { mileage: 10000, months: 12 },
                    atf: { mileage: 60000, months: 36 },
                    rearDiff: { mileage: 60000, months: 36 },
                    timingBelt: { mileage: 120000, months: 72 },
                    airFilter: { mileage: 20000, months: 12 },
                    cabinFilter: { mileage: 15000, months: 12 },
                    brakeFluid: { mileage: 40000, months: 24 },
                    coolant: { mileage: 80000, months: 48 }
                },
                insurance: [
                    {
                        number: "КАСКО555888",
                        company: "СОГАЗ",
                        type: "kasko",
                        startDate: "2024-03-01", 
                        endDate: "2025-03-01",
                        isActive: true
                    },
                    {
                        number: "ОСАГО333444", 
                        company: "ИНГОССТРАХ",
                        type: "osago",
                        startDate: "2023-03-01",
                        endDate: "2024-03-01",
                        isActive: false
                    }
                ],
                lastChanges: {
                    engineOil: {
                        date: "2024-03-10",
                        mileage: 44500,
                        oilBrand: "Hyundai 5W-30",
                        notes: "ТО у дилера"
                    },
                    atf: {
                        date: "2024-03-10",
                        mileage: 44500,
                        oilBrand: "Hyundai ATF SP-IV",
                        notes: "Замена по регламенту"
                    },
                    airFilter: {
                        date: "2024-03-10",
                        mileage: 44500, 
                        oilBrand: "Hyundai Original",
                        notes: "Замена по регламенту"
                    },
                    cabinFilter: {
                        date: "2024-03-10",
                        mileage: 44500,
                        oilBrand: "Hyundai Original", 
                        notes: "Замена по регламенту"
                    },
                    brakeFluid: {
                        date: "2024-03-10",
                        mileage: 44500,
                        oilBrand: "DOT-4",
                        notes: "Замена по регламенту"
                    }
                },
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
    }

    // Метод для получения тестовых данных для отладки
    static getTestData() {
        return {
            cars: this.getCars(),
            summary: {
                totalCars: this.getCars().length,
                totalInsurance: this.getCars().reduce((sum, car) => sum + car.insurance.length, 0),
                activeInsurance: this.getCars().reduce((sum, car) => 
                    sum + car.insurance.filter(ins => ins.isActive).length, 0
                ),
                maintenanceRecords: this.getCars().reduce((sum, car) => 
                    sum + Object.keys(car.lastChanges).length, 0
                )
            }
        };
    }

    // Метод для проверки данных
    static validateData() {
        const cars = this.getCars();
        const errors = [];

        cars.forEach((car, index) => {
            // Проверка обязательных полей
            if (!car.name) errors.push(`Автомобиль ${index}: отсутствует название`);
            if (!car.year) errors.push(`Автомобиль ${index}: отсутствует год`);
            if (!car.intervals) errors.push(`Автомобиль ${index}: отсутствуют интервалы ТО`);
            
            // Проверка страховок
            if (!Array.isArray(car.insurance)) {
                errors.push(`Автомобиль ${index}: страховки не в формате массива`);
            } else {
                car.insurance.forEach((ins, insIndex) => {
                    if (!ins.number) errors.push(`Автомобиль ${index}, страховка ${insIndex}: отсутствует номер`);
                    if (!ins.company) errors.push(`Автомобиль ${index}, страховка ${insIndex}: отсутствует компания`);
                    if (!ins.type) errors.push(`Автомобиль ${index}, страховка ${insIndex}: отсутствует тип`);
                });
            }
        });

        if (errors.length === 0) {
            console.log('✅ Данные прошли валидацию');
            return true;
        } else {
            console.error('❌ Ошибки в данных:', errors);
            return false;
        }
    }
}

// Автоматическая валидация при загрузке
console.log('🔍 Проверка начальных данных...');
InitialData.validateData();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InitialData;
}