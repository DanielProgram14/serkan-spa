import os
import re

directories = [
    r'c:\Users\danip\Desktop\Serkan SPA\frontend\src\pages',
    r'c:\Users\danip\Desktop\Serkan SPA\frontend\src\pages\admin',
    r'c:\Users\danip\Desktop\Serkan SPA\frontend\src\components'
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Skip if no Dialog is used
    if '<Dialog ' not in text and 'Dialog' not in text: # To be safe
        return

    original_text = text

    # Only process if Dialog actually exists as a tag
    if not re.search(r'<Dialog[\s>]', text):
        return

    # Add imports if not present
    if 'useMediaQuery' not in text:
        # Try to find @mui/material import and append
        text = re.sub(r'(\}\s+from\s+[\'"]@mui/material[\'"];)', r'  useMediaQuery,\n  useTheme,\n\1', text)
    
    # Inject hooks just after component declaration
    # Pattern: const ObjectName = (props) => {
    # or export default function ObjectName(...) {
    
    hook_injected = False
    
    if 'const isMobile =' not in text:
        # Match standard const Name = () => {
        match = re.search(r'(const\s+[A-Z][a-zA-Z0-9_]*\s*=\s*\([^)]*\)\s*=>\s*\{)', text)
        if match:
            hook_str = match.group(1) + "\n  const theme = useTheme();\n  const isMobile = useMediaQuery(theme.breakpoints.down('md'));"
            text = text.replace(match.group(1), hook_str, 1)
            hook_injected = True
        else:
            # Let's try export default function
            match = re.search(r'(export\s+default\s+function\s+[A-Z][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{)', text)
            if match:
                hook_str = match.group(1) + "\n  const theme = useTheme();\n  const isMobile = useMediaQuery(theme.breakpoints.down('md'));"
                text = text.replace(match.group(1), hook_str, 1)
                hook_injected = True
                
    else:
        hook_injected = True

    if hook_injected:
        # Add fullScreen prop to Dialogs
        # Only add it if not already present
        if 'fullScreen={isMobile}' not in text:
            text = re.sub(r'(<Dialog\s+open={[^{}]+}\s+onClose={[^{}]+}\s+)(maxWidth="[^"]+")?', r'\1fullScreen={isMobile} \2', text)
            text = text.replace('fullScreen={isMobile}  ', 'fullScreen={isMobile} ')
            
            # Catch plain <Dialog open={open}> 
            text = re.sub(r'(<Dialog\s+open={[^{}]+})(?!.*fullScreen)', r'\1 fullScreen={isMobile}', text)
    
    if text != original_text:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Updated: {filepath}")

for d in directories:
    if os.path.exists(d):
        for f in os.listdir(d):
            if f.endswith('.tsx'):
                process_file(os.path.join(d, f))

print('Dialogs responsiveness done')
