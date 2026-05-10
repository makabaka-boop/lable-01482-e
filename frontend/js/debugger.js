/**
 * CodeForge IDE - Debugger
 * Simple debugger implementation for Python
 */

class Debugger {
    constructor() {
        this.isDebugging = false;
        this.isPaused = false;
        this.breakpoints = new Map(); // Map<fileId, Set<lineNumber>>
        this.currentLine = null;
        this.callStack = [];
        this.variables = new Map();
        this.stepMode = null; // 'over', 'into', 'out'
        
        this.onPause = null;
        this.onResume = null;
        this.onStep = null;
        this.onVariableUpdate = null;
        this.onCallStackUpdate = null;
        this.onBreakpointHit = null;
        this.onDebugEnd = null;
    }

    /**
     * Start debugging session
     */
    async startDebug(code, language, breakpoints = []) {
        if (this.isDebugging) {
            return { success: false, error: '调试器已在运行' };
        }
        
        this.isDebugging = true;
        this.isPaused = false;
        this.currentLine = null;
        this.callStack = [];
        this.variables.clear();
        
        // Store breakpoints
        this.breakpoints.set('current', new Set(breakpoints));
        
        try {
            if (language === 'python') {
                return await this.debugPython(code, breakpoints);
            } else {
                // For C/C++, we use a simulated debugging experience
                return await this.debugCCpp(code, language, breakpoints);
            }
        } catch (error) {
            this.stopDebug();
            return { success: false, error: error.message };
        }
    }

    /**
     * Debug Python code
     * Note: This is a simplified debugger that simulates debugging by
     * executing code line by line
     */
    async debugPython(code, breakpoints) {
        const lines = code.split('\n');
        const executableLines = this.getExecutableLines(lines, 'python');
        
        // Initialize call stack
        this.callStack = [{
            name: '<module>',
            file: 'main.py',
            line: 1
        }];
        
        // Simulate stepping through code
        for (let i = 0; i < executableLines.length; i++) {
            const lineNum = executableLines[i];
            this.currentLine = lineNum;
            
            // Update call stack
            this.callStack[0].line = lineNum;
            
            if (this.onCallStackUpdate) {
                this.onCallStackUpdate(this.callStack);
            }
            
            // Check for breakpoint
            const bpSet = this.breakpoints.get('current');
            if (bpSet && bpSet.has(lineNum)) {
                this.isPaused = true;
                
                if (this.onBreakpointHit) {
                    this.onBreakpointHit(lineNum);
                }
                
                if (this.onPause) {
                    this.onPause(lineNum);
                }
                
                // Wait for continue/step command
                await this.waitForResume();
            }
            
            // Check step mode
            if (this.stepMode === 'over' || this.stepMode === 'into') {
                this.isPaused = true;
                this.stepMode = null;
                
                if (this.onStep) {
                    this.onStep(lineNum);
                }
                
                if (this.onPause) {
                    this.onPause(lineNum);
                }
                
                await this.waitForResume();
            }
            
            // Parse variables from current line
            this.parseVariables(lines[lineNum - 1]);
            
            if (!this.isDebugging) {
                break;
            }
        }
        
        this.stopDebug();
        return { success: true };
    }

    /**
     * Debug C/C++ code (simulated)
     */
    async debugCCpp(code, language, breakpoints) {
        const lines = code.split('\n');
        const executableLines = this.getExecutableLines(lines, language);
        
        // Find main function
        let inMain = false;
        let mainStartLine = 1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/int\s+main\s*\(/)) {
                inMain = true;
                mainStartLine = i + 1;
                break;
            }
        }
        
        // Initialize call stack
        this.callStack = [{
            name: 'main',
            file: language === 'c' ? 'main.c' : 'main.cpp',
            line: mainStartLine
        }];
        
        // Simulate stepping through main function
        for (let i = 0; i < executableLines.length; i++) {
            const lineNum = executableLines[i];
            
            // Skip lines before main
            if (lineNum < mainStartLine) continue;
            
            this.currentLine = lineNum;
            this.callStack[0].line = lineNum;
            
            if (this.onCallStackUpdate) {
                this.onCallStackUpdate(this.callStack);
            }
            
            // Check for breakpoint
            const bpSet = this.breakpoints.get('current');
            if (bpSet && bpSet.has(lineNum)) {
                this.isPaused = true;
                
                if (this.onBreakpointHit) {
                    this.onBreakpointHit(lineNum);
                }
                
                if (this.onPause) {
                    this.onPause(lineNum);
                }
                
                await this.waitForResume();
            }
            
            // Check step mode
            if (this.stepMode) {
                this.isPaused = true;
                this.stepMode = null;
                
                if (this.onStep) {
                    this.onStep(lineNum);
                }
                
                if (this.onPause) {
                    this.onPause(lineNum);
                }
                
                await this.waitForResume();
            }
            
            // Parse variables
            this.parseVariables(lines[lineNum - 1], language);
            
            if (!this.isDebugging) {
                break;
            }
        }
        
        this.stopDebug();
        return { success: true };
    }

    /**
     * Get executable line numbers (skip comments, empty lines, etc.)
     */
    getExecutableLines(lines, language) {
        const executable = [];
        let inMultilineComment = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) continue;
            
            // Handle comments
            if (language === 'python') {
                // Skip Python comments
                if (line.startsWith('#')) continue;
                // Skip docstrings (simplified)
                if (line.startsWith('"""') || line.startsWith("'''")) continue;
            } else {
                // Skip C/C++ comments
                if (line.startsWith('//')) continue;
                
                // Handle multiline comments
                if (line.includes('/*')) inMultilineComment = true;
                if (inMultilineComment) {
                    if (line.includes('*/')) inMultilineComment = false;
                    continue;
                }
                
                // Skip preprocessor directives
                if (line.startsWith('#')) continue;
            }
            
            // Skip certain keywords that aren't executable
            if (language === 'python') {
                if (line.startsWith('import ') || line.startsWith('from ')) continue;
                if (line.startsWith('def ') || line.startsWith('class ')) {
                    executable.push(i + 1);
                    continue;
                }
            } else {
                if (line.startsWith('#include')) continue;
                if (line.startsWith('using namespace')) continue;
                if (line === '{' || line === '}') continue;
            }
            
            executable.push(i + 1);
        }
        
        return executable;
    }

    /**
     * Parse variables from line (simplified)
     */
    parseVariables(line, language = 'python') {
        if (!line) return;
        
        const trimmedLine = line.trim();
        
        if (language === 'python') {
            // Look for assignment statements
            const assignMatch = trimmedLine.match(/^(\w+)\s*=\s*(.+)$/);
            if (assignMatch) {
                const varName = assignMatch[1];
                const varValue = assignMatch[2];
                
                this.variables.set(varName, {
                    name: varName,
                    value: varValue,
                    type: this.inferType(varValue, 'python')
                });
            }
        } else {
            // C/C++ variable declarations
            const declMatch = trimmedLine.match(/^(int|float|double|char|string|bool|auto)\s+(\w+)\s*=?\s*(.*)$/);
            if (declMatch) {
                const varType = declMatch[1];
                const varName = declMatch[2];
                const varValue = declMatch[3] || 'undefined';
                
                this.variables.set(varName, {
                    name: varName,
                    value: varValue.replace(/;$/, ''),
                    type: varType
                });
            }
        }
        
        if (this.onVariableUpdate) {
            this.onVariableUpdate(Array.from(this.variables.values()));
        }
    }

    /**
     * Infer type from value
     */
    inferType(value, language) {
        value = value.trim();
        
        if (value.match(/^-?\d+$/)) return 'int';
        if (value.match(/^-?\d+\.\d+$/)) return 'float';
        if (value.startsWith('"') || value.startsWith("'")) return 'str';
        if (value === 'True' || value === 'False') return 'bool';
        if (value.startsWith('[')) return 'list';
        if (value.startsWith('{')) return 'dict';
        if (value.startsWith('(')) return 'tuple';
        
        return 'object';
    }

    /**
     * Wait for resume signal
     */
    waitForResume() {
        return new Promise((resolve) => {
            const checkResume = () => {
                if (!this.isPaused || !this.isDebugging) {
                    resolve();
                } else {
                    setTimeout(checkResume, 100);
                }
            };
            checkResume();
        });
    }

    /**
     * Continue execution
     */
    continue() {
        this.isPaused = false;
        this.stepMode = null;
        
        if (this.onResume) {
            this.onResume();
        }
    }

    /**
     * Step over
     */
    stepOver() {
        this.stepMode = 'over';
        this.isPaused = false;
    }

    /**
     * Step into
     */
    stepInto() {
        this.stepMode = 'into';
        this.isPaused = false;
    }

    /**
     * Step out
     */
    stepOut() {
        this.stepMode = 'out';
        this.isPaused = false;
    }

    /**
     * Restart debugging
     */
    restart() {
        this.stopDebug();
        // The caller should restart with the same code
    }

    /**
     * Stop debugging
     */
    stopDebug() {
        this.isDebugging = false;
        this.isPaused = false;
        this.currentLine = null;
        this.callStack = [];
        this.stepMode = null;
        
        if (this.onDebugEnd) {
            this.onDebugEnd();
        }
    }

    /**
     * Add breakpoint
     */
    addBreakpoint(fileId, lineNumber) {
        if (!this.breakpoints.has(fileId)) {
            this.breakpoints.set(fileId, new Set());
        }
        this.breakpoints.get(fileId).add(lineNumber);
    }

    /**
     * Remove breakpoint
     */
    removeBreakpoint(fileId, lineNumber) {
        const bpSet = this.breakpoints.get(fileId);
        if (bpSet) {
            bpSet.delete(lineNumber);
        }
    }

    /**
     * Clear breakpoints for file
     */
    clearBreakpoints(fileId) {
        this.breakpoints.delete(fileId);
    }

    /**
     * Get all breakpoints
     */
    getBreakpoints(fileId) {
        return Array.from(this.breakpoints.get(fileId) || []);
    }

    /**
     * Get current state
     */
    getState() {
        return {
            isDebugging: this.isDebugging,
            isPaused: this.isPaused,
            currentLine: this.currentLine,
            callStack: this.callStack,
            variables: Array.from(this.variables.values())
        };
    }

    /**
     * Evaluate expression (simplified)
     */
    evaluate(expression) {
        // Check if it's a variable we know
        if (this.variables.has(expression)) {
            return this.variables.get(expression).value;
        }
        
        return `无法求值: ${expression}`;
    }
}
