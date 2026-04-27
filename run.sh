#!/bin/bash
cd "$(dirname "$0")"

# Comprova si s'ha passat l'argument --test o -t
ARGS=""
if [[ "$1" == "--test" || "$1" == "-t" ]]; then
    ARGS="--test"
fi

# Atura qualsevol instància anterior per evitar conflictes de port
pkill -f 'python3 server.py' > /dev/null 2>&1

# Executa en segon pla immune al tancament de la terminal
nohup python3 server.py $ARGS > serve.log 2>&1 &

if [[ "$ARGS" == "--test" ]]; then
    echo "✅ Servidor Iniciat en MODE DE PROVA!"
else
    echo "✅ Servidor Iniciat en segon pla!"
fi

echo "Pots tancar Antigravity i la pàgina de GitHub continuarà funcionant."
echo "Per aturar-lo manualment: pkill -f 'python3 server.py'"
