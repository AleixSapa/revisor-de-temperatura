#!/bin/bash
cd "$(dirname "$0")"

# Executa en segon pla immune al tancament de la terminal (Antigravity)
nohup python3 server.py > serve.log 2>&1 &

echo "✅ Servidor iniciat en segon pla!"
echo "Pots tancar Antigravity i la pàgina de GitHub continuarà funcionant."
echo "Per aturar-lo manualment, pots fer servir aquesta comanda: pkill -f 'python3 server.py'"
