/**
 * Debug Helper для отладки проблем с загрузкой библиотек
 */

window.DebugHelper = {
    // Проверка статуса всех библиотек
    checkLibrariesStatus() {
        const status = {
            react: !!window.React,
            reactDOM: !!window.ReactDOM,
            reactJSX: !!(window.React && (window.React.jsx || window.React.jsxs)),
            excalidraw: !!(window.Excalidraw || window.ExcalidrawLib),
            excalidrawComponent: !!(window.Excalidraw || (window.ExcalidrawLib && window.ExcalidrawLib.Excalidraw)),
            sockjs: !!window.SockJS,
            stomp: !!window.Stomp,
            cdnLoader: !!window.CDNLoader,
            stateManager: !!window.ReactStateManager
        };
        
        console.log('📊 Libraries Status:', status);
        return status;
    },
    
    // Проверка доступности CDN
    async testCDNAvailability() {
        const sources = [
            'https://unpkg.com/react@17/umd/react.production.min.js',
            'https://unpkg.com/@excalidraw/excalidraw@0.17.3/dist/excalidraw.production.min.js',
            'https://unpkg.com/@excalidraw/excalidraw@0.17.2/dist/excalidraw.production.min.js'
        ];
        
        const results = {};
        
        for (const source of sources) {
            try {
                const response = await fetch(source, { method: 'HEAD', mode: 'no-cors' });
                results[source] = 'available';
            } catch (error) {
                results[source] = 'unavailable';
            }
        }
        
        console.log('🌐 CDN Availability:', results);
        return results;
    },
    
    // Принудительная загрузка Excalidraw
    async forceLoadExcalidraw() {
        console.log('🔄 Force loading Excalidraw...');
        
        const sources = [
            'https://unpkg.com/@excalidraw/excalidraw@0.17.3/dist/excalidraw.production.min.js',
            'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.17.3/dist/excalidraw.production.min.js',
            'https://unpkg.com/@excalidraw/excalidraw@0.17.2/dist/excalidraw.production.min.js'
        ];
        
        for (const source of sources) {
            try {
                console.log(`🔄 Trying ${source}...`);
                await window.CDNLoader.loadScript([source], {
                    id: 'excalidraw-force',
                    timeout: 15000,
                    retries: 1
                });
                
                if (window.Excalidraw || window.ExcalidrawLib) {
                    console.log('✅ Excalidraw loaded successfully!');
                    return true;
                }
            } catch (error) {
                console.warn(`⚠️ Failed to load from ${source}:`, error);
            }
        }
        
        console.error('❌ Failed to load Excalidraw from all sources');
        return false;
    },
    
    // Очистка и перезагрузка
    clearAndReload() {
        console.log('🧹 Clearing and reloading...');
        
        // Очищаем загруженные скрипты
        const scripts = document.querySelectorAll('script[src*="excalidraw"]');
        scripts.forEach(script => script.remove());
        
        // Очищаем CSS
        const links = document.querySelectorAll('link[href*="excalidraw"]');
        links.forEach(link => link.remove());
        
        // Очищаем глобальные переменные
        delete window.Excalidraw;
        delete window.ExcalidrawLib;
        
        console.log('✅ Cleared, reloading...');
        
        // Перезагружаем
        setTimeout(() => {
            this.forceLoadExcalidraw();
        }, 1000);
    },
    
    // Полная диагностика
    async fullDiagnostic() {
        console.log('🔍 Starting full diagnostic...');
        
        const librariesStatus = this.checkLibrariesStatus();
        const cdnStatus = await this.testCDNAvailability();
        
        const diagnostic = {
            timestamp: new Date().toISOString(),
            libraries: librariesStatus,
            cdn: cdnStatus,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.log('📋 Full Diagnostic Report:', diagnostic);
        return diagnostic;
    }
};

// Автоматическая диагностика при загрузке
window.addEventListener('load', () => {
    setTimeout(() => {
        window.DebugHelper.fullDiagnostic();
    }, 3000);
});

console.log('🔧 Debug Helper loaded');
