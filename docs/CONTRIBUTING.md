# 📚 Guía para Desarrolladores - Serkan SPA

## Estructura del código

### Backend (Django)

```
backend/
├── api/
│   ├── models.py         # Modelos de la base de datos
│   ├── serializers.py    # Serializadores DRF
│   ├── views.py          # Vistas y ViewSets
│   ├── urls.py           # URLs de la app
│   ├── roles.py          # Definiciones de roles
│   ├── migrations/       # Migraciones de BD
│   └── tests.py          # Tests unitarios
│
├── serkan_project/
│   ├── settings.py       # Configuración principal
│   ├── urls.py           # URLs globales
│   ├── wsgi.py           # Deploy WSGI
│   └── asgi.py           # Deploy ASGI
│
├── manage.py             # CLI de Django
└── requirements.txt      # Dependencias Python
```

### Frontend (React + TypeScript)

```
frontend/
├── src/
│   ├── components/       # Componentes reutilizables
│   ├── pages/           # Páginas principales
│   ├── context/         # Context API (estado global)
│   ├── hooks/           # Custom hooks
│   ├── types/           # Definiciones de tipos TypeScript
│   ├── api/             # Cliente HTTP (Axios)
│   ├── utils/           # Funciones utilitarias
│   ├── assets/          # Imágenes y recursos
│   ├── App.tsx          # Componente raíz
│   └── main.tsx         # Punto de entrada
│
├── public/              # Archivos estáticos
├── package.json         # Dependencias Node
├── vite.config.ts       # Configuración de Vite
└── tsconfig.json        # Configuración de TypeScript
```

## Convenciones de código

### Python (Backend)

- **Indentación**: 4 espacios
- **Nombres**: `snake_case` para funciones/variables, `PascalCase` para clases
- **Imports**: Agrupar en: stdlib, third-party, local
- **Docstrings**: Usar triple comillas para funciones/clases

Ejemplo:
```python
class ProductoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de productos."""
    
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [permissions.IsAuthenticated]
```

### TypeScript (Frontend)

- **Indentación**: 2 espacios
- **Nombres**: `camelCase` para variables/funciones, `PascalCase` para componentes/tipos
- **Tipos**: Siempre especificar tipos explícitos
- **Componentes**: Usar arrow functions con `React.FC<Props>`
- **Notificaciones**: Se prohíbe el uso de `alert()` o `confirm()`. Usa siempre los métodos de `src/utils/alerts.ts` (ej. `showSuccess()`, `confirmAction()`).

Ejemplo:
```typescript
interface ProductoProps {
  id: number;
  nombre: string;
}

const Producto: React.FC<ProductoProps> = ({ id, nombre }) => {
  return <div>{nombre}</div>;
};
```

## Flujo de desarrollo

### 1. Crear una nueva Feature

```bash
# Backend
cd backend
git checkout -b feature/nueva-feature

# Frontend
cd frontend
git checkout -b feature/nueva-feature
```

### 2. Cambios en modelos (Backend)

```bash
cd backend
# Crear la migración
python manage.py makemigrations

# Aplicar cambios
python manage.py migrate

# Crear los endpoints necesarios en views.py
```

### 3. Testing

#### Backend
```bash
cd backend
python manage.py test api
```

#### Frontend
```bash
cd frontend
npm run lint
npm run test  # si está configurado
```

### 4. Commit y Push

```bash
git add .
git commit -m "feat: descripción clara de cambios"
git push origin feature/nueva-feature
```

## Roles y permisos

### Roles disponibles

- **ADMINISTRADOR**: Acceso completo
- **RRHH**: Gestión de trabajadores y acceso al inventario
- **SUPERVISOR**: Acceso limitado a reportes
- **TRABAJADOR**: Acceso a sus propios datos

### Protección de endpoints

```python
class MyViewSet(viewsets.ModelViewSet):
    def check_permissions(self, request):
        super().check_permissions(request)
        user_rol = request.user.perfilusuario.rol
        
        if user_rol not in ['ADMINISTRADOR', 'RRHH']:
            raise PermissionDenied("No tienes permisos")
```

## Variables de entorno importantes

### Backend (.env)

| Variable | Descripción | Defecto |
|----------|-------------|---------|
| `SECRET_KEY` | Clave secreta Django | Genera una nueva |
| `DEBUG` | Modo debug | `False` |
| `DB_NAME` | Nombre BD | `serkanSPA-DB` |
| `DB_USER` | Usuario BD | `admin-serkan` |
| `DB_PASSWORD` | Contraseña BD | `serkan2026` |
| `DB_HOST` | Host BD | `localhost` |
| `CORS_ALLOWED_ORIGINS` | Origins permitidos | `localhost:5173` |

### Frontend (.env)

```
VITE_API_URL=http://localhost:8000/api
```

## Debugging

### Backend

```python
# Usar print para debug (evita en producción)
print(f"DEBUG: {variable}")

# Mejor: usar logging
import logging
logger = logging.getLogger(__name__)
logger.debug(f"Debug info: {variable}")
```

### Frontend

```typescript
// Console en navegador (F12)
console.log("Debug:", variable);

// En componentes React
useEffect(() => {
  console.log("Componente montado");
  return () => console.log("Componente desmontado");
}, []);
```

## Problemas comunes

### Backend

**Error**: `ModuleNotFoundError: No module named 'decouple'`
```bash
pip install python-decouple
```

**Error**: `CORS error`
Verifica que `CORS_ALLOWED_ORIGINS` en `.env` incluya la URL del frontend.

**Error**: `Connection refused` en BD
```bash
# Inicia PostgreSQL
docker-compose up -d
# O localmente
sudo service postgresql start
```

### Frontend

**Error**: `Module not found`
```bash
# Reinstalar dependencies
rm -rf node_modules package-lock.json
npm install
```

**Error**: Puerto 5173 en uso
```bash
# Especificar otro puerto
npm run dev -- --port 3000
```

## Performance

### Backend
- Usar `select_related()` para FK
- Usar `prefetch_related()` para relaciones M2M
- Implementar paginación en endpoints grandes

### Frontend
- Usar lazy loading para páginas
- Memoizar componentes pesados con `React.memo()`
- Usar `useCallback()` para funciones en dependencias

## Seguridad

⚠️ **NUNCA hacer commit de**:
- Archivos `.env` con valores reales
- Claves API
- Credenciales
- Archivos sensibles

✅ **SI hacer commit**:
- `.env.example` como plantilla
- Código de la aplicación
- Documentación

## Recursos útiles

- [Django REST Framework Docs](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Material-UI Docs](https://mui.com/)

---

**Última actualización**: 30 de marzo de 2026
