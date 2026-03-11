#!/bin/bash
# Script para iniciar el servidor de desarrollo - Frontend - Linux/Mac

cd "$(dirname "$0")"

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    npm install
fi

# Iniciar servidor de desarrollo
echo ""
echo "Iniciando servidor frontend en http://localhost:5173"
echo ""
npm run dev
