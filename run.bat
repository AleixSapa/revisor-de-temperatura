@echo off
setlocal

:: Canvia al directori on hi ha el script
cd /d "%~dp0"

:: Comprova si s'ha passat l'argument --test o -t
set ARGS=
if "%1"=="--test" set ARGS=--test
if "%1"=="-t" set ARGS=--test

:: Atura qualsevol instància anterior (opcional)
taskkill /F /IM python.exe /FI "WINDOWTITLE eq MonitorTemperaturaServer" >nul 2>&1

echo ✅ Iniciant Servidor en Windows...
if "%ARGS%"=="--test" (
    echo Mode de Prova Activat
)

:: Executa en una finestra nova reduïda o minimitzada
start "MonitorTemperaturaServer" /min python server.py %ARGS%

echo.
echo Servidor actiu a http://localhost:3000
echo Pots tancar aquesta finestra, el servidor seguirà corrent en segon pla.
echo.
pause
