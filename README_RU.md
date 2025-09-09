# Env Uploader — руководство (RU)

Env Uploader — расширение для VS Code, позволяющее загружать файл `.env` в GitHub Secrets/Variables (репозитория или выбранного Environment) через ваш бэкенд API.

## Возможности
- Панель в проводнике (Explorer) с формой загрузки `.env`
- Загрузка реального файла (multipart/form-data), содержимое не показывается в UI
- Поддержка GitHub Environments: загрузка списка и выбор из выпадающего меню
- Подробные сообщения об ошибках (HTTP статус, метод, URL, тело ответа)

## Требования
- VS Code 1.103+
- Доступ к вашему бекенд API
- GitHub Personal Access Token (PAT) с правами на секреты/переменные репозитория

## Установка
### Вариант 1: из файла .vsix
1. Получите/соберите пакет расширения (`.vsix`).
2. В VS Code: Откройте «Extensions» → «…» (меню с тремя точками) → «Install from VSIX…».
3. Выберите файл `env-uploader-<version>.vsix` и подтвердите установку.

Командой из терминала (опционально):
```bash
code --install-extension env-uploader-<version>.vsix
```

### Вариант 2: из Marketplace (если опубликовано)
1. Откройте «Extensions» в VS Code.
2. Найдите «Env Uploader» по имени издателя и установите.

## Использование
1. Откройте вкладку «Explorer». В правой панели появится вид «Upload .env».
2. Заполните поля:
   - GitHub Username (owner)
   - GitHub Repository (repo)
   - Access Token (PAT)
3. Нажмите «Load», чтобы подгрузить список окружений (или оставьте «Repository level»).
4. Нажмите «Select .env File» и выберите ваш `.env` файл.
5. Нажмите «Upload» для отправки.

Что делает расширение под капотом:
- GET `/environments/{owner}/{repo}?token=...` — получение списка окружений
- POST `/env/upload` (multipart/form-data): `owner`, `repo`, `token`, опционально `environment`, и `env_file` (файл)

## Обновление/удаление
- Обновление: установите новую версию `.vsix` (VS Code предложит обновить).
- Удаление: «Extensions» → найдите «Env Uploader» → «Uninstall».

## Частые проблемы
- «Command not found»: перезагрузите окно VS Code (Developer: Reload Window).
- Ошибки 4xx/5xx: проверьте корректность URL API, `owner/repo/token`, выбранное окружение.
- 422 (Unprocessable Entity): убедитесь, что поля формы заполнены и бэкенд принимает multipart/form-data.

## Обратная связь
- Сообщайте о проблемах и предложениях в репозитории проекта или разработчику расширения.
