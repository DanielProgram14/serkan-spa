@echo off
REM Script para iniciar el servidor de desarrollo - Frontend - Windows

cd /d "%~dp0"

REM Verificar si node_modules existe
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
)

REM Iniciar servidor de desarrollo
echo.
echo Iniciando servidor frontend en http://localhost:5173
echo.
call npm run dev
