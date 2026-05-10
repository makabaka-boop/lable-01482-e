/**
 * CodeForge IDE - Compiler & Runtime
 * Handles code compilation and execution
 */

class CompilerRuntime {
    constructor() {
        this.pyodide = null;
        this.isPyodideReady = false;
        this.isRunning = false;
        this.isStopping = false;
        this.abortController = null;
        this.onOutput = null;
        this.onError = null;
        this.onComplete = null;
        this.onStatusChange = null;
        this.pythonStdout = [];
        this.pythonStderr = [];
        this.interruptBuffer = null;
    }

    /**
     * Initialize Pyodide for Python execution
     */
    async initPyodide() {
        if (this.isPyodideReady) return true;
        
        try {
            this.updateStatus('正在加载 Python 运行时...');
            
            // Create interrupt buffer for stopping execution (if available)
            try {
                if (typeof SharedArrayBuffer !== 'undefined') {
                    this.interruptBuffer = new Int32Array(new SharedArrayBuffer(4));
                }
            } catch (e) {
                console.warn('SharedArrayBuffer not available, interrupt functionality may be limited');
                this.interruptBuffer = null;
            }
            
            this.pyodide = await loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/',
                stdout: (text) => {
                    this.pythonStdout.push(text);
                    if (this.onOutput) {
                        this.onOutput(text, 'log');
                    }
                },
                stderr: (text) => {
                    this.pythonStderr.push(text);
                    if (this.onOutput) {
                        this.onOutput(text, 'error');
                    }
                }
            });
            
            // Set up interrupt buffer if available
            if (this.pyodide.setInterruptBuffer) {
                this.pyodide.setInterruptBuffer(this.interruptBuffer);
            }
            
            // Install commonly used packages
            this.updateStatus('正在加载 Python 包...');
            await this.pyodide.loadPackage(['numpy', 'micropip']);
            
            this.isPyodideReady = true;
            this.updateStatus('Python 运行时就绪');
            
            return true;
        } catch (error) {
            console.error('Pyodide initialization failed:', error);
            this.updateStatus('Python 运行时加载失败');
            return false;
        }
    }

    /**
     * Update status message
     */
    updateStatus(message) {
        if (this.onStatusChange) {
            this.onStatusChange(message);
        }
    }

    /**
     * Run code based on language
     */
    async run(code, language, stdin = '') {
        if (this.isRunning) {
            return { success: false, error: '已有代码正在运行' };
        }
        
        this.isRunning = true;
        this.updateStatus('正在运行...');
        
        try {
            let result;
            
            switch (language) {
                case 'python':
                    result = await this.runPython(code, stdin);
                    break;
                case 'c':
                case 'cpp':
                    result = await this.runCCpp(code, language, stdin);
                    break;
                default:
                    result = { success: false, error: `不支持的语言: ${language}` };
            }
            
            this.isRunning = false;
            this.updateStatus(result.success ? '运行完成' : '运行失败');
            
            if (this.onComplete) {
                this.onComplete(result);
            }
            
            return result;
        } catch (error) {
            this.isRunning = false;
            this.updateStatus('运行出错');
            
            const result = { success: false, error: error.message };
            
            if (this.onError) {
                this.onError(error);
            }
            
            return result;
        }
    }

    /**
     * Run Python code using Pyodide
     */
    async runPython(code, stdin = '') {
        if (!this.isPyodideReady) {
            await this.initPyodide();
            if (!this.isPyodideReady) {
                return { success: false, error: 'Python 运行时未就绪' };
            }
        }
        
        // Clear previous output
        this.pythonStdout = [];
        this.pythonStderr = [];
        
        // Reset interrupt buffer
        if (this.interruptBuffer) {
            Atomics.store(this.interruptBuffer, 0, 0);
        }
        
        try {
            // Setup stdin
            if (stdin) {
                const stdinLines = stdin.split('\n');
                let lineIndex = 0;
                
                this.pyodide.runPython(`
import sys
from io import StringIO

class StdinWrapper:
    def __init__(self, lines):
        self.lines = lines
        self.index = 0
    
    def readline(self):
        if self.index < len(self.lines):
            line = self.lines[self.index]
            self.index += 1
            return line + '\\n'
        return ''
    
    def read(self):
        return '\\n'.join(self.lines[self.index:])

_stdin_lines = ${JSON.stringify(stdinLines)}
sys.stdin = StdinWrapper(_stdin_lines)
                `);
            }
            
            // Run the code
            const startTime = performance.now();
            const result = await this.pyodide.runPythonAsync(code);
            const endTime = performance.now();
            
            // Check for result value
            let output = this.pythonStdout.join('\n');
            if (result !== undefined && result !== null) {
                // Don't show undefined/None unless it's the only output
                if (output.trim() === '' && String(result) !== 'undefined') {
                    output = String(result);
                }
            }
            
            return {
                success: true,
                output: output,
                error: this.pythonStderr.length > 0 ? this.pythonStderr.join('\n') : null,
                executionTime: Math.round(endTime - startTime)
            };
        } catch (error) {
            // Check if it was interrupted
            const wasInterrupted = error.message.includes('KeyboardInterrupt') || 
                                   error.message.includes('interrupted');
            
            return {
                success: wasInterrupted,
                output: this.pythonStdout.join('\n'),
                error: wasInterrupted ? '执行已中断' : error.message,
                executionTime: 0
            };
        }
    }

    /**
     * Run C/C++ code using online compiler API
     */
    async runCCpp(code, language, stdin = '') {
        // Use Piston API for C/C++ compilation
        const apiUrl = CONFIG.api.piston;
        
        const languageMap = {
            'c': { language: 'c', version: '10.2.0' },
            'cpp': { language: 'c++', version: '10.2.0' }
        };
        
        const langInfo = languageMap[language];
        
        try {
            this.updateStatus('正在编译...');
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language: langInfo.language,
                    version: langInfo.version,
                    files: [{
                        name: language === 'c' ? 'main.c' : 'main.cpp',
                        content: code
                    }],
                    stdin: stdin,
                    compile_timeout: 10000,
                    run_timeout: CONFIG.compiler.timeout
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Handle compilation errors
            if (result.compile && result.compile.code !== 0) {
                return {
                    success: false,
                    output: '',
                    error: result.compile.stderr || result.compile.output,
                    compilationError: true
                };
            }
            
            // Handle runtime results
            const output = result.run?.stdout || '';
            const error = result.run?.stderr || '';
            const exitCode = result.run?.code || 0;
            
            if (this.onOutput && output) {
                this.onOutput(output, 'log');
            }
            
            if (this.onOutput && error) {
                this.onOutput(error, exitCode !== 0 ? 'error' : 'warn');
            }
            
            return {
                success: exitCode === 0,
                output: output,
                error: error || null,
                exitCode: exitCode
            };
        } catch (error) {
            // Fallback to Wandbox API
            return this.runCCppWandbox(code, language, stdin);
        }
    }

    /**
     * Fallback C/C++ compiler using Wandbox API
     */
    async runCCppWandbox(code, language, stdin = '') {
        const compilerMap = {
            'c': 'gcc-head-c',
            'cpp': 'gcc-head'
        };
        
        try {
            this.updateStatus('正在使用备用编译器...');
            
            const response = await fetch(CONFIG.api.wandbox, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code,
                    compiler: compilerMap[language],
                    stdin: stdin,
                    'compiler-option-raw': `-${CONFIG.compiler.optimization} -std=${language === 'c' ? CONFIG.compiler.cStandard : CONFIG.compiler.cppStandard}`
                })
            });
            
            if (!response.ok) {
                throw new Error(`编译服务不可用 (${response.status})`);
            }
            
            const result = await response.json();
            
            // Check for compilation errors
            if (result.compiler_error) {
                return {
                    success: false,
                    output: '',
                    error: result.compiler_error,
                    compilationError: true
                };
            }
            
            const output = result.program_output || '';
            const error = result.program_error || '';
            
            if (this.onOutput && output) {
                this.onOutput(output, 'log');
            }
            
            if (this.onOutput && error) {
                this.onOutput(error, 'error');
            }
            
            return {
                success: !result.status || result.status === '0',
                output: output,
                error: error || null,
                signal: result.signal || null
            };
        } catch (error) {
            return {
                success: false,
                output: '',
                error: `编译服务暂时不可用: ${error.message}\n\n提示: 这是一个纯前端项目，C/C++ 编译需要网络连接到在线编译服务。`
            };
        }
    }

    /**
     * Stop running code
     */
    stop() {
        if (this.abortController) {
            this.abortController.abort();
        }
        
        if (this.pyodide && this.isRunning) {
            this.isStopping = true;
            
            try {
                // Try interrupt buffer first (most reliable)
                if (this.interruptBuffer && this.pyodide.setInterruptBuffer) {
                    Atomics.store(this.interruptBuffer, 0, 2);
                }
                
                // Try to raise KeyboardInterrupt
                try {
                    this.pyodide.runPython('raise KeyboardInterrupt()');
                } catch (e) {
                }
            } catch (e) {
            }
        }
        
        this.isRunning = false;
        this.isStopping = false;
        this.updateStatus('已停止');
    }

    /**
     * Reset Pyodide (for hard reset when stop doesn't work)
     */
    async resetPyodide() {
        this.pyodide = null;
        this.isPyodideReady = false;
        this.interruptBuffer = null;
        return await this.initPyodide();
    }

    /**
     * Check if compiler/runtime is ready
     */
    isReady(language) {
        if (language === 'python') {
            return this.isPyodideReady;
        }
        return true; // C/C++ uses online API, always "ready"
    }

    /**
     * Parse error message for line numbers
     */
    parseErrors(errorMessage, language) {
        const errors = [];
        const lines = errorMessage.split('\n');
        
        for (const line of lines) {
            let match;
            
            if (language === 'python') {
                // Python error format: File "...", line X
                match = line.match(/File\s+"[^"]+",\s+line\s+(\d+)/);
                if (match) {
                    errors.push({
                        line: parseInt(match[1], 10),
                        message: line,
                        severity: 'error'
                    });
                }
                
                // Also check for "line X" format
                match = line.match(/line\s+(\d+)/i);
                if (match && errors.length === 0) {
                    errors.push({
                        line: parseInt(match[1], 10),
                        message: line,
                        severity: 'error'
                    });
                }
            } else {
                // C/C++ error format: file.c:X:Y: error: message
                match = line.match(/:(\d+):(\d+):\s*(error|warning):\s*(.+)/);
                if (match) {
                    errors.push({
                        line: parseInt(match[1], 10),
                        column: parseInt(match[2], 10),
                        message: match[4],
                        severity: match[3] === 'error' ? 'error' : 'warning'
                    });
                }
            }
        }
        
        return errors;
    }

    /**
     * Get runtime stats
     */
    getStats() {
        return {
            pythonReady: this.isPyodideReady,
            isRunning: this.isRunning
        };
    }
}
