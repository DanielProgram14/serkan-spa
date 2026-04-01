import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Grid,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import {
  Add,
  AssignmentInd,
  DeleteOutline,
  EditOutlined,
  Info,
  Preview,
  RemoveCircleOutline,
  Replay,
  ShoppingCart,
  WarningAmber,
  CheckCircle,
  Schedule,
  Warehouse,
  Handyman,
  Timeline,
  Person,
} from '@mui/icons-material';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

type OrdenEstado = 'BORRADOR' | 'CONFIRMADA' | 'CANCELADA';
type ToolTipo = 'INTERNO' | 'CLIENTE';
type ToolEstado = 'DISPONIBLE' | 'ASIGNADA' | 'MANTENIMIENTO' | 'BAJA';

interface Categoria { id: number; nombre: string; }
interface Proveedor { id: number; nombre: string; rut: string; direccion: string; telefono: string; correo: string; }
interface Cliente { rut: string; razon_social: string; }
interface Trabajador { rut: string; nombres: string; apellidos: string; }
interface Producto {
  id: number;
  sku: string;
  nombre: string;
  categoria: number | null;
  categoria_nombre?: string;
  tipo_producto: 'FABRICADO' | 'COMPRADO';
  descripcion?: string | null;
  stock_actual: number;
  stock_minimo: number;
  unidad_medida: string;
  activo: boolean;
}
interface Herramienta {
  id: number;
  codigo: string;
  nombre: string;
  tipo_herramienta: ToolTipo;
  estado: ToolEstado;
  cliente: string | null;
  cliente_nombre?: string | null;
  stock_total: number;
  stock_disponible: number;
  fecha_asignacion?: string | null;
  observacion?: string | null;
}
interface HerramientaAsignacion {
  id: number;
  herramienta: number;
  trabajador: string;
  trabajador_nombre: string;
  cantidad: number;
  estado: 'ACTIVA' | 'DEVUELTA';
  fecha_asignacion: string;
}
interface OrdenItem { id: number; producto_nombre?: string; cantidad: number; costo_unitario: string; total_linea: string; }
interface Orden {
  id: number;
  numero: string;
  nombre: string;
  proveedor_nombre: string;
  fecha_orden: string;
  estado: OrdenEstado;
  estado_label?: string;
  total_orden: string;
  observacion?: string | null;
  items: OrdenItem[];
  fecha_confirmacion?: string | null;
}
interface Movimiento {
  id: number;
  producto_nombre: string;
  tipo_movimiento: string;
  cantidad: number;
  stock_anterior: number;
  stock_resultante: number;
  orden_compra_numero?: string | null;
  created_at: string;
}

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const todayISO = () => new Date().toISOString().split('T')[0];

const emptyProductForm = () => ({ sku: '', nombre: '', categoria: '', tipo_producto: 'COMPRADO' as 'FABRICADO' | 'COMPRADO', descripcion: '', stock_actual: '0', stock_minimo: '0', unidad_medida: 'UNIDAD' });
const emptyToolForm = () => ({ codigo: '', nombre: '', tipo_herramienta: 'INTERNO' as ToolTipo, estado: 'DISPONIBLE' as ToolEstado, cliente: '', stock_total: '1', stock_disponible: '1', fecha_asignacion: '', observacion: '' });
const emptyProviderForm = () => ({ nombre: '', rut: '', direccion: '', telefono: '', correo: '' });
const emptyOrderForm = () => ({ nombre: '', proveedor: '', fecha_orden: todayISO(), observacion: '' });
const emptyAssignForm = () => ({ trabajador: '', cliente: '', cantidad: '1', observacion: '' });
const emptyDiscountForm = () => ({ cantidad: '1', detalle: '' });

const Inventario = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const canManage = ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'].includes(user?.rol ?? '');
  const canConfirm = ['ADMINISTRADOR', 'RRHH'].includes(user?.rol ?? '');
  const canEdit = ['ADMINISTRADOR', 'RRHH'].includes(user?.rol ?? ''); // Solo Admin y RRHH pueden editar
  const canViewMovements = user?.rol !== 'SUPERVISOR'; // Supervisor no ve movimientos
  const canDeleteProveedor = ['ADMINISTRADOR', 'RRHH'].includes(user?.rol ?? '');

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [herramientas, setHerramientas] = useState<Herramienta[]>([]);
  const [asignaciones, setAsignaciones] = useState<HerramientaAsignacion[]>([]);
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  const [qProducto, setQProducto] = useState('');
  const [fCategoria, setFCategoria] = useState('');
  const [qHerramienta, setQHerramienta] = useState('');

  const [openProducto, setOpenProducto] = useState(false);
  const [openHerramienta, setOpenHerramienta] = useState(false);
  const [openProveedor, setOpenProveedor] = useState(false);
  const [openOrden, setOpenOrden] = useState(false);
  const [openCategoria, setOpenCategoria] = useState(false);
  const [openDetalleProducto, setOpenDetalleProducto] = useState(false);
  const [openDetalleHerramienta, setOpenDetalleHerramienta] = useState(false);
  const [openDetalleOrden, setOpenDetalleOrden] = useState(false);
  const [openDescuento, setOpenDescuento] = useState(false);
  const [openAsignar, setOpenAsignar] = useState(false);

  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [editingHerramienta, setEditingHerramienta] = useState<Herramienta | null>(null);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [selectedHerramienta, setSelectedHerramienta] = useState<Herramienta | null>(null);
  const [selectedOrden, setSelectedOrden] = useState<Orden | null>(null);

  const [productForm, setProductForm] = useState(emptyProductForm());
  const [toolForm, setToolForm] = useState(emptyToolForm());
  const [providerForm, setProviderForm] = useState(emptyProviderForm());
  const [orderForm, setOrderForm] = useState(emptyOrderForm());
  const [orderItems, setOrderItems] = useState<Array<{ producto: string; cantidad: string; costo_unitario: string }>>([{ producto: '', cantidad: '1', costo_unitario: '0' }]);
  const [categoriaForm, setCategoriaForm] = useState<{ nombre: string }>({ nombre: '' });
  const [assignForm, setAssignForm] = useState(emptyAssignForm());
  const [discountForm, setDiscountForm] = useState(emptyDiscountForm());

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({ open: false, message: '', severity: 'success' });
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; description: string; onConfirm?: () => Promise<void> | void }>({ open: false, title: '', description: '' });

  const showSnack = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => setSnack({ open: true, message, severity });

  const getErrorMessage = (err: unknown, fallback: string) => {
    const e = err as { response?: { data?: Record<string, unknown> | string } };
    const data = e?.response?.data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const first = Object.values(data)[0];
      if (Array.isArray(first) && first.length) return String(first[0]);
      if (typeof first === 'string') return first;
    }
    return fallback;
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, b, c, d, e, f, g, h, i] = await Promise.all([
        api.get('/categorias-producto/'),
        api.get('/proveedores/'),
        api.get('/clientes/'),
        api.get('/trabajadores/'),
        api.get('/productos/'),
        api.get('/herramientas/'),
        api.get('/herramientas-asignaciones/'),
        api.get('/ordenes-compra/'),
        api.get('/movimientos-inventario/'),
      ]);
      setCategorias(a.data); setProveedores(b.data); setClientes(c.data); setTrabajadores(d.data);
      setProductos(e.data); setHerramientas(f.data); setAsignaciones(g.data); setOrdenes(h.data); setMovimientos(i.data);
    } catch (err) {
      console.error(err);
      setError('No fue posible cargar inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const q = qProducto.toLowerCase();
      const okQ = p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const okC = fCategoria ? String(p.categoria ?? '') === fCategoria : true;
      return okQ && okC;
    });
  }, [productos, qProducto, fCategoria]);

  const herramientasFiltradas = useMemo(() => {
    const q = qHerramienta.toLowerCase();
    return herramientas.filter((h) => h.codigo.toLowerCase().includes(q) || h.nombre.toLowerCase().includes(q));
  }, [herramientas, qHerramienta]);

  const totalProductos = useMemo(() => productos.length, [productos]);
  const lowStockCount = useMemo(() => productos.filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo)).length, [productos]);
  const herramientasAsignadasCount = useMemo(() => herramientas.filter((h) => h.estado === 'ASIGNADA').length, [herramientas]);
  const ordenesPendientesCount = useMemo(() => ordenes.filter((o) => o.estado === 'BORRADOR' || (o.estado === 'CONFIRMADA' && !o.fecha_confirmacion)).length, [ordenes]);

  const asignacionesVisibles = useMemo(() => {
    if (user?.rol !== 'TRABAJADOR' || !user?.trabajador_rut) return asignaciones;
    return asignaciones.filter((a) => a.trabajador === user.trabajador_rut);
  }, [asignaciones, user]);

  const asignacionesHerramientaSeleccionada = useMemo(
    () => asignacionesVisibles.filter((a) => a.herramienta === selectedHerramienta?.id),
    [asignacionesVisibles, selectedHerramienta]
  );

  const handleConfirm = async () => {
    if (confirm.onConfirm) await confirm.onConfirm();
    setConfirm({ open: false, title: '', description: '' });
  };

  const openCreateProducto = () => { setEditingProducto(null); setProductForm(emptyProductForm()); setOpenProducto(true); };
  const openEditProducto = (row: Producto) => {
    setEditingProducto(row);
    setProductForm({ sku: row.sku, nombre: row.nombre, categoria: row.categoria ? String(row.categoria) : '', tipo_producto: row.tipo_producto, descripcion: row.descripcion || '', stock_actual: String(row.stock_actual), stock_minimo: String(row.stock_minimo), unidad_medida: row.unidad_medida });
    setOpenProducto(true);
  };

  const saveProducto = async () => {
    if (!canManage) return;
    try {
      const payload = { sku: productForm.sku, nombre: productForm.nombre, categoria: productForm.categoria ? Number(productForm.categoria) : null, tipo_producto: productForm.tipo_producto, descripcion: productForm.descripcion || null, stock_actual: Number(productForm.stock_actual), stock_minimo: Number(productForm.stock_minimo), unidad_medida: productForm.unidad_medida, activo: true };
      if (editingProducto) {
        await api.put(`/productos/${editingProducto.id}/`, payload);
        showSnack('Producto actualizado correctamente.');
      } else {
        await api.post('/productos/', payload);
        showSnack('Producto creado correctamente.');
      }
      setOpenProducto(false);
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo guardar el producto.'), 'error');
    }
  };

  const deleteProducto = async (id: number) => {
    try {
      await api.delete(`/productos/${id}/`);
      showSnack('Producto eliminado correctamente.');
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo eliminar el producto.'), 'error');
    }
  };

  const descontarStock = async () => {
    if (!selectedProducto) return;
    try {
      await api.post(`/productos/${selectedProducto.id}/descontar-stock/`, { cantidad: Number(discountForm.cantidad), detalle: discountForm.detalle || null });
      showSnack('Stock descontado correctamente.');
      setOpenDescuento(false);
      setDiscountForm(emptyDiscountForm());
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo descontar stock.'), 'error');
    }
  };

  const openCreateHerramienta = () => { setEditingHerramienta(null); setToolForm(emptyToolForm()); setOpenHerramienta(true); };
  const openEditHerramienta = (row: Herramienta) => {
    setEditingHerramienta(row);
    setToolForm({ codigo: row.codigo, nombre: row.nombre, tipo_herramienta: row.tipo_herramienta, estado: row.estado, cliente: row.cliente || '', stock_total: String(row.stock_total), stock_disponible: String(row.stock_disponible), fecha_asignacion: row.fecha_asignacion || '', observacion: row.observacion || '' });
    setOpenHerramienta(true);
  };

  const openCreateProveedor = () => {
    if (!canManage) return;
    setEditingProveedor(null);
    setProviderForm(emptyProviderForm());
    setOpenProveedor(true);
  };

  const openEditProveedor = (row: Proveedor) => {
    if (!canManage) return;
    setEditingProveedor(row);
    setProviderForm({ nombre: row.nombre, rut: row.rut, direccion: row.direccion, telefono: row.telefono, correo: row.correo });
    setOpenProveedor(true);
  };

  const closeProveedorDialog = () => {
    setOpenProveedor(false);
    setEditingProveedor(null);
    setProviderForm(emptyProviderForm());
  };

  const saveHerramienta = async () => {
    if (!canManage) return;
    try {
      const payload = { codigo: toolForm.codigo, nombre: toolForm.nombre, tipo_herramienta: toolForm.tipo_herramienta, estado: toolForm.estado, cliente: toolForm.cliente || null, stock_total: Number(toolForm.stock_total), stock_disponible: Number(toolForm.stock_disponible), fecha_asignacion: toolForm.fecha_asignacion || null, observacion: toolForm.observacion || null };
      if (editingHerramienta) {
        await api.put(`/herramientas/${editingHerramienta.id}/`, payload);
        showSnack('Herramienta actualizada correctamente.');
      } else {
        await api.post('/herramientas/', payload);
        showSnack('Herramienta creada correctamente.');
      }
      setOpenHerramienta(false);
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo guardar la herramienta.'), 'error');
    }
  };

  const deleteHerramienta = async (id: number) => {
    try {
      await api.delete(`/herramientas/${id}/`);
      showSnack('Herramienta eliminada correctamente.');
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo eliminar la herramienta.'), 'error');
    }
  };

  const asignarHerramienta = async () => {
    if (!selectedHerramienta) return;
    try {
      await api.post(`/herramientas/${selectedHerramienta.id}/asignar/`, { trabajador: assignForm.trabajador, cliente: assignForm.cliente || null, cantidad: Number(assignForm.cantidad), observacion: assignForm.observacion || null });
      showSnack('Herramienta asignada correctamente.');
      setOpenAsignar(false);
      setAssignForm(emptyAssignForm());
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo asignar la herramienta.'), 'error');
    }
  };

  const devolverAsignacion = async (id: number) => {
    try {
      await api.post(`/herramientas-asignaciones/${id}/devolver/`);
      showSnack('Devolucion registrada correctamente.');
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo devolver la asignacion.'), 'error');
    }
  };

  const saveProveedor = async () => {
    if (!canManage) return;
    try {
      if (editingProveedor) {
        await api.put(`/proveedores/${editingProveedor.id}/`, providerForm);
        showSnack('Proveedor actualizado correctamente.');
      } else {
        await api.post('/proveedores/', providerForm);
        showSnack('Proveedor creado correctamente.');
      }
      setOpenProveedor(false);
      setEditingProveedor(null);
      setProviderForm(emptyProviderForm());
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo guardar el proveedor.'), 'error');
    }
  };

  const deleteProveedor = async (id: number) => {
    if (!canDeleteProveedor) return;
    try {
      await api.delete(`/proveedores/${id}/`);
      showSnack('Proveedor eliminado correctamente.');
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo eliminar el proveedor.'), 'error');
    }
  };

  const saveCategoria = async () => {
    if (!canManage) return;
    try {
      await api.post('/categorias-producto/', { nombre: categoriaForm.nombre });
      showSnack('Categoría creada correctamente.');
      setOpenCategoria(false);
      setCategoriaForm({ nombre: '' });
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo crear la categoría.'), 'error');
    }
  };

  const saveOrden = async () => {
    if (!canManage) return;
    try {
      await api.post('/ordenes-compra/', { nombre: orderForm.nombre, proveedor: Number(orderForm.proveedor), fecha_orden: orderForm.fecha_orden, observacion: orderForm.observacion || null, items: orderItems.map((i) => ({ producto: Number(i.producto), cantidad: Number(i.cantidad), costo_unitario: i.costo_unitario })) });
      showSnack('Orden creada correctamente.');
      setOpenOrden(false);
      setOrderForm(emptyOrderForm());
      setOrderItems([{ producto: '', cantidad: '1', costo_unitario: '0' }]);
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo crear la orden.'), 'error');
    }
  };

  const aprobarOrden = async (id: number) => {
    try {
      await api.post(`/ordenes-compra/${id}/aprobar/`);
      showSnack('Orden aprobada. Confirma la recepción cuando lleguen los productos.');
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo aprobar la orden.'), 'error');
    }
  };

  const confirmarRecepcionOrden = async (id: number) => {
    try {
      await api.post(`/ordenes-compra/${id}/confirmar-recepcion/`);
      showSnack('Recepción confirmada y stock actualizado.');
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo confirmar la recepción.'), 'error');
    }
  };

  const cancelarOrden = async (id: number) => {
    try {
      await api.post(`/ordenes-compra/${id}/cancelar/`);
      showSnack('Orden cancelada correctamente.');
      await load();
    } catch (err) {
      showSnack(getErrorMessage(err, 'No se pudo cancelar la orden.'), 'error');
    }
  };

  const productColumns: GridColDef[] = [
    { field: 'sku', headerName: 'SKU', width: 120 },
    { field: 'nombre', headerName: 'PRODUCTO', width: 210 },
    { field: 'categoria_nombre', headerName: 'CATEGORIA', width: 170, valueGetter: (_, row) => row.categoria_nombre || '-' },
    { field: 'tipo_producto', headerName: 'TIPO', width: 130 },
    { field: 'stock_actual', headerName: 'STOCK DISPONIBLE', width: 170, renderCell: (p) => <Typography fontWeight={700} color={p.row.stock_actual <= p.row.stock_minimo ? 'warning.main' : 'text.primary'}>{p.row.stock_actual} {p.row.unidad_medida}</Typography> },
    { field: 'stock_minimo', headerName: 'MINIMO', width: 100 },
    { field: 'alerta', headerName: 'ALERTA', width: 110, sortable: false, renderCell: (p) => p.row.stock_actual <= p.row.stock_minimo ? <Chip size="small" color="warning" label="BAJO" /> : <Chip size="small" color="success" label="OK" /> },
    {
      field: 'acciones',
      headerName: 'ACCIONES',
      width: 240,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Ver detalles"><IconButton size="small" color="info" onClick={() => { setSelectedProducto(p.row as Producto); setOpenDetalleProducto(true); }}><Preview fontSize="small" /></IconButton></Tooltip>
          {canManage && <Tooltip title="Actualizar stock"><IconButton size="small" color="success" onClick={() => { setSelectedProducto(p.row as Producto); setOpenDescuento(true); }}><RemoveCircleOutline fontSize="small" /></IconButton></Tooltip>}
          {canEdit && <Tooltip title="Editar producto"><IconButton size="small" color="primary" onClick={() => openEditProducto(p.row as Producto)}><EditOutlined fontSize="small" /></IconButton></Tooltip>}
          {canEdit && <Tooltip title="Eliminar producto"><IconButton size="small" color="error" onClick={() => setConfirm({ open: true, title: 'Eliminar producto', description: `Se eliminara el producto ${p.row.nombre}. Esta accion no se puede deshacer.`, onConfirm: async () => deleteProducto(p.row.id) })}><DeleteOutline fontSize="small" /></IconButton></Tooltip>}
        </Stack>
      ),
    },
  ];

  const toolColumns: GridColDef[] = [
    { field: 'codigo', headerName: 'CODIGO', width: 120 },
    { field: 'nombre', headerName: 'HERRAMIENTA', width: 220 },
    { field: 'tipo_herramienta', headerName: 'TIPO', width: 130 },
    { field: 'estado', headerName: 'ESTADO', width: 140 },
    { field: 'stock_disponible', headerName: 'DISPONIBLE', width: 130, renderCell: (p) => <Typography fontWeight={700}>{p.row.stock_disponible} / {p.row.stock_total}</Typography> },
    { field: 'cliente_nombre', headerName: 'CLIENTE', width: 190, valueGetter: (_, row) => row.cliente_nombre || '-' },
    {
      field: 'acciones',
      headerName: 'ACCIONES',
      width: 250,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Ver detalles"><IconButton size="small" color="info" onClick={() => { setSelectedHerramienta(p.row as Herramienta); setOpenDetalleHerramienta(true); }}><Preview fontSize="small" /></IconButton></Tooltip>
          {canManage && p.row.stock_disponible > 0 && <Tooltip title="Asignar a trabajador"><IconButton size="small" color="success" onClick={() => { setSelectedHerramienta(p.row as Herramienta); setOpenAsignar(true); }}><AssignmentInd fontSize="small" /></IconButton></Tooltip>}
          {canEdit && <Tooltip title="Editar herramienta"><IconButton size="small" color="primary" onClick={() => openEditHerramienta(p.row as Herramienta)}><EditOutlined fontSize="small" /></IconButton></Tooltip>}
          {canEdit && <Tooltip title="Eliminar herramienta"><IconButton size="small" color="error" onClick={() => setConfirm({ open: true, title: 'Eliminar herramienta', description: `Se eliminara la herramienta ${p.row.nombre}.`, onConfirm: async () => deleteHerramienta(p.row.id) })}><DeleteOutline fontSize="small" /></IconButton></Tooltip>}
        </Stack>
      ),
    },
  ];
  const orderColumns: GridColDef[] = [
    { field: 'numero', headerName: 'ORDEN', width: 150 },
    { field: 'nombre', headerName: 'NOMBRE ORDEN', width: 220 },
    { field: 'proveedor_nombre', headerName: 'PROVEEDOR', width: 200 },
    { field: 'fecha_orden', headerName: 'FECHA', width: 120 },
    {
      field: 'estado',
      headerName: 'ESTADO',
      width: 150,
      renderCell: (p) => {
        if (p.row.estado === 'CANCELADA') return <Chip size="small" color="error" label="Cancelada" />;
        if (p.row.estado === 'CONFIRMADA') {
          if (p.row.fecha_confirmacion) return <Chip size="small" color="success" label="Recibida" />;
          return <Chip size="small" color="info" label="Aprobada" />;
        }
        return <Chip size="small" color="warning" label="Pendiente" />;
      },
    },
    { field: 'total_orden', headerName: 'TOTAL', width: 130, renderCell: (p) => money.format(Number(p.value)) },
    {
      field: "acciones",
      headerName: "ACCIONES",
      width: 320,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Tooltip title="Ver detalles">
            <IconButton size="small" color="info" onClick={() => { setSelectedOrden(p.row as Orden); setOpenDetalleOrden(true); }}>
              <Preview fontSize="small" />
            </IconButton>
          </Tooltip>
          {canConfirm && p.row.estado === "BORRADOR" && (
            <>
              <Button size="small" variant="outlined" color="success" onClick={() => void aprobarOrden(p.row.id)}>
                Aprobar orden
              </Button>
              <Button size="small" variant="outlined" color="error" onClick={() => void cancelarOrden(p.row.id)}>
                Cancelar
              </Button>
            </>
          )}
          {canConfirm && p.row.estado === "CONFIRMADA" && !p.row.fecha_confirmacion && (
            <Button size="small" variant="contained" color="success" onClick={() => void confirmarRecepcionOrden(p.row.id)}>
              Confirmar recepción
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  const proveedorColumns: GridColDef[] = [
    { field: 'nombre', headerName: 'NOMBRE', width: 220 },
    { field: 'rut', headerName: 'RUT', width: 150 },
    { field: 'direccion', headerName: 'DIRECCION', width: 220 },
    { field: 'telefono', headerName: 'TELEFONO', width: 140 },
    { field: 'correo', headerName: 'CORREO', width: 220 },
    {
      field: 'acciones',
      headerName: 'ACCIONES',
      width: 150,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          {canManage && <Tooltip title="Editar proveedor"><IconButton size="small" color="primary" onClick={() => openEditProveedor(p.row as Proveedor)}><EditOutlined fontSize="small" /></IconButton></Tooltip>}
          {canDeleteProveedor && <Tooltip title="Eliminar proveedor"><IconButton size="small" color="error" onClick={() => setConfirm({ open: true, title: 'Eliminar proveedor', description: `Se eliminara el proveedor ${p.row.nombre}.`, onConfirm: async () => deleteProveedor(p.row.id) })}><DeleteOutline fontSize="small" /></IconButton></Tooltip>}
        </Stack>
      ),
    },
  ];

  const MOV_TIPO_LABEL: Record<string, string> = {
    ENTRADA_OC: 'Entrada (OC)',
    AJUSTE_POSITIVO: 'Ajuste (+)',
    AJUSTE_NEGATIVO: 'Ajuste (-)',
  };

  const movColumns: GridColDef[] = [
    { field: 'producto_nombre', headerName: 'PRODUCTO/HERRAMIENTA', width: 210 },
    { field: 'tipo_movimiento', headerName: 'TIPO', width: 150, renderCell: (p) => MOV_TIPO_LABEL[p.value as string] || p.value },
    { field: 'cantidad', headerName: 'CANTIDAD', width: 110 },
    { field: 'detalle', headerName: 'MOTIVO / DETALLE', width: 220, valueGetter: (_, row) => row.detalle || '-' },
    { field: 'creado_por_username', headerName: 'USUARIO', width: 140, valueGetter: (_, row) => row.creado_por_username || '-' },
    { field: 'stock_anterior', headerName: 'STOCK ANT', width: 110 },
    { field: 'stock_resultante', headerName: 'STOCK NUEVO', width: 120 },
    { field: 'orden_compra_numero', headerName: 'ORDEN', width: 150, valueGetter: (_, row) => row.orden_compra_numero || '-' },
    { field: 'created_at', headerName: 'FECHA', width: 190, renderCell: (p) => {
      const d = new Date(p.value as string);
      return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
    } },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Inventario</Typography>
          <Typography variant="body2" color="text.secondary">Busqueda, detalle, stock y trazabilidad.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<Replay />} onClick={() => void load()}>Actualizar</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Panel de Métricas (KPIs) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#eff6ff', borderLeft: '4px solid #3b82f6', height: '100%', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption" fontWeight="bold">TOTAL PRODUCTOS</Typography>
                  <Typography variant="h4" fontWeight="900" color="#1e3a8a">{totalProductos}</Typography>
                </Box>
                <Warehouse fontSize="large" sx={{ color: '#60a5fa' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: lowStockCount > 0 ? '#fef2f2' : '#f0fdf4', borderLeft: `4px solid ${lowStockCount > 0 ? '#ef4444' : '#22c55e'}`, height: '100%', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption" fontWeight="bold">STOCK CRÍTICO</Typography>
                  <Typography variant="h4" fontWeight="900" color={lowStockCount > 0 ? '#991b1b' : '#166534'}>{lowStockCount}</Typography>
                </Box>
                {lowStockCount > 0 ? <WarningAmber fontSize="large" sx={{ color: '#f87171' }} /> : <CheckCircle fontSize="large" sx={{ color: '#4ade80' }} />}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#fdf4ff', borderLeft: '4px solid #d946ef', height: '100%', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption" fontWeight="bold">HERR. ASIGNADAS</Typography>
                  <Typography variant="h4" fontWeight="900" color="#701a75">{herramientasAsignadasCount}</Typography>
                </Box>
                <Handyman fontSize="large" sx={{ color: '#e879f9' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: ordenesPendientesCount > 0 ? '#fffbeb' : '#f8fafc', borderLeft: `4px solid ${ordenesPendientesCount > 0 ? '#f59e0b' : '#94a3b8'}`, height: '100%', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="text.secondary" variant="caption" fontWeight="bold">ÓRDENES EN TRÁNSITO</Typography>
                  <Typography variant="h4" fontWeight="900" color={ordenesPendientesCount > 0 ? '#b45309' : '#334155'}>{ordenesPendientesCount}</Typography>
                </Box>
                <ShoppingCart fontSize="large" sx={{ color: ordenesPendientesCount > 0 ? '#fbbf24' : '#cbd5e1' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 1, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab label={`Productos (${productos.length})`} />
          <Tab label={`Herramientas (${herramientas.length})`} />
          <Tab label={`Ordenes (${ordenes.length})`} />
          {canViewMovements && <Tab label={`Movimientos (${movimientos.length})`} />}
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1 }}>
            <TextField size="small" fullWidth label="Buscar por nombre o SKU" value={qProducto} onChange={(e) => setQProducto(e.target.value)} />
            <TextField size="small" select label="Categoria" value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} sx={{ minWidth: 220 }}>
              <MenuItem value="">Todas</MenuItem>
              {categorias.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.nombre}</MenuItem>)}
            </TextField>
          </Stack>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6">Productos (bajo minimo: {lowStockCount})</Typography>
            {canManage && (
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<Add />} onClick={() => setOpenCategoria(true)}>Nueva categoría</Button>
                <Button variant="contained" startIcon={<Add />} onClick={openCreateProducto}>Nuevo producto</Button>
              </Stack>
            )}
          </Box>
          <Box sx={{ height: 440 }}><DataGrid rows={productosFiltrados} columns={productColumns} loading={loading} slots={{ toolbar: GridToolbar }} getRowClassName={(params) => params.row.stock_actual <= params.row.stock_minimo ? 'low-stock-row' : ''} sx={{ '& .low-stock-row': { bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } } }} /></Box>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <TextField size="small" fullWidth label="Buscar por codigo o nombre" value={qHerramienta} onChange={(e) => setQHerramienta(e.target.value)} sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">Herramientas</Typography>
            {canManage && <Button variant="contained" startIcon={<Add />} onClick={openCreateHerramienta}>Nueva herramienta</Button>}
          </Box>
          <Box sx={{ height: 470 }}><DataGrid rows={herramientasFiltradas} columns={toolColumns} loading={loading} slots={{ toolbar: GridToolbar }} /></Box>
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">Ordenes de compra</Typography>
            {canManage && (
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<Add />} onClick={openCreateProveedor}>Nuevo proveedor</Button>
                <Button variant="contained" startIcon={<ShoppingCart />} onClick={() => setOpenOrden(true)}>Nueva orden</Button>
              </Stack>
            )}
          </Box>
          <Box sx={{ height: 360 }}><DataGrid rows={ordenes} columns={orderColumns} loading={loading} slots={{ toolbar: GridToolbar }} /></Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Proveedores</Typography>
            <Box sx={{ height: 280 }}><DataGrid rows={proveedores} columns={proveedorColumns} loading={loading} /></Box>
          </Box>
        </Paper>
      )}

      {tab === 3 && canViewMovements && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Movimientos inventario</Typography>
          <Box sx={{ height: 400 }}><DataGrid rows={movimientos} columns={movColumns} loading={loading} slots={{ toolbar: GridToolbar }} /></Box>
        </Paper>
      )}
      <Dialog open={openProducto && canManage} onClose={() => setOpenProducto(false)} fullScreen={isMobile} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProducto ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 1 }}>
            <TextField label="SKU*" value={productForm.sku} onChange={(e) => setProductForm((p) => ({ ...p, sku: e.target.value }))} />
            <TextField label="Nombre*" value={productForm.nombre} onChange={(e) => setProductForm((p) => ({ ...p, nombre: e.target.value }))} />
            <TextField select label="Categoria" value={productForm.categoria} onChange={(e) => setProductForm((p) => ({ ...p, categoria: e.target.value }))}>
              <MenuItem value="">Sin categoria</MenuItem>
              {categorias.map((c) => <MenuItem key={c.id} value={String(c.id)}>{c.nombre}</MenuItem>)}
            </TextField>
            <TextField select label="Tipo" value={productForm.tipo_producto} onChange={(e) => setProductForm((p) => ({ ...p, tipo_producto: e.target.value as 'FABRICADO' | 'COMPRADO' }))}>
              <MenuItem value="FABRICADO">Fabricado</MenuItem>
              <MenuItem value="COMPRADO">Comprado</MenuItem>
            </TextField>
            <Stack direction="row" spacing={1}>
              <TextField type="number" label="Stock actual" value={productForm.stock_actual} onChange={(e) => setProductForm((p) => ({ ...p, stock_actual: e.target.value }))} />
              <TextField type="number" label="Stock minimo" value={productForm.stock_minimo} onChange={(e) => setProductForm((p) => ({ ...p, stock_minimo: e.target.value }))} />
            </Stack>
            <TextField label="Unidad" value={productForm.unidad_medida} onChange={(e) => setProductForm((p) => ({ ...p, unidad_medida: e.target.value }))} />
            <TextField label="Descripcion" multiline rows={2} value={productForm.descripcion} onChange={(e) => setProductForm((p) => ({ ...p, descripcion: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenProducto(false)}>Cancelar</Button><Button variant="contained" onClick={() => void saveProducto()}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={openHerramienta && canManage} onClose={() => setOpenHerramienta(false)} fullScreen={isMobile} maxWidth="sm" fullWidth>
        <DialogTitle>{editingHerramienta ? 'Editar herramienta' : 'Nueva herramienta'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 1 }}>
            <TextField label="Codigo*" value={toolForm.codigo} onChange={(e) => setToolForm((p) => ({ ...p, codigo: e.target.value }))} />
            <TextField label="Nombre*" value={toolForm.nombre} onChange={(e) => setToolForm((p) => ({ ...p, nombre: e.target.value }))} />
            <TextField select label="Tipo" value={toolForm.tipo_herramienta} onChange={(e) => setToolForm((p) => ({ ...p, tipo_herramienta: e.target.value as ToolTipo }))}><MenuItem value="INTERNO">Interno</MenuItem><MenuItem value="CLIENTE">Cliente</MenuItem></TextField>
            <TextField select label="Estado" value={toolForm.estado} onChange={(e) => setToolForm((p) => ({ ...p, estado: e.target.value as ToolEstado }))}><MenuItem value="DISPONIBLE">Disponible</MenuItem><MenuItem value="ASIGNADA">Asignada</MenuItem><MenuItem value="MANTENIMIENTO">Mantenimiento</MenuItem><MenuItem value="BAJA">Baja</MenuItem></TextField>
            <TextField select label="Cliente (opcional)" value={toolForm.cliente} onChange={(e) => setToolForm((p) => ({ ...p, cliente: e.target.value }))}><MenuItem value="">Sin cliente</MenuItem>{clientes.map((c) => <MenuItem key={c.rut} value={c.rut}>{c.razon_social}</MenuItem>)}</TextField>
            <Stack direction="row" spacing={1}><TextField type="number" label="Stock total" value={toolForm.stock_total} onChange={(e) => setToolForm((p) => ({ ...p, stock_total: e.target.value }))} />{editingHerramienta && <TextField type="number" label="Stock disponible" value={toolForm.stock_disponible} onChange={(e) => setToolForm((p) => ({ ...p, stock_disponible: e.target.value }))} />}</Stack>
            {editingHerramienta && <TextField type="date" label="Fecha asignacion" InputLabelProps={{ shrink: true }} value={toolForm.fecha_asignacion} onChange={(e) => setToolForm((p) => ({ ...p, fecha_asignacion: e.target.value }))} />}
            <TextField label="Observacion" multiline rows={2} value={toolForm.observacion} onChange={(e) => setToolForm((p) => ({ ...p, observacion: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenHerramienta(false)}>Cancelar</Button><Button variant="contained" onClick={() => void saveHerramienta()}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={openCategoria && canManage} onClose={() => setOpenCategoria(false)} fullScreen={isMobile} maxWidth="xs" fullWidth>
        <DialogTitle>Nueva categoría</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre de la categoría*"
            fullWidth
            value={categoriaForm.nombre}
            onChange={(e) => setCategoriaForm({ nombre: e.target.value })}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoria(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveCategoria()} disabled={!categoriaForm.nombre.trim()}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openProveedor && canManage} onClose={closeProveedorDialog} fullScreen={isMobile} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 1 }}>
            <TextField label="Nombre*" value={providerForm.nombre} onChange={(e) => setProviderForm((p) => ({ ...p, nombre: e.target.value }))} />
            <TextField label="RUT*" value={providerForm.rut} onChange={(e) => setProviderForm((p) => ({ ...p, rut: e.target.value }))} />
            <TextField label="Direccion*" value={providerForm.direccion} onChange={(e) => setProviderForm((p) => ({ ...p, direccion: e.target.value }))} />
            <TextField label="Telefono*" value={providerForm.telefono} onChange={(e) => setProviderForm((p) => ({ ...p, telefono: e.target.value }))} />
            <TextField label="Correo*" value={providerForm.correo} onChange={(e) => setProviderForm((p) => ({ ...p, correo: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={closeProveedorDialog}>Cancelar</Button><Button variant="contained" onClick={() => void saveProveedor()}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={openOrden && canManage} onClose={() => setOpenOrden(false)} fullScreen={isMobile} maxWidth="md" fullWidth>
        <DialogTitle>Nueva orden</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 1 }}>
            <TextField label="Nombre orden*" value={orderForm.nombre} onChange={(e) => setOrderForm((p) => ({ ...p, nombre: e.target.value }))} />
            <TextField select label="Proveedor*" value={orderForm.proveedor} onChange={(e) => setOrderForm((p) => ({ ...p, proveedor: e.target.value }))}>{proveedores.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>)}</TextField>
            <TextField type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={orderForm.fecha_orden} onChange={(e) => setOrderForm((p) => ({ ...p, fecha_orden: e.target.value }))} />
            <TextField label="Observacion" multiline rows={2} value={orderForm.observacion} onChange={(e) => setOrderForm((p) => ({ ...p, observacion: e.target.value }))} />
            {orderItems.map((it, idx) => (
              <Stack key={`it-${idx}`} direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <TextField select label="Producto" value={it.producto} onChange={(e) => setOrderItems((prev) => prev.map((x, i) => i === idx ? { ...x, producto: e.target.value } : x))} sx={{ minWidth: 220 }}>{productos.map((p) => <MenuItem key={p.id} value={String(p.id)}>{p.nombre}</MenuItem>)}</TextField>
                <TextField type="number" label="Cantidad" value={it.cantidad} onChange={(e) => setOrderItems((prev) => prev.map((x, i) => i === idx ? { ...x, cantidad: e.target.value } : x))} />
                <TextField type="number" label="Costo unitario" value={it.costo_unitario} onChange={(e) => setOrderItems((prev) => prev.map((x, i) => i === idx ? { ...x, costo_unitario: e.target.value } : x))} />
              </Stack>
            ))}
            <Button onClick={() => setOrderItems((prev) => [...prev, { producto: '', cantidad: '1', costo_unitario: '0' }])}>Agregar item</Button>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenOrden(false)}>Cancelar</Button><Button variant="contained" onClick={() => void saveOrden()}>Crear</Button></DialogActions>
      </Dialog>
      <Dialog open={openDetalleProducto} onClose={() => setOpenDetalleProducto(false)} fullScreen={isMobile} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warehouse sx={{ color: 'primary.main' }} />
          Detalle de Producto
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {selectedProducto && (
            <Stack spacing={2}>
              {/* Header Card */}
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700}>{selectedProducto.nombre}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }} component="span">SKU: <Chip size="small" label={selectedProducto.sku} variant="outlined" sx={{ bgcolor: 'white', color: 'primary.main' }} /></Typography>
                </CardContent>
              </Card>

              {/* Información Básica */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Info fontSize="small" /> Información Básica
                </Typography>
                <Card>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Categoría</Typography>
                          <Typography variant="body2">{selectedProducto.categoria_nombre || <em>Sin categoría</em>}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Tipo de Producto</Typography>
                          <Typography variant="body2">{selectedProducto.tipo_producto === 'FABRICADO' ? 'Fabricado' : 'Comprado'}</Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Descripción</Typography>
                        <Typography variant="body2">{selectedProducto.descripcion || <em>Sin descripción</em>}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>

              {/* Stock */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Warehouse fontSize="small" /> Estado de Stock
                </Typography>
                <Stack spacing={1}>
                  <Card sx={{ bgcolor: selectedProducto.stock_actual <= selectedProducto.stock_minimo ? '#fff3e0' : '#f1f8e9', borderLeft: `4px solid ${selectedProducto.stock_actual <= selectedProducto.stock_minimo ? '#ff9800' : '#4caf50'}` }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Stock Actual</Typography>
                          <Typography variant="h6" fontWeight={700} color={selectedProducto.stock_actual <= selectedProducto.stock_minimo ? 'warning.main' : 'success.main'}>
                            {selectedProducto.stock_actual} {selectedProducto.unidad_medida}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Stock Mínimo</Typography>
                          <Typography variant="h6" fontWeight={700}>{selectedProducto.stock_minimo}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {selectedProducto.stock_actual <= selectedProducto.stock_minimo ? (
                          <><WarningAmber sx={{ color: 'warning.main', fontSize: '1.2rem' }} /><Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>Bajo Stock - Por Reabastecer</Typography></>
                        ) : (
                          <><CheckCircle sx={{ color: 'success.main', fontSize: '1.2rem' }} /><Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>Stock Disponible</Typography></>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <Card>
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 }, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Unidad de Medida</Typography>
                        <Chip size="small" label={selectedProducto.unidad_medida} sx={{ mt: 0.5 }} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 }, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Estado</Typography>
                        <Chip size="small" label={selectedProducto.activo ? 'Activo' : 'Inactivo'} color={selectedProducto.activo ? 'success' : 'error'} sx={{ mt: 0.5 }} />
                      </CardContent>
                    </Card>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDetalleProducto(false)}>Cerrar</Button>
          {canManage && selectedProducto && <Button variant="contained" color="primary" startIcon={<EditOutlined />} onClick={() => openEditProducto(selectedProducto)}>Editar</Button>}
        </DialogActions>
      </Dialog>

      <Dialog open={openDescuento && canManage} onClose={() => setOpenDescuento(false)} fullScreen={isMobile} maxWidth="xs" fullWidth>
        <DialogTitle>Descontar stock</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 1 }}>
            <Typography variant="body2">Producto: <b>{selectedProducto?.nombre}</b></Typography>
            <Typography variant="body2">Disponible: <b>{selectedProducto?.stock_actual ?? 0}</b></Typography>
            <TextField type="number" label="Cantidad" value={discountForm.cantidad} onChange={(e) => setDiscountForm((p) => ({ ...p, cantidad: e.target.value }))} />
            <TextField label="Detalle" multiline rows={2} value={discountForm.detalle} onChange={(e) => setDiscountForm((p) => ({ ...p, detalle: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenDescuento(false)}>Cancelar</Button><Button variant="contained" color="warning" onClick={() => void descontarStock()}>Descontar</Button></DialogActions>
      </Dialog>

      <Dialog open={openDetalleHerramienta} onClose={() => setOpenDetalleHerramienta(false)} fullScreen={isMobile} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Handyman sx={{ color: 'primary.main' }} />
          Detalle de Herramienta
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {selectedHerramienta && (
            <Stack spacing={2}>
              {/* Header Card */}
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={700}>{selectedHerramienta.nombre}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label={selectedHerramienta.codigo} variant="outlined" sx={{ bgcolor: 'white', color: 'primary.main' }} />
                    <Chip 
                      size="small" 
                      label={selectedHerramienta.tipo_herramienta} 
                      color={selectedHerramienta.tipo_herramienta === 'INTERNO' ? 'primary' : 'secondary'}
                      variant="filled"
                      sx={{ bgcolor: 'white', color: 'primary.main' }}
                    />
                  </Stack>
                </CardContent>
              </Card>

              {/* Estado */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Timeline fontSize="small" /> Estado Actual
                </Typography>
                <Card sx={{ bgcolor: selectedHerramienta.estado === 'DISPONIBLE' ? '#f1f8e9' : selectedHerramienta.estado === 'ASIGNADA' ? '#e3f2fd' : '#fff3e0', borderLeft: `4px solid ${selectedHerramienta.estado === 'DISPONIBLE' ? '#4caf50' : selectedHerramienta.estado === 'ASIGNADA' ? '#2196f3' : '#ff9800'}` }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Estado</Typography>
                        <Chip 
                          label={selectedHerramienta.estado}
                          color={
                            selectedHerramienta.estado === 'DISPONIBLE' ? 'success' :
                            selectedHerramienta.estado === 'ASIGNADA' ? 'info' :
                            selectedHerramienta.estado === 'MANTENIMIENTO' ? 'warning' : 'default'
                          }
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Tipo</Typography>
                        <Chip label={selectedHerramienta.tipo_herramienta} size="small" sx={{ mt: 0.5 }} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Stock */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Warehouse fontSize="small" /> Disponibilidad
                </Typography>
                <Card sx={{ bgcolor: selectedHerramienta.stock_disponible > 0 ? '#f1f8e9' : '#ffebee', borderLeft: `4px solid ${selectedHerramienta.stock_disponible > 0 ? '#4caf50' : '#f44336'}` }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Stock Disponible</Typography>
                        <Typography variant="h5" fontWeight={700} color={selectedHerramienta.stock_disponible > 0 ? 'success.main' : 'error.main'}>
                          {selectedHerramienta.stock_disponible}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Stock Total</Typography>
                        <Typography variant="h5" fontWeight={700}>{selectedHerramienta.stock_total}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Cliente */}
              {selectedHerramienta.cliente_nombre && (
                <Card sx={{ bgcolor: 'white', borderLeft: '4px solid #2196f3' }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person sx={{ color: 'primary.main' }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Cliente Asignado</Typography>
                        <Typography variant="body2" fontWeight={600}>{selectedHerramienta.cliente_nombre}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Asignaciones */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Person fontSize="small" /> Asignaciones Activas
                </Typography>
                <Stack spacing={1}>
                  {asignacionesHerramientaSeleccionada.length === 0 ? (
                    <Card sx={{ bgcolor: 'grey.100' }}>
                      <CardContent sx={{ py: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Sin asignaciones activas</Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    asignacionesHerramientaSeleccionada.map((a) => (
                      <Card key={a.id} sx={{ borderLeft: `4px solid ${a.estado === 'ACTIVA' ? '#4caf50' : '#9e9e9e'}` }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack spacing={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{a.trabajador_nombre}</Typography>
                                <Typography variant="caption" color="text.secondary">Cantidad: {a.cantidad} unidad.</Typography>
                              </Box>
                              <Chip size="small" label={a.estado} color={a.estado === 'ACTIVA' ? 'success' : 'default'} />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Desde: {new Date(a.fecha_asignacion).toLocaleDateString('es-CL')}
                            </Typography>
                            {canManage && a.estado === 'ACTIVA' && (
                              <Button size="small" variant="outlined" color="warning" onClick={() => void devolverAsignacion(a.id)}>
                                Registrar Devolucion
                              </Button>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Stack>
              </Box>

              {/* Info Adicional */}
              {selectedHerramienta.observacion && (
                <Card sx={{ bgcolor: 'white', borderLeft: '4px solid #1976d2' }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">Observaciones</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedHerramienta.observacion}</Typography>
                  </CardContent>
                </Card>
              )}
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDetalleHerramienta(false)}>Cerrar</Button>
          {canManage && selectedHerramienta && selectedHerramienta.stock_disponible > 0 && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AssignmentInd />} 
              onClick={() => { setOpenAsignar(true); setOpenDetalleHerramienta(false); }}
            >
              Asignar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={openAsignar && canManage} onClose={() => setOpenAsignar(false)} fullScreen={isMobile} maxWidth="sm" fullWidth>
        <DialogTitle>Asignar herramienta a trabajador</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 1 }}>
            <Typography variant="body2">Herramienta: <b>{selectedHerramienta?.nombre}</b></Typography>
            <TextField select label="Trabajador*" value={assignForm.trabajador} onChange={(e) => setAssignForm((p) => ({ ...p, trabajador: e.target.value }))}>{trabajadores.map((t) => <MenuItem key={t.rut} value={t.rut}>{t.nombres} {t.apellidos}</MenuItem>)}</TextField>
            <TextField select label="Cliente (opcional)" value={assignForm.cliente} onChange={(e) => setAssignForm((p) => ({ ...p, cliente: e.target.value }))}><MenuItem value="">Sin cliente</MenuItem>{clientes.map((c) => <MenuItem key={c.rut} value={c.rut}>{c.razon_social}</MenuItem>)}</TextField>
            <TextField type="number" label="Cantidad" value={assignForm.cantidad} onChange={(e) => setAssignForm((p) => ({ ...p, cantidad: e.target.value }))} />
            <TextField label="Observacion" multiline rows={2} value={assignForm.observacion} onChange={(e) => setAssignForm((p) => ({ ...p, observacion: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenAsignar(false)}>Cancelar</Button><Button variant="contained" onClick={() => void asignarHerramienta()}>Asignar</Button></DialogActions>
      </Dialog>

      <Dialog open={openDetalleOrden} onClose={() => setOpenDetalleOrden(false)} fullScreen={isMobile} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShoppingCart sx={{ color: 'primary.main' }} />
          Detalle de Orden de Compra
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {selectedOrden && (
            <Stack spacing={2}>
              {/* Header Card */}
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 1 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>{selectedOrden.nombre}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }} component="span">Orden: <Chip size="small" label={selectedOrden.numero} variant="outlined" sx={{ bgcolor: 'white', color: 'primary.main' }} /></Typography>
                    </Box>
                    <Chip 
                      label={selectedOrden.estado_label || selectedOrden.estado}
                      color={
                        selectedOrden.estado === 'CONFIRMADA' ? 'success' :
                        selectedOrden.estado === 'CANCELADA' ? 'error' : 'warning'
                      }
                      icon={
                        selectedOrden.estado === 'CONFIRMADA' ? <CheckCircle /> :
                        selectedOrden.estado === 'CANCELADA' ? <DeleteOutline /> : <Schedule />
                      }
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Información General */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ShoppingCart fontSize="small" /> Información Orden
                </Typography>
                <Card>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Fecha Orden</Typography>
                        <Typography variant="body2" fontWeight={600}>{new Date(`${selectedOrden.fecha_orden}T00:00:00`).toLocaleDateString('es-CL')}</Typography>
                      </Box>
                      {selectedOrden.observacion && (
                        <Box sx={{ bgcolor: '#f5f5f5', p: 1, borderRadius: 1, borderLeft: '3px solid #1976d2' }}>
                          <Typography variant="caption" color="text.secondary">Observaciones</Typography>
                          <Typography variant="body2" sx={{ mt: 0.5 }}>{selectedOrden.observacion}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>

              {/* Proveedor */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ShoppingCart fontSize="small" /> Datos del Proveedor
                </Typography>
                <Card>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Nombre</Typography>
                          <Typography variant="body2" fontWeight={600}>{selectedOrden.proveedor_nombre}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">RUT</Typography>
                          <Typography variant="body2" fontWeight={600}>{proveedores.find(p => p.nombre === selectedOrden.proveedor_nombre)?.rut || '-'}</Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Dirección</Typography>
                        <Typography variant="body2">{proveedores.find(p => p.nombre === selectedOrden.proveedor_nombre)?.direccion || '-'}</Typography>
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Teléfono</Typography>
                          <Typography variant="body2">{proveedores.find(p => p.nombre === selectedOrden.proveedor_nombre)?.telefono || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Correo</Typography>
                          <Typography variant="body2">{proveedores.find(p => p.nombre === selectedOrden.proveedor_nombre)?.correo || '-'}</Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>

              {/* Items */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ShoppingCart fontSize="small" /> Productos ({selectedOrden.items.length})
                </Typography>
                <Stack spacing={1}>
                  {selectedOrden.items.map((it, idx) => (
                    <Card key={it.id} sx={{ borderLeft: `4px solid ${['#2196F3', '#4CAF50', '#FF9800', '#F44336'][idx % 4]}` }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 1, alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{it.producto_nombre}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                              Producto ID: {it.id}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">Cant.</Typography>
                            <Typography variant="body2" fontWeight={600}>{it.cantidad}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">Unit.</Typography>
                            <Typography variant="body2" fontWeight={600}>{money.format(Number(it.costo_unitario))}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right', bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Total</Typography>
                            <Typography variant="body2" fontWeight={700} color="primary.main">{money.format(Number(it.total_linea))}</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>

              {/* Total */}
              <Card sx={{ bgcolor: '#f1f8e9', border: '2px solid', borderColor: '#4caf50' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">Total Orden</Typography>
                      <Typography variant="h5" fontWeight={700} color="success.main">
                        {money.format(Number(selectedOrden.total_orden))}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDetalleOrden(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirm.open} onClose={() => setConfirm({ open: false, title: '', description: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>{confirm.title}</DialogTitle>
        <DialogContent><Typography>{confirm.description}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirm({ open: false, title: '', description: '' })}>Cancelar</Button><Button variant="contained" color="error" onClick={() => void handleConfirm()}>Confirmar</Button></DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default Inventario;

