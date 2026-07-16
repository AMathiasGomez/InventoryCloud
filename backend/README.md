# InventoryCloud — Backend (API REST)

API en **Node.js + Express** que conecta la interfaz de InventoryCloud con la base de datos **MySQL** (local o en Railway).

## Requisitos

- Node.js 18 o superior.
- Una base de datos MySQL con el esquema de [`../database/schema.sql`](../database/schema.sql) ya importado.

## Instalación

```bash
cd backend
npm install
cp .env.example .env    # y edita .env con tus datos de conexión
npm start               # o: npm run dev  (recarga en caliente)
```

El servidor queda en `http://localhost:3000` (o el `PORT` que definas).

## Variables de entorno (`.env`)

| Variable       | Descripción                                              |
|----------------|----------------------------------------------------------|
| `MYSQL_URL`    | URL completa `mysql://user:pass@host:port/db` (Railway). Si se define, tiene prioridad. |
| `DB_HOST` … `DB_NAME` | Datos de conexión sueltos (alternativa a `MYSQL_URL`). |
| `PORT`         | Puerto del servidor (Railway lo asigna solo).            |
| `JWT_SECRET`   | Clave para firmar los tokens de sesión. **Cámbiala.**    |
| `JWT_EXPIRES`  | Duración del token (ej. `8h`).                           |
| `CORS_ORIGIN`  | Dominio del frontend permitido (`*` en desarrollo).      |

## Endpoints

Todas las rutas de datos requieren el header `Authorization: Bearer <token>`.

| Método | Ruta                          | Descripción                                  |
|--------|-------------------------------|----------------------------------------------|
| `GET`  | `/api/health`                 | Estado del servicio y de la BD.              |
| `POST` | `/api/login`                  | Login. Body: `{ username, password }` → `{ token }`. |
| `GET`  | `/api/categorias`             | Lista de categorías.                         |
| `GET`  | `/api/productos`              | Lista de productos (con `estado` calculado). |
| `GET`  | `/api/productos/:id`          | Un producto.                                 |
| `POST` | `/api/productos`              | Crear. Body: `{ name, category, stock, min, price }`. |
| `PUT`  | `/api/productos/:id`          | Editar (mismos campos).                      |
| `DELETE`| `/api/productos/:id`         | Eliminar.                                    |
| `GET`  | `/api/movimientos?tipo=`      | Historial (filtro opcional `Entrada`/`Salida`). |
| `POST` | `/api/movimientos/entrada`    | Registrar entrada. Body: `{ productId, qty }`. |
| `POST` | `/api/movimientos/salida`     | Registrar salida. Body: `{ productId, qty }`. |

Las entradas/salidas se hacen dentro de una **transacción** que actualiza el stock y registra el movimiento de forma atómica, e impiden que el stock quede negativo.

## Desplegar en Railway

1. En el mismo proyecto donde tienes el servicio **MySQL**, añade **New → GitHub Repo** (o *Empty Service*) apuntando a este repositorio; en *Settings → Root Directory* pon `backend`.
2. En **Variables** del servicio del backend, añade una referencia a la base:
   - `MYSQL_URL = ${{ MySQL.MYSQL_URL }}`  *(Railway autocompleta al escribir `${{`)*
   - `JWT_SECRET = <una cadena larga aleatoria>`
   - `CORS_ORIGIN = <dominio de tu frontend>`  (o `*` temporalmente)
3. Railway detecta Node, ejecuta `npm install` y `npm start` automáticamente.
4. Verifica en `https://<tu-backend>.up.railway.app/api/health` que diga `db: conectada`.

## Nota sobre el frontend

Este backend ya está listo, pero el frontend actual sigue guardando datos en `localStorage`. El siguiente paso es reemplazar esa capa por llamadas `fetch()` a esta API (login, productos, movimientos) usando la URL del backend de Railway.
