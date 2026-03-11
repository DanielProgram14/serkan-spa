@echo off
REM Script para iniciar el servidor Django - Windows

cd /d "%~dp0"

REM Activar entorno virtual
call venv\Scripts\activate.bat

REM Ejecutar migraciones si es necesario
echo Aplicando migraciones...
python manage.py migrate --noinput

REM Iniciar servidor
echo.
echo Iniciando servidor Django en http://localhost:8000
echo.
python manage.py runserver
