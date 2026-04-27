@echo off
echo ✅ Aturant el Monitor de Temperatura...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq MonitorTemperaturaServer" >nul 2>&1
echo Monitor aturat.
pause
