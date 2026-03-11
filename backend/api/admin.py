from django.contrib import admin
from .models import (
    Area, Cargo, TipoDocumento, CategoriaTarea,
    CategoriaProducto, Proveedor, Producto, Herramienta,
    OrdenCompra, OrdenCompraItem, MovimientoInventario, HerramientaAsignacion,
    Cliente, Trabajador, Documento, DocumentoCliente,
    MovimientoFinancieroCliente, Tarea, PerfilUsuario
)

# ==========================================
# 1. TABLAS MAESTRAS (Registro simple)
# ==========================================
admin.site.register(Area)
admin.site.register(Cargo)
admin.site.register(TipoDocumento)
admin.site.register(CategoriaTarea)
admin.site.register(CategoriaProducto)

# ==========================================
# 2. MODELOS PRINCIPALES (Con diseño avanzado)
# ==========================================

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ('rut', 'razon_social')
    search_fields = ('rut', 'razon_social')

@admin.register(Trabajador)
class TrabajadorAdmin(admin.ModelAdmin):
    list_display = ('rut', 'nombres', 'apellidos', 'cargo', 'area', 'estado')
    search_fields = ('rut', 'nombres', 'apellidos')
    list_filter = ('estado', 'area', 'cargo')

@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display = ('tipo', 'trabajador', 'fecha_emision', 'fecha_vencimiento')
    list_filter = ('tipo',)
    search_fields = ('trabajador__nombres', 'trabajador__apellidos', 'trabajador__rut')

@admin.register(DocumentoCliente)
class DocumentoClienteAdmin(admin.ModelAdmin):
    list_display = ('cliente', 'nombre_original', 'extension', 'tamano_bytes', 'fecha_carga', 'cargado_por')
    list_filter = ('extension', 'fecha_carga')
    search_fields = ('cliente__razon_social', 'cliente__rut', 'nombre_original')

@admin.register(MovimientoFinancieroCliente)
class MovimientoFinancieroClienteAdmin(admin.ModelAdmin):
    list_display = ('cliente', 'tipo_movimiento', 'monto', 'fecha', 'creado_por', 'created_at')
    list_filter = ('tipo_movimiento', 'fecha')
    search_fields = ('cliente__razon_social', 'cliente__rut', 'descripcion')

@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'rut', 'correo', 'telefono', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre', 'rut')

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('sku', 'nombre', 'tipo_producto', 'categoria', 'stock_actual', 'stock_minimo', 'activo')
    list_filter = ('tipo_producto', 'activo', 'categoria')
    search_fields = ('sku', 'nombre')

@admin.register(Herramienta)
class HerramientaAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'tipo_herramienta', 'estado', 'stock_total', 'stock_disponible', 'cliente', 'fecha_asignacion')
    list_filter = ('tipo_herramienta', 'estado')
    search_fields = ('codigo', 'nombre')

@admin.register(HerramientaAsignacion)
class HerramientaAsignacionAdmin(admin.ModelAdmin):
    list_display = ('herramienta', 'trabajador', 'cantidad', 'estado', 'fecha_asignacion', 'fecha_devolucion')
    list_filter = ('estado', 'fecha_asignacion')
    search_fields = ('herramienta__nombre', 'trabajador__nombres', 'trabajador__apellidos')

class OrdenCompraItemInline(admin.TabularInline):
    model = OrdenCompraItem
    extra = 0

@admin.register(OrdenCompra)
class OrdenCompraAdmin(admin.ModelAdmin):
    list_display = ('numero', 'nombre', 'proveedor', 'fecha_orden', 'estado', 'total_orden', 'creado_por')
    list_filter = ('estado', 'fecha_orden')
    search_fields = ('numero', 'proveedor__nombre')
    inlines = [OrdenCompraItemInline]

@admin.register(MovimientoInventario)
class MovimientoInventarioAdmin(admin.ModelAdmin):
    list_display = ('producto', 'tipo_movimiento', 'cantidad', 'stock_anterior', 'stock_resultante', 'orden_compra', 'created_at')
    list_filter = ('tipo_movimiento', 'created_at')
    search_fields = ('producto__nombre', 'producto__sku', 'detalle', 'orden_compra__numero')

@admin.register(Tarea)
class TareaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'responsable', 'estado', 'prioridad', 'fecha_limite')
    list_filter = ('estado', 'prioridad', 'categoria')
    search_fields = ('nombre', 'responsable__nombres', 'responsable__apellidos')

@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = ('user', 'rol', 'trabajador')
    list_filter = ('rol',)
    search_fields = ('user__username', 'trabajador__nombres')
