@echo off
setlocal

:: Canvia al directori on hi ha el script
cd /d "%~dp0"

:: Comprova si s'ha passat l'argument --test o -t
set ARGS=
if "%1"=="--test" set ARGS=--test
if "%1"=="-t" set ARGS=--test

:: Comprova permisos d'Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ⚠️ ATENCIÓ: No tens permisos d'Administrador.
    echo Les dades de temperatura poden no ser llegibles.
    echo Es recomana fer clic dret i "Executa com a administrador".
    echo.
    timeout /t 3 >nul
)

:: Atura qualsevol instància anterior (opcional)
taskkill /F /IM python.exe /FI "WINDOWTITLE eq MonitorTemperaturaServer" >nul 2>&1


:: Prova diferents comandaments de python comuns a Windows
set PY_CMD=python
py --version >nul 2>&1 && set PY_CMD=py
python3 --version >nul 2>&1 && set PY_CMD=python3

:: Executa el servidor en una finestra nova minimitzada
start "MonitorTemperaturaServer" /min %PY_CMD% server.py %ARGS%


:: Espera un moment i obre en mode aplicació (sense barra d'adreces)
timeout /t 2 /nobreak >nul
start msedge --app=http://localhost:3000/inici.html || start chrome --app=http://localhost:3000/inici.html || start http://localhost:3000


echo.
echo L'aplicació s'ha obert al teu navegador.
echo Pots tancar aquesta finestra, el servidor seguirà treballant.
echo.
pause

