/**
 * CodeForge IDE - UI Manager
 * Handles all UI interactions and DOM updates
 */

class UIManager {
    constructor() {
        this.elements = {};
        this.activeModal = null;
        this.toastQueue = [];
        this.resizing = null;
    }

    /**
     * Initialize UI elements
     */
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.setupResizers();
        this.setupModals();
        this.setupKeyboardShortcuts();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Splash
            splashScreen: document.getElementById('splash-screen'),
            app: document.getElementById('app'),
            
            // Toolbar
            btnRun: document.getElementById('btn-run'),
            btnDebug: document.getElementById('btn-debug'),
            btnStop: document.getElementById('btn-stop'),
            btnTheme: document.getElementById('btn-theme'),
            btnFullscreen: document.getElementById('btn-fullscreen'),
            languageSelect: document.getElementById('language-select'),
            
            // Sidebar
            sidebarTabs: document.querySelectorAll('.sidebar-tab'),
            sidebarPanels: document.querySelectorAll('.sidebar-panel'),
            fileTree: document.getElementById('file-tree'),
            
            // Debug
            breakpointsList: document.getElementById('breakpoints-list'),
            callstackList: document.getElementById('callstack-list'),
            variablesList: document.getElementById('variables-list'),
            debugContinue: document.getElementById('debug-continue'),
            debugStepOver: document.getElementById('debug-step-over'),
            debugStepInto: document.getElementById('debug-step-into'),
            debugStepOut: document.getElementById('debug-step-out'),
            debugRestart: document.getElementById('debug-restart'),
            debugStop: document.getElementById('debug-stop'),
            
            // Settings
            fontSize: document.getElementById('font-size'),
            fontSizeValue: document.getElementById('font-size-value'),
            tabSize: document.getElementById('tab-size'),
            wordWrap: document.getElementById('word-wrap'),
            lineNumbers: document.getElementById('line-numbers'),
            minimap: document.getElementById('minimap'),
            bracketMatching: document.getElementById('bracket-matching'),
            
            // Editor
            editorTabs: document.getElementById('editor-tabs'),
            monacoEditor: document.getElementById('monaco-editor'),
            
            // Bottom Panel
            panelTabs: document.querySelectorAll('.panel-tab'),
            panelViews: document.querySelectorAll('.panel-view'),
            consoleOutput: document.getElementById('console-output'),
            consoleInput: document.getElementById('console-input'),
            consoleClear: document.getElementById('console-clear'),
            consoleFilter: document.querySelectorAll('.filter-btn'),
            outputContent: document.getElementById('output-content'),
            problemsList: document.getElementById('problems-list'),
            problemsCount: document.getElementById('problems-count'),
            
            // Status Bar
            statusLanguage: document.getElementById('status-language'),
            statusPosition: document.getElementById('status-position'),
            statusSelection: document.getElementById('status-selection'),
            statusMessage: document.getElementById('status-message'),
            
            // Modals
            newFileModal: document.getElementById('new-file-modal'),
            settingsModal: document.getElementById('settings-modal'),
            shortcutsModal: document.getElementById('shortcuts-modal'),
            aboutModal: document.getElementById('about-modal'),
            inputModal: document.getElementById('input-modal'),
            
            // Toast
            toastContainer: document.getElementById('toast-container')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Menu dropdown handling
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // 如果点击的是下拉菜单内的按钮，关闭菜单
                if (e.target.closest('.dropdown')) {
                    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                    return;
                }
                const isActive = item.classList.contains('active');
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
        
        // Close menu on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.menu-item')) {
                document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            }
        });
        
        // Sidebar tabs
        this.elements.sidebarTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchSidebarTab(tabName);
            });
        });
        
        // Panel tabs
        this.elements.panelTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchPanelTab(tabName);
            });
        });
        
        // Console filter
        this.elements.consoleFilter.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.consoleFilter.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterConsole(btn.dataset.filter);
            });
        });
        
        // Console clear
        this.elements.consoleClear?.addEventListener('click', () => {
            this.clearConsole();
        });
        
        // Console input
        this.elements.consoleInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const value = e.target.value.trim();
                if (value) {
                    document.dispatchEvent(new CustomEvent('console:input', { detail: value }));
                    e.target.value = '';
                }
            }
        });
        
        // Settings panel tabs
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.querySelector(`.settings-panel[data-panel="${tab.dataset.tab}"]`)?.classList.add('active');
            });
        });
        
        // Font size slider
        this.elements.fontSize?.addEventListener('input', (e) => {
            const size = e.target.value;
            this.elements.fontSizeValue.textContent = `${size}px`;
            document.dispatchEvent(new CustomEvent('settings:fontSize', { detail: parseInt(size) }));
        });
        
        // Tab size
        this.elements.tabSize?.addEventListener('change', (e) => {
            document.dispatchEvent(new CustomEvent('settings:tabSize', { detail: parseInt(e.target.value) }));
        });
        
        // Word wrap toggle
        this.elements.wordWrap?.addEventListener('change', (e) => {
            document.dispatchEvent(new CustomEvent('settings:wordWrap', { detail: e.target.checked }));
        });
        
        // Line numbers toggle
        this.elements.lineNumbers?.addEventListener('change', (e) => {
            document.dispatchEvent(new CustomEvent('settings:lineNumbers', { detail: e.target.checked }));
        });
        
        // Minimap toggle
        this.elements.minimap?.addEventListener('change', (e) => {
            document.dispatchEvent(new CustomEvent('settings:minimap', { detail: e.target.checked }));
        });
        
        // Bracket matching toggle
        this.elements.bracketMatching?.addEventListener('change', (e) => {
            document.dispatchEvent(new CustomEvent('settings:bracketMatching', { detail: e.target.checked }));
        });
        
        // Theme toggle
        this.elements.btnTheme?.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('ui:toggleTheme'));
        });
        
        // Fullscreen toggle
        this.elements.btnFullscreen?.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Menu actions
        document.querySelectorAll('.dropdown button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                document.dispatchEvent(new CustomEvent('menu:action', { detail: action }));
            });
        });
        
        // Panel header actions
        document.querySelectorAll('.panel-actions button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                document.dispatchEvent(new CustomEvent('menu:action', { detail: action }));
            });
        });
    }

    /**
     * Setup resizers
     */
    setupResizers() {
        const sidebarResizer = document.getElementById('sidebar-resizer');
        const panelResizer = document.getElementById('panel-resizer');
        
        if (sidebarResizer) {
            this.setupResizer(sidebarResizer, 'horizontal', (width) => {
                document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
            }, 180, 400);
        }
        
        if (panelResizer) {
            this.setupResizer(panelResizer, 'vertical', (height) => {
                document.documentElement.style.setProperty('--panel-height', `${height}px`);
            }, 100, 500);
        }
    }

    /**
     * Setup individual resizer
     */
    setupResizer(element, direction, callback, min, max) {
        let startPos, startSize;
        
        const onMouseDown = (e) => {
            e.preventDefault();
            startPos = direction === 'horizontal' ? e.clientX : e.clientY;
            
            if (direction === 'horizontal') {
                startSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'));
            } else {
                startSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-height'));
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
        };
        
        const onMouseMove = (e) => {
            const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
            let newSize;
            
            if (direction === 'horizontal') {
                newSize = startSize + (currentPos - startPos);
            } else {
                newSize = startSize - (currentPos - startPos);
            }
            
            newSize = Math.max(min, Math.min(max, newSize));
            callback(newSize);
            
            // Trigger editor layout update
            document.dispatchEvent(new CustomEvent('ui:resize'));
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        
        element.addEventListener('mousedown', onMouseDown);
    }

    /**
     * Setup modals
     */
    setupModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            // Close on overlay click
            const overlay = modal.querySelector('.modal-overlay');
            overlay?.addEventListener('click', () => this.closeModal(modal.id));
            
            // Close button
            modal.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
                btn.addEventListener('click', () => this.closeModal(modal.id));
            });
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape - close modal
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal(this.activeModal);
                return;
            }
            
            // Ctrl/Cmd + N - New file
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openModal('new-file-modal');
            }
        });
    }

    /**
     * Hide splash screen
     */
    hideSplash() {
        this.elements.splashScreen?.classList.add('fade-out');
        this.elements.app?.classList.remove('hidden');
        
        setTimeout(() => {
            this.elements.splashScreen?.remove();
        }, 500);
    }

    /**
     * Update splash message
     */
    updateSplashMessage(message) {
        const splashText = document.querySelector('.splash-text');
        if (splashText) {
            splashText.textContent = message;
        }
    }

    /**
     * Switch sidebar tab
     */
    switchSidebarTab(tabName) {
        this.elements.sidebarTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        this.elements.sidebarPanels.forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === tabName);
        });
    }

    /**
     * Switch panel tab
     */
    switchPanelTab(tabName) {
        this.elements.panelTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        this.elements.panelViews.forEach(view => {
            view.classList.toggle('active', view.dataset.view === tabName);
        });
    }

    /**
     * Render file tree
     */
    renderFileTree(files, activeFileId) {
        const tree = this.elements.fileTree;
        if (!tree) return;
        
        tree.innerHTML = files.map(file => {
            const langConfig = CONFIG.languages[file.language];
            const icon = langConfig?.icon || 'fas fa-file-code';
            const isActive = file.id === activeFileId;
            
            return `
                <div class="file-item ${isActive ? 'active' : ''}" data-file-id="${file.id}">
                    <i class="${icon}"></i>
                    <span class="file-name">${Utils.escapeHtml(file.name)}</span>
                    <div class="file-actions">
                        <button data-action="delete-file" title="删除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        tree.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.file-actions')) {
                    const fileId = item.dataset.fileId;
                    document.dispatchEvent(new CustomEvent('file:select', { detail: fileId }));
                }
            });
            
            item.querySelector('[data-action="delete-file"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = item.dataset.fileId;
                if (confirm('确定要删除这个文件吗？')) {
                    document.dispatchEvent(new CustomEvent('file:delete', { detail: fileId }));
                }
            });
        });
    }

    /**
     * Render editor tabs
     */
    renderEditorTabs(files, activeFileId) {
        const tabs = this.elements.editorTabs;
        if (!tabs) return;
        
        tabs.innerHTML = files.map(file => {
            const langConfig = CONFIG.languages[file.language];
            const icon = langConfig?.icon || 'fas fa-file-code';
            const isActive = file.id === activeFileId;
            const isModified = file.isModified;
            
            return `
                <button class="editor-tab ${isActive ? 'active' : ''} ${isModified ? 'modified' : ''}" data-file-id="${file.id}">
                    <i class="${icon}"></i>
                    <span class="tab-name">${Utils.escapeHtml(file.name)}</span>
                    <span class="tab-close" title="关闭标签页">
                        <i class="fas fa-times"></i>
                    </span>
                </button>
            `;
        }).join('');
        
        // Add click handlers
        tabs.querySelectorAll('.editor-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (!e.target.closest('.tab-close')) {
                    const fileId = tab.dataset.fileId;
                    document.dispatchEvent(new CustomEvent('file:select', { detail: fileId }));
                }
            });
            
            tab.querySelector('.tab-close')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = tab.dataset.fileId;
                document.dispatchEvent(new CustomEvent('file:close', { detail: fileId }));
            });
        });
    }

    /**
     * Update language selector
     */
    updateLanguageSelector(language) {
        if (this.elements.languageSelect) {
            this.elements.languageSelect.value = language;
        }
        
        // Update status bar
        const langConfig = CONFIG.languages[language];
        if (langConfig && this.elements.statusLanguage) {
            this.elements.statusLanguage.innerHTML = `
                <i class="${langConfig.icon}"></i>
                <span>${language.charAt(0).toUpperCase() + language.slice(1)}</span>
            `;
        }
    }

    /**
     * Update cursor position
     */
    updateCursorPosition(line, column, selectedLength) {
        if (this.elements.statusPosition) {
            this.elements.statusPosition.textContent = `行 ${line}, 列 ${column}`;
        }
        
        if (this.elements.statusSelection) {
            this.elements.statusSelection.textContent = `已选择 ${selectedLength}`;
        }
    }

    /**
     * Update status message
     */
    updateStatusMessage(message) {
        if (this.elements.statusMessage) {
            this.elements.statusMessage.textContent = message;
        }
    }

    /**
     * Set running state
     */
    setRunningState(isRunning) {
        if (this.elements.btnRun) {
            this.elements.btnRun.disabled = isRunning;
        }
        if (this.elements.btnDebug) {
            this.elements.btnDebug.disabled = isRunning;
        }
        if (this.elements.btnStop) {
            this.elements.btnStop.disabled = !isRunning;
        }
        
        // Update run button appearance
        if (isRunning && this.elements.btnRun) {
            this.elements.btnRun.innerHTML = `
                <div class="running-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
                <span>运行中</span>
            `;
        } else if (this.elements.btnRun) {
            this.elements.btnRun.innerHTML = `
                <i class="fas fa-play"></i>
                <span>运行</span>
            `;
        }
    }

    /**
     * Set debug state
     */
    setDebugState(isDebugging, isPaused) {
        const btns = [
            this.elements.debugContinue,
            this.elements.debugStepOver,
            this.elements.debugStepInto,
            this.elements.debugStepOut,
            this.elements.debugRestart,
            this.elements.debugStop
        ];
        
        btns.forEach(btn => {
            if (btn) {
                btn.disabled = !isDebugging;
            }
        });
        
        if (this.elements.debugContinue) {
            this.elements.debugContinue.disabled = !isDebugging || !isPaused;
        }
    }

    /**
     * Log to console
     */
    logToConsole(message, type = 'log') {
        const output = this.elements.consoleOutput;
        if (!output) return;
        
        // Remove welcome message if exists
        const welcome = output.querySelector('.console-welcome');
        if (welcome) {
            welcome.remove();
        }
        
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.dataset.type = type;
        line.innerHTML = `
            <span class="timestamp">${Utils.formatTime()}</span>
            <span class="content">${Utils.escapeHtml(message)}</span>
        `;
        
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    /**
     * Clear console
     */
    clearConsole() {
        const output = this.elements.consoleOutput;
        if (output) {
            output.innerHTML = `
                <div class="console-welcome">
                    <i class="fas fa-terminal"></i>
                    <p>控制台已清空</p>
                </div>
            `;
        }
    }

    /**
     * Filter console output
     */
    filterConsole(filter) {
        const lines = this.elements.consoleOutput?.querySelectorAll('.console-line');
        if (!lines) return;
        
        lines.forEach(line => {
            if (filter === 'all') {
                line.style.display = '';
            } else {
                line.style.display = line.dataset.type === filter ? '' : 'none';
            }
        });
    }

    /**
     * Update output panel
     */
    updateOutput(content) {
        if (this.elements.outputContent) {
            this.elements.outputContent.innerHTML = content ? 
                `<pre>${Utils.escapeHtml(content)}</pre>` :
                `<div class="empty-state">
                    <i class="fas fa-stream"></i>
                    <p>编译输出将显示在这里</p>
                </div>`;
        }
    }

    /**
     * Update problems list
     */
    updateProblems(problems) {
        const list = this.elements.problemsList;
        const count = this.elements.problemsCount;
        
        if (count) {
            count.textContent = problems.length;
            count.classList.toggle('has-items', problems.length > 0);
        }
        
        if (!list) return;
        
        if (problems.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>没有问题</p>
                </div>
            `;
        } else {
            list.innerHTML = problems.map(p => `
                <div class="problem-item ${p.severity}" data-line="${p.line}">
                    <i class="fas fa-${p.severity === 'error' ? 'times-circle' : 'exclamation-triangle'}"></i>
                    <div class="problem-message">${Utils.escapeHtml(p.message)}</div>
                    <div class="problem-location">行 ${p.line}${p.column ? `, 列 ${p.column}` : ''}</div>
                </div>
            `).join('');
            
            // Add click handlers
            list.querySelectorAll('.problem-item').forEach(item => {
                item.addEventListener('click', () => {
                    const line = parseInt(item.dataset.line);
                    document.dispatchEvent(new CustomEvent('editor:goToLine', { detail: line }));
                });
            });
        }
    }

    /**
     * Update breakpoints list
     */
    updateBreakpoints(breakpoints, fileName) {
        const list = this.elements.breakpointsList;
        if (!list) return;
        
        if (breakpoints.length === 0) {
            list.innerHTML = '<div class="empty-state">无断点</div>';
        } else {
            const fileLabel = fileName ? ` (${fileName})` : '';
            list.innerHTML = breakpoints.map(line => `
                <div class="breakpoint-item" data-line="${line}">
                    <i class="fas fa-circle" style="color: var(--accent-danger); font-size: 8px;"></i>
                    <span class="line-num">行 ${line}${fileLabel}</span>
                </div>
            `).join('');
            
            list.querySelectorAll('.breakpoint-item').forEach(item => {
                item.addEventListener('click', () => {
                    const line = parseInt(item.dataset.line);
                    document.dispatchEvent(new CustomEvent('editor:goToLine', { detail: line }));
                });
            });
        }
    }

    /**
     * Update call stack
     */
    updateCallStack(stack) {
        const list = this.elements.callstackList;
        if (!list) return;
        
        if (stack.length === 0) {
            list.innerHTML = '<div class="empty-state">未运行</div>';
        } else {
            list.innerHTML = stack.map((frame, i) => `
                <div class="callstack-item" data-line="${frame.line}">
                    <span>${frame.name}</span>
                    <span class="file">${frame.file}:${frame.line}</span>
                </div>
            `).join('');
        }
    }

    /**
     * Update variables list
     */
    updateVariables(variables) {
        const list = this.elements.variablesList;
        if (!list) return;
        
        if (variables.length === 0) {
            list.innerHTML = '<div class="empty-state">无变量</div>';
        } else {
            list.innerHTML = variables.map(v => `
                <div class="variable-item">
                    <span class="var-name">${Utils.escapeHtml(v.name)}</span>
                    <span class="var-type">(${v.type})</span>
                    <span class="var-value">${Utils.escapeHtml(String(v.value))}</span>
                </div>
            `).join('');
        }
    }

    /**
     * Open modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            this.activeModal = modalId;
            
            // Focus first input
            const input = modal.querySelector('input, select, textarea');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        }
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            this.activeModal = null;
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const container = this.elements.toastContainer;
        if (!container) return;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <span class="toast-message">${Utils.escapeHtml(message)}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        container.appendChild(toast);
        
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }
    }

    /**
     * Remove toast
     */
    removeToast(toast) {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            this.elements.btnFullscreen.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            document.exitFullscreen();
            this.elements.btnFullscreen.innerHTML = '<i class="fas fa-expand"></i>';
        }
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') !== 'light';
        document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
        
        if (this.elements.btnTheme) {
            this.elements.btnTheme.innerHTML = isDark ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
        
        return isDark ? 'vs' : 'vs-dark';
    }
}
