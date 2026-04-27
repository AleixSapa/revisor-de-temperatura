#!/bin/bash
# Script d'inici per a Linux
cd "$(dirname "$0")"
chmod +x linux_extras/run.sh
./linux_extras/run.sh "$@"
xdg-open http://localhost:3000 || google-chrome --app=http://localhost:3000 || firefox http://localhost:3000
