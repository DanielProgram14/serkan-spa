import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Chip, Stack, Dialog, 
  DialogTitle, DialogContent, TextField, DialogActions, Tooltip 
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import api from '../../api/axios';

// Interfaces para los datos
interface MasterItem {
  id: number;
  nombre: string;
}

// NUEVO TIPO DEFINIDO PARA EVITAR ERRORES DE TYPESCRIPT
type MasterType = 'AREA' | 'CARGO' | 'DOC' | 'CATEGORIA';

const TablasMaestras = () => {
  // Estados para las 4 listas
  const [areas, setAreas] = useState<MasterItem[]>([]);
  const [cargos, setCargos] = useState<MasterItem[]>([]);
  const [docs, setDocs] = useState<MasterItem[]>([]);
  const [categorias, setCategorias] = useState<MasterItem[]>([]);
  
  // Estado del Modal (Sirve para Crear y Editar)
  const [openModal, setOpenModal] = useState(false);
  const [currentType, setCurrentType] = useState<MasterType>('AREA');
  const [editItem, setEditItem] = useState<MasterItem | null>(null); 
  const [itemName, setItemName] = useState('');
  

  // --- 1. CARGA DE DATOS ---
  const fetchData = async () => {
    try {
        const [rAreas, rCargos, rDocs, rCategorias] = await Promise.all([
            api.get('/areas/'), 
            api.get('/cargos/'), 
            api.get('/tipos-documento/'),
            api.get('/categorias-tarea/')
        ]);
        setAreas(rAreas.data); 
        setCargos(rCargos.data); 
        setDocs(rDocs.data);
        setCategorias(rCategorias.data);
    } catch (e) { console.error("Error cargando maestros", e); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- 2. ABRIR MODAL (CREAR O EDITAR) ---
  const handleOpen = (type: MasterType, item?: MasterItem) => {
      setCurrentType(type);
      if (item) {
          setEditItem(item);
          setItemName(item.nombre);
      } else {
          setEditItem(null);
          setItemName('');
      }
      setOpenModal(true);
  };

  // --- 3. GUARDAR (POST o PUT) ---
  const handleSave = async () => {
      let endpoint = '';
      if (currentType === 'AREA') endpoint = '/areas/';
      if (currentType === 'CARGO') endpoint = '/cargos/';
      if (currentType === 'DOC') endpoint = '/tipos-documento/';
      if (currentType === 'CATEGORIA') endpoint = '/categorias-tarea/';

      try {
          if (editItem) {
              await api.put(`${endpoint}${editItem.id}/`, { nombre: itemName });
          } else {
              await api.post(endpoint, { nombre: itemName });
          }
          setOpenModal(false); 
          setItemName('');
          fetchData(); // Recargar todo
      } catch (e) { alert("Error al guardar. Verifica que no esté duplicado."); }
  };

  // --- 4. ELIMINAR (DELETE) ---
  const handleDelete = async (type: MasterType, id: number) => {
      if(!confirm("¿Estás seguro de eliminar este registro?")) return;

      let endpoint = '';
      if (type === 'AREA') endpoint = `/areas/${id}/`;
      if (type === 'CARGO') endpoint = `/cargos/${id}/`;
      if (type === 'DOC') endpoint = `/tipos-documento/${id}/`;
      if (type === 'CATEGORIA') endpoint = `/categorias-tarea/${id}/`; // <--- AÑADIDO

      try {
          await api.delete(endpoint);
          fetchData();
      } catch (e) { alert("No se puede eliminar. Probablemente esté en uso por otro registro en el sistema."); }
  };

  // --- COMPONENTE VISUAL DE TARJETA ---
  const MasterCard = ({ title, items, type }: { title: string, items: MasterItem[], type: MasterType }) => (
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 4, height: '100%', minHeight: 180, bgcolor: '#fff' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight="900" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: '#475569' }}>
                {title}
              </Typography>
              <Button 
                size="small" 
                variant="contained" 
                startIcon={<Add />} 
                onClick={() => handleOpen(type)} 
                sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9', color: '#334155', boxShadow: 'none', '&:hover': { bgcolor: '#e2e8f0' } }}
              >
                Añadir
              </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {items.length > 0 ? items.map((i) => (
                  <Chip 
                    key={i.id} 
                    label={i.nombre} 
                    onClick={() => handleOpen(type, i)} 
                    onDelete={() => handleDelete(type, i.id)} 
                    deleteIcon={<Tooltip title="Eliminar"><Delete sx={{ fontSize: 16 }} /></Tooltip>}
                    sx={{ 
                        borderRadius: 2, 
                        fontWeight: '500', 
                        bgcolor: '#f8fafc', 
                        border: '1px solid #e2e8f0',
                        '&:hover': { bgcolor: '#e0f2fe', borderColor: '#bae6fd', cursor: 'pointer' }
                    }} 
                  />
              )) : (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', width: '100%', textAlign: 'center', mt: 2 }}>
                    Sin registros activos
                </Typography>
              )}
          </Box>
      </Paper>
  );

  return (
    <Box>
        <Typography variant="h5" fontWeight="900" sx={{ mb: 1, color: '#0f172a' }}>MAESTROS DE DATOS</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Gestión de catálogos para listas desplegables del sistema.
        </Typography>
        
        <Stack spacing={3}>
            {/* FILA 1: Áreas y Cargos */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <Box sx={{ flex: 1 }}>
                    <MasterCard title="Áreas Operativas" items={areas} type="AREA" />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <MasterCard title="Cargos Definidos" items={cargos} type="CARGO" />
                </Box>
            </Stack>

            {/* FILA 2: Documentos y Categorías (AHORA RENDERIZADO) */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                <Box sx={{ flex: 1 }}>
                    <MasterCard title="Tipos de Documento" items={docs} type="DOC" />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <MasterCard title="Categorías de Tareas" items={categorias} type="CATEGORIA" />
                </Box>
            </Stack>
        </Stack>

        {/* MODAL UNIFICADO */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle fontWeight="bold" sx={{ borderBottom: '1px solid #f1f5f9' }}>
                {editItem ? 'Editar Registro' : 'Nuevo Registro'}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Typography variant="caption" fontWeight="bold" sx={{ mb: 1, display: 'block' }}>
                    NOMBRE / DESCRIPCIÓN
                </Typography>
                <TextField 
                    fullWidth 
                    size="small" 
                    value={itemName} 
                    onChange={(e) => setItemName(e.target.value)} 
                    placeholder="Escriba aquí..."
                    autoFocus 
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSave(); }}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
                <Button onClick={() => setOpenModal(false)} color="inherit" sx={{ fontWeight: 'bold', color: '#64748b' }}>Cancelar</Button>
                <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#2563eb', fontWeight: 'bold', boxShadow: 'none' }}>
                    {editItem ? 'Guardar Cambios' : 'Crear'}
                </Button>
            </DialogActions>
        </Dialog>
    </Box>
  );
};
export default TablasMaestras;
