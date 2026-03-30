# 🔐 Cómo Resolver el Error de GitHub 403

## Problema

```
remote: Permission to DanielProgram14/serkan-spa.git denied to nvillegas-git.
fatal: unable to access 'https://github.com/DanielProgram14/serkan-spa.git/': The requested URL returned error: 403
```

**Causa**: Las credenciales almacenadas en Windows corresponden a una cuenta diferente.

---

## ✅ Solución: Usar Personal Access Token

### Paso 1: Ir a GitHub y crear un Token

1. Ve a: **https://github.com/settings/tokens/new**
2. Dale un nombre: `serkan-spa-push`
3. Selecciona permisos: ✅ `repo` (control completo de repositorios privados y públicos)
4. Haz clic en **Generate token**
5. **COPIA el token** (solo lo podrás ver una vez)
   ```
   ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Paso 2: Usar el Token para hacer Push

Copia y ejecuta en PowerShell:

```powershell
cd "C:\Users\danip\Desktop\Serkan SPA"

# Reemplaza TOKEN con tu token personal
$token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$url = "https://DanielProgram14:${token}@github.com/DanielProgram14/serkan-spa.git"

# Actualizar la URL del repositorio
git remote set-url origin $url

# Hacer push
git push -u origin main
```

### Paso 3: Si git pide credenciales

Cuando Git pida credenciales en la terminal:
- **Usuario**: `DanielProgram14`
- **Contraseña**: Pega el token personal que copiaste

---

## 🔒 Alternativa Segura: Usar SSH (Recomendado para futuro)

Si quieres evitar tokens en el futuro, usa SSH:

### Generar clave SSH

```powershell
# Abre PowerShell como administrador y corre:
$keyPath = "$env:USERPROFILE\.ssh\id_ed25519"

# Crear carpeta .ssh
New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" -Force

# Generar clave (sin contraseña)
ssh-keygen -t ed25519 -C "danielprograma2021@gmail.com" -f $keyPath -N ""
```

### Agregar clave pública a GitHub

1. Copia el contenido de:
   ```powershell
   Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
   ```
2. Ve a: **https://github.com/settings/ssh/new**
3. Pega la clave en el campo
4. Guarda

### Cambiar URL a SSH

```powershell
cd "C:\Users\danip\Desktop\Serkan SPA"
git remote set-url origin git@github.com:DanielProgram14/serkan-spa.git
git push -u origin main
```

---

## 📋 Checklist Rápido

- [ ] Creé Personal Access Token en GitHub
- [ ] Copié el token completo
- [ ] Ejecuté el comando de push con el token
- [ ] El push fue exitoso ✅

---

## ✨ Una vez funcionando

Después del primer push exitoso, git recordará las credenciales y podrás:

```powershell
cd "C:\Users\danip\Desktop\Serkan SPA"
git push    # Sin pedirte usuario/contraseña
git pull
git commit -m "cambios"
```

---

**¿Necesitas ayuda? Elige una solución y ejecuta los comandos en PowerShell.** 🚀
