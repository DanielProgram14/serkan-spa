from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from decimal import Decimal
from uuid import uuid4
# Importamos TODOS los modelos necesarios
from .models import (
    Trabajador, Documento, Tarea, PerfilUsuario, 
    Area, Cargo, TipoDocumento, Cliente, CategoriaTarea,
    DocumentoCliente, MovimientoFinancieroCliente,
    CategoriaProducto, Proveedor, Producto, Herramienta,
    OrdenCompra, OrdenCompraItem, MovimientoInventario,
    HerramientaAsignacion, Evento
)
from .roles import (
    CANONICAL_ROLE_VALUES,
    ROLE_SUPERVISOR,
    ROLE_TRABAJADOR,
    normalize_role,
)

# ==========================================
# 1. SERIALIZADORES DE TABLAS MAESTRAS Y CLIENTES
# ==========================================

class AreaSerializer(serializers.ModelSerializer):
    class Meta: model = Area; fields = '__all__'

class CargoSerializer(serializers.ModelSerializer):
    class Meta: model = Cargo; fields = '__all__'

class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta: model = TipoDocumento; fields = '__all__'

class CategoriaTareaSerializer(serializers.ModelSerializer):
    class Meta: model = CategoriaTarea; fields = '__all__'

class ClienteSerializer(serializers.ModelSerializer):
    class Meta: model = Cliente; fields = '__all__'

    def validate(self, attrs):
        instance = self.instance

        def clean(value):
            if value is None:
                return None
            if isinstance(value, str):
                value = value.strip()
                return value if value else None
            return value

        rut = clean(attrs.get("rut", getattr(instance, "rut", None)))
        nombre = clean(attrs.get("nombre", getattr(instance, "nombre", None)))
        razon_social = clean(attrs.get("razon_social", getattr(instance, "razon_social", None)))
        telefono = clean(attrs.get("telefono", getattr(instance, "telefono", None)))
        correo = clean(attrs.get("correo", getattr(instance, "correo", None)))
        descripcion = clean(attrs.get("descripcion", getattr(instance, "descripcion", None)))

        if not rut:
            raise serializers.ValidationError({"rut": "Este campo es obligatorio."})
        if not nombre:
            raise serializers.ValidationError({"nombre": "Este campo es obligatorio."})
        if not razon_social:
            raise serializers.ValidationError({"razon_social": "Este campo es obligatorio."})
        if len(rut) > 12:
            raise serializers.ValidationError({"rut": "El RUT no puede superar 12 caracteres."})
        if instance is None and Cliente.objects.filter(pk=rut).exists():
            raise serializers.ValidationError({"rut": "Este RUT ya existe."})

        attrs["rut"] = rut
        attrs["nombre"] = nombre
        attrs["razon_social"] = razon_social
        attrs["telefono"] = telefono
        attrs["correo"] = correo
        attrs["descripcion"] = descripcion
        return attrs


class CategoriaProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaProducto
        fields = '__all__'


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'

    def validate(self, attrs):
        required_fields = ["nombre", "rut", "direccion", "telefono", "correo"]
        for field in required_fields:
            value = attrs.get(field, getattr(self.instance, field, None))
            if value is None or not str(value).strip():
                raise serializers.ValidationError({field: "Este campo es obligatorio."})
            attrs[field] = str(value).strip()
        return attrs


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    bajo_stock = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            'id',
            'sku',
            'nombre',
            'categoria',
            'categoria_nombre',
            'tipo_producto',
            'descripcion',
            'stock_actual',
            'stock_minimo',
            'unidad_medida',
            'activo',
            'bajo_stock',
            'created_at',
            'updated_at',
        ]

    def get_bajo_stock(self, obj):
        return obj.stock_actual <= obj.stock_minimo


class HerramientaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.ReadOnlyField(source='cliente.razon_social')
    bajo_stock = serializers.SerializerMethodField()

    class Meta:
        model = Herramienta
        fields = '__all__'

    def get_bajo_stock(self, obj):
        return obj.stock_disponible <= 0

    def validate(self, attrs):
        tipo_herramienta = attrs.get('tipo_herramienta', getattr(self.instance, 'tipo_herramienta', None))
        cliente = attrs.get('cliente', getattr(self.instance, 'cliente', None))
        stock_total = attrs.get('stock_total', getattr(self.instance, 'stock_total', 0))
        stock_disponible = attrs.get('stock_disponible', getattr(self.instance, 'stock_disponible', 0))

        if stock_total is not None and stock_disponible is not None and stock_disponible > stock_total:
            raise serializers.ValidationError({"stock_disponible": "No puede superar el stock total."})

        if tipo_herramienta == Herramienta.TIPO_INTERNO and 'cliente' in attrs and cliente:
            raise serializers.ValidationError({"cliente": "Las herramientas internas no deben tener cliente asignado."})

        return attrs


class HerramientaAsignacionSerializer(serializers.ModelSerializer):
    herramienta_nombre = serializers.ReadOnlyField(source='herramienta.nombre')
    trabajador_nombre = serializers.SerializerMethodField()
    cliente_nombre = serializers.ReadOnlyField(source='cliente.razon_social')
    asignado_por_username = serializers.ReadOnlyField(source='asignado_por.username')
    devuelto_por_username = serializers.ReadOnlyField(source='devuelto_por.username')

    class Meta:
        model = HerramientaAsignacion
        fields = '__all__'
        read_only_fields = [
            'estado',
            'fecha_asignacion',
            'fecha_devolucion',
            'asignado_por',
            'devuelto_por',
        ]

    def get_trabajador_nombre(self, obj):
        return f"{obj.trabajador.nombres} {obj.trabajador.apellidos}"

    def validate(self, attrs):
        herramienta = attrs.get('herramienta')
        cantidad = attrs.get('cantidad')
        if not herramienta:
            raise serializers.ValidationError({"herramienta": "Debes seleccionar una herramienta."})
        if not cantidad or cantidad <= 0:
            raise serializers.ValidationError({"cantidad": "La cantidad debe ser mayor que cero."})
        if herramienta.stock_disponible < cantidad:
            raise serializers.ValidationError({"cantidad": "Stock disponible insuficiente para asignar."})
        return attrs


class OrdenCompraItemSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    producto_sku = serializers.ReadOnlyField(source='producto.sku')

    class Meta:
        model = OrdenCompraItem
        fields = ['id', 'producto', 'producto_nombre', 'producto_sku', 'cantidad', 'costo_unitario', 'total_linea']
        read_only_fields = ['total_linea']


class OrdenCompraSerializer(serializers.ModelSerializer):
    numero = serializers.CharField(required=False, allow_blank=True)
    nombre = serializers.CharField(required=True)
    proveedor_nombre = serializers.ReadOnlyField(source='proveedor.nombre')
    creado_por_username = serializers.ReadOnlyField(source='creado_por.username')
    estado_label = serializers.SerializerMethodField()
    items = OrdenCompraItemSerializer(many=True)

    class Meta:
        model = OrdenCompra
        fields = [
            'id',
            'numero',
            'nombre',
            'proveedor',
            'proveedor_nombre',
            'fecha_orden',
            'estado',
            'estado_label',
            'observacion',
            'total_orden',
            'creado_por',
            'creado_por_username',
            'fecha_confirmacion',
            'created_at',
            'updated_at',
            'items',
        ]
        read_only_fields = ['estado', 'total_orden', 'creado_por', 'fecha_confirmacion', 'created_at', 'updated_at']

    def get_estado_label(self, obj):
        if obj.estado == OrdenCompra.ESTADO_BORRADOR:
            return "Pendiente"
        if obj.estado == OrdenCompra.ESTADO_CONFIRMADA and obj.fecha_confirmacion:
            return "Recibida"
        if obj.estado == OrdenCompra.ESTADO_CONFIRMADA:
            return "Aprobada"
        if obj.estado == OrdenCompra.ESTADO_CANCELADA:
            return "Cancelada"
        return obj.estado

    def _validate_items(self, items):
        if not items:
            raise serializers.ValidationError({"items": "Debes agregar al menos un item a la orden."})

        producto_ids = [item.get("producto").id for item in items]
        if len(producto_ids) != len(set(producto_ids)):
            raise serializers.ValidationError({"items": "No puedes repetir productos dentro de la misma orden."})

        for item in items:
            cantidad = item.get("cantidad")
            costo = item.get("costo_unitario")
            if cantidad is None or cantidad <= 0:
                raise serializers.ValidationError({"items": "Todas las cantidades deben ser mayores que cero."})
            if costo is None or Decimal(costo) <= Decimal("0"):
                raise serializers.ValidationError({"items": "Todos los costos unitarios deben ser mayores que cero."})

    def _generate_numero(self):
        return f"OC-{uuid4().hex[:10].upper()}"

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        self._validate_items(items_data)
        validated_data["nombre"] = validated_data.get("nombre", "").strip()
        if not validated_data["nombre"]:
            raise serializers.ValidationError({"nombre": "El nombre de la orden es obligatorio."})

        if not validated_data.get("numero"):
            validated_data["numero"] = self._generate_numero()
        validated_data["creado_por"] = self.context["request"].user

        orden = OrdenCompra.objects.create(**validated_data)

        total = Decimal("0")
        for item in items_data:
            cantidad = item["cantidad"]
            costo_unitario = Decimal(item["costo_unitario"])
            total_linea = Decimal(cantidad) * costo_unitario
            OrdenCompraItem.objects.create(
                orden_compra=orden,
                producto=item["producto"],
                cantidad=cantidad,
                costo_unitario=costo_unitario,
                total_linea=total_linea,
            )
            total += total_linea

        orden.total_orden = total
        orden.save(update_fields=["total_orden", "updated_at"])
        return orden

    def update(self, instance, validated_data):
        if instance.estado != OrdenCompra.ESTADO_BORRADOR:
            raise serializers.ValidationError("Solo puedes editar ordenes en estado BORRADOR.")

        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            if attr == "nombre":
                value = str(value).strip()
                if not value:
                    raise serializers.ValidationError({"nombre": "El nombre de la orden es obligatorio."})
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            self._validate_items(items_data)
            instance.items.all().delete()

            total = Decimal("0")
            for item in items_data:
                cantidad = item["cantidad"]
                costo_unitario = Decimal(item["costo_unitario"])
                total_linea = Decimal(cantidad) * costo_unitario
                OrdenCompraItem.objects.create(
                    orden_compra=instance,
                    producto=item["producto"],
                    cantidad=cantidad,
                    costo_unitario=costo_unitario,
                    total_linea=total_linea,
                )
                total += total_linea

            instance.total_orden = total
            instance.save(update_fields=["total_orden", "updated_at"])

        return instance


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    producto_sku = serializers.ReadOnlyField(source='producto.sku')
    orden_compra_numero = serializers.ReadOnlyField(source='orden_compra.numero')
    creado_por_username = serializers.ReadOnlyField(source='creado_por.username')

    class Meta:
        model = MovimientoInventario
        fields = '__all__'


class DocumentoClienteSerializer(serializers.ModelSerializer):
    ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx", "txt"}
    MAX_SIZE_BYTES = 10 * 1024 * 1024

    cliente_nombre = serializers.ReadOnlyField(source='cliente.razon_social')
    cargado_por_username = serializers.ReadOnlyField(source='cargado_por.username')

    class Meta:
        model = DocumentoCliente
        fields = [
            'id',
            'cliente',
            'cliente_nombre',
            'archivo',
            'nombre_original',
            'extension',
            'tamano_bytes',
            'descripcion',
            'fecha_carga',
            'cargado_por',
            'cargado_por_username',
        ]
        read_only_fields = ['nombre_original', 'extension', 'tamano_bytes', 'fecha_carga', 'cargado_por']

    def _file_metadata(self, file_obj):
        filename = getattr(file_obj, "name", "") or ""
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        return {
            "nombre_original": filename,
            "extension": extension,
            "tamano_bytes": getattr(file_obj, "size", 0) or 0,
        }

    def validate_archivo(self, value):
        metadata = self._file_metadata(value)
        extension = metadata["extension"]
        file_size = metadata["tamano_bytes"]

        if extension not in self.ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                "Tipo de archivo no permitido. Usa: PDF, imagenes, Word, Excel o TXT."
            )

        if file_size > self.MAX_SIZE_BYTES:
            raise serializers.ValidationError("El archivo supera el maximo permitido de 10 MB.")

        if file_size <= 0:
            raise serializers.ValidationError("El archivo esta vacio.")

        return value

    def create(self, validated_data):
        file_obj = validated_data["archivo"]
        validated_data.update(self._file_metadata(file_obj))
        validated_data["cargado_por"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        file_obj = validated_data.get("archivo")
        if file_obj:
            validated_data.update(self._file_metadata(file_obj))
        return super().update(instance, validated_data)


class MovimientoFinancieroClienteSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.ReadOnlyField(source='cliente.razon_social')
    creado_por_username = serializers.ReadOnlyField(source='creado_por.username')
    tipo_movimiento_label = serializers.ReadOnlyField(source='get_tipo_movimiento_display')

    class Meta:
        model = MovimientoFinancieroCliente
        fields = [
            'id',
            'cliente',
            'cliente_nombre',
            'tipo_movimiento',
            'tipo_movimiento_label',
            'monto',
            'fecha',
            'descripcion',
            'creado_por',
            'creado_por_username',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['creado_por', 'created_at', 'updated_at']

    def validate_monto(self, value):
        if value is None or Decimal(value) <= Decimal("0"):
            raise serializers.ValidationError("El monto debe ser mayor que cero.")
        return value

    def create(self, validated_data):
        validated_data["creado_por"] = self.context["request"].user
        return super().create(validated_data)


# ==========================================
# 2. SERIALIZADORES DE TAREAS (EL ORDEN IMPORTA AQUÍ)
# ==========================================

# A) PRIMERO declaramos SubtareaSerializer
class SubtareaSerializer(serializers.ModelSerializer):
    nombre_responsable = serializers.SerializerMethodField()

    class Meta:
        model = Tarea
        fields = ['id', 'nombre', 'estado', 'prioridad', 'fecha_limite', 'nombre_responsable']

    def get_nombre_responsable(self, obj):
        if obj.responsable:
            return f"{obj.responsable.nombres} {obj.responsable.apellidos}"
        return "Sin Asignar"

# ==========================================
# SERIALIZADORES Mini (para relaciones)
# ==========================================

class TrabajadorMiniSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = Trabajador
        fields = ['rut', 'nombres', 'apellidos', 'nombre_completo', 'cargo']
    
    def get_nombre_completo(self, obj):
        return f"{obj.nombres} {obj.apellidos}"

# B) LUEGO declaramos TareaSerializer (que usa el de arriba)
class TareaSerializer(serializers.ModelSerializer):
    nombre_responsable = serializers.SerializerMethodField()
    responsable_objeto = TrabajadorMiniSerializer(source='responsable', read_only=True)
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    cliente_nombre = serializers.ReadOnlyField(source='cliente.razon_social')
    
    subtareas = SubtareaSerializer(many=True, read_only=True)

    class Meta:
        model = Tarea
        fields = [
            'id', 'nombre', 'informacion', 'comentario_gestion', 
            'fecha_limite', 'fecha_creacion', 'prioridad', 'estado',
            'categoria', 'categoria_nombre', 
            'cliente', 'cliente_nombre',
            'responsable', 'nombre_responsable', 'responsable_objeto',
            'tarea_padre', 'subtareas', 
            'creado_por'
        ]

    def get_nombre_responsable(self, obj):
        if obj.responsable:
            return f"{obj.responsable.nombres} {obj.responsable.apellidos}"
        return "Sin Asignar"

    def validate(self, data):
        """
        Validar que no se pueda completar una tarea si tiene subtareas pendientes.
        """
        instance = self.instance
        nuevo_estado = data.get('estado', instance.estado if instance else None)
        tarea_padre = data.get('tarea_padre', instance.tarea_padre if instance else None)

        if tarea_padre and tarea_padre.estado == 'COMPLETADA':
            is_create = instance is None
            changed_parent = instance is not None and 'tarea_padre' in data and tarea_padre != instance.tarea_padre
            if is_create or changed_parent:
                raise serializers.ValidationError({
                    'tarea_padre': 'No se pueden crear subtareas en una tarea completada.'
                })
        
        # Solo validar si se intenta cambiar a COMPLETADA
        if nuevo_estado == 'COMPLETADA' and instance:
            # Verificar si existe alguna subtarea que NO esté completada
            subtareas_pendientes = instance.subtareas.exclude(estado='COMPLETADA').exclude(estado='CANCELADA').exists()
            
            if subtareas_pendientes:
                subtareas_incompletas = instance.subtareas.exclude(estado='COMPLETADA').exclude(estado='CANCELADA').values_list('nombre', flat=True)
                nombres = ', '.join(subtareas_incompletas)
                raise serializers.ValidationError({
                    'estado': f'No se puede completar esta tarea porque tiene subtareas pendientes: {nombres}'
                })
        
        return data


# ==========================================
# 3. OTROS SERIALIZADORES PRINCIPALES
# ==========================================

class TrabajadorSerializer(serializers.ModelSerializer):
    UNIQUE_ERROR_MESSAGES = {
        "rut": "Ya existe un trabajador con este RUT.",
        "correo_empresarial": "Ya existe un trabajador con este correo empresarial.",
        "correo_personal": "Ya existe un trabajador con este correo personal.",
        "telefono": "Ya existe un trabajador con este telefono.",
    }

    class Meta:
        model = Trabajador
        fields = '__all__'

    def _normalize_text(self, value):
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    def _validate_unique_value(self, field_name, value, lookup=None):
        if not value:
            return

        final_lookup = lookup or field_name
        queryset = Trabajador.objects.filter(**{final_lookup: value})
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError({field_name: self.UNIQUE_ERROR_MESSAGES[field_name]})

    def validate(self, attrs):
        for optional_field in ["correo_empresarial", "correo_personal", "telefono"]:
            if optional_field in attrs:
                attrs[optional_field] = self._normalize_text(attrs[optional_field])

        if "rut" in attrs:
            attrs["rut"] = self._normalize_text(attrs["rut"]) or attrs["rut"]

        rut_value = attrs.get("rut", getattr(self.instance, "rut", None))
        correo_empresarial_value = attrs.get("correo_empresarial", getattr(self.instance, "correo_empresarial", None))
        correo_personal_value = attrs.get("correo_personal", getattr(self.instance, "correo_personal", None))
        telefono_value = attrs.get("telefono", getattr(self.instance, "telefono", None))

        self._validate_unique_value("rut", rut_value, "rut__iexact")
        self._validate_unique_value("correo_empresarial", correo_empresarial_value, "correo_empresarial__iexact")
        self._validate_unique_value("correo_personal", correo_personal_value, "correo_personal__iexact")
        self._validate_unique_value("telefono", telefono_value, "telefono__iexact")

        return attrs
        
class DocumentoSerializer(serializers.ModelSerializer):
    ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx", "txt"}
    MAX_SIZE_BYTES = 10 * 1024 * 1024

    nombre_trabajador = serializers.ReadOnlyField(source='trabajador.nombres')
    apellido_trabajador = serializers.ReadOnlyField(source='trabajador.apellidos')
    rut_trabajador = serializers.ReadOnlyField(source='trabajador.rut')

    class Meta:
        model = Documento
        fields = '__all__'

    def validate_archivo(self, value):
        filename = getattr(value, "name", "") or ""
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        file_size = getattr(value, "size", 0) or 0

        if extension not in self.ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                "Tipo de archivo no permitido. Usa: PDF, imagenes, Word, Excel o TXT."
            )

        if file_size > self.MAX_SIZE_BYTES:
            raise serializers.ValidationError("El archivo supera el maximo permitido de 10 MB.")

        if file_size <= 0:
            raise serializers.ValidationError("El archivo esta vacio.")

        return value


# ==========================================
# 4. SEGURIDAD (Usuarios y Perfiles)
# ==========================================

class LoginSerializer(serializers.Serializer):
    login = serializers.CharField(write_only=True, required=False, allow_blank=True)
    username = serializers.CharField(write_only=True, required=False, allow_blank=True)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        raw_login = (
            attrs.get("login")
            or attrs.get("username")
            or attrs.get("email")
            or ""
        ).strip()
        password = attrs.get("password") or ""

        if not raw_login:
            raise serializers.ValidationError("Debes ingresar usuario o correo.")
        if not password:
            raise serializers.ValidationError("Debes ingresar password.")

        username = raw_login
        if "@" in raw_login:
            matches = User.objects.filter(email__iexact=raw_login)
            if matches.count() > 1:
                raise serializers.ValidationError(
                    "El correo esta asociado a multiples cuentas."
                )
            if matches.exists():
                username = matches.first().username

        user = authenticate(
            request=self.context.get("request"),
            username=username,
            password=password,
        )

        if not user:
            raise serializers.ValidationError("Credenciales incorrectas.")

        attrs["user"] = user
        return attrs


class PerfilSerializer(serializers.ModelSerializer):
    rol = serializers.SerializerMethodField()
    trabajador_nombre = serializers.SerializerMethodField()
    trabajador_rut = serializers.ReadOnlyField(source='trabajador.rut')
    
    class Meta:
        model = PerfilUsuario
        fields = ['rol', 'trabajador', 'trabajador_nombre', 'trabajador_rut']

    def get_rol(self, obj):
        return normalize_role(obj.rol)
    
    def get_trabajador_nombre(self, obj):
        if obj.trabajador:
            return f"{obj.trabajador.nombres} {obj.trabajador.apellidos}"
        return None


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    rol = serializers.ChoiceField(
        choices=[(role, role) for role in CANONICAL_ROLE_VALUES],
        write_only=True,
        required=False,
    )
    trabajador_id = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)

    perfil = PerfilSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'rol', 'trabajador_id', 'perfil']

    def validate(self, attrs):
        instance = self.instance

        username = attrs.get("username", getattr(instance, "username", None))
        if username:
            qs = User.objects.filter(username__iexact=username)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"username": "Este nombre de usuario ya existe."})

        email = attrs.get("email", getattr(instance, "email", None))
        if email:
            qs = User.objects.filter(email__iexact=email)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"email": "Este correo ya existe."})

        return attrs

    def validate_rol(self, value):
        normalized = normalize_role(value)
        if normalized not in CANONICAL_ROLE_VALUES:
            raise serializers.ValidationError("Rol no valido.")
        return normalized

    def _resolve_trabajador(self, rut_trabajador):
        if not rut_trabajador:
            return None
        try:
            return Trabajador.objects.get(pk=rut_trabajador)
        except Trabajador.DoesNotExist:
            raise serializers.ValidationError({"trabajador_id": "Trabajador no existe."})

    def _validate_trabajador_requirement(self, rol, trabajador):
        if rol in {ROLE_SUPERVISOR, ROLE_TRABAJADOR} and not trabajador:
            raise serializers.ValidationError(
                {"trabajador_id": "Supervisor y Trabajador deben estar vinculados a un trabajador."}
            )

    def create(self, validated_data):
        rol = validated_data.pop('rol', None)
        if not rol:
            raise serializers.ValidationError({"rol": "Rol es obligatorio."})

        rol = normalize_role(rol)
        if rol not in CANONICAL_ROLE_VALUES:
            raise serializers.ValidationError({"rol": "Rol no valido."})

        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({"password": "Password es obligatorio."})

        rut_trabajador = validated_data.pop('trabajador_id', None)
        trabajador_instance = self._resolve_trabajador(rut_trabajador)
        self._validate_trabajador_requirement(rol, trabajador_instance)

        user = User.objects.create_user(password=password, **validated_data)

        PerfilUsuario.objects.create(
            user=user, 
            rol=rol, 
            trabajador=trabajador_instance 
        )
        return user

    def update(self, instance, validated_data):
        rol = validated_data.pop('rol', None)
        rut = validated_data.pop('trabajador_id', None) if 'trabajador_id' in validated_data else None

        instance.username = validated_data.get('username', instance.username)
        instance.email = validated_data.get('email', instance.email)
        
        if 'password' in validated_data and validated_data['password']:
            instance.set_password(validated_data['password'])
        
        instance.save()

        perfil, _ = PerfilUsuario.objects.get_or_create(user=instance)

        if rol:
            normalized_rol = normalize_role(rol)
            if normalized_rol not in CANONICAL_ROLE_VALUES:
                raise serializers.ValidationError({"rol": "Rol no valido."})
            perfil.rol = normalized_rol

        if 'trabajador_id' in self.initial_data:
            trabajador_instance = self._resolve_trabajador(rut)
            if trabajador_instance and PerfilUsuario.objects.filter(trabajador=trabajador_instance).exclude(user=instance).exists():
                raise serializers.ValidationError({"trabajador_id": "Trabajador ya vinculado a otro usuario."})
            perfil.trabajador = trabajador_instance

        self._validate_trabajador_requirement(perfil.rol, perfil.trabajador)
        
        perfil.save()
        return instance


# ==========================================
# SERIALIZADORES DE CALENDARIO Y EVENTOS
# ==========================================

class EventoSerializer(serializers.ModelSerializer):
    trabajadores_asignados = TrabajadorMiniSerializer(many=True, read_only=True)
    trabajadores_asignados_ids = serializers.PrimaryKeyRelatedField(
        queryset=Trabajador.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='trabajadores_asignados'
    )
    creado_por_nombre = serializers.CharField(source='creado_por.username', read_only=True)
    tarea_nombre = serializers.CharField(source='tarea_relacionada.nombre', read_only=True, allow_null=True)
    
    class Meta:
        model = Evento
        fields = [
            'id',
            'titulo',
            'descripcion',
            'tipo',
            'importancia',
            'fecha',
            'hora_inicio',
            'hora_fin',
            'creado_por',
            'creado_por_nombre',
            'trabajadores_asignados',
            'trabajadores_asignados_ids',
            'visibilidad_privada',
            'tarea_relacionada',
            'tarea_nombre',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'creado_por', 'creado_por_nombre', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        trabajadores = validated_data.pop('trabajadores_asignados', [])
        validated_data['creado_por'] = self.context['request'].user
        evento = Evento.objects.create(**validated_data)
        evento.trabajadores_asignados.set(trabajadores)
        return evento
    
    def update(self, instance, validated_data):
        trabajadores = validated_data.pop('trabajadores_asignados', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if trabajadores is not None:
            instance.trabajadores_asignados.set(trabajadores)
        return instance
