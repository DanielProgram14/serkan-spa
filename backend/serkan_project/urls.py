from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from api.views import CustomAuthToken, MiPerfilView
from api.views import (
    TrabajadorViewSet, 
    DocumentoViewSet, 
    DocumentoClienteViewSet,
    MovimientoFinancieroClienteViewSet,
    CategoriaProductoViewSet,
    ProveedorViewSet,
    ProductoViewSet,
    HerramientaViewSet,
    HerramientaAsignacionViewSet,
    OrdenCompraViewSet,
    MovimientoInventarioViewSet,
    TareaViewSet, 
    UserViewSet, 
    AreaViewSet, 
    CargoViewSet, 
    TipoDocumentoViewSet,
    CategoriaTareaViewSet, 
    ClienteViewSet,
    EventoViewSet,
    AuditLogViewSet
)

router = DefaultRouter()

# --- Módulos Principales ---
router.register(r'trabajadores', TrabajadorViewSet)
router.register(r'documentos', DocumentoViewSet) 
router.register(r'documentos-cliente', DocumentoClienteViewSet)
router.register(r'movimientos-financieros', MovimientoFinancieroClienteViewSet)
router.register(r'categorias-producto', CategoriaProductoViewSet)
router.register(r'proveedores', ProveedorViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'herramientas', HerramientaViewSet)
router.register(r'herramientas-asignaciones', HerramientaAsignacionViewSet)
router.register(r'ordenes-compra', OrdenCompraViewSet)
router.register(r'movimientos-inventario', MovimientoInventarioViewSet)
router.register(r'tareas', TareaViewSet)
router.register(r'eventos', EventoViewSet)

# --- Módulos de Administración ---
router.register(r'users', UserViewSet)
router.register(r'areas', AreaViewSet)
router.register(r'cargos', CargoViewSet)
router.register(r'tipos-documento', TipoDocumentoViewSet)
router.register(r'categorias-tarea', CategoriaTareaViewSet) 
router.register(r'clientes', ClienteViewSet)                
router.register(r'audit-logs', AuditLogViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/login/', CustomAuthToken.as_view()),
    path('api/auth/me/', MiPerfilView.as_view()),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
