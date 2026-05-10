/**
 * CodeForge IDE - Editor Manager
 * Handles Monaco Editor integration
 */

class EditorManager {
    constructor() {
        this.editor = null;
        this.decorations = [];
        this.breakpoints = new Map();
        this.currentDebugLine = null;
        this.currentFileId = null;
        this.debugFileId = null;
        this.onContentChange = null;
        this.onBreakpointChange = null;
        this.onCursorChange = null;
        this.isInitialized = false;
    }

    /**
     * Initialize Monaco Editor
     */
    async init(containerId) {
        return new Promise((resolve, reject) => {
            require.config({
                paths: {
                    'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
                }
            });

            require(['vs/editor/editor.main'], () => {
                // Register custom themes
                this.registerThemes();
                
                // Create editor instance
                this.editor = monaco.editor.create(document.getElementById(containerId), {
                    value: '',
                    language: 'python',
                    theme: CONFIG.editor.theme,
                    fontSize: CONFIG.editor.fontSize,
                    fontFamily: CONFIG.editor.fontFamily,
                    tabSize: CONFIG.editor.tabSize,
                    minimap: { enabled: CONFIG.editor.minimap },
                    lineNumbers: CONFIG.editor.lineNumbers ? 'on' : 'off',
                    wordWrap: CONFIG.editor.wordWrap,
                    automaticLayout: CONFIG.editor.automaticLayout,
                    scrollBeyondLastLine: CONFIG.editor.scrollBeyondLastLine,
                    bracketPairColorization: { enabled: CONFIG.editor.bracketPairColorization },
                    autoClosingBrackets: CONFIG.editor.autoClosingBrackets,
                    autoIndent: CONFIG.editor.autoIndent,
                    formatOnPaste: CONFIG.editor.formatOnPaste,
                    formatOnType: CONFIG.editor.formatOnType,
                    glyphMargin: true,
                    folding: true,
                    lineDecorationsWidth: 5,
                    glyphMarginWidth: 20,
                    renderLineHighlight: 'all',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on'
                });

                // Setup event listeners
                this.setupEventListeners();
                
                // Setup keybindings
                this.setupKeybindings();
                
                this.isInitialized = true;
                resolve(this.editor);
            });
        });
    }

    /**
     * Register custom themes
     */
    registerThemes() {
        // Custom dark theme with neon accents
        monaco.editor.defineTheme('codeforge-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6b6b7a', fontStyle: 'italic' },
                { token: 'keyword', foreground: '7c3aed', fontStyle: 'bold' },
                { token: 'string', foreground: '10b981' },
                { token: 'number', foreground: 'f59e0b' },
                { token: 'type', foreground: '00d4ff' },
                { token: 'function', foreground: '00d4ff' },
                { token: 'variable', foreground: 'e4e4eb' },
                { token: 'constant', foreground: 'ef4444' }
            ],
            colors: {
                'editor.background': '#0d0d12',
                'editor.foreground': '#e4e4eb',
                'editor.lineHighlightBackground': '#1a1a24',
                'editor.selectionBackground': '#32324a',
                'editor.inactiveSelectionBackground': '#2a2a38',
                'editorCursor.foreground': '#00d4ff',
                'editorWhitespace.foreground': '#2a2a38',
                'editorLineNumber.foreground': '#4a4a58',
                'editorLineNumber.activeForeground': '#00d4ff',
                'editorGutter.background': '#0d0d12',
                'editorBracketMatch.background': '#32324a',
                'editorBracketMatch.border': '#00d4ff'
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.editor.onDidChangeModelContent((e) => {
            if (this.onContentChange) {
                this.onContentChange(this.getValue());
            }
            this.updateBreakpointDecorations();
        });

        // Cursor position change event
        this.editor.onDidChangeCursorPosition((e) => {
            if (this.onCursorChange) {
                const position = e.position;
                const selection = this.editor.getSelection();
                const selectedText = this.editor.getModel().getValueInRange(selection);
                
                this.onCursorChange({
                    line: position.lineNumber,
                    column: position.column,
                    selectedLength: selectedText.length
                });
            }
        });

        // Mouse down on gutter (for breakpoints)
        this.editor.onMouseDown((e) => {
            if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
                e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
                const lineNumber = e.target.position.lineNumber;
                this.toggleBreakpoint(lineNumber);
            }
        });
    }

    /**
     * Setup keybindings
     */
    setupKeybindings() {
        // Ctrl+S - Save
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            document.dispatchEvent(new CustomEvent('editor:save'));
        });

        // F5 - Run
        this.editor.addCommand(monaco.KeyCode.F5, () => {
            document.dispatchEvent(new CustomEvent('editor:run'));
        });

        // F9 - Toggle breakpoint
        this.editor.addCommand(monaco.KeyCode.F9, () => {
            const position = this.editor.getPosition();
            this.toggleBreakpoint(position.lineNumber);
        });

        // Ctrl+/ - Toggle comment
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
            this.editor.trigger('keyboard', 'editor.action.commentLine', {});
        });

        // Ctrl+F - Find
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
            this.editor.trigger('keyboard', 'actions.find', {});
        });

        // Ctrl+H - Replace
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
            this.editor.trigger('keyboard', 'editor.action.startFindReplaceAction', {});
        });
    }

    /**
     * Set editor content
     */
    setValue(content) {
        if (this.editor) {
            this.editor.setValue(content);
        }
    }

    /**
     * Get editor content
     */
    getValue() {
        return this.editor ? this.editor.getValue() : '';
    }

    /**
     * Set editor language
     */
    setLanguage(language) {
        if (this.editor) {
            const model = this.editor.getModel();
            monaco.editor.setModelLanguage(model, CONFIG.languages[language]?.monacoId || language);
        }
    }

    /**
     * Set editor theme
     */
    setTheme(theme) {
        if (this.editor) {
            monaco.editor.setTheme(theme);
        }
    }

    /**
     * Set font size
     */
    setFontSize(size) {
        if (this.editor) {
            this.editor.updateOptions({ fontSize: size });
        }
    }

    /**
     * Set tab size
     */
    setTabSize(size) {
        if (this.editor) {
            this.editor.getModel().updateOptions({ tabSize: size });
        }
    }

    /**
     * Toggle word wrap
     */
    setWordWrap(enabled) {
        if (this.editor) {
            this.editor.updateOptions({ wordWrap: enabled ? 'on' : 'off' });
        }
    }

    /**
     * Toggle line numbers
     */
    setLineNumbers(enabled) {
        if (this.editor) {
            this.editor.updateOptions({ lineNumbers: enabled ? 'on' : 'off' });
        }
    }

    /**
     * Toggle minimap
     */
    setMinimap(enabled) {
        if (this.editor) {
            this.editor.updateOptions({ minimap: { enabled } });
        }
    }

    /**
     * Toggle bracket pair colorization (括号配对高亮)
     */
    setBracketMatching(enabled) {
        if (this.editor) {
            this.editor.updateOptions({ 
                bracketPairColorization: { enabled },
                matchBrackets: enabled ? 'always' : 'never'
            });
        }
    }

    /**
     * Focus editor
     */
    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }

    /**
     * Format document
     */
    formatDocument() {
        if (this.editor) {
            this.editor.trigger('keyboard', 'editor.action.formatDocument', {});
        }
    }

    /**
     * Undo
     */
    undo() {
        if (this.editor) {
            this.editor.trigger('keyboard', 'undo', {});
        }
    }

    /**
     * Redo
     */
    redo() {
        if (this.editor) {
            this.editor.trigger('keyboard', 'redo', {});
        }
    }

    /**
     * Toggle breakpoint at line
     */
    toggleBreakpoint(lineNumber, fileId) {
        if (!fileId) fileId = this.currentFileId;
        if (!fileId) return;
        
        if (!this.breakpoints.has(fileId)) {
            this.breakpoints.set(fileId, new Set());
        }
        
        const fileBreakpoints = this.breakpoints.get(fileId);
        
        if (fileBreakpoints.has(lineNumber)) {
            fileBreakpoints.delete(lineNumber);
        } else {
            fileBreakpoints.add(lineNumber);
        }
        
        this.updateBreakpointDecorations(fileId);
        
        if (this.onBreakpointChange) {
            this.onBreakpointChange(fileId, Array.from(fileBreakpoints));
        }
    }

    /**
     * Get breakpoints for file
     */
    getBreakpoints(fileId) {
        if (!fileId) fileId = this.currentFileId;
        return Array.from(this.breakpoints.get(fileId) || []);
    }

    /**
     * Clear all breakpoints for file
     */
    clearBreakpoints(fileId) {
        if (!fileId) fileId = this.currentFileId;
        this.breakpoints.delete(fileId);
        this.updateBreakpointDecorations(fileId);
        
        if (this.onBreakpointChange) {
            this.onBreakpointChange(fileId, []);
        }
    }

    /**
     * Update breakpoint decorations
     */
    updateBreakpointDecorations(fileId) {
        if (!this.editor) return;
        if (!fileId) fileId = this.currentFileId;
        
        const isCurrentFile = fileId === this.currentFileId;
        
        if (!isCurrentFile) return;
        
        const breakpoints = this.breakpoints.get(fileId) || new Set();
        const decorations = [];
        
        breakpoints.forEach(lineNumber => {
            decorations.push({
                range: new monaco.Range(lineNumber, 1, lineNumber, 1),
                options: {
                    isWholeLine: false,
                    glyphMarginClassName: 'breakpoint-decoration',
                    glyphMarginHoverMessage: { value: '断点' }
                }
            });
        });
        
        if (this.currentDebugLine !== null && this.debugFileId === this.currentFileId) {
            decorations.push({
                range: new monaco.Range(this.currentDebugLine, 1, this.currentDebugLine, 1),
                options: {
                    isWholeLine: true,
                    className: 'debug-line',
                    glyphMarginClassName: 'debug-arrow'
                }
            });
        }
        
        this.decorations = this.editor.deltaDecorations(this.decorations, decorations);
    }

    /**
     * Set current debug line
     */
    setDebugLine(lineNumber, fileId) {
        this.currentDebugLine = lineNumber;
        this.debugFileId = fileId || this.currentFileId;
        this.updateBreakpointDecorations(this.debugFileId);
        
        if (lineNumber !== null && this.editor && this.debugFileId === this.currentFileId) {
            this.editor.revealLineInCenter(lineNumber);
        }
    }

    /**
     * Clear debug line
     */
    clearDebugLine() {
        this.currentDebugLine = null;
        this.debugFileId = null;
        this.updateBreakpointDecorations();
    }

    /**
     * Go to line
     */
    goToLine(lineNumber, column = 1) {
        if (this.editor) {
            this.editor.setPosition({ lineNumber, column });
            this.editor.revealLineInCenter(lineNumber);
            this.focus();
        }
    }

    /**
     * Highlight error line
     */
    highlightError(lineNumber, message) {
        if (!this.editor) return;
        
        const decorations = [{
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
                isWholeLine: true,
                className: 'error-line',
                glyphMarginClassName: 'error-glyph',
                hoverMessage: { value: message }
            }
        }];
        
        this.editor.deltaDecorations([], decorations);
    }

    /**
     * Clear all decorations
     */
    clearDecorations() {
        if (this.editor) {
            this.decorations = this.editor.deltaDecorations(this.decorations, []);
        }
    }

    /**
     * Get model markers (errors/warnings)
     */
    setMarkers(markers) {
        if (this.editor) {
            const model = this.editor.getModel();
            monaco.editor.setModelMarkers(model, 'codeforge', markers);
        }
    }

    /**
     * Clear markers
     */
    clearMarkers() {
        if (this.editor) {
            const model = this.editor.getModel();
            monaco.editor.setModelMarkers(model, 'codeforge', []);
        }
    }

    /**
     * Dispose editor
     */
    dispose() {
        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }
    }

    /**
     * Layout editor (for resize)
     */
    layout() {
        if (this.editor) {
            this.editor.layout();
        }
    }
}
