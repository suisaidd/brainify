/**
 * CDN Loader with Fallback System
 * Обеспечивает надежную загрузку внешних библиотек с fallback механизмами
 */

class CDNLoader {
    constructor() {
        this.loadedLibraries = new Set();
        this.failedLibraries = new Set();
        this.loadPromises = new Map();
    }

    /**
     * Загружает скрипт с fallback источниками
     */
    async loadScript(sources, options = {}) {
        const {
            id = null,
            timeout = 10000,
            retries = 3,
            onProgress = null,
            onError = null
        } = options;

        // Проверяем, не загружен ли уже
        if (id && this.loadedLibraries.has(id)) {
            return Promise.resolve();
        }

        // Проверяем, не провалился ли уже
        if (id && this.failedLibraries.has(id)) {
            return Promise.reject(new Error(`Library ${id} previously failed to load`));
        }

        // Проверяем, не загружается ли уже
        if (id && this.loadPromises.has(id)) {
            return this.loadPromises.get(id);
        }

        const loadPromise = this._loadScriptWithFallback(sources, {
            id,
            timeout,
            retries,
            onProgress,
            onError
        });

        if (id) {
            this.loadPromises.set(id, loadPromise);
        }

        try {
            await loadPromise;
            if (id) {
                this.loadedLibraries.add(id);
                this.loadPromises.delete(id);
            }
        } catch (error) {
            if (id) {
                this.failedLibraries.add(id);
                this.loadPromises.delete(id);
            }
            throw error;
        }

        return loadPromise;
    }

    /**
     * Загружает CSS с fallback источниками
     */
    async loadCSS(sources, options = {}) {
        const {
            id = null,
            timeout = 8000,
            retries = 2
        } = options;

        if (id && this.loadedLibraries.has(id)) {
            return Promise.resolve();
        }

        for (let i = 0; i < sources.length; i++) {
            const source = sources[i];
            try {
                await this._loadCSS(source, timeout);
                if (id) {
                    this.loadedLibraries.add(id);
                }
                console.log(`✅ CSS loaded from: ${source}`);
                return;
            } catch (error) {
                console.warn(`⚠️ Failed to load CSS from ${source}:`, error.message);
                if (i === sources.length - 1) {
                    throw new Error(`All CSS sources failed. Last error: ${error.message}`);
                }
            }
        }
    }

    /**
     * Внутренний метод загрузки скрипта с fallback
     */
    async _loadScriptWithFallback(sources, options) {
        const { timeout, retries, onProgress, onError } = options;

        for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex++) {
            const source = sources[sourceIndex];
            
            for (let attempt = 0; attempt < retries; attempt++) {
                try {
                    if (onProgress) {
                        onProgress(source, attempt + 1, retries);
                    }

                    await this._loadScript(source, timeout);
                    console.log(`✅ Script loaded from: ${source}`);
                    return;
                } catch (error) {
                    console.warn(`⚠️ Attempt ${attempt + 1}/${retries} failed for ${source}:`, error.message);
                    
                    if (attempt === retries - 1 && sourceIndex === sources.length - 1) {
                        if (onError) {
                            onError(error, source);
                        }
                        throw new Error(`All script sources failed. Last error: ${error.message}`);
                    }
                    
                    // Небольшая задержка перед повтором
                    if (attempt < retries - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    }
                }
            }
        }
    }

    /**
     * Загружает отдельный скрипт
     */
    _loadScript(src, timeout) {
        return new Promise((resolve, reject) => {
            // Проверяем, не загружен ли уже этот скрипт
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            
            const timeoutId = setTimeout(() => {
                script.remove();
                reject(new Error(`Script load timeout: ${src}`));
            }, timeout);

            script.onload = () => {
                clearTimeout(timeoutId);
                resolve();
            };

            script.onerror = () => {
                clearTimeout(timeoutId);
                script.remove();
                reject(new Error(`Script load error: ${src}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Загружает отдельный CSS файл
     */
    _loadCSS(href, timeout) {
        return new Promise((resolve, reject) => {
            // Проверяем, не загружен ли уже этот CSS
            const existingLink = document.querySelector(`link[href="${href}"]`);
            if (existingLink) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.crossOrigin = 'anonymous';
            
            const timeoutId = setTimeout(() => {
                link.remove();
                reject(new Error(`CSS load timeout: ${href}`));
            }, timeout);

            link.onload = () => {
                clearTimeout(timeoutId);
                resolve();
            };

            link.onerror = () => {
                clearTimeout(timeoutId);
                link.remove();
                reject(new Error(`CSS load error: ${href}`));
            };

            document.head.appendChild(link);
        });
    }

    /**
     * Проверяет доступность URL
     */
    async checkAvailability(url) {
        try {
            const response = await fetch(url, { 
                method: 'HEAD', 
                mode: 'no-cors',
                cache: 'no-cache'
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Получает статус загруженных библиотек
     */
    getStatus() {
        return {
            loaded: Array.from(this.loadedLibraries),
            failed: Array.from(this.failedLibraries),
            loading: Array.from(this.loadPromises.keys())
        };
    }
}

// Глобальный экземпляр
window.CDNLoader = new CDNLoader();

// Предопределенные источники для популярных библиотек
window.CDN_SOURCES = {
    react: [
        'https://cdnjs.cloudflare.com/ajax/libs/react/17.0.2/umd/react.production.min.js',
        'https://cdn.jsdelivr.net/npm/react@17/umd/react.production.min.js',
        'https://unpkg.com/react@17/umd/react.production.min.js'
    ],
    reactDOM: [
        'https://cdnjs.cloudflare.com/ajax/libs/react-dom/17.0.2/umd/react-dom.production.min.js',
        'https://cdn.jsdelivr.net/npm/react-dom@17/umd/react-dom.production.min.js',
        'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js'
    ],
    excalidraw: [
        'https://unpkg.com/@excalidraw/excalidraw@0.17.3/dist/excalidraw.production.min.js',
        'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.17.3/dist/excalidraw.production.min.js',
        'https://unpkg.com/@excalidraw/excalidraw@0.17.2/dist/excalidraw.production.min.js',
        'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.17.2/dist/excalidraw.production.min.js'
    ],
    excalidrawCSS: [
        '/css/excalidraw/excalidraw.min.css' // Только локальный файл
    ],
    sockjs: [
        'https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js',
        'https://unpkg.com/sockjs-client@1/dist/sockjs.min.js'
    ],
    stomp: [
        'https://cdn.jsdelivr.net/npm/stompjs@2.3.3/lib/stomp.min.js',
        'https://unpkg.com/stompjs@2.3.3/lib/stomp.min.js'
    ]
};

console.log('📚 CDN Loader initialized');
