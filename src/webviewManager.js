const vscode = require('vscode');
const path = require('path');

class WebviewManager {
    constructor(context, uploadManager) {
        this.context = context;
        this.uploadManager = uploadManager;
        this.currentPanel = null;
    }

    createWebview() {
        if (this.currentPanel) {
            this.currentPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'envUploadForm',
            'Upload .env File',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getWebviewContent();

        // Обработка сообщений из веб-вью
        panel.webview.onDidReceiveMessage(
            async (data) => {
                switch (data.type) {
                    case 'upload':
                        await this.handleUpload(data);
                        break;
                    case 'selectFile':
                        await this.handleFileSelect();
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        panel.onDidDispose(() => {
            this.currentPanel = null;
        }, null, this.context.subscriptions);

        this.currentPanel = panel;
    }

    async handleUpload(data) {
        try {
            const { username, repository, token, envContent } = data;

            const result = await this.uploadManager.uploadEnvFile({
                username,
                repository,
                token,
                envContent
            });

            this.currentPanel.webview.postMessage({
                type: 'uploadSuccess',
                data: result
            });

            vscode.window.showInformationMessage('✅ .env file uploaded successfully!');

        } catch (error) {
            this.currentPanel.webview.postMessage({
                type: 'uploadError',
                error: error.message
            });

            vscode.window.showErrorMessage(`❌ Upload failed: ${error.message}`);
        }
    }

    async handleFileSelect() {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select .env file',
            filters: {
                'Env Files': ['env'],
                'All files': ['*']
            }
        });

        if (fileUri && fileUri[0]) {
            try {
                const content = await this.uploadManager.readEnvFile(fileUri[0].fsPath);
                this.currentPanel.webview.postMessage({
                    type: 'fileSelected',
                    content: content
                });
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
                    body { padding: 20px; font-family: var(--vscode-font-family); }
                    .form-group { margin-bottom: 15px; }
                    label { display: block; margin-bottom: 5px; font-weight: bold; }
                    input, textarea { 
                        width: 100%; 
                        padding: 8px; 
                        border: 1px solid var(--vscode-input-border);
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                    }
                    button { 
                        padding: 10px 20px; 
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        cursor: pointer;
                        margin-right: 10px;
                    }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                    .file-content { height: 200px; resize: vertical; }
                    .status { margin-top: 15px; padding: 10px; border-radius: 4px; }
                    .success { background: #d4edda; color: #155724; }
                    .error { background: #f8d7da; color: #721c24; }
                </style>
            </head>
            <body>
                <h2>Upload .env File</h2>
                
                <div class="form-group">
                    <label for="username">GitHub Username:</label>
                    <input type="text" id="username" placeholder="your-username">
                </div>

                <div class="form-group">
                    <label for="repository">GitHub Repository:</label>
                    <input type="text" id="repository" placeholder="your-repo">
                </div>

                <div class="form-group">
                    <label for="token">Access Token:</label>
                    <input type="password" id="token" placeholder="your-token">
                </div>

                <div class="form-group">
                    <label for="envFile">.env File:</label>
                    <button onclick="selectFile()">Select .env File</button>
                    <textarea id="envContent" class="file-content" placeholder="Or paste .env content here..."></textarea>
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
                        const envContent = document.getElementById('envContent').value;
                        
                        vscode.postMessage({ 
                            type: 'upload', 
                            username, 
                            repository, 
                            token, 
                            envContent 
                        });
                    }
                    
                    window.addEventListener('message', event => {
                        const message = event.data;
                        const status = document.getElementById('status');
                        
                        switch (message.type) {
                            case 'fileSelected':
                                document.getElementById('envContent').value = message.content;
                                break;
                            case 'uploadSuccess':
                                status.style.display = 'block';
                                status.className = 'status success';
                                status.innerHTML = '✅ Upload successful!';
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

module.exports = WebviewManager;


