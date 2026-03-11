# Serkan SPA - Sistema de Gestión Integral

Sistema de gestión empresarial completo desarrollado con **Django** (backend) y **React** (frontend) para administrar trabajadores, clientes, inventario, tareas, eventos y documentos.

## 📋 Características principales

- **Gestión de Trabajadores**: Registro, perfiles y roles
- **Gestión de Clientes**: Información de clientes y asociaciones
- **Gestión de Inventario**: Productos, herramientas y órdenes de compra
- **Gestión de Tareas**: Creación y seguimiento de tareas
- **Gestión de Eventos**: Calendario de eventos
- **Gestión de Documentos**: Almacenamiento y trazabilidad de documentos
- **Control de Acceso**: Sistema de roles y permisos
- **API REST**: Backend completamente documentado

## 🛠️ Tecnologías utilizadas

### Backend
- **Django 6.0.2**: Framework web Python
- **Django REST Framework 3.16.1**: Para construcción de APIs REST
- **PostgreSQL 15**: Base de datos relacional
- **python-decouple**: Gestión de variables de entorno

### Frontend
- **React 19.2.0**: Librería de UI
- **Vite 7.3.1**: Bundler y generador de módulos
- **TypeScript 5.9.3**: Tipado estático
- **Material-UI 7.3.7**: Componentes UI profesionales
- **React Router 7.13.0**: Enrutamiento
- **Axios 1.13.5**: Cliente HTTP

### Infraestructura
- **Docker & Docker Compose**: Containerización
- **PostgreSQL 15**: Base de datos en contenedor

## 📦 Requisitos previos

- **Python 3.10+**
- **Node.js 18+** y **npm** o **yarn**
- **PostgreSQL 15+** (o Docker/Docker Compose)
- **Git**

## 🚀 Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/serkan-spa.git
cd serkan-spa
```

### 2. Configurar variables de entorno

Tanto para backend como frontend se necesitan archivos `.env` con las configuraciones específicas del entorno.

#### Backend (.env en la carpeta `backend/`)

```bash
cp backend/.env.example backend/.env
```

Luego edita `backend/.env` con tus valores:

```env
SECRET_KEY=tu-clave-secreta-aqui
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=serkanSPA-DB
DB_USER=admin-serkan
DB_PASSWORD=tu-contraseña-segura
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3. Configurar y ejecutar la base de datos

#### Opción A: Con Docker Compose (recomendado)

```bash
docker-compose up -d
```

Esto levantará un contenedor PostgreSQL automáticamente.

#### Opción B: PostgreSQL instalado localmente

Asegúrate de que PostgreSQL esté corriendo y crea la base de datos:

```bash
createdb serkanSPA-DB
```

### 4. Instalar dependencias del backend

```bash
cd backend
python -m venv venv

# En Windows:
venv\Scripts\activate

# En Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
```

### 5. Aplicar migraciones de la base de datos

```bash
python manage.py migrate
```

### 6. Crear superusuario (administrador)

```bash
python manage.py createsuperuser
```

### 7. Instalar dependencias del frontend

```bash
cd ../frontend
npm install
```

## 🏃 Ejecutar en desarrollo

### Iniciar el servidor backend

#### Opción A: Usando script (Recomendado)

**En Windows**:
```bash
cd backend
runserver.bat
```

**En Linux/Mac**:
```bash
cd backend
chmod +x runserver.sh
./runserver.sh
```

#### Opción B: Modo manual

```bash
cd backend

# Activar entorno virtual
# En Windows:
venv\Scripts\activate

# En Linux/Mac:
source venv/bin/activate

# Ejecutar migraciones (primera vez)
python manage.py migrate

# Iniciar servidor
python manage.py runserver
```

El servidor estará disponible en: `http://localhost:8000`

### Iniciar el servidor frontend

En otra terminal:

```bash
cd frontend
npm run dev
```

El cliente estará disponible en: `http://localhost:5173`

### Panel de administración Django

Accede a `http://localhost:8000/admin` con las credenciales del superusuario creado.

## 📁 Estructura del proyecto

```
serkan-spa/
├── backend/
│   ├── api/              # Aplicación principal (modelos, vistas, serializadores)
│   ├── serkan_project/   # Configuración de Django
│   ├── media/            # Archivos subidos
│   ├── manage.py         # Script de gestión de Django
│   ├── requirements.txt   # Dependencias Python
│   └── .env.example      # Plantilla de variables de entorno
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Componentes React reutilizables
│   │   ├── pages/        # Páginas principales
│   │   ├── context/      # Context API para estado global
│   │   ├── hooks/        # Custom hooks
│   │   ├── types/        # Tipos TypeScript
│   │   ├── api/          # Configuración de Axios
│   │   └── App.tsx       # Componente raíz
│   ├── package.json      # Dependencias Node
│   └── vite.config.ts    # Configuración de Vite
│
├── docker-compose.yml    # Configuración de servicios
├── KeysSerkan.env        # Variables de entorno (NO SUBIR A GIT)
└── README.md             # Este archivo
```

## 🔐 Seguridad

### Variables de entorno sensibles

** ⚠️ NUNCA committed las credenciales reales. ** Los archivos `.env` están incluidos en `.gitignore`.

Para trabajo en equipo:
1. Distribuye `.env.example` como plantilla
2. Cada desarrollador crea su propio `.env` con valores locales
3. En producción, configura variables de entorno en el servidor/plataforma de hosting

### En producción

- Cambia `DEBUG=False` en `.env`
- Genera una nueva `SECRET_KEY` fuerte
- Configura `ALLOWED_HOSTS` con los dominios reales
- Usa HTTPS
- Configura CORS correctamente para tu dominio

## 🗄️ Modelos principales

### Trabajador
- RUT, nombres, apellidos
- Rol en el sistema
- Área y cargo

### Cliente
- RUT, razón social
- Contacto y ubicación
- Asociación con herramientas

### Producto
- SKU, nombre, categoría
- Stock actual y mínimo
- Tipo (fabricado/comprado)

### Herramienta
- Código, nombre, tipo (interno/cliente)
- Estado (disponible/asignada/mantenimiento/baja)
- Asignaciones a trabajadores

### Orden de Compra
- Número, nombre, proveedor
- Items con productos y cantidades
- Estados: BORRADOR → CONFIRMADA → RECIBIDA/CANCELADA

### Tarea
- Title, descripción, categoría
- Asignado a trabajador
- Prioridad y estado

### Evento
- Título, descripción
- Fecha y participantes
- Ubicación y notas

## 📜 API Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Autenticar usuario |
| GET | `/api/trabajadores/` | Listar trabajadores |
| POST | `/api/trabajadores/` | Crear trabajador |
| GET | `/api/clientes/` | Listar clientes |
| GET | `/api/productos/` | Listar productos |
| GET | `/api/herramientas/` | Listar herramientas |
| POST | `/api/ordenes-compra/` | Crear orden |
| GET | `/api/tareas/` | Listar tareas |
| GET | `/api/eventos/` | Listar eventos |

## 🧪 Testing (opcional)

```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm run test
```

## 🐛 Solución de problemas

### Error de conexión a la base de datos

```
Error: could not translate host name "db" to address
```

**Solución**: Asegúrate de que PostgreSQL esté corriendo:
- Con Docker: `docker-compose up -d`
- Local: Inicia el servicio PostgreSQL

### Puerto 5173 ya en uso

```bash
# Frontend comenzará en un puerto diferente automáticamente
npm run dev
```

### Errores de migración

```bash
cd backend
python manage.py migrate --fake-initial
```

## 📝 Cambios recientes y mejoras

- ✅ Gestión de variables de entorno con `python-decouple`
- ✅ Estructura separada de backend/frontend
- ✅ Autenticación con tokens
- ✅ Sistema de roles y permisos
- ✅ Panel administrativo con DataGrid
- ✅ Soporte multiidioma (Español)
- ✅ Zona horaria configurada (Santiago, Chile)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 📧 Contacto

Para consultas o reportar problemas, abre un issue en el repositorio o contacta a [tu-email@example.com](mailto:tu-email@example.com).

---

**Última actualización**: 11 de marzo de 2026

**Versión**: 1.0.0
