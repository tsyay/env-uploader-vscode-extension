const axios = require('axios');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

class UploadManager {
    constructor() {
        this.baseURL = 'https://api.env-to-github.tools.infinite-ellipse.ru'; // Замените на ваш URL
    }

    async uploadEnvFile(data) {
        try {
            const { username, repository, token, filePath, environment } = data;

            // Валидация
            if (!username || !repository || !token || !filePath) {
                throw new Error('Все поля обязательны для заполнения');
            }

            const url = `${this.baseURL}/env/upload`;
            const payload = {
                owner: username,
                repo: repository,
                token: token
            };

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            console.debug('Uploading .env', { url, payload, headers });

            let response;
            try {
                response = await axios.post(url, payload, {
                    headers,
                    timeout: 10000
                });
            } catch (err) {
                const FormData = require('form-data');
                const formData = new FormData();
                const fsModule = require('fs');
                formData.append('owner', username);
                formData.append('repo', repository);
                formData.append('token', token);
                if (environment) {
                    formData.append('environment', environment);
                }
                formData.append('env_file', fsModule.createReadStream(filePath), {
                    filename: '.env',
                    contentType: 'text/plain'
                });

                const formHeaders = formData.getHeaders({ 'Authorization': `Bearer ${token}` });
                console.debug('Retrying as form-data with file', { url, formHeaders });

                response = await axios.post(url, formData, {
                    headers: formHeaders,
                    timeout: 10000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });
            }

            return response.data;
        } catch (error) {
            console.error('Upload error:', error);
            throw this.handleError(error);
        }
    }

    async getEnvironments({ username, repository, token }) {
        try {
            const url = `${this.baseURL}/environments/${encodeURIComponent(username)}/${encodeURIComponent(repository)}`;
            const response = await axios.get(url, {
                params: { token },
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            console.error('Get environments error:', error);
            throw this.handleError(error);
        }
    }

    handleError(error) {
        if (axios.isAxiosError(error)) {
            const method = error.config?.method?.toUpperCase?.() || 'UNKNOWN';
            const url = error.config?.url || 'UNKNOWN_URL';
            const status = error.response?.status;
            const statusText = error.response?.statusText;
            const code = error.code;
            const responseData = error.response?.data;
            const responseBody = typeof responseData === 'string' 
                ? responseData
                : responseData ? JSON.stringify(responseData) : undefined;

            if (error.response) {
                const parts = [
                    `HTTP ${status}${statusText ? ' ' + statusText : ''}`,
                    `${method} ${url}`,
                    code ? `code=${code}` : undefined,
                    responseBody ? `response=${responseBody}` : undefined
                ].filter(Boolean);
                return new Error(`Server error: ${parts.join(' | ')}`);
            } else if (error.request) {
                const parts = [
                    `${method} ${url}`,
                    code ? `code=${code}` : undefined
                ].filter(Boolean);
                return new Error(`No response from server. ${parts.join(' | ')}`);
            }
        }
        return error instanceof Error ? error : new Error(String(error));
    }

    async readEnvFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error('File not found');
            }

            const content = fs.readFileSync(filePath, 'utf8');
            return content;
        } catch (error) {
            throw new Error(`Cannot read .env file: ${error.message}`);
        }
    }

    dispose() {
        // Cleanup if needed
    }
}

module.exports = UploadManager;


