#!/bin/bash
cd "$(dirname "$0")"

# Comprova si s'ha passat l'argument --test o -t
ARGS=""
if [[ "$1" == "--test" || "$1" == "-t" ]]; then
    ARGS="--test"
fi

# Atura qualsevol instància anterior per evitar conflictes de port
pkill -f 'python3 server.py' > /dev/null 2>&1

# El log va a /tmp (FORA del directori del projecte) perquè si uses Live Server
# o qualsevol eina que vigila els fitxers, no recarregui la pàgina en bucle.
LOG_FILE="/tmp/monitor-temperatura.log"

# Executa en segon pla immune al tancament de la terminal (buscant server.py a la carpeta superior)
nohup python3 ../server.py $ARGS > "$LOG_FILE" 2>&1 &

if [[ "$ARGS" == "--test" ]]; then
    echo "✅ Servidor Iniciat en MODE DE PROVA!"
else
    echo "✅ Servidor Iniciat en segon pla!"
fi

echo "Pots tancar Antigravity i la pàgina de GitHub continuarà funcionant."
echo "Log del servidor: $LOG_FILE"
echo "Per aturar-lo manualment: pkill -f 'python3 server.py'"
