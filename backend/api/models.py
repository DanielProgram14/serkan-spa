from django.db import models
from django.contrib.auth.models import User
from .roles import ROLE_CHOICES

# --- 1. TABLAS MAESTRAS ---
# Estas tablas alimentan los selectores del sistema administrativo

class Area(models.Model):
    nombre = models.CharField(max_length=100)
    def __str__(self): return self.nombre

class Cargo(models.Model):
    nombre = models.CharField(max_length=100)
    def __str__(self): return self.nombre

class TipoDocumento(models.Model):
    nombre = models.CharField(max_length=100)
    def __str__(self): return self.nombre
    
class CategoriaTarea(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    def __str__(self): return self.nombre


# --- 2. MODELOS PRINCIPALES ---

class Cliente(models.Model):
    rut = models.CharField(max_length=12, primary_key=True)
    nombre = models.CharField(max_length=200) # Nombre de fantasía o contacto
    razon_social = models.CharField(max_length=200)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    correo = models.EmailField(blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True) # Aquí puedes poner "Cargo", etc.
    
    def __str__(self): 
        return f"{self.nombre} ({self.razon_social})"


class CategoriaProducto(models.Model):
    nombre = models.CharField(max_length=120, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Proveedor(models.Model):
    nombre = models.CharField(max_length=200, unique=True)
    rut = models.CharField(max_length=20, default='')
    correo = models.EmailField(default='')
    telefono = models.CharField(max_length=30, default='')
    direccion = models.CharField(max_length=255, default='')
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    TIPO_FABRICADO = 'FABRICADO'
    TIPO_COMPRADO = 'COMPRADO'
    TIPO_PRODUCTO_CHOICES = [
        (TIPO_FABRICADO, 'Fabricacion propia'),
        (TIPO_COMPRADO, 'Comprado a proveedor'),
    ]

    sku = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=200)
    categoria = models.ForeignKey(
        'CategoriaProducto',
        on_delete=models.PROTECT,
        related_name='productos',
        null=True,
        blank=True,
    )
    tipo_producto = models.CharField(max_length=20, choices=TIPO_PRODUCTO_CHOICES)
    descripcion = models.TextField(blank=True, null=True)
    stock_actual = models.PositiveIntegerField(default=0)
    stock_minimo = models.PositiveIntegerField(default=0)
    unidad_medida = models.CharField(max_length=20, default='UNIDAD')
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nombre']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(stock_actual__gte=0),
                name='producto_stock_actual_gte_0',
            ),
            models.CheckConstraint(
                condition=models.Q(stock_minimo__gte=0),
                name='producto_stock_minimo_gte_0',
            ),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.sku})"


class Herramienta(models.Model):
    TIPO_INTERNO = 'INTERNO'
    TIPO_CLIENTE = 'CLIENTE'
    TIPO_HERRAMIENTA_CHOICES = [
        (TIPO_INTERNO, 'Uso interno'),
        (TIPO_CLIENTE, 'Asignada a cliente'),
    ]

    ESTADO_DISPONIBLE = 'DISPONIBLE'
    ESTADO_ASIGNADA = 'ASIGNADA'
    ESTADO_MANTENIMIENTO = 'MANTENIMIENTO'
    ESTADO_BAJA = 'BAJA'
    ESTADO_CHOICES = [
        (ESTADO_DISPONIBLE, 'Disponible'),
        (ESTADO_ASIGNADA, 'Asignada'),
        (ESTADO_MANTENIMIENTO, 'Mantenimiento'),
        (ESTADO_BAJA, 'Baja'),
    ]

    codigo = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=200)
    tipo_herramienta = models.CharField(max_length=20, choices=TIPO_HERRAMIENTA_CHOICES, default=TIPO_INTERNO)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_DISPONIBLE)
    cliente = models.ForeignKey('Cliente', on_delete=models.SET_NULL, null=True, blank=True, related_name='herramientas')
    fecha_asignacion = models.DateField(null=True, blank=True)
    stock_total = models.PositiveIntegerField(default=1)
    stock_disponible = models.PositiveIntegerField(default=1)
    observacion = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nombre']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(stock_total__gte=0),
                name='herramienta_stock_total_gte_0',
            ),
            models.CheckConstraint(
                condition=models.Q(stock_disponible__gte=0),
                name='herramienta_stock_disponible_gte_0',
            ),
            models.CheckConstraint(
                condition=models.Q(stock_disponible__lte=models.F('stock_total')),
                name='herramienta_stock_disponible_lte_total',
            ),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"


class OrdenCompra(models.Model):
    ESTADO_BORRADOR = 'BORRADOR'
    ESTADO_CONFIRMADA = 'CONFIRMADA'
    ESTADO_CANCELADA = 'CANCELADA'
    ESTADO_CHOICES = [
        (ESTADO_BORRADOR, 'Borrador'),
        (ESTADO_CONFIRMADA, 'Confirmada'),
        (ESTADO_CANCELADA, 'Cancelada'),
    ]

    numero = models.CharField(max_length=40, unique=True)
    nombre = models.CharField(max_length=200, default='')
    proveedor = models.ForeignKey('Proveedor', on_delete=models.PROTECT, related_name='ordenes_compra')
    fecha_orden = models.DateField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_BORRADOR)
    observacion = models.TextField(blank=True, null=True)
    total_orden = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes_compra_creadas',
    )
    fecha_confirmacion = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(total_orden__gte=0),
                name='orden_compra_total_gte_0',
            ),
        ]

    def __str__(self):
        return f"{self.numero} - {self.nombre}"


class OrdenCompraItem(models.Model):
    orden_compra = models.ForeignKey('OrdenCompra', on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey('Producto', on_delete=models.CASCADE, related_name='items_orden_compra')
    cantidad = models.PositiveIntegerField()
    costo_unitario = models.DecimalField(max_digits=14, decimal_places=2)
    total_linea = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        ordering = ['id']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cantidad__gt=0),
                name='orden_compra_item_cantidad_gt_0',
            ),
            models.CheckConstraint(
                condition=models.Q(costo_unitario__gt=0),
                name='orden_compra_item_costo_unitario_gt_0',
            ),
            models.CheckConstraint(
                condition=models.Q(total_linea__gt=0),
                name='orden_compra_item_total_linea_gt_0',
            ),
            models.UniqueConstraint(
                fields=['orden_compra', 'producto'],
                name='orden_compra_item_producto_unique',
            ),
        ]

    def __str__(self):
        return f"{self.orden_compra.numero} - {self.producto.nombre}"


class MovimientoInventario(models.Model):
    TIPO_ENTRADA_OC = 'ENTRADA_OC'
    TIPO_AJUSTE_POSITIVO = 'AJUSTE_POSITIVO'
    TIPO_AJUSTE_NEGATIVO = 'AJUSTE_NEGATIVO'
    TIPO_CHOICES = [
        (TIPO_ENTRADA_OC, 'Entrada por orden de compra'),
        (TIPO_AJUSTE_POSITIVO, 'Ajuste positivo'),
        (TIPO_AJUSTE_NEGATIVO, 'Ajuste negativo'),
    ]

    producto = models.ForeignKey('Producto', on_delete=models.CASCADE, related_name='movimientos_inventario')
    tipo_movimiento = models.CharField(max_length=20, choices=TIPO_CHOICES)
    cantidad = models.PositiveIntegerField()
    stock_anterior = models.PositiveIntegerField()
    stock_resultante = models.PositiveIntegerField()
    detalle = models.TextField(blank=True, null=True)
    orden_compra = models.ForeignKey('OrdenCompra', on_delete=models.SET_NULL, null=True, blank=True, related_name='movimientos_inventario')
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_inventario_creados',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cantidad__gt=0),
                name='movimiento_inventario_cantidad_gt_0',
            ),
        ]

    def __str__(self):
        return f"{self.producto.nombre} - {self.tipo_movimiento} - {self.cantidad}"


class HerramientaAsignacion(models.Model):
    ESTADO_ACTIVA = 'ACTIVA'
    ESTADO_DEVUELTA = 'DEVUELTA'
    ESTADO_CHOICES = [
        (ESTADO_ACTIVA, 'Activa'),
        (ESTADO_DEVUELTA, 'Devuelta'),
    ]

    herramienta = models.ForeignKey('Herramienta', on_delete=models.CASCADE, related_name='asignaciones')
    trabajador = models.ForeignKey('Trabajador', on_delete=models.PROTECT, related_name='asignaciones_herramientas')
    cliente = models.ForeignKey('Cliente', on_delete=models.SET_NULL, null=True, blank=True, related_name='asignaciones_herramientas')
    cantidad = models.PositiveIntegerField(default=1)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ESTADO_ACTIVA)
    observacion = models.TextField(blank=True, null=True)
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    fecha_devolucion = models.DateTimeField(null=True, blank=True)
    asignado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asignaciones_herramienta_creadas',
    )
    devuelto_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asignaciones_herramienta_devueltas',
    )

    class Meta:
        ordering = ['-fecha_asignacion']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(cantidad__gt=0),
                name='herramienta_asignacion_cantidad_gt_0',
            ),
        ]

    def __str__(self):
        return f"{self.herramienta.nombre} -> {self.trabajador.nombres} ({self.cantidad})"


class DocumentoCliente(models.Model):
    cliente = models.ForeignKey('Cliente', on_delete=models.CASCADE, related_name='documentos')
    archivo = models.FileField(upload_to='documentos_clientes/%Y/%m/')
    nombre_original = models.CharField(max_length=255)
    extension = models.CharField(max_length=20)
    tamano_bytes = models.PositiveBigIntegerField()
    descripcion = models.TextField(blank=True, null=True)
    fecha_carga = models.DateTimeField(auto_now_add=True)
    cargado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documentos_cliente_subidos',
    )

    class Meta:
        ordering = ['-fecha_carga']

    def __str__(self):
        return f"{self.cliente.razon_social} - {self.nombre_original}"


class MovimientoFinancieroCliente(models.Model):
    TIPO_COSTO = 'COSTO'
    TIPO_INGRESO = 'INGRESO'
    TIPO_MOVIMIENTO_CHOICES = [
        (TIPO_COSTO, 'Costo'),
        (TIPO_INGRESO, 'Ingreso'),
    ]

    cliente = models.ForeignKey('Cliente', on_delete=models.CASCADE, related_name='movimientos_financieros')
    tipo_movimiento = models.CharField(max_length=10, choices=TIPO_MOVIMIENTO_CHOICES)
    monto = models.DecimalField(max_digits=14, decimal_places=2)
    fecha = models.DateField()
    descripcion = models.TextField(blank=True, null=True)
    creado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_financieros_cliente_creados',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha', '-created_at']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(monto__gt=0),
                name='movimiento_cliente_monto_gt_0',
            ),
        ]

    def __str__(self):
        return f"{self.cliente.razon_social} - {self.tipo_movimiento} - {self.monto}"


class Trabajador(models.Model):
    rut = models.CharField(max_length=12, primary_key=True, unique=True)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    
    area = models.CharField(max_length=100) 
    cargo = models.CharField(max_length=100)
    
    fecha_ingreso = models.DateField()
    telefono = models.CharField(max_length=20, blank=True, null=True)
    correo_personal = models.EmailField(blank=True, null=True)
    correo_empresarial = models.EmailField(blank=True, null=True)
    
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('INACTIVO', 'Inactivo'),
    ]
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ACTIVO')

    def __str__(self):
        return f"{self.nombres} {self.apellidos} ({self.rut})"


class Documento(models.Model):
    trabajador = models.ForeignKey('Trabajador', on_delete=models.CASCADE, related_name='documentos')
    tipo = models.CharField(max_length=50) 
    archivo = models.FileField(upload_to='documentos/')
    fecha_emision = models.DateField()
    fecha_vencimiento = models.DateField(null=True, blank=True)
    observacion = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tipo} - {self.trabajador.nombres}"
    

class Tarea(models.Model):
    ESTADOS = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROGRESO', 'En Progreso'),
        ('COMPLETADA', 'Completada'),
        ('CANCELADA', 'Cancelada'),
    ]
    PRIORIDADES = [
        ('ALTA', 'Alta'),
        ('MEDIA', 'Media'),
        ('BAJA', 'Baja'),
    ]

    nombre = models.CharField(max_length=200)
    informacion = models.TextField(blank=True, null=True)
    comentario_gestion = models.TextField(blank=True, null=True)
    
    # --- FECHAS ---
    fecha_limite = models.DateField()
    fecha_creacion = models.DateTimeField(auto_now_add=True) # Se asigna sola
    
    # --- CLASIFICACIÓN ---
    prioridad = models.CharField(max_length=10, choices=PRIORIDADES, default='MEDIA')
    estado = models.CharField(max_length=15, choices=ESTADOS, default='PENDIENTE')
    
    # --- RELACIONES CON USO DE COMILLAS ---
    categoria = models.ForeignKey('CategoriaTarea', on_delete=models.PROTECT, related_name='tareas', null=True, blank=True)
    responsable = models.ForeignKey('Trabajador', on_delete=models.CASCADE, related_name='tareas')
    cliente = models.ForeignKey('Cliente', on_delete=models.SET_NULL, null=True, blank=True, related_name='tareas')
    tarea_padre = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subtareas')
    
    creado_por = models.CharField(max_length=100, default='ADMIN USUARIO')
    
    def __str__(self): 
        return f"{self.nombre} ({self.estado})"
    

# --- 3. EXTENSIÓN DE SEGURIDAD (PERFIL) ---

class PerfilUsuario(models.Model):
    # Relación 1 a 1 con el usuario nativo de Django
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    
    # Vinculación opcional con un Trabajador (para saber quién es en la vida real)
    trabajador = models.OneToOneField('Trabajador', on_delete=models.CASCADE, null=True, blank=True)
    
    rol = models.CharField(max_length=50, choices=ROLE_CHOICES)

    def __str__(self): return f"{self.user.username} - {self.rol}"


# --- 4. MÓDULO DE CALENDARIO Y EVENTOS ---

class Evento(models.Model):
    TIPO_SISTEMA = 'SISTEMA'
    TIPO_ASIGNADO = 'ASIGNADO'
    TIPO_PERSONAL = 'PERSONAL'
    TIPO_CHOICES = [
        (TIPO_SISTEMA, 'Evento del Sistema'),
        (TIPO_ASIGNADO, 'Evento Asignado'),
        (TIPO_PERSONAL, 'Evento Personal'),
    ]
    
    IMPORTANCIA_ALTA = 'ALTA'
    IMPORTANCIA_MEDIA = 'MEDIA'
    IMPORTANCIA_BAJA = 'BAJA'
    IMPORTANCIA_CHOICES = [
        (IMPORTANCIA_ALTA, 'Alta'),
        (IMPORTANCIA_MEDIA, 'Media'),
        (IMPORTANCIA_BAJA, 'Baja'),
    ]
    
    # --- INFORMACIÓN BÁSICA ---
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    tipo = models.CharField(max_length=15, choices=TIPO_CHOICES, default=TIPO_PERSONAL)
    importancia = models.CharField(max_length=10, choices=IMPORTANCIA_CHOICES, default=IMPORTANCIA_MEDIA)
    
    # --- FECHA Y HORA ---
    fecha = models.DateField()
    hora_inicio = models.TimeField(null=True, blank=True)
    hora_fin = models.TimeField(null=True, blank=True)
    
    # --- ASIGNACIONES Y VISIBILIDAD ---
    creado_por = models.ForeignKey(User, on_delete=models.CASCADE, related_name='eventos_creados')
    trabajadores_asignados = models.ManyToManyField('Trabajador', related_name='eventos_asignados', blank=True)
    
    # Para eventos personales: solo visible si visibilidad_privada=True y creador=usuario
    visibilidad_privada = models.BooleanField(default=False)
    
    # --- METADATOS ---
    tarea_relacionada = models.ForeignKey('Tarea', on_delete=models.SET_NULL, null=True, blank=True, related_name='eventos')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['fecha', 'hora_inicio']
        indexes = [
            models.Index(fields=['fecha', 'creado_por']),
            models.Index(fields=['tipo', 'fecha']),
        ]
    
    def __str__(self):
        return f"{self.titulo} ({self.tipo}) - {self.fecha}"


# --- 5. MODULO DE AUDITORIA GLOBAL ---

class AuditLog(models.Model):
    ACTION_CREATE = 'CREATE'
    ACTION_UPDATE = 'UPDATE'
    ACTION_DELETE = 'DELETE'
    ACTION_CHOICES = [
        (ACTION_CREATE, 'Creacion'),
        (ACTION_UPDATE, 'Modificacion'),
        (ACTION_DELETE, 'Eliminacion'),
    ]

    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    user_label = models.CharField(max_length=150, blank=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    module = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    summary = models.TextField(blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=45, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    path = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['action']),
            models.Index(fields=['module']),
            models.Index(fields=['model']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        who = self.user_label or (self.user.username if self.user else 'Sistema')
        return f"{self.action} {self.model} {self.object_id} - {who}"
