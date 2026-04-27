@echo off
setlocal
cd /d "%~dp0"

set "targetDir=%~dp0"
set "vbsFile=%targetDir%Inicia Monitor (Sense Finestra).vbs"
set "startupFolder=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "shortcutName=MonitorTemperatura.lnk"

echo ⏳ Configurant l'arrencada automàtica...

:: Utilitzem PowerShell per crear l'accés directe de forma neta a la carpeta de Startup
powershell -NoProfile -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%startupFolder%\%shortcutName%'); $Shortcut.TargetPath = '%vbsFile%'; $Shortcut.WorkingDirectory = '%targetDir%'; $Shortcut.Save()"

if exist "%startupFolder%\%shortcutName%" (
    echo.
    echo ✅ FET! El monitor s'iniciarà sol cada vegada que engeguis l'ordinador.
    echo Ara ja pots tancar aquesta finestra.
    echo.
) else (
    echo.
    echo ❌ Hi ha hagut un problema creant l'accés directe. 
    echo Prova d'executar aquest fitxer com a Administrador.
    echo.
)

pause
