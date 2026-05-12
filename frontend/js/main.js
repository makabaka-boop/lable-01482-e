/**
 * CodeForge IDE - Main Application
 * Entry point that connects all components
 */

class CodeForgeIDE {
    constructor() {
        this.fileManager = new FileManager();
        this.editorManager = new EditorManager();
        this.compiler = new CompilerRuntime();
        this.debugger = new Debugger();
        this.ui = new UIManager();
        
        this.isInitialized = false;
        this.currentStdin = '';
    }

    /**
     * Initialize the IDE
     */
    async init() {
        try {
            console.log('Initializing CodeForge IDE...');
            
            // Initialize UI
            this.ui.init();
            this.ui.updateSplashMessage('正在初始化编辑器...');
            
            // Initialize Monaco Editor
            await this.editorManager.init('monaco-editor');
            this.ui.updateSplashMessage('正在加载 Python 运行时...');
            
            // Initialize Pyodide in background
            this.compiler.initPyodide().then(() => {
                this.ui.showToast('Python 运行时已就绪', 'success');
            }).catch(err => {
                console.error('Pyodide failed to load:', err);
                this.ui.showToast('Python 运行时加载失败，将使用在线编译', 'warning');
            });
            
            // Setup callbacks
            this.setupCallbacks();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial state
            this.loadInitialState();
            
            // Hide splash screen
            setTimeout(() => {
                this.ui.hideSplash();
                this.editorManager.focus();
            }, 1000);
            
            this.isInitialized = true;
            console.log('CodeForge IDE initialized successfully');
            
        } catch (error) {
            console.error('Initialization failed:', error);
            this.ui.showToast('初始化失败: ' + error.message, 'error');
        }
    }

    /**
     * Setup callbacks between components
     */
    setupCallbacks() {
        // File manager callbacks
        this.fileManager.onFileChange = (action, file) => {
            this.refreshUI();
            if (action === 'close' || action === 'delete') {
                const activeFile = this.fileManager.getActiveFile();
                if (activeFile) {
                    this.openFile(activeFile);
                }
            }
        };
        
        this.fileManager.onFileSelect = (file) => {
            this.openFile(file);
        };
        
        this.fileManager.onFileDelete = (file) => {
            this.refreshUI();
            const activeFile = this.fileManager.getActiveFile();
            if (activeFile) {
                this.openFile(activeFile);
            }
        };
        
        // Editor callbacks
        this.editorManager.onContentChange = Utils.debounce((content) => {
            const file = this.fileManager.getActiveFile();
            if (file) {
                this.fileManager.updateContent(file.id, content);
                this.refreshUI();
            }
        }, 300);
        
        this.editorManager.onCursorChange = (position) => {
            this.ui.updateCursorPosition(position.line, position.column, position.selectedLength);
        };
        
        this.editorManager.onBreakpointChange = (fileId, breakpoints) => {
            this.ui.updateBreakpoints(breakpoints);
            this.debugger.clearBreakpoints(fileId);
            breakpoints.forEach(line => {
                this.debugger.addBreakpoint(fileId, line);
            });
        };
        
        // Compiler callbacks
        this.compiler.onOutput = (message, type) => {
            this.ui.logToConsole(message, type);
        };
        
        this.compiler.onStatusChange = (message) => {
            this.ui.updateStatusMessage(message);
        };
        
        this.compiler.onComplete = (result) => {
            this.ui.setRunningState(false);
            
            if (result.success) {
                this.ui.logToConsole(`\n程序执行完成${result.executionTime ? ` (${result.executionTime}ms)` : ''}`, 'success');
            } else {
                // Parse and display errors
                const file = this.fileManager.getActiveFile();
                if (file && result.error) {
                    const errors = this.compiler.parseErrors(result.error, file.language);
                    this.ui.updateProblems(errors);
                    
                    // Highlight first error in editor
                    if (errors.length > 0) {
                        this.editorManager.goToLine(errors[0].line);
                    }
                }
            }
        };
        
        // Debugger callbacks
        this.debugger.onPause = (line) => {
            this.editorManager.setDebugLine(line);
            this.ui.setDebugState(true, true);
            this.ui.logToConsole(`暂停在第 ${line} 行`, 'info');
        };
        
        this.debugger.onResume = () => {
            this.editorManager.clearDebugLine();
            this.ui.setDebugState(true, false);
        };
        
        this.debugger.onVariableUpdate = (variables) => {
            this.ui.updateVariables(variables);
        };
        
        this.debugger.onCallStackUpdate = (stack) => {
            this.ui.updateCallStack(stack);
        };
        
        this.debugger.onDebugEnd = () => {
            this.editorManager.clearDebugLine();
            this.ui.setDebugState(false, false);
            this.ui.setRunningState(false);
            this.ui.logToConsole('调试结束', 'info');
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Run button
        document.getElementById('btn-run')?.addEventListener('click', () => {
            this.runCode();
        });
        
        // Debug button
        document.getElementById('btn-debug')?.addEventListener('click', () => {
            this.debugCode();
        });
        
        // Stop button
        document.getElementById('btn-stop')?.addEventListener('click', () => {
            this.stopExecution();
        });
        
        // Language selector
        document.getElementById('language-select')?.addEventListener('change', (e) => {
            const file = this.fileManager.getActiveFile();
            if (file) {
                const newLang = e.target.value;
                const ext = CONFIG.languages[newLang].extension;
                const newName = file.name.replace(/\.[^/.]+$/, ext);
                this.fileManager.renameFile(file.id, newName);
                this.editorManager.setLanguage(newLang);
                this.refreshUI();
            }
        });
        
        // Debug controls
        document.getElementById('debug-continue')?.addEventListener('click', () => {
            this.debugger.continue();
        });
        
        document.getElementById('debug-step-over')?.addEventListener('click', () => {
            this.debugger.stepOver();
        });
        
        document.getElementById('debug-step-into')?.addEventListener('click', () => {
            this.debugger.stepInto();
        });
        
        document.getElementById('debug-step-out')?.addEventListener('click', () => {
            this.debugger.stepOut();
        });
        
        document.getElementById('debug-restart')?.addEventListener('click', () => {
            this.debugger.restart();
            setTimeout(() => this.debugCode(), 100);
        });
        
        document.getElementById('debug-stop')?.addEventListener('click', () => {
            this.debugger.stopDebug();
        });
        
        // Editor events
        document.addEventListener('editor:save', () => {
            this.saveCurrentFile();
        });
        
        document.addEventListener('editor:run', () => {
            this.runCode();
        });
        
        document.addEventListener('editor:goToLine', (e) => {
            this.editorManager.goToLine(e.detail);
        });
        
        // File events
        document.addEventListener('file:select', (e) => {
            const file = this.fileManager.setActiveFile(e.detail);
            if (file) {
                this.openFile(file);
            }
        });
        
        document.addEventListener('file:delete', (e) => {
            this.fileManager.deleteFile(e.detail);
        });
        
        document.addEventListener('file:close', (e) => {
            this.fileManager.closeFile(e.detail);
        });
        
        // Menu actions
        document.addEventListener('menu:action', (e) => {
            this.handleMenuAction(e.detail);
        });
        
        // Settings events
        document.addEventListener('settings:fontSize', (e) => {
            this.editorManager.setFontSize(e.detail);
        });
        
        document.addEventListener('settings:tabSize', (e) => {
            this.editorManager.setTabSize(e.detail);
        });
        
        document.addEventListener('settings:wordWrap', (e) => {
            this.editorManager.setWordWrap(e.detail);
        });
        
        document.addEventListener('settings:lineNumbers', (e) => {
            this.editorManager.setLineNumbers(e.detail);
        });
        
        document.addEventListener('settings:minimap', (e) => {
            this.editorManager.setMinimap(e.detail);
        });
        
        document.addEventListener('settings:bracketMatching', (e) => {
            this.editorManager.setBracketMatching(e.detail);
        });
        
        // UI events
        document.addEventListener('ui:toggleTheme', () => {
            const theme = this.ui.toggleTheme();
            this.editorManager.setTheme(theme);
        });
        
        document.addEventListener('ui:resize', () => {
            this.editorManager.layout();
        });
        
        // Console input
        document.addEventListener('console:input', (e) => {
            this.evaluateExpression(e.detail);
        });
        
        // New file modal
        document.getElementById('create-file-btn')?.addEventListener('click', () => {
            this.createNewFile();
        });
        
        document.getElementById('new-file-language')?.addEventListener('change', (e) => {
            const nameInput = document.getElementById('new-file-name');
            const lang = e.target.value;
            const ext = CONFIG.languages[lang].extension;
            if (nameInput && nameInput.value) {
                nameInput.value = nameInput.value.replace(/\.[^/.]+$/, ext);
            }
        });
        
        // Input modal for stdin
        document.getElementById('submit-input-btn')?.addEventListener('click', () => {
            const stdin = document.getElementById('stdin-input').value;
            this.currentStdin = stdin;
            this.ui.closeModal('input-modal');
            this.executeWithStdin();
        });
        
        // Window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.editorManager.layout();
        }, 100));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // F5 - Run
            if (e.key === 'F5' && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                this.runCode();
            }
            
            // F9 - Debug
            if (e.key === 'F9' && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                this.debugCode();
            }
            
            // F10 - Step over
            if (e.key === 'F10' && this.debugger.isDebugging) {
                e.preventDefault();
                this.debugger.stepOver();
            }
            
            // F11 - Step into
            if (e.key === 'F11' && this.debugger.isDebugging) {
                e.preventDefault();
                this.debugger.stepInto();
            }
            
            // Shift+F11 - Step out
            if (e.key === 'F11' && e.shiftKey && this.debugger.isDebugging) {
                e.preventDefault();
                this.debugger.stepOut();
            }
        });
    }

    /**
     * Load initial state
     */
    loadInitialState() {
        const activeFile = this.fileManager.getActiveFile();
        if (activeFile) {
            this.openFile(activeFile);
        }
        this.refreshUI();
    }

    /**
     * Open file in editor
     */
    openFile(file) {
        // Set current file ID before any operations
        this.editorManager.currentFileId = file.id;
        
        this.editorManager.setValue(file.content);
        this.editorManager.setLanguage(file.language);
        this.ui.updateLanguageSelector(file.language);
        
        // Restore breakpoints
        const breakpoints = this.editorManager.getBreakpoints(file.id);
        this.editorManager.updateBreakpointDecorations(file.id);
        this.ui.updateBreakpoints(breakpoints);
        
        // Clear debug line when switching files (only if not debugging)
        if (!this.debugger.isDebugging) {
            this.editorManager.clearDebugLine();
        }
        
        this.refreshUI();
    }

    /**
     * Refresh UI
     */
    refreshUI() {
        const files = this.fileManager.getAllFiles();
        const activeFile = this.fileManager.getActiveFile();
        const activeId = activeFile?.id;
        
        this.ui.renderFileTree(files, activeId);
        this.ui.renderEditorTabs(files, activeId);
        
        if (activeFile) {
            this.ui.updateLanguageSelector(activeFile.language);
        }
    }

    /**
     * Handle menu actions
     */
    handleMenuAction(action) {
        switch (action) {
            case 'new-file':
                this.ui.openModal('new-file-modal');
                break;
                
            case 'open-file':
                this.openFileFromDisk();
                break;
                
            case 'save-file':
                this.saveCurrentFile();
                break;
                
            case 'download-file':
                this.downloadCurrentFile();
                break;
                
            case 'settings':
                this.ui.openModal('settings-modal');
                break;
                
            case 'undo':
                this.editorManager.undo();
                break;
                
            case 'redo':
                this.editorManager.redo();
                break;
                
            case 'find':
                this.editorManager.editor?.trigger('keyboard', 'actions.find', {});
                break;
                
            case 'replace':
                this.editorManager.editor?.trigger('keyboard', 'editor.action.startFindReplaceAction', {});
                break;
                
            case 'format':
                this.editorManager.formatDocument();
                break;
                
            case 'run':
                this.runCode();
                break;
                
            case 'debug':
                this.debugCode();
                break;
                
            case 'stop':
                this.stopExecution();
                break;
                
            case 'clear-console':
                this.ui.clearConsole();
                break;
                
            case 'shortcuts':
                this.ui.openModal('shortcuts-modal');
                break;
                
            case 'about':
                this.ui.openModal('about-modal');
                break;
        }
    }

    /**
     * Create new file
     */
    createNewFile() {
        const nameInput = document.getElementById('new-file-name');
        const langSelect = document.getElementById('new-file-language');
        const templateSelect = document.getElementById('new-file-template');
        
        const name = nameInput.value.trim() || '';
        const language = langSelect.value;
        const template = templateSelect.value;
        
        const file = this.fileManager.createFromTemplate(
            name || this.fileManager.generateUniqueName('untitled', language),
            language,
            template
        );
        
        this.fileManager.setActiveFile(file.id);
        this.openFile(file);
        
        this.ui.closeModal('new-file-modal');
        this.ui.showToast(`文件 "${file.name}" 已创建`, 'success');
        
        // Reset form
        nameInput.value = '';
        templateSelect.value = 'empty';
    }

    /**
     * Open file from disk
     */
    async openFileFromDisk() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.py,.c,.cpp,.cc,.cxx,.h,.hpp';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const newFile = await this.fileManager.importFile(file);
                    this.fileManager.setActiveFile(newFile.id);
                    this.openFile(newFile);
                    this.ui.showToast(`文件 "${file.name}" 已打开`, 'success');
                } catch (error) {
                    this.ui.showToast('打开文件失败: ' + error.message, 'error');
                }
            }
        };
        
        input.click();
    }

    /**
     * Save current file
     */
    saveCurrentFile() {
        const file = this.fileManager.getActiveFile();
        if (file) {
            const content = this.editorManager.getValue();
            this.fileManager.updateContent(file.id, content);
            this.fileManager.saveFile(file.id);
            this.refreshUI();
            this.ui.showToast('文件已保存', 'success');
        }
    }

    /**
     * Download current file
     */
    downloadCurrentFile() {
        const file = this.fileManager.getActiveFile();
        if (file) {
            this.fileManager.exportFile(file.id);
            this.ui.showToast(`文件 "${file.name}" 已下载`, 'success');
        }
    }

    /**
     * Run code
     */
    async runCode() {
        const file = this.fileManager.getActiveFile();
        if (!file) {
            this.ui.showToast('没有打开的文件', 'warning');
            return;
        }
        
        // Save before running
        const content = this.editorManager.getValue();
        this.fileManager.updateContent(file.id, content);
        
        // Clear previous output
        this.ui.clearConsole();
        this.ui.updateProblems([]);
        this.editorManager.clearMarkers();
        
        // Check if code needs stdin
        const needsInput = this.codeNeedsInput(content, file.language);
        
        if (needsInput) {
            // Clear previous input
            document.getElementById('stdin-input').value = '';
            this.currentStdin = '';
            this.ui.openModal('input-modal');
            return;
        }
        
        this.currentStdin = '';
        await this.executeWithStdin();
    }

    /**
     * Check if code needs stdin
     */
    codeNeedsInput(code, language) {
        if (language === 'python') {
            return code.includes('input(') || code.includes('sys.stdin');
        } else {
            return code.includes('scanf') || code.includes('cin') || 
                   code.includes('getchar') || code.includes('gets') ||
                   code.includes('fgets') || code.includes('getline');
        }
    }

    /**
     * Execute code with stdin
     */
    async executeWithStdin() {
        const file = this.fileManager.getActiveFile();
        if (!file) return;
        
        const content = this.editorManager.getValue();
        
        this.ui.setRunningState(true);
        this.ui.logToConsole(`运行 ${file.name}...`, 'info');
        this.ui.switchPanelTab('console');
        
        try {
            const result = await this.compiler.run(content, file.language, this.currentStdin);
            
            if (!result.success && result.error) {
                this.ui.logToConsole(result.error, 'error');
            }
        } catch (error) {
            this.ui.logToConsole('执行错误: ' + error.message, 'error');
        }
    }

    /**
     * Debug code
     */
    async debugCode() {
        const file = this.fileManager.getActiveFile();
        if (!file) {
            this.ui.showToast('没有打开的文件', 'warning');
            return;
        }
        
        // Save before debugging
        const content = this.editorManager.getValue();
        this.fileManager.updateContent(file.id, content);
        
        // Get breakpoints from editor
        const breakpoints = this.editorManager.getBreakpoints(file.id);
        
        // Sync breakpoints to debugger
        this.debugger.clearBreakpoints('current');
        breakpoints.forEach(line => {
            this.debugger.addBreakpoint('current', line);
        });
        
        // Switch to debug panel
        this.ui.switchSidebarTab('debug');
        
        this.ui.setRunningState(true);
        this.ui.setDebugState(true, false);
        this.ui.logToConsole(`开始调试 ${file.name}...`, 'info');
        
        if (breakpoints.length === 0) {
            this.ui.logToConsole('提示: 点击行号左侧添加断点', 'info');
        }
        
        try {
            await this.debugger.startDebug(content, file.language, breakpoints);
        } catch (error) {
            this.ui.logToConsole('调试错误: ' + error.message, 'error');
        }
    }

    /**
     * Stop execution
     */
    stopExecution() {
        if (this.debugger.isDebugging) {
            this.debugger.stopDebug();
        }
        
        if (this.compiler.isRunning) {
            this.compiler.stop();
        }
        
        this.ui.setRunningState(false);
        this.ui.setDebugState(false, false);
        this.ui.logToConsole('执行已停止', 'warn');
    }

    /**
     * Evaluate expression in console
     */
    async evaluateExpression(expression) {
        const file = this.fileManager.getActiveFile();
        const language = file?.language || 'python';
        
        this.ui.logToConsole(`> ${expression}`, 'log');
        
        if (this.debugger.isDebugging) {
            const result = this.debugger.evaluate(expression);
            this.ui.logToConsole(result, 'info');
        } else if (language === 'python' && this.compiler.isPyodideReady) {
            try {
                const result = await this.compiler.pyodide.runPythonAsync(`
import sys
from io import StringIO
_stdout_backup = sys.stdout
_stderr_backup = sys.stderr
_capture_output = StringIO()
sys.stdout = _capture_output
sys.stderr = _capture_output
try:
    _result = eval(${JSON.stringify(expression)}, globals(), locals())
    if _result is not None:
        print(repr(_result))
except:
    try:
        exec(${JSON.stringify(expression)}, globals(), locals())
    except Exception as _e:
        print(f"Error: {_e}", file=sys.stderr)
finally:
    sys.stdout = _stdout_backup
    sys.stderr = _stderr_backup
    _captured = _capture_output.getvalue()
    _capture_output.close()
_captured
`);
                if (result) {
                    const output = result.trim();
                    if (output) {
                        const lines = output.split('\n');
                        lines.forEach(line => {
                            if (line.startsWith('Error:')) {
                                this.ui.logToConsole(line.substring(7).trim(), 'error');
                            } else {
                                this.ui.logToConsole(line, 'info');
                            }
                        });
                    }
                }
            } catch (error) {
                this.ui.logToConsole(error.message, 'error');
            }
        } else {
            this.ui.logToConsole('表达式求值仅支持调试模式或 Python 环境', 'warn');
        }
    }
}

// Initialize the IDE when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ide = new CodeForgeIDE();
    window.ide.init();
});
