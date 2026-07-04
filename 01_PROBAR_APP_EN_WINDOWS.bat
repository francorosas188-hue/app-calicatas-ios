@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo  INGE+ / AppCalicatas - prueba local del proyecto migrado
echo ============================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encontró Node.js.
  echo Instala Node.js LTS y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
echo [OK] Node encontrado.
if not exist node_modules (
  echo Instalando dependencias...
  npm install
  if errorlevel 1 (
    echo [ERROR] Falló npm install. Revisa tu conexión a internet.
    pause
    exit /b 1
  )
)
echo.
echo Abriendo servidor local en http://localhost:9000
echo Para verlo desde iPhone en la misma WiFi usa: http://IP-DE-TU-PC:9000
echo.
npx http-server www -p 9000 -c-1
pause
