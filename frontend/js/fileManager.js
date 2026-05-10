/**
 * CodeForge IDE - File Manager
 */

class FileManager {
    constructor() {
        this.files = new Map();
        this.openFiles = []; // Array of file IDs currently open in tabs
        this.activeFileId = null;
        this.fileCounter = 0;
        this.onFileChange = null;
        this.onFileSelect = null;
        this.onFileDelete = null;
        this.onFileClose = null;
        
        this.loadFromStorage();
    }

    /**
     * Create a new file
     */
    createFile(name, language, content = null) {
        const id = Utils.generateId();
        const langConfig = CONFIG.languages[language];
        
        // Auto-generate filename if not provided
        if (!name) {
            this.fileCounter++;
            name = `untitled_${this.fileCounter}${langConfig.extension}`;
        }
        
        // Ensure correct extension
        const ext = Utils.getExtension(name);
        if (!ext) {
            name += langConfig.extension;
        }
        
        const file = {
            id,
            name,
            language,
            content: content !== null ? content : langConfig.defaultCode,
            created: Date.now(),
            modified: Date.now(),
            isModified: false
        };
        
        this.files.set(id, file);
        
        // Add to open files
        if (!this.openFiles.includes(id)) {
            this.openFiles.push(id);
        }
        
        this.saveToStorage();
        
        if (this.onFileChange) {
            this.onFileChange('create', file);
        }
        
        return file;
    }

    /**
     * Create file from template
     */
    createFromTemplate(name, language, template) {
        const langConfig = CONFIG.languages[language];
        let content;
        
        switch (template) {
            case 'hello':
                content = langConfig.helloWorld;
                break;
            case 'main':
                content = langConfig.mainTemplate;
                break;
            default:
                content = langConfig.defaultCode;
        }
        
        return this.createFile(name, language, content);
    }

    /**
     * Get file by ID
     */
    getFile(id) {
        return this.files.get(id);
    }

    /**
     * Get all files
     */
    getAllFiles() {
        return Array.from(this.files.values());
    }

    /**
     * Get active file
     */
    getActiveFile() {
        return this.activeFileId ? this.files.get(this.activeFileId) : null;
    }

    /**
     * Set active file
     */
    setActiveFile(id) {
        if (this.files.has(id)) {
            this.activeFileId = id;
            
            // Add to open files if not already open
            if (!this.openFiles.includes(id)) {
                this.openFiles.push(id);
                this.saveToStorage();
            }
            
            const file = this.files.get(id);
            
            if (this.onFileSelect) {
                this.onFileSelect(file);
            }
            
            return file;
        }
        return null;
    }

    /**
     * Update file content
     */
    updateContent(id, content) {
        const file = this.files.get(id);
        if (file) {
            file.content = content;
            file.modified = Date.now();
            file.isModified = true;
            
            this.saveToStorage();
            
            if (this.onFileChange) {
                this.onFileChange('update', file);
            }
            
            return file;
        }
        return null;
    }

    /**
     * Save file (mark as not modified)
     */
    saveFile(id) {
        const file = this.files.get(id);
        if (file) {
            file.isModified = false;
            this.saveToStorage();
            
            if (this.onFileChange) {
                this.onFileChange('save', file);
            }
            
            return file;
        }
        return null;
    }

    /**
     * Rename file
     */
    renameFile(id, newName) {
        const file = this.files.get(id);
        if (file) {
            // Update language if extension changed
            const oldLang = file.language;
            const newLang = Utils.getLanguageFromFilename(newName);
            
            file.name = newName;
            file.language = newLang;
            file.modified = Date.now();
            
            this.saveToStorage();
            
            if (this.onFileChange) {
                this.onFileChange('rename', file, { oldLang, newLang });
            }
            
            return file;
        }
        return null;
    }

    /**
     * Close file (remove from tabs, but keep in file manager)
     */
    closeFile(id) {
        const index = this.openFiles.indexOf(id);
        if (index > -1) {
            this.openFiles.splice(index, 1);
            
            // If closed file was active, select another open file
            if (this.activeFileId === id) {
                if (this.openFiles.length > 0) {
                    // Select the file that was before or after the closed one
                    const newIndex = Math.min(index, this.openFiles.length - 1);
                    this.activeFileId = this.openFiles[newIndex];
                } else {
                    this.activeFileId = null;
                }
            }
            
            this.saveToStorage();
            
            const file = this.files.get(id);
            if (this.onFileClose) {
                this.onFileClose(file);
            }
            
            return true;
        }
        return false;
    }

    /**
     * Get open files
     */
    getOpenFiles() {
        return this.openFiles.map(id => this.files.get(id)).filter(Boolean);
    }

    /**
     * Delete file
     */
    deleteFile(id) {
        const file = this.files.get(id);
        if (file) {
            // Remove from open files first
            const openIndex = this.openFiles.indexOf(id);
            if (openIndex > -1) {
                this.openFiles.splice(openIndex, 1);
            }
            
            this.files.delete(id);
            
            // If deleted file was active, select another
            if (this.activeFileId === id) {
                const remaining = this.openFiles.length > 0 ? this.openFiles : Array.from(this.files.keys());
                this.activeFileId = remaining.length > 0 ? remaining[0] : null;
            }
            
            this.saveToStorage();
            
            if (this.onFileDelete) {
                this.onFileDelete(file);
            }
            
            if (this.onFileChange) {
                this.onFileChange('delete', file);
            }
            
            return true;
        }
        return false;
    }

    /**
     * Import file from disk
     */
    async importFile(fileHandle) {
        try {
            const content = await Utils.readFile(fileHandle);
            const name = fileHandle.name;
            const language = Utils.getLanguageFromFilename(name);
            
            return this.createFile(name, language, content);
        } catch (error) {
            console.error('Import file error:', error);
            throw error;
        }
    }

    /**
     * Export file to disk
     */
    exportFile(id) {
        const file = this.files.get(id);
        if (file) {
            Utils.downloadFile(file.name, file.content);
            return true;
        }
        return false;
    }

    /**
     * Save all files to localStorage
     */
    saveToStorage() {
        const data = {
            files: Array.from(this.files.entries()),
            openFiles: this.openFiles,
            activeFileId: this.activeFileId,
            fileCounter: this.fileCounter
        };
        Utils.saveToStorage(CONFIG.storage.files, data);
    }

    /**
     * Load files from localStorage
     */
    loadFromStorage() {
        const data = Utils.loadFromStorage(CONFIG.storage.files);
        
        if (data) {
            this.files = new Map(data.files || []);
            this.openFiles = data.openFiles || Array.from(this.files.keys());
            this.activeFileId = data.activeFileId;
            this.fileCounter = data.fileCounter || 0;
        }
        
        // Create default file if none exist
        if (this.files.size === 0) {
            const file = this.createFile('main.py', 'python');
            this.activeFileId = file.id;
        }
    }

    /**
     * Clear all files
     */
    clearAll() {
        this.files.clear();
        this.activeFileId = null;
        Utils.removeFromStorage(CONFIG.storage.files);
    }

    /**
     * Get files by language
     */
    getFilesByLanguage(language) {
        return this.getAllFiles().filter(f => f.language === language);
    }

    /**
     * Check if filename exists
     */
    fileExists(name) {
        return this.getAllFiles().some(f => f.name === name);
    }

    /**
     * Generate unique filename
     */
    generateUniqueName(baseName, language) {
        const langConfig = CONFIG.languages[language];
        let name = baseName;
        let counter = 1;
        
        // Ensure extension
        if (!Utils.getExtension(name)) {
            name += langConfig.extension;
        }
        
        const nameWithoutExt = name.replace(/\.[^/.]+$/, '');
        const ext = Utils.getExtension(name);
        
        while (this.fileExists(name)) {
            name = `${nameWithoutExt}_${counter}${ext}`;
            counter++;
        }
        
        return name;
    }
}
