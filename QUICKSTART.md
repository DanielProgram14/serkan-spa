# ⚡ Quickstart - Serkan SPA

Guía rápida para empezar a trabajar con el proyecto en 5 minutos.

## Windows

### 1️⃣ Backend

```powershell
cd backend
runserver.bat
```

Listo. El servidor estará en `http://localhost:8000`

### 2️⃣ Frontend (en otra terminal)

```powershell
cd frontend
npm install    # Primera vez solamente
npm run dev
```

Frontend en `http://localhost:5173`

---

## Mac / Linux

### 1️⃣ Backend

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt  # Primera vez
python manage.py migrate          # Primera vez
python manage.py runserver
```

### 2️⃣ Frontend (en otra terminal)

```bash
cd frontend
npm install    # Primera vez
npm run dev
```

---

## 🔑 Variables de Entorno

Si ves error de conexión a BD, asegúrate que:

### Backend
- PostgreSQL está corriendo
- Archivo `backend/.env` existe con valores correctos
- Base de datos `serkanSPA-DB` existe

### Opción: Usar Docker para BD

```bash
docker-compose up -d
```

---

## 📝 Primera ejecución

### Crear admin

```bash
cd backend
python manage.py createsuperuser
```

Luego accede a: `http://localhost:8000/admin`

---

## 🆘 Problemas comunes

| Problema | Solución |
|----------|----------|
| `ModuleNotFoundError: No module named 'django'` | Activate venv: `venv\Scripts\activate` (Windows) o `source venv/bin/activate` (Mac/Linux) |
| `Port 8000 already in use` | `python manage.py runserver 8001` |
| `Port 5173 already in use` | `npm run dev -- --port 3000` |
| `Connection refused (BD)` | `docker-compose up -d` |

---

## 📚 Documentación Completa

Ver [README.md](README.md) para instalación detallada y [CONTRIBUTING.md](CONTRIBUTING.md) para desarrollo.

---

**¡Ya está! 🚀 Happy coding!**
