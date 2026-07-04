@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Verificando estructura de migración...
if exist www\index.html (echo [OK] www\index.html) else (echo [FALTA] www\index.html)
if exist www\app.js (echo [OK] www\app.js) else (echo [FALTA] www\app.js)
if exist www\styles.css (echo [OK] www\styles.css) else (echo [FALTA] www\styles.css)
if exist capacitor.config.json (echo [OK] capacitor.config.json) else (echo [FALTA] capacitor.config.json)
if exist package.json (echo [OK] package.json) else (echo [FALTA] package.json)
if exist resources\ios\AppIcon.appiconset\Contents.json (echo [OK] iconos iOS) else (echo [FALTA] iconos iOS)
echo.
echo Si todo sale OK, prueba con 01_PROBAR_APP_EN_WINDOWS.bat o en Mac con 02_PREPARAR_IOS_EN_MAC.command
pause
