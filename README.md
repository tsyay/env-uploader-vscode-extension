# Env Uploader

Upload your `.env` file to GitHub Secrets/Variables directly from VS Code.

## Features

- Explorer view with a form to upload `.env` files
- Select a repository level or a specific GitHub Environment
- Fetch environments from your repo via API and choose from a dropdown
- Actual file upload (multipart/form-data), contents are never shown in UI
- Detailed error messages with HTTP status and server response

## Usage

1. Open the Explorer view. You will see the panel “Upload .env”.
2. Fill in:
   - GitHub Username (owner)
   - GitHub Repository (repo)
   - Access Token (PAT)
3. Click “Load” to fetch available Environments, or keep “Repository level”.
4. Click “Select .env File” and pick your `.env` file.
5. Click “Upload”.

The extension will call your backend:
- GET `/environments/{owner}/{repo}?token=...` to fetch environments
- POST `/env/upload` with form-data: `owner`, `repo`, `token`, optional `environment`, and `env_file` as file stream

## Commands

- “Env Uploader: Upload .env File” (`env-uploader.envUpload`) — opens the webview form.

## Requirements

- VS Code 1.103+
- Internet access to your backend API
- GitHub Personal Access Token with permissions for repository secrets/variables

## Settings

No user settings currently. API base URL is defined in code (`uploadManager.js`).

## Release Notes

### 0.1.0
- Initial release with Explorer view, environment fetching, and file upload
