const vscode = require('vscode');
const WebviewManager = require('./src/webviewManager');
const UploadManager = require('./src/uploadManager');
const EnvUploaderViewProvider = require('./src/webviewViewProvider');

function activate(context) {
    console.log('Env Uploader activated');
    
    const uploadManager = new UploadManager();
    const webviewManager = new WebviewManager(context, uploadManager);
    const viewProvider = new EnvUploaderViewProvider(context, uploadManager);

    // Команда для открытия формы
    let showFormCommand = vscode.commands.registerCommand('env-uploader.envUpload', () => {
        webviewManager.createWebview();
    });

    const viewDisposable = vscode.window.registerWebviewViewProvider(
        'envUploaderView',
        viewProvider,
        { webviewOptions: { retainContextWhenHidden: true } }
    );

    context.subscriptions.push(showFormCommand, viewDisposable, uploadManager);
}

function deactivate() {}

module.exports = { activate, deactivate };