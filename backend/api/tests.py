import shutil
import tempfile

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import (
    CategoriaProducto,
    Cliente,
    Herramienta,
    HerramientaAsignacion,
    MovimientoFinancieroCliente,
    MovimientoInventario,
    PerfilUsuario,
    Producto,
    Proveedor,
    Trabajador,
)
from .roles import ROLE_ADMINISTRADOR


@override_settings(MEDIA_ROOT=tempfile.gettempdir())
class ClienteFinanzasYDocumentosTests(APITestCase):
    def setUp(self):
        self.media_dir = tempfile.mkdtemp(prefix="serkan_tests_")
        self.override_media = override_settings(MEDIA_ROOT=self.media_dir)
        self.override_media.enable()

        self.user = User.objects.create_user(username="admin-test", password="pass123")
        PerfilUsuario.objects.create(user=self.user, rol=ROLE_ADMINISTRADOR)
        self.client.force_authenticate(user=self.user)

        self.cliente = Cliente.objects.create(
            rut="11.111.111-1",
            nombre="Cliente QA",
            razon_social="Cliente QA SPA",
        )

    def tearDown(self):
        self.override_media.disable()
        shutil.rmtree(self.media_dir, ignore_errors=True)

    def test_resumen_financiero_por_cliente(self):
        MovimientoFinancieroCliente.objects.create(
            cliente=self.cliente,
            tipo_movimiento=MovimientoFinancieroCliente.TIPO_INGRESO,
            monto="1500.00",
            fecha="2026-02-01",
            creado_por=self.user,
        )
        MovimientoFinancieroCliente.objects.create(
            cliente=self.cliente,
            tipo_movimiento=MovimientoFinancieroCliente.TIPO_COSTO,
            monto="400.00",
            fecha="2026-02-02",
            creado_por=self.user,
        )

        response = self.client.get(f"/api/movimientos-financieros/resumen/?cliente={self.cliente.rut}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data["total_ingresos"]), "1500.00")
        self.assertEqual(str(response.data["total_costos"]), "400.00")
        self.assertEqual(str(response.data["ganancia_neta"]), "1100.00")
        self.assertEqual(response.data["total_movimientos"], 2)

    def test_upload_documento_cliente_guarda_metadata(self):
        archivo = SimpleUploadedFile("contrato.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        payload = {"cliente": self.cliente.rut, "archivo": archivo, "descripcion": "Contrato marco"}

        response = self.client.post("/api/documentos-cliente/", data=payload, format="multipart")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["extension"], "pdf")
        self.assertEqual(response.data["nombre_original"], "contrato.pdf")
        self.assertGreater(response.data["tamano_bytes"], 0)

    def test_upload_documento_cliente_rechaza_archivo_muy_grande(self):
        archivo = SimpleUploadedFile(
            "masivo.pdf",
            b"x" * (10 * 1024 * 1024 + 1),
            content_type="application/pdf",
        )
        payload = {"cliente": self.cliente.rut, "archivo": archivo}

        response = self.client.post("/api/documentos-cliente/", data=payload, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertIn("archivo", response.data)


class InventarioTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="admin-inv", password="pass123")
        PerfilUsuario.objects.create(user=self.user, rol=ROLE_ADMINISTRADOR)
        self.client.force_authenticate(user=self.user)

        self.categoria = CategoriaProducto.objects.create(nombre="Ferreteria")
        self.proveedor = Proveedor.objects.create(
            nombre="Proveedor Uno",
            rut="76.111.222-3",
            direccion="Av Siempre Viva 123",
            telefono="+56912345678",
            correo="proveedor@demo.cl",
        )
        self.producto = Producto.objects.create(
            sku="SKU-001",
            nombre="Perno 1/4",
            categoria=self.categoria,
            tipo_producto=Producto.TIPO_COMPRADO,
            stock_actual=2,
            stock_minimo=5,
        )
        self.trabajador = Trabajador.objects.create(
            rut="22.222.222-2",
            nombres="Juan",
            apellidos="Perez",
            area="Bodega",
            cargo="Operario",
            fecha_ingreso="2026-01-10",
            correo_empresarial="juan@serkan.cl",
        )
        self.herramienta = Herramienta.objects.create(
            codigo="H-001",
            nombre="Taladro",
            tipo_herramienta=Herramienta.TIPO_CLIENTE,
            stock_total=4,
            stock_disponible=4,
        )

    def test_filtro_productos_bajo_stock(self):
        response = self.client.get("/api/productos/?bajo_stock=true")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["sku"], "SKU-001")

    def test_confirmar_recepcion_orden_actualiza_stock_y_traza(self):
        payload = {
            "nombre": "Compra semanal ferreteria",
            "proveedor": self.proveedor.id,
            "fecha_orden": "2026-02-28",
            "observacion": "Compra semanal",
            "items": [
                {
                    "producto": self.producto.id,
                    "cantidad": 10,
                    "costo_unitario": "1500.00",
                }
            ],
        }
        create_response = self.client.post("/api/ordenes-compra/", data=payload, format="json")

        self.assertEqual(create_response.status_code, 201)
        orden_id = create_response.data["id"]

        confirm_response = self.client.post(f"/api/ordenes-compra/{orden_id}/confirmar-recepcion/")
        self.assertEqual(confirm_response.status_code, 200)
        self.assertEqual(confirm_response.data["estado"], "CONFIRMADA")

        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 12)

        movimiento = MovimientoInventario.objects.get(orden_compra_id=orden_id, producto=self.producto)
        self.assertEqual(movimiento.cantidad, 10)
        self.assertEqual(movimiento.stock_anterior, 2)
        self.assertEqual(movimiento.stock_resultante, 12)

    def test_descontar_stock_producto_no_permite_negativo(self):
        response = self.client.post(f"/api/productos/{self.producto.id}/descontar-stock/", data={"cantidad": 5})
        self.assertEqual(response.status_code, 400)

    def test_herramienta_cliente_sin_cliente_permitida(self):
        payload = {
            "codigo": "H-002",
            "nombre": "Pulidora",
            "tipo_herramienta": "CLIENTE",
            "estado": "DISPONIBLE",
            "stock_total": 2,
            "stock_disponible": 2,
        }
        response = self.client.post("/api/herramientas/", data=payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data.get("cliente"))

    def test_asignar_herramienta_a_trabajador_descuenta_stock(self):
        payload = {
            "trabajador": self.trabajador.rut,
            "cantidad": 2,
            "observacion": "Entrega inicial",
        }
        response = self.client.post(f"/api/herramientas/{self.herramienta.id}/asignar/", data=payload, format="json")
        self.assertEqual(response.status_code, 201)

        self.herramienta.refresh_from_db()
        self.assertEqual(self.herramienta.stock_disponible, 2)
        self.assertEqual(self.herramienta.estado, "ASIGNADA")

        asignacion = HerramientaAsignacion.objects.get(herramienta=self.herramienta)
        self.assertEqual(asignacion.cantidad, 2)
