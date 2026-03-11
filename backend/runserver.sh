#!/bin/bash
# Script para iniciar el servidor Django - Linux/Mac

# Cambiar al directorio del script
cd "$(dirname "$0")"

# Activar entorno virtual
source venv/bin/activate

# Ejecutar migraciones si es necesario
echo "Aplicando migraciones..."
python manage.py migrate --noinput

# Iniciar servidor
echo ""
echo "Iniciando servidor Django en http://localhost:8000"
echo ""
python manage.py runserver
