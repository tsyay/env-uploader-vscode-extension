const vscode = require('vscode');

class EnvUploaderViewProvider {
    constructor(context, uploadManager) {
        this.context = context;
        this.uploadManager = uploadManager;
        this.view = null;
        this.selectedFilePath = null;
    }

    resolveWebviewView(webviewView, context, _token) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            retainContextWhenHidden: true
        };

        webviewView.webview.html = this.getWebviewContent();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'upload':
                    await this.handleUpload(data);
                    break;
                case 'selectFile':
                    await this.handleFileSelect();
                    break;
                case 'loadEnvironments':
                    await this.handleLoadEnvironments(data);
                    break;
            }
        });
    }

    async handleUpload(data) {
        try {
            const { username, repository, token, environment, autoClear } = data;

            if (!this.selectedFilePath) {
                vscode.window.showErrorMessage('Сначала выберите .env файл');
                return;
            }

            const result = await this.uploadManager.uploadEnvFile({
                username,
                repository,
                token,
                filePath: this.selectedFilePath,
                environment: environment && environment !== '__repo__' ? environment : undefined
            });

            this.view?.webview.postMessage({
                type: 'uploadSuccess',
                data: result
            });

            vscode.window.showInformationMessage('✅ .env file uploaded successfully!');

            if (autoClear) {
                this.selectedFilePath = null;
                this.view?.webview.postMessage({ type: 'resetForm' });
            }
        } catch (error) {
            this.view?.webview.postMessage({
                type: 'uploadError',
                error: error.message
            });

            vscode.window.showErrorMessage(`❌ Upload failed: ${error.message}`);
        }
    }

    async handleLoadEnvironments(data) {
        try {
            const { username, repository, token } = data;
            if (!username || !repository || !token) {
                vscode.window.showErrorMessage('Enter username, repository and token first');
                return;
            }
            const result = await this.uploadManager.getEnvironments({ username, repository, token });
            const environments = Array.isArray(result?.environments) ? result.environments : [];
            this.view?.webview.postMessage({ type: 'environmentsLoaded', environments });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load environments: ${error.message}`);
            this.view?.webview.postMessage({ type: 'environmentsLoaded', environments: [] });
        }
    }

    async handleFileSelect() {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select .env file'
        });

        if (fileUri && fileUri[0]) {
            const selectedPath = fileUri[0].fsPath;
            const pathModule = require('path');
            const fileName = pathModule.basename(selectedPath);

            if (fileName !== '.env' && !fileName.endsWith('.env')) {
                vscode.window.showErrorMessage('Выберите файл с именем .env или оканчивающимся на .env');
                return;
            }

            try {
                // Не читаем и не показываем содержимое; сохраняем путь для отправки
                this.selectedFilePath = selectedPath;
                this.view?.webview.postMessage({ type: 'fileSelected', name: fileName });
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        }
    }

    getWebviewContent() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { padding: 12px; font-family: var(--vscode-font-family); }
                    .form-group { margin-bottom: 10px; }
                    label { display: block; margin-bottom: 5px; font-weight: bold; }
                    input, textarea { 
                        width: 100%; 
                        padding: 6px; 
                        border: 1px solid var(--vscode-input-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        box-sizing: border-box;
                    }
                    button { 
                        padding: 8px 12px; 
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        cursor: pointer;
                        width: 100%;
                        margin: 8px 0 0 0;
                    }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                    .file-content { height: 140px; resize: vertical; }
                    .status { margin-top: 10px; padding: 8px; border-radius: 4px; }
                    .success { background: #d4edda; color: #155724; }
                    .error { background: #f8d7da; color: #721c24; }
                </style>
            </head>
            <body>
                <h3>Upload .env File</h3>
                
                <div class="form-group">
                    <label for="username">GitHub Username</label>
                    <input type="text" id="username" placeholder="your-username">
                </div>

                <div class="form-group">
                    <label for="repository">GitHub Repository</label>
                    <input type="text" id="repository" placeholder="your-repo">
                </div>

                <div class="form-group">
                    <label for="token">Access Token</label>
                    <input type="password" id="token" placeholder="your-token">
                </div>

                <div class="form-group">
                    <label for="environment">Environment</label>
                    <div style="display:block;">
                        <select id="environment" style="width:100%;">
                            <option value="__repo__" selected>Repository level</option>
                        </select>
                        <button id="loadBtn" onclick="loadEnvs()">Load</button>
                    </div>
                </div>

                <div class="form-group">
                    <label for="envFile">.env File</label>
                    <button onclick="selectFile()">Select .env File</button>
                    <div id="fileName" style="margin-top:6px;color:var(--vscode-descriptionForeground)"></div>
                </div>

                <div class="form-group">
                    <label for="autoClear">Автоочистка после загрузки</label>
                    <label style="display:flex;align-items:center;gap:8px;">
                        <input type="checkbox" id="autoClear" />
                        <span>Очистить форму и выбор файла после успешной загрузки</span>
                    </label>
                </div>

                <button onclick="upload()">Upload</button>
                
                <div id="status" class="status" style="display: none;"></div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function selectFile() {
                        vscode.postMessage({ type: 'selectFile' });
                    }
                    
                    function upload() {
                        const username = document.getElementById('username').value;
                        const repository = document.getElementById('repository').value;
                        const token = document.getElementById('token').value;
                        const environment = document.getElementById('environment').value;
                        const autoClear = document.getElementById('autoClear').checked;
                        // Содержимое файла не передаём
                        
                        vscode.postMessage({ 
                            type: 'upload', 
                            username, 
                            repository, 
                            token,
                            environment,
                            autoClear
                        });
                    }

                    function loadEnvs() {
                        const username = document.getElementById('username').value;
                        const repository = document.getElementById('repository').value;
                        const token = document.getElementById('token').value;
                        vscode.postMessage({ type: 'loadEnvironments', username, repository, token });
                    }
                    
                    window.addEventListener('message', event => {
                        const message = event.data;
                        const status = document.getElementById('status');
                        
                        switch (message.type) {
                            case 'fileSelected':
                                const fileNameEl = document.getElementById('fileName');
                                fileNameEl.textContent = 'Selected: ' + message.name;
                                break;
                            case 'environmentsLoaded':
                                const select = document.getElementById('environment');
                                const current = select.value;
                                select.innerHTML = '';
                                const optRepo = document.createElement('option');
                                optRepo.value = '__repo__';
                                optRepo.textContent = 'Repository level';
                                select.appendChild(optRepo);
                                if (Array.isArray(message.environments)) {
                                    for (const env of message.environments) {
                                        const opt = document.createElement('option');
                                        opt.value = env;
                                        opt.textContent = env;
                                        select.appendChild(opt);
                                    }
                                }
                                const options = Array.from(select.options).map(o => o.value);
                                if (options.includes(current)) {
                                    select.value = current;
                                } else {
                                    select.value = '__repo__';
                                }
                                break;
                            case 'uploadSuccess':
                                status.style.display = 'block';
                                status.className = 'status success';
                                status.innerHTML = '✅ Upload successful!';
                                break;
                            case 'resetForm':
                                document.getElementById('username').value = '';
                                document.getElementById('repository').value = '';
                                document.getElementById('token').value = '';
                                document.getElementById('environment').value = '__repo__';
                                document.getElementById('fileName').textContent = '';
                                break;
                            case 'uploadError':
                                status.style.display = 'block';
                                status.className = 'status error';
                                status.innerHTML = '❌ Error: ' + message.error;
                                break;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}

module.exports = EnvUploaderViewProvider;


