#!/bin/bash
# Script d'inici per a Linux
cd "$(dirname "$0")"
chmod +x linux_extras/run.sh
./linux_extras/run.sh "$@"

# Espera fins que el servidor respongui abans d'obrir el navegador (evita errors de connexió)
echo "Esperant que el servidor estigui llest..."
for i in $(seq 1 15); do
    if curl -s -o /dev/null http://localhost:4321/api/temp; then
        echo "✅ Servidor llest!"
        break
    fi
    sleep 1
done

# Obre el navegador (prova diversos en ordre de preferència)
xdg-open http://localhost:4321 2>/dev/null \
    || google-chrome --app=http://localhost:4321 2>/dev/null \
    || firefox http://localhost:4321 2>/dev/null \
    || echo "No s'ha trobat cap navegador. Obre manualment: http://localhost:4321"
