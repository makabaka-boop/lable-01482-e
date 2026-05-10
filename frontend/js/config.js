/**
 * CodeForge IDE - Configuration
 */

const CONFIG = {
    // Editor settings
    editor: {
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        tabSize: 4,
        theme: 'vs-dark',
        minimap: true,
        lineNumbers: true,
        wordWrap: 'off',
        automaticLayout: true,
        scrollBeyondLastLine: false,
        bracketPairColorization: true,
        autoClosingBrackets: 'always',
        autoIndent: 'full',
        formatOnPaste: true,
        formatOnType: true
    },

    // Compiler settings
    compiler: {
        cStandard: 'c11',
        cppStandard: 'c++17',
        optimization: 'O2',
        timeout: 30000 // 30 seconds
    },

    // Language configurations
    languages: {
        python: {
            extension: '.py',
            icon: 'fab fa-python',
            monacoId: 'python',
            comment: '#',
            defaultCode: `# Python 程序
print("Hello, World!")
`,
            helloWorld: `# Hello World 程序
print("Hello, World!")
`,
            mainTemplate: `# 主程序模板
def main():
    # 在这里编写你的代码
    print("程序开始运行...")
    
    # 示例：读取输入
    # name = input("请输入你的名字: ")
    # print(f"你好, {name}!")

if __name__ == "__main__":
    main()
`
        },
        c: {
            extension: '.c',
            icon: 'fas fa-c',
            monacoId: 'c',
            comment: '//',
            defaultCode: `// C 程序
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
            helloWorld: `// Hello World 程序
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
            mainTemplate: `// C 主程序模板
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    // 在这里编写你的代码
    printf("程序开始运行...\\n");
    
    // 示例：读取输入
    // char name[100];
    // printf("请输入你的名字: ");
    // scanf("%s", name);
    // printf("你好, %s!\\n", name);
    
    return 0;
}
`
        },
        cpp: {
            extension: '.cpp',
            icon: 'fas fa-c',
            monacoId: 'cpp',
            comment: '//',
            defaultCode: `// C++ 程序
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
            helloWorld: `// Hello World 程序
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
            mainTemplate: `// C++ 主程序模板
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    // 在这里编写你的代码
    cout << "程序开始运行..." << endl;
    
    // 示例：读取输入
    // string name;
    // cout << "请输入你的名字: ";
    // cin >> name;
    // cout << "你好, " << name << "!" << endl;
    
    return 0;
}
`
        }
    },

    // API endpoints for online compilation (using public APIs)
    api: {
        // Wandbox API for C/C++
        wandbox: 'https://wandbox.org/api/compile.json',
        // Piston API as alternative
        piston: 'https://emkc.org/api/v2/piston/execute'
    },

    // Storage keys
    storage: {
        files: 'codeforge_files',
        settings: 'codeforge_settings',
        recentFiles: 'codeforge_recent'
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
