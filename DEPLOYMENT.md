# 🚀 Guía de Despliegue - Serkan SPA

## Requisitos previos para producción

- VPS o servidor cloud (AWS, Heroku, DigitalOcean, etc.)
- Dominio configurado
- Certificado SSL/TLS
- Email para notificaciones

## Opción 1: Despliegue con Docker (Recomendado)

### 1. Preparar el servidor

```bash
# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Clonar repositorio

```bash
cd /opt
git clone https://github.com/tu-usuario/serkan-spa.git
cd serkan-spa
```

### 3. Configurar variables de producción

```bash
# Crear .env para producción
cp backend/.env.example backend/.env
nano backend/.env
```

Valores críticos para producción:

```env
SECRET_KEY=genera-una-clave-muy-larga-y-aleatoria
DEBUG=False
ALLOWED_HOSTS=tudominio.com,www.tudominio.com

DB_NAME=serkanSPA_prod
DB_USER=postgres_prod
DB_PASSWORD=contraseña_muy_secura_aqui
DB_HOST=db
DB_PORT=5432

CORS_ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com
CSRF_TRUSTED_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

### 4. Actualizar docker-compose.yml para producción

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: serkan_db_prod
    restart: always
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
    networks:
      - serkan_network

  backend:
    build: ./backend
    container_name: serkan_backend_prod
    restart: always
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=${DEBUG}
      - ALLOWED_HOSTS=${ALLOWED_HOSTS}
      - DB_HOST=db
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
    ports:
      - "8000:8000"
    depends_on:
      - db
    volumes:
      - ./backend/media:/app/media
      - ./backend/staticfiles:/app/staticfiles
    networks:
      - serkan_network
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             gunicorn serkan_project.wsgi:application --bind 0.0.0.0:8000 --workers 4"

  frontend:
    build: ./frontend
    container_name: serkan_frontend_prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./frontend/dist:/usr/share/nginx/html
      - ./ssl:/etc/nginx/certs
    networks:
      - serkan_network

volumes:
  postgres_data_prod:

networks:
  serkan_network:
    driver: bridge
```

### 5. Dockerfile para backend

Crear `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copiar código
COPY . .

# Crear usuario no-root
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

CMD ["gunicorn", "serkan_project.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### 6. Dockerfile para frontend

Crear `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### 7. Configurar Nginx para frontend

Crear `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache estático
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 8. Levantar los servicios

```bash
docker-compose up -d
docker-compose logs -f  # Ver logs
```

### 9. Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot certonly --standalone -d tudominio.com -d www.tudominio.com

# Actualizar nginx.conf con SSL
```

---

## Opción 2: Despliegue en Heroku

### 1. Instalar Heroku CLI

```bash
curl https://cli-assets.heroku.com/install.sh | sh
heroku login
```

### 2. Crear app Heroku

```bash
heroku create tu-app-name
heroku addons:create heroku-postgresql:hobby-dev
```

### 3. Configurar variables de entorno

```bash
heroku config:set SECRET_KEY="tu-clave-larga"
heroku config:set DEBUG=False
heroku config:set ALLOWED_HOSTS="tu-app-name.herokuapp.com"
```

### 4. Crear Procfile

```
web: gunicorn serkan_project.wsgi --log-file -
release: python manage.py migrate
```

### 5. Desplegar

```bash
git push heroku main
heroku open
```

---

## Opción 3: Despliegue en DigitalOcean App Platform

1. Conectar repositorio GitHub
2. Crear dos apps: Backend (Django) y Frontend (Node.js)
3. Configurar variables de entorno en el panel
4. Conectar base de datos PostgreSQL managed
5. Deploy automático en cada push

---

## Checklist pre-producción

- [ ] Cambiar `DEBUG = False`
- [ ] Generar nueva `SECRET_KEY`
- [ ] Configurar `ALLOWED_HOSTS` correctamente
- [ ] Configurar CORS con dominios reales
- [ ] Usar HTTPS en todo
- [ ] Configurar email para notificaciones
- [ ] Configurar backups automáticos de BD
- [ ] Configurar logging y monitoreo
- [ ] Ejecutar `python manage.py check --deploy`
- [ ] Cambiar credenciales de BD
- [ ] Actualizar credenciales de superusuario
- [ ] Probar todos los flujos principales
- [ ] Configurar CI/CD con GitHub Actions

---

## Monitoreo en producción

### Logs

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Exportar logs
docker-compose logs > logs.txt
```

### Backups de base de datos

```bash
# Backup
pg_dump -U postgres serkanSPA_prod > backup.sql

# Restore
psql -U postgres serkanSPA_prod < backup.sql
```

### Mantenimiento

```bash
# Limpiar imágenes Docker no usadas
docker image prune

# Actualizar dependencias
pip install -r requirements.txt --upgrade
npm install && npm update
```

---

**Última actualización**: 11 de marzo de 2026
