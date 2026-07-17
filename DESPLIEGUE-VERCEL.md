# Despliegue: backend + MySQL en Railway, frontend en Vercel

Arquitectura:

```
[ Navegador ] → [ Frontend en Vercel ] --(/api/* proxy)--> [ Backend en Railway ] → [ MySQL en Railway ]
```

El frontend en Vercel reenvía todas las llamadas `/api/*` al backend de
Railway mediante un *rewrite* (ver [`vercel.json`](vercel.json)). Así el
navegador ve todo en el mismo dominio y **no hay problemas de CORS**, y no
hay que tocar [`config.js`](config.js) (sigue usando `/api`).

---

## Parte A — Backend + base de datos en Railway

### 1. Base de datos MySQL
1. [railway.app](https://railway.app) → **New Project → Provision MySQL**.
2. Importa el esquema con MySQL Workbench (host **público** `.proxy.rlwy.net`):
   abre [`database/schema.sql`](database/schema.sql), comenta
   `CREATE DATABASE …` / `USE inventorycloud;`, descomenta `USE railway;`, ejecuta.
   (Detalle en [`database/DESPLIEGUE-RAILWAY.md`](database/DESPLIEGUE-RAILWAY.md).)

### 2. Servicio del backend
1. En el mismo proyecto → **New → GitHub Repo** → `AMathiasGomez/InventoryCloud`.
2. Railway corre `npm install` y `npm start` automáticamente.
3. **Variables** del servicio:

   | Variable      | Valor                                  |
   |---------------|----------------------------------------|
   | `MYSQL_URL`   | `${{ MySQL.MYSQL_URL }}`                |
   | `JWT_SECRET`  | una cadena larga y aleatoria           |

   *(No hace falta `CORS_ORIGIN`: el proxy de Vercel evita el CORS.)*
4. **Settings → Networking → Generate Domain**. Copia la URL, algo como
   `https://inventorycloud-production.up.railway.app`.
5. Verifica: abre `https://<tu-backend>.up.railway.app/api/health` →
   `{"status":"ok","db":"conectada"}`.

---

## Parte B — Frontend en Vercel

### 3. Apuntar el proxy a tu backend
1. Edita [`vercel.json`](vercel.json) y reemplaza la URL de ejemplo por la de
   tu backend de Railway (mantén el `/api/:path*` al final):

   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://TU-BACKEND.up.railway.app/api/:path*" }
     ]
   }
   ```
2. Sube el cambio:
   ```bash
   git add vercel.json
   git commit -m "Configurar proxy de Vercel al backend de Railway"
   git push
   ```

### 4. Crear el proyecto en Vercel
1. Entra a [vercel.com](https://vercel.com) (inicia sesión con GitHub) →
   **Add New → Project** → importa `AMathiasGomez/InventoryCloud`.
2. Configuración:
   - **Framework Preset:** *Other*.
   - **Build Command:** vacío.
   - **Output Directory:** vacío (raíz).
   - **Root Directory:** `./` (raíz).
   *(El archivo [`.vercelignore`](.vercelignore) hace que Vercel publique solo
   el frontend estático y omita `backend/`, `database/`, etc.)*
3. **Deploy**. Vercel te dará una URL como
   `https://inventorycloud.vercel.app`.

### 5. Probar
1. Abre `https://<tu-app>.vercel.app/` → pantalla de login.
2. Entra con **admin / admin123**.

¡Listo! Cada `git push` a `main` vuelve a desplegar automáticamente tanto
Vercel (frontend) como Railway (backend).

---

## Alternativa sin proxy (usando CORS)

Si prefieres no usar el *rewrite* de Vercel:

1. En [`config.js`](config.js) pon la URL completa del backend:
   `window.INVENTORY_API_URL = 'https://TU-BACKEND.up.railway.app/api';`
2. En Railway, añade la variable `CORS_ORIGIN` con el dominio de Vercel
   (ej. `https://inventorycloud.vercel.app`).
3. Borra o vacía [`vercel.json`](vercel.json).

El método del proxy (Parte B) es más sencillo porque evita configurar CORS.

---

> Recordatorio de seguridad: la contraseña del usuario se guarda en texto
> plano por simplicidad académica. En un entorno real usa un hash (bcrypt).
