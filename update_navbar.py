import os

filepath = r'c:\Users\danip\Desktop\Serkan SPA\frontend\src\components\Navbar.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Imports
text = text.replace('  Alert\n} from \'@mui/material\';', '  Alert,\n  Drawer\n} from \'@mui/material\';')
text = text.replace('  ArrowBack\n} from \'@mui/icons-material\';', '  ArrowBack,\n  Menu as MenuIcon\n} from \'@mui/icons-material\';')

# 2. State
text = text.replace('  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);', '  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);\n  const [mobileOpen, setMobileOpen] = useState(false);')

# 3. Responsive Menu
old_desktop_menu = """          <Box sx={{ flexGrow: 1, display: 'flex', gap: 0.5 }}>
            {filteredItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    color: isActive ? '#2563eb' : '#64748b',
                    bgcolor: isActive ? '#eff6ff' : 'transparent',
                    fontWeight: isActive ? 'bold' : '500',
                    px: 2,
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>"""

new_responsive_menu = """          {/* Mobile Hamburger Icon */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' }, color: '#0f172a' }}
          >
            <MenuIcon />
          </IconButton>

          {/* Desktop Nav Items */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
            {filteredItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    color: isActive ? '#2563eb' : '#64748b',
                    bgcolor: isActive ? '#eff6ff' : 'transparent',
                    fontWeight: isActive ? 'bold' : '500',
                    px: 2,
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>"""

text = text.replace(old_desktop_menu, new_responsive_menu)

# 4. Drawer Injection
drawer_code = """      </Container>

      {/* MOBILE DRAWER */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: 280, bgcolor: '#f8fafc' } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" fontWeight="bold" color="#0f172a">SERKAN SPA</Typography>
          <IconButton onClick={() => setMobileOpen(false)}><Close /></IconButton>
        </Box>
        <List sx={{ px: 2, py: 2 }}>
          {filteredItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <ListItem 
                button 
                key={item.label} 
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                sx={{
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#2563eb' : '#475569',
                  '&:hover': { bgcolor: '#f1f5f9' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? '#2563eb' : '#94a3b8' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={<Typography fontWeight={isActive ? 'bold' : '500'}>{item.label}</Typography>} />
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      {/* MODAL MI PERFIL REDISEÑADO CON EDICIÓN */}"""

text = text.replace('      </Container>\n\n      {/* MODAL MI PERFIL REDISEÑADO CON EDICIÓN */}', drawer_code)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print('Navbar responsive drawer ok')
