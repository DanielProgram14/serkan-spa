import os

filepath = r'c:\Users\danip\Desktop\Serkan SPA\frontend\src\pages\Inventario.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add Grid to MUI imports
text = text.replace('  Typography,\n} from \'@mui/material\';', '  Typography,\n  Grid\n} from \'@mui/material\';')
# 2. Add GridToolbar to X-Data-Grid imports
text = text.replace("import { DataGrid } from '@mui/x-data-grid';", "import { DataGrid, GridToolbar } from '@mui/x-data-grid';")

# 3. Add KPIs memo variables under lowStockCount
old_kpi_line = "  const lowStockCount = useMemo(() => productos.filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo)).length, [productos]);"
new_kpi_lines = """  const totalProductos = useMemo(() => productos.length, [productos]);
  const lowStockCount = useMemo(() => productos.filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo)).length, [productos]);
  const herramientasAsignadasCount = useMemo(() => herramientas.filter((h) => h.estado === 'ASIGNADA').length, [herramientas]);
  const ordenesPendientesCount = useMemo(() => ordenes.filter((o) => o.estado === 'BORRADOR' || (o.estado === 'CONFIRMADA' && not_confirmed(o))).length, [ordenes]);
"""
# Helper function
new_kpi_lines = new_kpi_lines.replace('not_confirmed(o)', '!o.fecha_confirmacion')

text = text.replace(old_kpi_line, new_kpi_lines)

# 4. Insert KPI Cards rendering before Paper Tabs
old_header = """      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 1, mb: 2 }}>"""

kpi_cards_render = """      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Panel de Métricas (KPIs) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
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

      <Paper sx={{ p: 1, mb: 2 }}>"""
text = text.replace(old_header, kpi_cards_render)

# 5. Add GridToolbar to DataGrids, and styling for row alerts
text = text.replace('<DataGrid rows={productosFiltrados} columns={productColumns} loading={loading} />', "<DataGrid rows={productosFiltrados} columns={productColumns} loading={loading} slots={{ toolbar: GridToolbar }} getRowClassName={(params) => params.row.stock_actual <= params.row.stock_minimo ? 'low-stock-row' : ''} sx={{ '& .low-stock-row': { bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } } }} />")
text = text.replace('<DataGrid rows={herramientasFiltradas} columns={toolColumns} loading={loading} />', "<DataGrid rows={herramientasFiltradas} columns={toolColumns} loading={loading} slots={{ toolbar: GridToolbar }} />")
text = text.replace('<DataGrid rows={ordenes} columns={orderColumns} loading={loading} />', "<DataGrid rows={ordenes} columns={orderColumns} loading={loading} slots={{ toolbar: GridToolbar }} />")
text = text.replace('<DataGrid rows={movimientos} columns={movColumns} loading={loading} />', "<DataGrid rows={movimientos} columns={movColumns} loading={loading} slots={{ toolbar: GridToolbar }} />")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print("Done updates")
