/**
 * React State Manager
 * Улучшенная система управления состоянием для React компонентов
 */

class ReactStateManager {
    constructor() {
        this.state = new Map();
        this.listeners = new Map();
        this.middleware = [];
        this.isInitialized = false;
        this.updateQueue = [];
        this.isUpdating = false;
    }

    /**
     * Инициализация менеджера состояния
     */
    initialize(initialState = {}) {
        if (this.isInitialized) {
            console.warn('StateManager already initialized');
            return;
        }

        // Устанавливаем начальное состояние
        Object.entries(initialState).forEach(([key, value]) => {
            this.state.set(key, value);
        });

        this.isInitialized = true;
        console.log('✅ ReactStateManager initialized with state:', initialState);
    }

    /**
     * Получение значения из состояния
     */
    getState(key) {
        if (!this.isInitialized) {
            console.warn('StateManager not initialized');
            return undefined;
        }
        return this.state.get(key);
    }

    /**
     * Получение всего состояния
     */
    getAllState() {
        if (!this.isInitialized) {
            return {};
        }
        return Object.fromEntries(this.state);
    }

    /**
     * Установка значения в состояние
     */
    setState(key, value, options = {}) {
        if (!this.isInitialized) {
            console.warn('StateManager not initialized');
            return;
        }

        const { silent = false, force = false } = options;
        const oldValue = this.state.get(key);

        // Проверяем, изменилось ли значение
        if (!force && this._deepEqual(oldValue, value)) {
            return;
        }

        // Применяем middleware
        const processedValue = this._applyMiddleware(key, value, oldValue);
        
        // Устанавливаем новое значение
        this.state.set(key, processedValue);

        // Уведомляем слушателей
        if (!silent) {
            this._notifyListeners(key, processedValue, oldValue);
        }

        console.log(`🔄 State updated: ${key}`, { old: oldValue, new: processedValue });
    }

    /**
     * Массовое обновление состояния
     */
    setMultipleState(updates, options = {}) {
        if (!this.isInitialized) {
            console.warn('StateManager not initialized');
            return;
        }

        const { silent = false } = options;
        const changes = [];

        // Собираем все изменения
        Object.entries(updates).forEach(([key, value]) => {
            const oldValue = this.state.get(key);
            if (!this._deepEqual(oldValue, value)) {
                const processedValue = this._applyMiddleware(key, value, oldValue);
                this.state.set(key, processedValue);
                changes.push({ key, value: processedValue, oldValue });
            }
        });

        // Уведомляем слушателей о всех изменениях
        if (!silent && changes.length > 0) {
            this._notifyListeners('*', changes, null);
        }

        console.log(`🔄 Multiple state updates:`, changes);
    }

    /**
     * Подписка на изменения состояния
     */
    subscribe(key, callback, options = {}) {
        const { immediate = false } = options;
        
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        
        this.listeners.get(key).add(callback);

        // Вызываем callback сразу, если требуется
        if (immediate && this.isInitialized) {
            const value = this.state.get(key);
            if (value !== undefined) {
                callback(value, undefined, key);
            }
        }

        // Возвращаем функцию отписки
        return () => {
            const listeners = this.listeners.get(key);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.listeners.delete(key);
                }
            }
        };
    }

    /**
     * Подписка на все изменения состояния
     */
    subscribeAll(callback, options = {}) {
        return this.subscribe('*', callback, options);
    }

    /**
     * Добавление middleware
     */
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * Очистка состояния
     */
    clear() {
        this.state.clear();
        this.listeners.clear();
        this.isInitialized = false;
        console.log('🧹 StateManager cleared');
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            stateKeys: Array.from(this.state.keys()),
            listenerCount: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
            middlewareCount: this.middleware.length
        };
    }

    /**
     * Применение middleware
     */
    _applyMiddleware(key, value, oldValue) {
        let processedValue = value;
        
        for (const middleware of this.middleware) {
            try {
                processedValue = middleware(key, processedValue, oldValue);
            } catch (error) {
                console.error(`Middleware error for key ${key}:`, error);
            }
        }
        
        return processedValue;
    }

    /**
     * Уведомление слушателей
     */
    _notifyListeners(key, value, oldValue) {
        // Уведомляем слушателей конкретного ключа
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(value, oldValue, key);
                } catch (error) {
                    console.error(`Listener error for key ${key}:`, error);
                }
            });
        }

        // Уведомляем слушателей всех изменений
        const allListeners = this.listeners.get('*');
        if (allListeners) {
            allListeners.forEach(callback => {
                try {
                    callback({ [key]: value }, { [key]: oldValue }, key);
                } catch (error) {
                    console.error(`Global listener error for key ${key}:`, error);
                }
            });
        }
    }

    /**
     * Глубокое сравнение объектов
     */
    _deepEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== typeof b) return false;
        
        if (typeof a === 'object') {
            if (Array.isArray(a) !== Array.isArray(b)) return false;
            
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            
            if (keysA.length !== keysB.length) return false;
            
            for (const key of keysA) {
                if (!keysB.includes(key)) return false;
                if (!this._deepEqual(a[key], b[key])) return false;
            }
            
            return true;
        }
        
        return false;
    }
}

// Глобальный экземпляр менеджера состояния
window.ReactStateManager = new ReactStateManager();

// Middleware для логирования
window.ReactStateManager.addMiddleware((key, value, oldValue) => {
    if (key.startsWith('debug_')) {
        console.log(`🔍 State debug [${key}]:`, { old: oldValue, new: value });
    }
    return value;
});

// Middleware для валидации
window.ReactStateManager.addMiddleware((key, value, oldValue) => {
    // Валидация для критических состояний
    if (key === 'excalidrawAPI' && value && typeof value !== 'object') {
        console.warn(`⚠️ Invalid excalidrawAPI state: expected object, got ${typeof value}`);
        return oldValue;
    }
    
    if (key === 'isConnected' && typeof value !== 'boolean') {
        console.warn(`⚠️ Invalid isConnected state: expected boolean, got ${typeof value}`);
        return Boolean(value);
    }
    
    return value;
});

console.log('📊 ReactStateManager initialized');
