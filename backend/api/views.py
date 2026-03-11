from decimal import Decimal

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import (
    Area,
    Cargo,
    CategoriaProducto,
    CategoriaTarea,
    Cliente,
    Documento,
    DocumentoCliente,
    Evento,
    Herramienta,
    HerramientaAsignacion,
    MovimientoFinancieroCliente,
    MovimientoInventario,
    OrdenCompra,
    Producto,
    Proveedor,
    Tarea,
    TipoDocumento,
    Trabajador,
)
from .roles import (
    ROLE_ADMINISTRADOR,
    ROLE_RRHH,
    ROLE_SUPERVISOR,
    ROLE_TRABAJADOR,
    normalize_role,
)
from .serializers import (
    AreaSerializer,
    CargoSerializer,
    CategoriaProductoSerializer,
    CategoriaTareaSerializer,
    ClienteSerializer,
    DocumentoSerializer,
    DocumentoClienteSerializer,
    EventoSerializer,
    HerramientaSerializer,
    HerramientaAsignacionSerializer,
    MovimientoFinancieroClienteSerializer,
    MovimientoInventarioSerializer,
    OrdenCompraSerializer,
    ProductoSerializer,
    ProveedorSerializer,
    TareaSerializer,
    TipoDocumentoSerializer,
    TrabajadorSerializer,
    UserSerializer,
)


class RoleContextMixin:
    permission_classes = [IsAuthenticated]

    def get_user_role(self):
        user = self.request.user
        if user.is_superuser:
            return ROLE_ADMINISTRADOR
        perfil = getattr(user, "perfil", None)
        return normalize_role(getattr(perfil, "rol", None))

    def get_user_trabajador(self):
        user = self.request.user
        perfil = getattr(self.request.user, "perfil", None)
        trabajador = getattr(perfil, "trabajador", None)
        if trabajador:
            return trabajador

        # Fallback para cuentas legacy sin vinculacion explicita de perfil.
        trabajador = Trabajador.objects.filter(pk=user.username).first()
        if trabajador:
            return trabajador

        return Trabajador.objects.filter(correo_empresarial__iexact=user.username).first()

    def require_roles(self, *allowed_roles):
        if self.get_user_role() not in allowed_roles:
            raise PermissionDenied("No tienes permisos para esta accion.")


class AdminOnlyViewSet(RoleContextMixin, viewsets.ModelViewSet):
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.require_roles(ROLE_ADMINISTRADOR)


class CustomAuthToken(ObtainAuthToken):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        perfil = getattr(user, "perfil", None)
        trabajador = getattr(perfil, "trabajador", None)

        if not user.is_active:
            return Response(
                {"detail": "Este usuario se encuentra inactivo. Contacte con el administrador."},
                status=403,
            )

        if trabajador and trabajador.estado == "INACTIVO":
            return Response(
                {"detail": "Este usuario se encuentra inactivo. Contacte con el administrador."},
                status=403,
            )

        token, _ = Token.objects.get_or_create(user=user)
        rol = ROLE_ADMINISTRADOR if user.is_superuser else (normalize_role(getattr(perfil, "rol", None)) or ROLE_TRABAJADOR)

        if trabajador:
            nombres = f"{trabajador.nombres} {trabajador.apellidos}".strip()
            rut = trabajador.rut
            area = trabajador.area
        else:
            nombres = user.get_full_name().strip() or user.username
            rut = user.username
            area = None

        return Response(
            {
                "token": token.key,
                "user": {
                    "rut": rut,
                    "nombres": nombres,
                    "rol": rol,
                    "trabajador_rut": trabajador.rut if trabajador else None,
                    "area": area,
                },
            }
        )


class AreaViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR}:
            return Area.objects.all()
        return Area.objects.none()

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR)
        instance.delete()


class CargoViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = Cargo.objects.all()
    serializer_class = CargoSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR}:
            return Cargo.objects.all()
        return Cargo.objects.none()

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR)
        instance.delete()


class TipoDocumentoViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR}:
            return TipoDocumento.objects.all()
        return TipoDocumento.objects.none()

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR)
        instance.delete()


class CategoriaTareaViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = CategoriaTarea.objects.all()
    serializer_class = CategoriaTareaSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR}:
            return CategoriaTarea.objects.all()
        return CategoriaTarea.objects.none()

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR)
        instance.delete()


class UserViewSet(AdminOnlyViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def perform_update(self, serializer):
        if serializer.instance == self.request.user:
            raise PermissionDenied("No puedes modificar tu propia cuenta desde este modulo.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance == self.request.user:
            raise PermissionDenied("No puedes eliminar tu propia cuenta.")
        instance.delete()


class ClienteViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR}:
            return Cliente.objects.all()
        return Cliente.objects.none()

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        instance.delete()


class CategoriaProductoViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = CategoriaProducto.objects.all()
    serializer_class = CategoriaProductoSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR, ROLE_TRABAJADOR}:
            return CategoriaProducto.objects.all()
        return CategoriaProducto.objects.none()

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        instance.delete()


class ProveedorViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR, ROLE_TRABAJADOR}:
            return Proveedor.objects.all()
        return Proveedor.objects.none()

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        instance.delete()


class ProductoViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = Producto.objects.select_related("categoria").all().order_by("nombre")
    serializer_class = ProductoSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role not in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR, ROLE_TRABAJADOR}:
            return Producto.objects.none()

        queryset = Producto.objects.select_related("categoria").all().order_by("nombre")
        query = self.request.query_params.get("q")
        categoria_id = self.request.query_params.get("categoria")
        low_stock = self.request.query_params.get("bajo_stock")
        if query:
            queryset = queryset.filter(Q(nombre__icontains=query) | Q(sku__icontains=query))
        if categoria_id:
            queryset = queryset.filter(categoria_id=categoria_id)
        if low_stock and low_stock.lower() in {"1", "true", "si", "yes"}:
            queryset = queryset.filter(stock_actual__lte=F("stock_minimo"))
        return queryset

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        # Establecer stock_disponible igual a stock_total en creación
        herramienta = serializer.save()
        if herramienta.stock_disponible != herramienta.stock_total:
            herramienta.stock_disponible = herramienta.stock_total
            herramienta.save(update_fields=["stock_disponible"])

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="recalcular-disponible")
    def recalcular_disponible(self, request, pk=None):
        """Recalcula el stock disponible basado en asignaciones activas"""
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        with transaction.atomic():
            herramienta = Herramienta.objects.select_for_update().get(pk=pk)
            
            # Calcular cantidad asignada activamente
            asignaciones_activas = HerramientaAsignacion.objects.filter(
                herramienta=herramienta,
                estado=HerramientaAsignacion.ESTADO_ACTIVA
            )
            cantidad_asignada = sum(a.cantidad for a in asignaciones_activas)
            
            # Nuevo stock disponible = stock total - cantidad asignada
            nuevo_disponible = herramienta.stock_total - cantidad_asignada
            nuevo_disponible = max(0, min(nuevo_disponible, herramienta.stock_total))  # Limitar entre 0 y stock_total
            
            if herramienta.stock_disponible != nuevo_disponible:
                herramienta.stock_disponible = nuevo_disponible
                # Actualizar estado si es necesario
                if nuevo_disponible == herramienta.stock_total:
                    herramienta.estado = Herramienta.ESTADO_DISPONIBLE
                elif nuevo_disponible < herramienta.stock_total and herramienta.estado == Herramienta.ESTADO_DISPONIBLE:
                    herramienta.estado = Herramienta.ESTADO_ASIGNADA
                herramienta.save(update_fields=["stock_disponible", "estado", "updated_at"])
        
        serializer = self.get_serializer(herramienta)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="descontar-stock")
    def descontar_stock(self, request, pk=None):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)

        cantidad_raw = request.data.get("cantidad")
        detalle = request.data.get("detalle", "")
        try:
            cantidad = int(cantidad_raw)
        except (TypeError, ValueError):
            return Response({"cantidad": "Cantidad invalida."}, status=400)

        if cantidad <= 0:
            return Response({"cantidad": "La cantidad debe ser mayor que cero."}, status=400)

        with transaction.atomic():
            producto = Producto.objects.select_for_update().get(pk=pk)
            if producto.stock_actual < cantidad:
                return Response({"cantidad": "No puedes descontar mas del stock disponible."}, status=400)

            stock_anterior = producto.stock_actual
            stock_resultante = stock_anterior - cantidad
            producto.stock_actual = stock_resultante
            producto.save(update_fields=["stock_actual", "updated_at"])

            MovimientoInventario.objects.create(
                producto=producto,
                tipo_movimiento=MovimientoInventario.TIPO_AJUSTE_NEGATIVO,
                cantidad=cantidad,
                stock_anterior=stock_anterior,
                stock_resultante=stock_resultante,
                detalle=detalle or "Descuento manual de stock",
                creado_por=request.user,
            )

        serializer = self.get_serializer(producto)
        return Response(serializer.data)


class HerramientaViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = Herramienta.objects.select_related("cliente").all().order_by("nombre")
    serializer_class = HerramientaSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role not in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR, ROLE_TRABAJADOR}:
            return Herramienta.objects.none()

        queryset = Herramienta.objects.select_related("cliente").all().order_by("nombre")
        query = self.request.query_params.get("q")
        if query:
            queryset = queryset.filter(Q(codigo__icontains=query) | Q(nombre__icontains=query))
        return queryset

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        # Establecer stock_disponible igual a stock_total en creación
        herramienta = serializer.save()
        if herramienta.stock_disponible != herramienta.stock_total:
            herramienta.stock_disponible = herramienta.stock_total
            herramienta.save(update_fields=["stock_disponible"])

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="recalcular-disponible")
    def recalcular_disponible(self, request, pk=None):
        """Recalcula el stock disponible basado en asignaciones activas"""
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        with transaction.atomic():
            herramienta = Herramienta.objects.select_for_update().get(pk=pk)
            
            # Calcular cantidad asignada activamente
            asignaciones_activas = HerramientaAsignacion.objects.filter(
                herramienta=herramienta,
                estado=HerramientaAsignacion.ESTADO_ACTIVA
            )
            cantidad_asignada = sum(a.cantidad for a in asignaciones_activas)
            
            # Nuevo stock disponible = stock total - cantidad asignada
            nuevo_disponible = herramienta.stock_total - cantidad_asignada
            nuevo_disponible = max(0, min(nuevo_disponible, herramienta.stock_total))  # Limitar entre 0 y stock_total
            
            if herramienta.stock_disponible != nuevo_disponible:
                herramienta.stock_disponible = nuevo_disponible
                # Actualizar estado si es necesario
                if nuevo_disponible == herramienta.stock_total:
                    herramienta.estado = Herramienta.ESTADO_DISPONIBLE
                elif nuevo_disponible < herramienta.stock_total and herramienta.estado == Herramienta.ESTADO_DISPONIBLE:
                    herramienta.estado = Herramienta.ESTADO_ASIGNADA
                herramienta.save(update_fields=["stock_disponible", "estado", "updated_at"])
        
        serializer = self.get_serializer(herramienta)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="asignar")
    def asignar(self, request, pk=None):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        herramienta = Herramienta.objects.filter(pk=pk).first()
        if not herramienta:
            return Response({"detail": "Herramienta no encontrada."}, status=404)

        payload = request.data.copy()
        payload["herramienta"] = pk
        serializer = HerramientaAsignacionSerializer(data=payload, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            herramienta = Herramienta.objects.select_for_update().get(pk=pk)
            cantidad = serializer.validated_data["cantidad"]
            if herramienta.stock_disponible < cantidad:
                return Response({"cantidad": "Stock disponible insuficiente para asignar."}, status=400)

            asignacion = HerramientaAsignacion.objects.create(
                herramienta=herramienta,
                trabajador=serializer.validated_data["trabajador"],
                cliente=serializer.validated_data.get("cliente"),
                cantidad=cantidad,
                observacion=serializer.validated_data.get("observacion"),
                asignado_por=request.user,
            )

            herramienta.stock_disponible -= cantidad
            if herramienta.stock_disponible < herramienta.stock_total and herramienta.estado == Herramienta.ESTADO_DISPONIBLE:
                herramienta.estado = Herramienta.ESTADO_ASIGNADA
            herramienta.save(update_fields=["stock_disponible", "estado", "updated_at"])

        response_serializer = HerramientaAsignacionSerializer(asignacion)
        return Response(response_serializer.data, status=201)

    @action(detail=True, methods=["get"], url_path="asignaciones")
    def asignaciones(self, request, pk=None):
        role = self.get_user_role()
        if role not in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR, ROLE_TRABAJADOR}:
            return Response([], status=200)
        queryset = HerramientaAsignacion.objects.select_related("herramienta", "trabajador", "cliente").filter(herramienta_id=pk)
        if role == ROLE_TRABAJADOR:
            trabajador = self.get_user_trabajador()
            if not trabajador:
                return Response([], status=200)
            queryset = queryset.filter(trabajador=trabajador)
        serializer = HerramientaAsignacionSerializer(queryset, many=True)
        return Response(serializer.data)


class HerramientaAsignacionViewSet(RoleContextMixin, viewsets.ReadOnlyModelViewSet):
    queryset = HerramientaAsignacion.objects.select_related("herramienta", "trabajador", "cliente").all().order_by("-fecha_asignacion")
    serializer_class = HerramientaAsignacionSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role not in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR, ROLE_TRABAJADOR}:
            return HerramientaAsignacion.objects.none()
        queryset = HerramientaAsignacion.objects.select_related("herramienta", "trabajador", "cliente").all().order_by("-fecha_asignacion")
        if role == ROLE_TRABAJADOR:
            trabajador = self.get_user_trabajador()
            if not trabajador:
                return HerramientaAsignacion.objects.none()
            queryset = queryset.filter(trabajador=trabajador)
        herramienta_id = self.request.query_params.get("herramienta")
        if herramienta_id:
            queryset = queryset.filter(herramienta_id=herramienta_id)
        return queryset

    @action(detail=True, methods=["post"], url_path="devolver")
    def devolver(self, request, pk=None):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        with transaction.atomic():
            asignacion = HerramientaAsignacion.objects.select_for_update().get(pk=pk)
            if asignacion.estado != HerramientaAsignacion.ESTADO_ACTIVA:
                return Response({"detail": "La asignacion ya fue devuelta."}, status=400)

            herramienta = Herramienta.objects.select_for_update().get(pk=asignacion.herramienta_id)
            nuevo_disponible = herramienta.stock_disponible + asignacion.cantidad
            if nuevo_disponible > herramienta.stock_total:
                nuevo_disponible = herramienta.stock_total

            herramienta.stock_disponible = nuevo_disponible
            if herramienta.stock_disponible == herramienta.stock_total and herramienta.estado == Herramienta.ESTADO_ASIGNADA:
                herramienta.estado = Herramienta.ESTADO_DISPONIBLE
            herramienta.save(update_fields=["stock_disponible", "estado", "updated_at"])

            asignacion.estado = HerramientaAsignacion.ESTADO_DEVUELTA
            asignacion.fecha_devolucion = timezone.now()
            asignacion.devuelto_por = request.user
            asignacion.save(update_fields=["estado", "fecha_devolucion", "devuelto_por"])

        serializer = self.get_serializer(asignacion)
        return Response(serializer.data)


class OrdenCompraViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = (
        OrdenCompra.objects.select_related("proveedor", "creado_por")
        .prefetch_related("items__producto")
        .all()
        .order_by("-created_at")
    )
    serializer_class = OrdenCompraSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role not in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR, ROLE_TRABAJADOR}:
            return OrdenCompra.objects.none()

        queryset = (
            OrdenCompra.objects.select_related("proveedor", "creado_por")
            .prefetch_related("items__producto")
            .all()
            .order_by("-created_at")
        )
        
        # Filtrar por usuario para RRHH y SUPERVISOR (solo ven sus propias órdenes)
        if role in {ROLE_RRHH, ROLE_SUPERVISOR}:
            queryset = queryset.filter(creado_por=self.request.user)
        
        estado = self.request.query_params.get("estado")
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        if instance.estado != OrdenCompra.ESTADO_BORRADOR:
            raise PermissionDenied("Solo se pueden eliminar ordenes en estado BORRADOR.")
        instance.delete()

    @action(detail=True, methods=["post"], url_path="confirmar-recepcion")
    def confirmar_recepcion(self, request, pk=None):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)

        with transaction.atomic():
            orden = (
                OrdenCompra.objects.select_for_update()
                .select_related("proveedor")
                .prefetch_related("items__producto")
                .get(pk=pk)
            )
            if orden.estado != OrdenCompra.ESTADO_CONFIRMADA:
                raise PermissionDenied("Solo puedes confirmar la recepción de ordenes APROBADAS.")
            if orden.fecha_confirmacion:
                raise PermissionDenied("La recepción de esta orden ya fue confirmada.")

            if not orden.items.exists():
                raise PermissionDenied("No puedes confirmar una orden sin items.")

            for item in orden.items.all():
                producto = Producto.objects.select_for_update().get(pk=item.producto_id)
                stock_anterior = producto.stock_actual
                stock_resultante = stock_anterior + item.cantidad
                producto.stock_actual = stock_resultante
                producto.save(update_fields=["stock_actual", "updated_at"])

                MovimientoInventario.objects.create(
                    producto=producto,
                    tipo_movimiento=MovimientoInventario.TIPO_ENTRADA_OC,
                    cantidad=item.cantidad,
                    stock_anterior=stock_anterior,
                    stock_resultante=stock_resultante,
                    detalle=f"Recepcion de orden {orden.numero}",
                    orden_compra=orden,
                    creado_por=request.user,
                )

            orden.estado = OrdenCompra.ESTADO_CONFIRMADA
            orden.fecha_confirmacion = timezone.now()
            orden.save(update_fields=["estado", "fecha_confirmacion", "updated_at"])

        serializer = self.get_serializer(orden)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="aprobar")
    def aprobar(self, request, pk=None):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        with transaction.atomic():
            orden = (
                OrdenCompra.objects.select_for_update()
                .select_related("proveedor")
                .prefetch_related("items__producto")
                .get(pk=pk)
            )
            if orden.estado != OrdenCompra.ESTADO_BORRADOR:
                raise PermissionDenied("Solo puedes aprobar ordenes en estado BORRADOR.")
            if not orden.items.exists():
                raise PermissionDenied("No puedes aprobar una orden sin items.")
            orden.estado = OrdenCompra.ESTADO_CONFIRMADA
            orden.fecha_confirmacion = None
            orden.save(update_fields=["estado", "fecha_confirmacion", "updated_at"])
        return Response(self.get_serializer(orden).data)

    @action(detail=True, methods=["post"], url_path="cancelar")
    def cancelar(self, request, pk=None):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        orden = self.get_object()
        if orden.estado != OrdenCompra.ESTADO_BORRADOR:
            raise PermissionDenied("Solo puedes cancelar ordenes en BORRADOR.")
        orden.estado = OrdenCompra.ESTADO_CANCELADA
        orden.save(update_fields=["estado", "updated_at"])
        return Response(self.get_serializer(orden).data)


class MovimientoInventarioViewSet(RoleContextMixin, viewsets.ReadOnlyModelViewSet):
    queryset = (
        MovimientoInventario.objects.select_related("producto", "orden_compra", "creado_por")
        .all()
        .order_by("-created_at")
    )
    serializer_class = MovimientoInventarioSerializer

    def get_queryset(self):
        role = self.get_user_role()
        if role not in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR}:
            return MovimientoInventario.objects.none()

        queryset = (
            MovimientoInventario.objects.select_related("producto", "orden_compra", "creado_por")
            .all()
            .order_by("-created_at")
        )
        producto_id = self.request.query_params.get("producto")
        if producto_id:
            queryset = queryset.filter(producto_id=producto_id)
        return queryset


class TrabajadorViewSet(RoleContextMixin, viewsets.ModelViewSet):
    queryset = Trabajador.objects.all()
    serializer_class = TrabajadorSerializer

    def get_queryset(self):
        role = self.get_user_role()

        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH}:
            return Trabajador.objects.all()

        if role == ROLE_SUPERVISOR:
            supervisor = self.get_user_trabajador()
            if not supervisor or not supervisor.area:
                return Trabajador.objects.none()
            return Trabajador.objects.filter(area=supervisor.area)

        if role == ROLE_TRABAJADOR:
            trabajador = self.get_user_trabajador()
            if not trabajador:
                return Trabajador.objects.none()
            return Trabajador.objects.filter(pk=trabajador.pk)

        return Trabajador.objects.none()

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        current_trabajador = self.get_user_trabajador()
        if current_trabajador and serializer.instance.pk == current_trabajador.pk:
            raise PermissionDenied("No puedes modificar tus propios datos desde este modulo.")
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        current_trabajador = self.get_user_trabajador()
        if current_trabajador and instance.pk == current_trabajador.pk:
            raise PermissionDenied("No puedes eliminar tu propio registro de trabajador.")
        # Validación: No permitir eliminar trabajadores activos
        if instance.estado == 'ACTIVO':
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'estado': 'No se puede eliminar un trabajador que se encuentra ACTIVO. Primero debe cambiarse su estado a INACTIVO.'
            })
        instance.delete()


class DocumentoViewSet(RoleContextMixin, viewsets.ModelViewSet):
    serializer_class = DocumentoSerializer
    queryset = Documento.objects.select_related("trabajador").all().order_by("-created_at")

    def get_queryset(self):
        role = self.get_user_role()
        base_qs = Documento.objects.select_related("trabajador").all().order_by("-created_at")

        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH}:
            return base_qs

        if role == ROLE_TRABAJADOR:
            trabajador = self.get_user_trabajador()
            if not trabajador:
                return Documento.objects.none()
            return base_qs.filter(trabajador=trabajador)

        return Documento.objects.none()

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        current_trabajador = self.get_user_trabajador()
        if current_trabajador and serializer.instance.trabajador_id == current_trabajador.pk:
            raise PermissionDenied("No puedes modificar documentos asociados a tu propio perfil.")
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        current_trabajador = self.get_user_trabajador()
        if current_trabajador and instance.trabajador_id == current_trabajador.pk:
            raise PermissionDenied("No puedes eliminar documentos asociados a tu propio perfil.")
        instance.delete()


class DocumentoClienteViewSet(RoleContextMixin, viewsets.ModelViewSet):
    serializer_class = DocumentoClienteSerializer
    queryset = DocumentoCliente.objects.select_related("cliente", "cargado_por").all().order_by("-fecha_carga")

    def get_queryset(self):
        role = self.get_user_role()
        if role not in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR}:
            return DocumentoCliente.objects.none()

        queryset = DocumentoCliente.objects.select_related("cliente", "cargado_por").all().order_by("-fecha_carga")
        cliente_rut = self.request.query_params.get("cliente")
        if cliente_rut:
            queryset = queryset.filter(cliente_id=cliente_rut)
        return queryset

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        instance.delete()

    @action(detail=True, methods=["get"], url_path="descargar")
    def descargar(self, request, pk=None):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        documento = self.get_object()
        if not documento.archivo:
            raise Http404("Documento sin archivo asociado.")

        filename = documento.nombre_original or documento.archivo.name.rsplit("/", 1)[-1]
        return FileResponse(documento.archivo.open("rb"), as_attachment=True, filename=filename)


class MovimientoFinancieroClienteViewSet(RoleContextMixin, viewsets.ModelViewSet):
    serializer_class = MovimientoFinancieroClienteSerializer
    queryset = (
        MovimientoFinancieroCliente.objects.select_related("cliente", "creado_por")
        .all()
        .order_by("-fecha", "-created_at")
    )

    def get_queryset(self):
        role = self.get_user_role()
        if role not in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR}:
            return MovimientoFinancieroCliente.objects.none()

        queryset = (
            MovimientoFinancieroCliente.objects.select_related("cliente", "creado_por")
            .all()
            .order_by("-fecha", "-created_at")
        )
        cliente_rut = self.request.query_params.get("cliente")
        if cliente_rut:
            queryset = queryset.filter(cliente_id=cliente_rut)
        return queryset

    def perform_create(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save()

    def perform_update(self, serializer):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR)
        serializer.save()

    def perform_destroy(self, instance):
        self.require_roles(ROLE_ADMINISTRADOR, ROLE_RRHH)
        instance.delete()

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        queryset = self.get_queryset()
        totals = queryset.aggregate(
            total_ingresos=Coalesce(
                Sum("monto", filter=Q(tipo_movimiento=MovimientoFinancieroCliente.TIPO_INGRESO)),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            ),
            total_costos=Coalesce(
                Sum("monto", filter=Q(tipo_movimiento=MovimientoFinancieroCliente.TIPO_COSTO)),
                Value(0),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            ),
        )

        total_ingresos = totals["total_ingresos"] or Decimal("0")
        total_costos = totals["total_costos"] or Decimal("0")
        ganancia_neta = total_ingresos - total_costos

        return Response(
            {
                "cliente": request.query_params.get("cliente"),
                "total_ingresos": total_ingresos,
                "total_costos": total_costos,
                "ganancia_neta": ganancia_neta,
                "total_movimientos": queryset.count(),
            }
        )


class TareaViewSet(RoleContextMixin, viewsets.ModelViewSet):
    serializer_class = TareaSerializer
    queryset = (
        Tarea.objects.select_related("responsable", "cliente", "categoria", "tarea_padre")
        .all()
        .order_by("-fecha_creacion")
    )

    def get_queryset(self):
        role = self.get_user_role()
        base_qs = (
            Tarea.objects.select_related("responsable", "cliente", "categoria", "tarea_padre")
            .all()
            .order_by("-fecha_creacion")
        )

        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH}:
            qs = base_qs
        elif role == ROLE_SUPERVISOR:
            supervisor = self.get_user_trabajador()
            if not supervisor or not supervisor.area:
                return Tarea.objects.none()
            qs = base_qs.filter(responsable__area=supervisor.area)
        elif role == ROLE_TRABAJADOR:
            trabajador = self.get_user_trabajador()
            if not trabajador:
                return Tarea.objects.none()
            qs = base_qs.filter(responsable=trabajador)
        else:
            return Tarea.objects.none()

        # Filtro por cliente si se proporciona
        cliente_rut = self.request.query_params.get('cliente')
        if cliente_rut:
            qs = qs.filter(cliente__rut=cliente_rut)

        return qs

    def _supervisor_area(self):
        supervisor = self.get_user_trabajador()
        if not supervisor or not supervisor.area:
            raise PermissionDenied("Supervisor sin trabajador o area asociada.")
        return supervisor.area

    def _validate_supervisor_scope(self, responsable, tarea_padre=None):
        area = self._supervisor_area()

        if responsable.area != area:
            raise PermissionDenied("No puedes asignar tareas fuera de tu area.")

        if tarea_padre and tarea_padre.responsable.area != area:
            raise PermissionDenied("No puedes vincular subtareas fuera de tu area.")

    def _actor_label(self):
        trabajador = self.get_user_trabajador()
        if trabajador:
            return f"{trabajador.nombres} {trabajador.apellidos}".strip()
        return self.request.user.username

    def perform_create(self, serializer):
        role = self.get_user_role()

        if role == ROLE_TRABAJADOR:
            raise PermissionDenied("No tienes permisos para crear tareas.")

        if role == ROLE_SUPERVISOR:
            self._validate_supervisor_scope(
                serializer.validated_data["responsable"],
                serializer.validated_data.get("tarea_padre"),
            )

        if role not in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR}:
            raise PermissionDenied("No tienes permisos para crear tareas.")

        serializer.save(creado_por=self._actor_label())

    def perform_update(self, serializer):
        role = self.get_user_role()

        if role == ROLE_TRABAJADOR:
            allowed_fields = {"estado"}
            received_fields = set(serializer.validated_data.keys())
            if not received_fields:
                raise PermissionDenied("No hay cambios para aplicar.")
            if not received_fields.issubset(allowed_fields):
                raise PermissionDenied("Solo puedes actualizar el estado de tu tarea.")

            if serializer.validated_data.get("estado") != "COMPLETADA":
                raise PermissionDenied("Solo puedes marcar la tarea como COMPLETADA.")

            serializer.save()
            return

        current_task = serializer.instance

        if role == ROLE_SUPERVISOR:
            self._validate_supervisor_scope(
                current_task.responsable,
                current_task.tarea_padre,
            )

            responsible = serializer.validated_data.get("responsable", current_task.responsable)
            parent = serializer.validated_data.get("tarea_padre", current_task.tarea_padre)
            self._validate_supervisor_scope(responsible, parent)

        if role not in {ROLE_ADMINISTRADOR, ROLE_RRHH, ROLE_SUPERVISOR}:
            raise PermissionDenied("No tienes permisos para modificar tareas.")

        serializer.save()

    def perform_destroy(self, instance):
        role = self.get_user_role()

        if role in {ROLE_ADMINISTRADOR, ROLE_RRHH}:
            instance.delete()
            return

        if role == ROLE_SUPERVISOR:
            raise PermissionDenied("Supervisor no puede eliminar tareas.")

        raise PermissionDenied("No tienes permisos para eliminar tareas.")


# ==========================================
# VIEWSET DE EVENTOS Y CALENDARIO
# ==========================================

class EventoViewSet(RoleContextMixin, viewsets.ModelViewSet):
    serializer_class = EventoSerializer
    permission_classes = [IsAuthenticated]
    queryset = Evento.objects.all()

    def get_queryset(self):
        """
        Retorna eventos visibles para el usuario actual:
        - Eventos del SISTEMA: visible para todos
        - Eventos ASIGNADOS: visible para el usuario y trabajadores asignados
        - Eventos PERSONALES: solo visible para el creador
        """
        user = self.request.user
        role = self.get_user_role()
        trabajador = self.get_user_trabajador()

        # Eventos del sistema (visibles para todos)
        sistema_events = Evento.objects.filter(tipo=Evento.TIPO_SISTEMA)

        # Eventos asignados al usuario o su trabajador
        asignado_events = Evento.objects.filter(
            tipo=Evento.TIPO_ASIGNADO
        ).filter(Q(creado_por=user) | Q(trabajadores_asignados=trabajador))

        # Eventos personales solo del usuario
        personal_events = Evento.objects.filter(
            tipo=Evento.TIPO_PERSONAL,
            creado_por=user,
            visibilidad_privada=True
        )

        # Combinar queries
        queryset = (
            sistema_events | asignado_events | personal_events
        ).select_related(
            'creado_por', 'tarea_relacionada'
        ).prefetch_related(
            'trabajadores_asignados'
        ).distinct().order_by('fecha', 'hora_inicio')

        return queryset

    def perform_create(self, serializer):
        """El creador siempre es el usuario autenticado"""
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        """Solo el creador o administrador pueden actualizar"""
        user = self.request.user
        instance = self.get_object()
        role = self.get_user_role()

        if instance.creado_por != user and role != ROLE_ADMINISTRADOR:
            raise PermissionDenied(
                "Solo el creador o un administrador puede actualizar este evento."
            )

        serializer.save()

    def perform_destroy(self, instance):
        """Solo el creador o administrador pueden eliminar"""
        user = self.request.user
        role = self.get_user_role()

        if instance.creado_por != user and role != ROLE_ADMINISTRADOR:
            raise PermissionDenied(
                "Solo el creador o un administrador puede eliminar este evento."
            )

        instance.delete()

    @action(detail=False, methods=['get'])
    def mis_eventos(self, request):
        """Retorna solo los eventos del usuario actual"""
        user = request.user
        trabajador = self.get_user_trabajador()

        eventos = Evento.objects.filter(
            Q(creado_por=user) |
            (Q(tipo=Evento.TIPO_ASIGNADO) & Q(trabajadores_asignados=trabajador)) |
            Q(tipo=Evento.TIPO_SISTEMA)
        ).select_related(
            'creado_por', 'tarea_relacionada'
        ).prefetch_related(
            'trabajadores_asignados'
        ).distinct().order_by('fecha', 'hora_inicio')

        serializer = self.get_serializer(eventos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def por_fecha(self, request):
        """
        Retorna eventos filtrados por fecha.
        Query params: fecha (YYYY-MM-DD) o rango: fecha_desde, fecha_hasta
        """
        from datetime import datetime

        fecha_str = request.query_params.get('fecha')
        fecha_desde_str = request.query_params.get('fecha_desde')
        fecha_hasta_str = request.query_params.get('fecha_hasta')

        queryset = self.get_queryset()

        if fecha_str:
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha=fecha)
            except ValueError:
                return Response(
                    {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                    status=400
                )

        if fecha_desde_str and fecha_hasta_str:
            try:
                fecha_desde = datetime.strptime(fecha_desde_str, '%Y-%m-%d').date()
                fecha_hasta = datetime.strptime(fecha_hasta_str, '%Y-%m-%d').date()
                queryset = queryset.filter(fecha__range=[fecha_desde, fecha_hasta])
            except ValueError:
                return Response(
                    {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                    status=400
                )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def por_tipo(self, request):
        """Retorna eventos filtrados por tipo (SISTEMA, ASIGNADO, PERSONAL)"""
        tipo = request.query_params.get('tipo')

        if tipo not in [Evento.TIPO_SISTEMA, Evento.TIPO_ASIGNADO, Evento.TIPO_PERSONAL]:
            return Response(
                {'error': f'Tipo de evento inválido. Opciones: {Evento.TIPO_SISTEMA}, {Evento.TIPO_ASIGNADO}, {Evento.TIPO_PERSONAL}'},
                status=400
            )

        queryset = self.get_queryset().filter(tipo=tipo)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
