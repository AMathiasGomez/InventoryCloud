# Desplegar InventoryCloud en Railway

Guía completa para poner la app en línea. El backend sirve también el
frontend, así que solo necesitas **2 servicios en Railway**: la base de
datos MySQL y el servicio web (Node).

```
[ Navegador ] → [ Servicio Web (Node): frontend + API ] → [ MySQL ]
                        una sola URL
```

---

## 0. Requisito: el código en GitHub

Railway despliega desde tu repositorio. Asegúrate de que todo esté subido:

```bash
git add .
git commit -m "Backend + integración + despliegue"
git push
```

Repo: https://github.com/AMathiasGomez/InventoryCloud

---

## 1. Crear la base de datos MySQL

1. Entra a [railway.app](https://railway.app) → **New Project**.
2. **Provision MySQL**. Railway crea la base y una base vacía llamada `railway`.

## 2. Cargar el esquema (con MySQL Workbench)

1. En el servicio MySQL → pestaña **Variables / Connect**, copia los datos de
   conexión **públicos** (host que termina en `.proxy.rlwy.net` y su puerto).
2. Conéctate desde MySQL Workbench con esos datos (ver
   [`database/DESPLIEGUE-RAILWAY.md`](database/DESPLIEGUE-RAILWAY.md) para el detalle).
3. Abre [`database/schema.sql`](database/schema.sql), **comenta** el bloque
   `CREATE DATABASE …` y `USE inventorycloud;`, **descomenta** `USE railway;` y
   ejecútalo. Quedan creadas las tablas, los datos de ejemplo y el usuario
   `admin` / `admin123`.

## 3. Crear el servicio web (backend + frontend)

1. En el **mismo proyecto** de Railway → **New → GitHub Repo** → elige
   `AMathiasGomez/InventoryCloud`.
2. Railway detecta Node, ejecuta `npm install` y `npm start`
   (que corre `node backend/server.js`). **No** hace falta tocar el *Root Directory*.
3. Ve a la pestaña **Variables** del servicio web y añade:

   | Variable      | Valor                                             |
   |---------------|---------------------------------------------------|
   | `MYSQL_URL`   | `${{ MySQL.MYSQL_URL }}`  *(escribe `${{` y Railway autocompleta)* |
   | `JWT_SECRET`  | una cadena larga y aleatoria                       |

   > `PORT` lo asigna Railway automáticamente. `CORS_ORIGIN` no hace falta
   > porque frontend y API van en el mismo dominio.

4. En **Settings → Networking** del servicio web → **Generate Domain**.
   Obtendrás una URL como `https://inventorycloud-production.up.railway.app`.

## 4. Probar

1. Abre `https://<tu-dominio>.up.railway.app/api/health` → debe decir
   `{"status":"ok","db":"conectada"}`.
2. Abre `https://<tu-dominio>.up.railway.app/` → la pantalla de login.
3. Entra con **admin / admin123**. ¡Listo!

---

## Ejecutar en local (opcional, para probar antes)

Necesitas un MySQL local (o el de Railway) con el esquema importado.

```bash
npm install
cp backend/.env.example backend/.env   # edita con tus datos de MySQL
npm start
```

Abre **http://localhost:3000** (el backend sirve el frontend). Login: admin / admin123.

> Importante: abre `http://localhost:3000`, **no** el `index.html` con doble
> clic (`file://`), porque las llamadas a la API no funcionan desde `file://`.

---

## Notas

- La contraseña se guarda en texto plano por simplicidad académica. En un
  entorno real, guarda un hash (`bcrypt`) en la tabla `usuarios`.
- Si algún día alojas el frontend en un dominio distinto al backend, pon en
  [`config.js`](config.js) la URL completa de la API y define `CORS_ORIGIN`
  en el backend con el dominio del frontend.
