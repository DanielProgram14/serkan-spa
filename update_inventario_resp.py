import os
import re

filepath = r'c:\Users\danip\Desktop\Serkan SPA\frontend\src\pages\Inventario.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Imports
text = text.replace('  Typography,\n  Grid\n} from \'@mui/material\';', '  Typography,\n  Grid,\n  useMediaQuery,\n  useTheme\n} from \'@mui/material\';')

# 2. Add isMobile
hook_str = '''  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));'''
text = text.replace('  const { user } = useAuth();', hook_str)

# 3. Tabs
old_tabs = '<Tabs value={tab} onChange={(_, v) => setTab(v)}>'
new_tabs = '<Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>'
text = text.replace(old_tabs, new_tabs)

# 4. Modals
# Find all `<Dialog open={...}` and inject `fullScreen={isMobile} ` before `maxWidth`
text = re.sub(r'(<Dialog\s+open={[^{}]+}\s+onClose={[^{}]+}\s+)(maxWidth="[a-zA-Z]+")?', r'\1fullScreen={isMobile} \2', text)
# Some might not have maxWidth right after onClose, so we do a general replace:
text = text.replace('fullScreen={isMobile}  ', 'fullScreen={isMobile} ')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print('Inventario Responsive Done')
