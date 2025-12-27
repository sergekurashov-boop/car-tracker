// app/ui.js
class CarUI {
    constructor() {
        this.carManager = carManager;
        this.currentView = 'list';
        this.editingCarId = null;
    }

    // Инициализация UI
    async init() {
        this.bindEvents();
        await this.loadCars();
    }

    // Привязка событий
    bindEvents() {
        document.getElementById('addCarBtn').addEventListener('click', () => this.showCarModal());
        document.getElementById('addFirstCarBtn').addEventListener('click', () => this.showCarModal());
        document.querySelector('.close').addEventListener('click', () => this.hideCarModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideCarModal());
        document.getElementById('carForm').addEventListener('submit', (e) => this.handleCarSubmit(e));
        document.getElementById('carModal').addEventListener('click', (e) => {
            if (e.target.id === 'carModal') this.hideCarModal();
        });
        document.getElementById('carTemplate').addEventListener('change', (e) => this.onTemplateChange(e));
    }

    // Загрузка и отображение автомобилей
    async loadCars() {
        const cars = await carDB.getAllCars();
        this.renderCarList(cars);
    }

    // Отображение списка автомобилей
    renderCarList(cars) {
        const carList = document.getElementById('carList');
        const emptyState = document.getElementById('emptyState');
        const loading = document.getElementById('loading');

        loading.style.display = 'none';

        if (!cars || cars.length === 0) {
            carList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        carList.style.display = 'grid';
        carList.innerHTML = cars.map(car => this.createCarCard(car)).join('');
    }

    // Создание карточки автомобиля - УЛУЧШЕННАЯ ВЕРСИЯ
    createCarCard(car) {
        const status = this.calculateCarStatus(car);
        const insuranceInfo = this.getInsuranceInfoForCard(car.insurance);
        
        return `
            <div class="car-card" data-car-id="${car.id}">
                <div class="car-header">
                    <h3>${car.name}</h3>
                    <button class="btn-delete" onclick="carUI.deleteCar(${car.id})">×</button>
                </div>
                <div class="car-info">
                    ${car.plate ? `<div class="status-item">
                        <span>Госномер:</span>
                        <span>${car.plate}</span>
                    </div>` : ''}
                    
                    ${car.currentMileage ? `<div class="status-item">
                        <span>Пробег:</span>
                        <span>${car.currentMileage.toLocaleString()} км</span>
                    </div>` : ''}
                    
                    <!-- УЛУЧШЕННЫЙ БЛОК СТРАХОВОК -->
                    <div class="insurance-preview">
                        <div class="status-item">
                            <span>🎫 Страховки:</span>
                            <span class="insurance-count">${insuranceInfo.count}</span>
                        </div>
                        ${insuranceInfo.active ? `
                        <div class="insurance-active">
                            <span class="insurance-active-text">${insuranceInfo.type} до: ${insuranceInfo.activeEndDate}</span>
                            ${insuranceInfo.expiringSoon ? '<span class="insurance-warning">⚠️ Скоро истекает</span>' : ''}
                        </div>
                        ` : `
                        <div class="insurance-none">
                            <span class="insurance-none-text">Нет активных страховок</span>
                        </div>
                        `}
                    </div>
                    
                    ${this.renderMaintenanceStatus(status)}
                </div>
                <div class="car-actions">
                    <button class="btn-edit" onclick="carUI.editCar(${car.id})">✏️ Редактировать</button>
                    <button class="btn-details" onclick="carUI.showCarDetail(${car.id})">📊 Подробнее</button>
                </div>
            </div>
        `;
    }

    // Информация о страховках для карточки
    getInsuranceInfoForCard(insurance) {
        let insuranceArray = [];
        
        // Конвертируем в массив если нужно
        if (Array.isArray(insurance)) {
            insuranceArray = insurance;
        } else if (insurance && insurance.number) {
            insuranceArray = [insurance];
        }
        
        const now = new Date();
        const activeInsurance = insuranceArray.find(ins => 
            ins.endDate && new Date(ins.endDate) > now
        );
        
        let expiringSoon = false;
        if (activeInsurance) {
            const endDate = new Date(activeInsurance.endDate);
            const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            expiringSoon = daysUntilExpiry < 30;
        }
        
        return {
            count: insuranceArray.length,
            active: !!activeInsurance,
            type: activeInsurance ? (activeInsurance.type === 'kasko' ? 'КАСКО' : 'ОСАГО') : '',
            activeEndDate: activeInsurance ? new Date(activeInsurance.endDate).toLocaleDateString() : '',
            expiringSoon: expiringSoon
        };
    }

    // Расчет статуса автомобиля
    calculateCarStatus(car) {
        const now = new Date();
        const status = {
            insurance: 'normal',
            maintenance: 'normal',
            criticalItems: []
        };

        // Проверка страховок
        if (car.insurance && Array.isArray(car.insurance)) {
            const activeInsurance = car.insurance.find(ins => 
                ins.endDate && new Date(ins.endDate) > now
            );
            
            if (!activeInsurance) {
                status.insurance = 'danger';
            } else {
                const endDate = new Date(activeInsurance.endDate);
                const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                
                if (daysUntilExpiry < 30) {
                    status.insurance = 'warning';
                }
            }
        } else if (car.insurance && car.insurance.endDate) {
            // Обратная совместимость со старой структурой
            const endDate = new Date(car.insurance.endDate);
            const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntilExpiry < 0) status.insurance = 'danger';
            else if (daysUntilExpiry < 30) status.insurance = 'warning';
        }

        // Проверка ТО
        if (car.lastChanges && car.intervals) {
            for (const [component, interval] of Object.entries(car.intervals)) {
                const lastChange = car.lastChanges[component];
                if (lastChange && lastChange.mileage && car.currentMileage) {
                    const nextMileage = lastChange.mileage + interval.mileage;
                    const mileageLeft = nextMileage - car.currentMileage;
                    
                    if (mileageLeft < 0) {
                        status.criticalItems.push(component);
                        status.maintenance = 'danger';
                    } else if (mileageLeft < interval.mileage * 0.2) {
                        status.maintenance = status.maintenance === 'normal' ? 'warning' : status.maintenance;
                    }
                }
            }
        }

        return status;
    }

    // Отображение статуса ТО
    renderMaintenanceStatus(status) {
        let statusClass = 'status-normal';
        let statusText = 'Все ТО в норме';

        if (status.maintenance === 'danger') {
            statusClass = 'status-danger';
            statusText = 'Есть просроченные ТО';
        } else if (status.maintenance === 'warning') {
            statusClass = 'status-warning';
            statusText = 'Скоро потребуется ТО';
        }

        return `
            <div class="status-item">
                <span>🔧 Техническое обслуживание:</span>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        `;
    }

    // Показать модальное окно добавления авто
    showCarModal() {
        if (!this.carManager.canAddMoreCars()) {
            this.showNotification('Максимум можно добавить 3 автомобиля', 'warning');
            return;
        }

        this.editingCarId = null;
        document.getElementById('carModalTitle').textContent = 'Добавить автомобиль';
        document.getElementById('submitBtn').textContent = 'Сохранить';
        document.getElementById('carForm').reset();
        document.getElementById('carId').value = '';
        document.getElementById('carModal').style.display = 'block';
    }

    // Показать модальное окно редактирования авто
    async editCar(carId) {
        try {
            const car = await carDB.getCar(carId);
            if (!car) {
                this.showNotification('Автомобиль не найден', 'error');
                return;
            }

            this.editingCarId = carId;
            document.getElementById('carModalTitle').textContent = 'Редактировать автомобиль';
            document.getElementById('submitBtn').textContent = 'Обновить';
            
            document.getElementById('carId').value = car.id;
            document.getElementById('carName').value = car.name;
            document.getElementById('carPlate').value = car.plate || '';
            document.getElementById('carYear').value = car.year || '';
            document.getElementById('currentMileage').value = car.currentMileage || '';
            
            const templateSelect = document.getElementById('carTemplate');
            templateSelect.value = this.detectTemplate(car);
            
            document.getElementById('carModal').style.display = 'block';
            
        } catch (error) {
            console.error('❌ Ошибка загрузки автомобиля:', error);
            this.showNotification('Ошибка загрузки данных', 'error');
        }
    }

    // Определение шаблона
    detectTemplate(car) {
        if (car.name.includes('JEEP') || car.name.includes('LIBERTY')) return 'jeepLiberty';
        if (car.name.includes('VOLVO') || car.name.includes('XC90')) return 'volvoXC90';
        if (car.name.includes('CRETA') || car.name.includes('HYUNDAI')) return 'hyundaiCreta';
        return 'custom';
    }

    // Скрыть модальное окно
    hideCarModal() {
        document.getElementById('carModal').style.display = 'none';
        this.editingCarId = null;
    }

    // Обработка выбора шаблона
    onTemplateChange(event) {
        const template = event.target.value;
        const nameInput = document.getElementById('carName');
        const yearInput = document.getElementById('carYear');

        if (this.editingCarId) return;

        if (template && template !== 'custom') {
            const templateData = this.carManager.templates[template];
            if (templateData) {
                nameInput.value = templateData.name;
                yearInput.value = templateData.year;
            }
        } else {
            nameInput.value = '';
            yearInput.value = '';
        }
    }

    // Обработка отправки формы
    async handleCarSubmit(event) {
        event.preventDefault();
        
        const template = document.getElementById('carTemplate').value;
        const name = document.getElementById('carName').value;
        const plate = document.getElementById('carPlate').value;
        const year = parseInt(document.getElementById('carYear').value) || 0;
        const mileage = parseInt(document.getElementById('currentMileage').value) || 0;

        try {
            if (this.editingCarId) {
                await carDB.updateCar(this.editingCarId, {
                    name, plate, year, currentMileage: mileage, updatedAt: new Date().toISOString()
                });
                this.showNotification('Автомобиль обновлен', 'success');
            } else {
                let newCar;
                
                if (template && template !== 'custom') {
                    newCar = this.carManager.createCarFromTemplate(template, {
                        name, plate, year, currentMileage: mileage
                    });
                } else {
                    newCar = {
                        name, plate, year, currentMileage: mileage,
                        intervals: { ...this.carManager.templates.hyundaiCreta.intervals },
                        insurance: [], // Теперь массив вместо объекта
                        lastChanges: {}, customMetrics: [], isActive: true
                    };
                }

                await this.carManager.addCar(newCar);
                this.showNotification('Автомобиль добавлен', 'success');
            }
            
            await this.loadCars();
            this.hideCarModal();
            
        } catch (error) {
            console.error('❌ Ошибка сохранения автомобиля:', error);
            this.showNotification('Ошибка при сохранении автомобиля', 'error');
        }
    }

    // Удаление автомобиля
    async deleteCar(carId) {
        if (confirm('Удалить этот автомобиль?')) {
            try {
                await this.carManager.deleteCar(carId);
                await this.loadCars();
                this.showNotification('Автомобиль удален', 'success');
            } catch (error) {
                console.error('❌ Ошибка удаления автомобиля:', error);
                this.showNotification('Ошибка при удалении автомобиля', 'error');
            }
        }
    }

    // Показать детали автомобиля
    async showCarDetail(carId) {
        try {
            const car = await carDB.getCar(carId);
            if (!car) {
                this.showNotification('Автомобиль не найден', 'error');
                return;
            }
            this.renderCarDetail(car);
        } catch (error) {
            console.error('❌ Ошибка загрузки деталей автомобиля:', error);
            this.showNotification('Ошибка загрузки данных', 'error');
        }
    }

    // Отрисовка детальной страницы
    renderCarDetail(car) {
        const app = document.getElementById('app');
        app.innerHTML = `
            <header class="header">
                <h1>🚗 ${car.name}</h1>
                <button class="back-button" onclick="carUI.showCarList()">← Назад к списку</button>
            </header>

            <main>
                <div class="detail-section">
                    <h3>📋 Основная информация</h3>
                    <div class="car-info">
                        ${car.plate ? `<div class="status-item"><span>Госномер:</span><span>${car.plate}</span></div>` : ''}
                        ${car.year ? `<div class="status-item"><span>Год выпуска:</span><span>${car.year}</span></div>` : ''}
                        ${car.currentMileage ? `<div class="status-item"><span>Текущий пробег:</span><span>${car.currentMileage.toLocaleString()} км</span></div>` : ''}
                        <div class="status-item">
                            <span>Общий статус ТО:</span>
                            <span class="status-badge status-${this.calculateCarStatus(car).maintenance}">
                                ${this.calculateCarStatus(car).maintenance === 'normal' ? '✅ В норме' : 
                                  this.calculateCarStatus(car).maintenance === 'warning' ? '⚠️ Скоро ТО' : '❌ Просрочено'}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>🔧 Текущее состояние компонентов</h3>
                    <div class="component-grid">
                        ${this.renderComponentStatus(car)}
                    </div>
                </div>

                <div class="detail-section">
                    <h3>📊 Детальная информация по компонентам</h3>
                    <div class="component-list">${this.renderMaintenanceComponents(car)}</div>
                </div>

                ${this.renderInsuranceSection(car)}

                <div class="detail-section">
                    <h3>📋 История последних замен</h3>
                    ${this.renderMaintenanceHistory(car)}
                </div>
            </main>
        `;
    }

    // Секция страховок с карточками
    renderInsuranceSection(car) {
        // Конвертируем старую структуру в новую для совместимости
        let insuranceArray = [];
        if (Array.isArray(car.insurance)) {
            insuranceArray = car.insurance;
        } else if (car.insurance && car.insurance.number) {
            insuranceArray = [car.insurance];
        }

        const insuranceCards = insuranceArray.map(insurance => {
            const isActive = insurance.endDate && new Date(insurance.endDate) > new Date();
            const statusClass = isActive ? 'status-active' : 'status-expired';
            const statusText = isActive ? 'Активна' : 'Истекла';
            
            return `
                <div class="insurance-card ${isActive ? 'active' : 'expired'}">
                    <div class="insurance-header">
                        <span class="insurance-type ${insurance.type}">${insurance.type === 'kasko' ? 'КАСКО' : 'ОСАГО'}</span>
                        <span class="insurance-status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="insurance-number">${insurance.number}</div>
                    <div class="insurance-company">${insurance.company}</div>
                    <div class="insurance-dates">
                        ${insurance.startDate ? `${new Date(insurance.startDate).toLocaleDateString()} - ` : ''}
                        ${insurance.endDate ? new Date(insurance.endDate).toLocaleDateString() : 'нет даты'}
                    </div>
                    <div class="insurance-actions">
                        <button class="btn-small" onclick="carUI.editInsuranceCard(${car.id}, '${insurance.number}')">✏️</button>
                        <button class="btn-small btn-danger" onclick="carUI.deleteInsurance(${car.id}, '${insurance.number}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="detail-section">
                <div class="section-header">
                    <h3>🎫 Страховки</h3>
                    <button class="btn-primary" onclick="carUI.showInsuranceForm(${car.id})">➕ Добавить страховку</button>
                </div>
                ${insuranceArray.length > 0 ? `
                    <div class="insurance-grid">
                        ${insuranceCards}
                    </div>
                ` : `
                    <div class="empty-state">
                        <p>Нет добавленных страховок</p>
                    </div>
                `}
            </div>
        `;
    }

    // Отрисовка статуса компонентов в виде сетки
    renderComponentStatus(car) {
        if (!car.intervals) return '<p>Нет данных о ТО</p>';

        let componentsHTML = '';
        const criticalComponents = this.calculateCarStatus(car).criticalItems;
        
        for (const [componentKey, interval] of Object.entries(car.intervals)) {
            const lastChange = car.lastChanges?.[componentKey];
            const componentName = this.getComponentName(componentKey);
            const nextMileage = lastChange ? lastChange.mileage + interval.mileage : null;
            const currentMileage = car.currentMileage || 0;
            
            let status = 'normal';
            let statusText = 'НОРМА';
            let progress = 100;
            
            if (lastChange && nextMileage) {
                const mileagePassed = currentMileage - lastChange.mileage;
                const totalInterval = interval.mileage;
                progress = Math.min(100, Math.max(0, (mileagePassed / totalInterval) * 100));
                
                if (currentMileage >= nextMileage) {
                    status = 'danger';
                    statusText = 'ПРОСРОЧЕНО';
                    progress = 100;
                } else if (progress > 80) {
                    status = 'warning';
                    statusText = 'СКОРО';
                }
            } else {
                status = 'warning';
                statusText = 'НЕТ ДАННЫХ';
                progress = 0;
            }
            
            componentsHTML += `
                <div class="component-status-card ${status}">
                    <div class="component-status-header">
                        <span class="component-status-name">${componentName}</span>
                        <span class="status-badge status-${status}">${statusText}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill progress-${status}" style="width: ${progress}%"></div>
                    </div>
                    <div class="component-status-details">
                        ${lastChange ? `
                            <span><strong>Заменено:</strong> ${lastChange.mileage?.toLocaleString()} км</span>
                            <span><strong>Следующая:</strong> ${nextMileage?.toLocaleString()} км</span>
                        ` : '<span>Нет данных о замене</span>'}
                    </div>
                    <button class="btn-small" onclick="carUI.showMaintenanceForm(${car.id}, '${componentKey}', '${componentName}')">
                        ${lastChange ? '✏️ Обновить' : '📝 Записать'}
                    </button>
                </div>
            `;
        }

        return componentsHTML;
    }

    // Отрисовка детальной информации по компонентам
    renderMaintenanceComponents(car) {
        if (!car.intervals) return '<p>Нет данных о ТО</p>';

        let componentsHTML = '';
        
        for (const [componentKey, interval] of Object.entries(car.intervals)) {
            const lastChange = car.lastChanges?.[componentKey];
            const componentName = this.getComponentName(componentKey);
            const nextMileage = lastChange ? lastChange.mileage + interval.mileage : null;
            const currentMileage = car.currentMileage || 0;
            
            let status = 'normal';
            let statusText = 'Норма';
            
            if (nextMileage && currentMileage >= nextMileage) {
                status = 'danger';
                statusText = 'ПРОСРОЧЕНО';
            } else if (nextMileage && (nextMileage - currentMileage) < interval.mileage * 0.2) {
                status = 'warning';
                statusText = 'СКОРО';
            }
            
            componentsHTML += `
                <div class="component-detail-item">
                    <div class="component-detail-header">
                        <h4>${componentName}</h4>
                        <span class="status-badge status-${status}">${statusText}</span>
                    </div>
                    
                    <div class="component-detail-info">
                        <div class="detail-row">
                            <span class="detail-label">Интервал замены:</span>
                            <span class="detail-value">${interval.mileage.toLocaleString()} км / ${interval.months} мес.</span>
                        </div>
                        
                        ${lastChange ? `
                            <div class="detail-row">
                                <span class="detail-label">Последняя замена:</span>
                                <span class="detail-value">${lastChange.date ? new Date(lastChange.date).toLocaleDateString() : 'нет даты'} (${lastChange.mileage?.toLocaleString()} км)</span>
                            </div>
                            ${lastChange.oilBrand ? `
                            <div class="detail-row">
                                <span class="detail-label">Марка масла:</span>
                                <span class="detail-value oil-brand">${lastChange.oilBrand}</span>
                            </div>
                            ` : ''}
                            ${lastChange.notes ? `
                            <div class="detail-row">
                                <span class="detail-label">Заметки:</span>
                                <span class="detail-value notes">${lastChange.notes}</span>
                            </div>
                            ` : ''}
                        ` : `
                            <div class="detail-row">
                                <span class="detail-label">Последняя замена:</span>
                                <span class="detail-value">Нет данных</span>
                            </div>
                        `}
                        
                        ${nextMileage ? `
                            <div class="detail-row">
                                <span class="detail-label">Следующая замена:</span>
                                <span class="detail-value">${nextMileage.toLocaleString()} км</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Осталось до замены:</span>
                                <span class="detail-value ${nextMileage - currentMileage < 0 ? 'danger' : ''}">
                                    ${Math.abs(nextMileage - currentMileage).toLocaleString()} км
                                    ${nextMileage - currentMileage < 0 ? ' (просрочено)' : ''}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="component-detail-actions">
                        <button class="btn-small" onclick="carUI.showMaintenanceForm(${car.id}, '${componentKey}', '${componentName}')">
                            ${lastChange ? '✏️ Редактировать замену' : '📝 Записать замену'}
                        </button>
                    </div>
                </div>
            `;
        }

        return componentsHTML;
    }

    // Названия компонентов
    getComponentName(key) {
        const names = {
            engineOil: 'Моторное масло', atf: 'Масло в АКПП', rearDiff: 'Масло в заднем редукторе',
            transferCase: 'Масло в раздаточной коробке', timingBelt: 'Ремень ГРМ', fuelFilter: 'Топливный фильтр',
            turboInspection: 'Диагностика турбины', intercoolerCleaning: 'Чистка интеркулера', glowPlugs: 'Свечи накала',
            airFilter: 'Воздушный фильтр', cabinFilter: 'Салонный фильтр', brakeFluid: 'Тормозная жидкость',
            coolant: 'Охлаждающая жидкость', haldexOil: 'Масло в муфте Haldex', haldexFilter: 'Фильтр Haldex',
            egrCleaning: 'Чистка EGR'
        };
        return names[key] || key;
    }

    // Отрисовка истории замен
    renderMaintenanceHistory(car) {
        if (!car.lastChanges || Object.keys(car.lastChanges).length === 0) {
            return '<p>Нет данных о заменах</p>';
        }

        // Сортируем замены по дате (новые сверху)
        const sortedChanges = Object.entries(car.lastChanges)
            .sort(([,a], [,b]) => new Date(b.date) - new Date(a.date))
            .slice(0, 10); // Показываем последние 10 замен

        let historyHTML = '<div class="history-list">';
        
        for (const [componentKey, change] of sortedChanges) {
            const componentName = this.getComponentName(componentKey);
            
            historyHTML += `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-component">${componentName}</span>
                        <span class="history-date">${change.date ? new Date(change.date).toLocaleDateString() : 'нет даты'}</span>
                    </div>
                    <div class="history-details">
                        <span class="history-mileage">${change.mileage?.toLocaleString()} км</span>
                        ${change.oilBrand ? `<span class="history-oil">${change.oilBrand}</span>` : ''}
                    </div>
                    ${change.notes ? `<div class="history-notes">${change.notes}</div>` : ''}
                </div>
            `;
        }
        
        historyHTML += '</div>';
        return historyHTML;
    }

    // МЕТОДЫ ДЛЯ РАБОТЫ СО СТРАХОВКАМИ

    // Показать форму добавления/редактирования страховки
    async showInsuranceForm(carId, insuranceNumber = null) {
        try {
            const car = await carDB.getCar(carId);
            if (!car) {
                this.showNotification('Автомобиль не найден', 'error');
                return;
            }

            // Конвертируем старую структуру в новую
            let insuranceArray = [];
            if (Array.isArray(car.insurance)) {
                insuranceArray = car.insurance;
            } else if (car.insurance && car.insurance.number) {
                insuranceArray = [car.insurance];
            }

            const isEdit = !!insuranceNumber;
            let insuranceData = null;
            
            if (isEdit) {
                insuranceData = insuranceArray.find(ins => ins.number === insuranceNumber);
                if (!insuranceData) {
                    this.showNotification('Страховка не найдена', 'error');
                    return;
                }
            }

            const formHTML = `
                <div class="modal" id="insuranceModal" style="display: block;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>${isEdit ? 'Редактировать' : 'Добавить'} страховку</h2>
                            <span class="close" onclick="document.getElementById('insuranceModal').style.display='none'">&times;</span>
                        </div>
                        <form id="insuranceForm">
                            <div class="form-group">
                                <label for="insuranceNumber">Номер полиса *</label>
                                <input type="text" id="insuranceNumber" value="${insuranceData?.number || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="insuranceCompany">Страховая компания *</label>
                                <input type="text" id="insuranceCompany" value="${insuranceData?.company || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="insuranceType">Тип страховки</label>
                                <select id="insuranceType">
                                    <option value="osago" ${(insuranceData?.type || 'osago') === 'osago' ? 'selected' : ''}>ОСАГО</option>
                                    <option value="kasko" ${insuranceData?.type === 'kasko' ? 'selected' : ''}>КАСКО</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="insuranceStartDate">Дата начала</label>
                                <input type="date" id="insuranceStartDate" value="${insuranceData?.startDate || new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label for="insuranceEndDate">Дата окончания *</label>
                                <input type="date" id="insuranceEndDate" value="${insuranceData?.endDate || ''}" required>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="document.getElementById('insuranceModal').style.display='none'">Отмена</button>
                                <button type="submit" class="btn-primary">${isEdit ? 'Обновить' : 'Добавить'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            if (document.getElementById('insuranceModal')) {
                document.getElementById('insuranceModal').remove();
            }
            
            document.body.insertAdjacentHTML('beforeend', formHTML);
            
            document.getElementById('insuranceForm').onsubmit = async (e) => {
                e.preventDefault();
                await this.saveInsurance(carId, insuranceNumber);
            };
            
        } catch (error) {
            console.error('❌ Ошибка показа формы страховки:', error);
            this.showNotification('Ошибка загрузки формы', 'error');
        }
    }

    // Сохранение страховки
    async saveInsurance(carId, originalNumber = null) {
        try {
            const number = document.getElementById('insuranceNumber').value;
            const company = document.getElementById('insuranceCompany').value;
            const type = document.getElementById('insuranceType').value;
            const startDate = document.getElementById('insuranceStartDate').value;
            const endDate = document.getElementById('insuranceEndDate').value;

            if (!number || !company || !endDate) {
                this.showNotification('Заполните обязательные поля', 'warning');
                return;
            }

            const car = await carDB.getCar(carId);
            
            // Конвертируем старую структуру в новую
            let insuranceArray = [];
            if (Array.isArray(car.insurance)) {
                insuranceArray = car.insurance;
            } else if (car.insurance && car.insurance.number) {
                insuranceArray = [car.insurance];
            }

            const insuranceData = {
                number,
                company,
                type,
                startDate: startDate || new Date().toISOString().split('T')[0],
                endDate,
                isActive: new Date(endDate) > new Date()
            };

            const isEdit = !!originalNumber;
            
            if (isEdit) {
                // Редактирование существующей страховки
                const index = insuranceArray.findIndex(ins => ins.number === originalNumber);
                if (index !== -1) {
                    insuranceArray[index] = insuranceData;
                }
            } else {
                // Добавление новой страховки
                insuranceArray.push(insuranceData);
            }

            await carDB.updateCar(carId, { insurance: insuranceArray });
            
            document.getElementById('insuranceModal').style.display = 'none';
            this.showNotification(`Страховка ${isEdit ? 'обновлена' : 'добавлена'}`, 'success');
            
            // Обновляем детальную страницу
            const updatedCar = await carDB.getCar(carId);
            this.renderCarDetail(updatedCar);
            
        } catch (error) {
            console.error('❌ Ошибка сохранения страховки:', error);
            this.showNotification('Ошибка при сохранении страховки', 'error');
        }
    }

    // Редактирование карточки страховки
    async editInsuranceCard(carId, insuranceNumber) {
        await this.showInsuranceForm(carId, insuranceNumber);
    }

    // Удаление страховки
    async deleteInsurance(carId, insuranceNumber) {
        if (!confirm('Удалить эту страховку?')) return;

        try {
            const car = await carDB.getCar(carId);
            
            // Конвертируем старую структуру в новую
            let insuranceArray = [];
            if (Array.isArray(car.insurance)) {
                insuranceArray = car.insurance;
            } else if (car.insurance && car.insurance.number) {
                insuranceArray = [car.insurance];
            }

            insuranceArray = insuranceArray.filter(ins => ins.number !== insuranceNumber);
            
            await carDB.updateCar(carId, { insurance: insuranceArray });
            this.showNotification('Страховка удалена', 'success');
            
            // Обновляем детальную страницу
            const updatedCar = await carDB.getCar(carId);
            this.renderCarDetail(updatedCar);
            
        } catch (error) {
            console.error('❌ Ошибка удаления страховки:', error);
            this.showNotification('Ошибка при удалении страховки', 'error');
        }
    }

    // Показать форму для записи ТО
    async showMaintenanceForm(carId, componentKey, componentName) {
        try {
            const car = await carDB.getCar(carId);
            if (!car) {
                this.showNotification('Автомобиль не найден', 'error');
                return;
            }

            const currentMileage = car.currentMileage || 0;
            const lastChange = car.lastChanges?.[componentKey];
            
            const formHTML = `
                <div class="modal" id="maintenanceModal" style="display: block;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Запись ТО: ${componentName}</h2>
                            <span class="close" onclick="document.getElementById('maintenanceModal').style.display='none'">&times;</span>
                        </div>
                        <form id="maintenanceForm">
                            <div class="form-group">
                                <label for="maintenanceDate">Дата замены *</label>
                                <input type="date" id="maintenanceDate" value="${new Date().toISOString().split('T')[0]}" required>
                            </div>
                            <div class="form-group">
                                <label for="maintenanceMileage">Пробег при замене *</label>
                                <input type="number" id="maintenanceMileage" value="${currentMileage}" required>
                            </div>
                            <div class="form-group">
                                <label for="maintenanceOilBrand">Марка масла/материала</label>
                                <input type="text" id="maintenanceOilBrand" placeholder="Например: Mobil 1 5W-30" value="${lastChange?.oilBrand || ''}">
                            </div>
                            <div class="form-group">
                                <label for="maintenanceNotes">Заметки</label>
                                <textarea id="maintenanceNotes" placeholder="Дополнительная информация..." rows="3">${lastChange?.notes || ''}</textarea>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="document.getElementById('maintenanceModal').style.display='none'">Отмена</button>
                                <button type="submit" class="btn-primary">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            if (document.getElementById('maintenanceModal')) {
                document.getElementById('maintenanceModal').remove();
            }
            
            document.body.insertAdjacentHTML('beforeend', formHTML);
            
            document.getElementById('maintenanceForm').onsubmit = async (e) => {
                e.preventDefault();
                await this.saveMaintenance(carId, componentKey, componentName);
            };
            
        } catch (error) {
            console.error('❌ Ошибка показа формы ТО:', error);
            this.showNotification('Ошибка загрузки формы', 'error');
        }
    }

    // Сохранение данных ТО
    async saveMaintenance(carId, componentKey, componentName) {
        try {
            const date = document.getElementById('maintenanceDate').value;
            const mileage = parseInt(document.getElementById('maintenanceMileage').value);
            const oilBrand = document.getElementById('maintenanceOilBrand').value;
            const notes = document.getElementById('maintenanceNotes').value;

            if (!date || !mileage) {
                this.showNotification('Заполните обязательные поля', 'warning');
                return;
            }

            const maintenanceData = {
                mileage: mileage,
                date: date,
                oilBrand: oilBrand || '',
                notes: notes || ''
            };

            const car = await carDB.getCar(carId);
            const updatedLastChanges = {
                ...car.lastChanges,
                [componentKey]: maintenanceData
            };

            await carDB.updateCar(carId, { 
                lastChanges: updatedLastChanges,
                currentMileage: mileage
            });

            document.getElementById('maintenanceModal').style.display = 'none';
            this.showNotification(`Замена ${componentName} записана`, 'success');
            
            const updatedCar = await carDB.getCar(carId);
            this.renderCarDetail(updatedCar);
            
        } catch (error) {
            console.error('❌ Ошибка сохранения ТО:', error);
            this.showNotification('Ошибка при записи ТО', 'error');
        }
    }

    // Показать список автомобилей
    showCarList() {
        location.reload();
    }

    // Показать уведомление
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notifications.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
}

// Создаем экземпляр UI
const carUI = new CarUI();