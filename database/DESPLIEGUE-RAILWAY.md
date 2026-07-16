# Despliegue de la base de datos en Railway (con MySQL Workbench)

Guía para alojar la base de datos de InventoryCloud en [Railway](https://railway.app) y administrarla desde MySQL Workbench.

---

## 1. Crear el servicio MySQL en Railway

1. Entra a [railway.app](https://railway.app) e inicia sesión (puedes usar tu cuenta de GitHub).
2. **New Project** → **Provision MySQL** (o *Add a service* → *Database* → *MySQL*).
3. Railway crea la base de datos y una base vacía llamada **`railway`** ya lista para usar.

## 2. Obtener los datos de conexión

En el servicio MySQL, abre la pestaña **Variables** (o **Connect**). Verás algo como:

| Variable         | Ejemplo                        | Para Workbench       |
|------------------|--------------------------------|----------------------|
| `MYSQLHOST`      | `monorail.proxy.rlwy.net`      | Hostname             |
| `MYSQLPORT`      | `38472`                        | Port                 |
| `MYSQLUSER`      | `root`                         | Username             |
| `MYSQLPASSWORD`  | `xxxxxxxxxxxx`                 | Password             |
| `MYSQLDATABASE`  | `railway`                      | Default Schema       |

> **Importante:** para conectarte desde tu PC usa el **host y puerto público** (el que termina en `.proxy.rlwy.net` o `containers-*.railway.app`), NO el interno (`mysql.railway.internal`), que solo funciona entre servicios dentro de Railway.

## 3. Conectar MySQL Workbench

1. Abre Workbench → **+** junto a *MySQL Connections*.
2. Rellena:
   - **Connection Name:** `InventoryCloud - Railway`
   - **Hostname:** el `MYSQLHOST` público
   - **Port:** el `MYSQLPORT` público
   - **Username:** `root`
   - **Password:** *Store in Vault…* → pega `MYSQLPASSWORD`
3. **Test Connection** → debe decir *Successfully made the MySQL connection*.
4. **OK** y abre la conexión.

## 4. Importar el esquema

1. Abre el archivo [`schema.sql`](schema.sql) en Workbench (*File → Open SQL Script*).
2. **Antes de ejecutar**, ajústalo para Railway:
   - **Comenta** el bloque `CREATE DATABASE ... ;` y la línea `USE inventorycloud;`.
   - **Descomenta** la línea `USE railway;`.
   (Están señaladas con comentarios en el propio archivo.)
3. Ejecuta el script con el rayo ⚡ (*Execute all*).
4. Refresca el *Schemas* del panel izquierdo: dentro de `railway` verás las tablas `usuarios`, `categorias`, `productos`, `movimientos` y los procedimientos `registrar_entrada` / `registrar_salida`.

## 5. Verificar

```sql
USE railway;
SELECT * FROM productos;
CALL registrar_entrada(1, 20);   -- prueba: suma 20 al producto 1
SELECT stock FROM productos WHERE id = 1;
```

---

## ⚠️ Nota importante sobre el despliegue completo

Alojar la base de datos en Railway **no basta** para que la app web la use tal como está hoy.

La aplicación actual es **100% frontend** (HTML/CSS/JS) y guarda los datos en `localStorage` del navegador. **Un navegador no puede conectarse directamente a MySQL** (ni sería seguro exponer la contraseña de la base de datos en el código del navegador).

Para que InventoryCloud realmente lea/escriba en la base de Railway falta una pieza intermedia: un **backend / API** (por ejemplo Node.js + Express, o PHP) que:

1. Se conecte a MySQL usando las variables de Railway.
2. Exponga endpoints (`GET /productos`, `POST /movimientos`, etc.).
3. Y que el frontend consuma esos endpoints con `fetch()` en lugar de `localStorage`.

Ese backend también se puede desplegar en Railway como un segundo servicio, junto a la base de datos.

**Resumen del despliegue completo:**

```
[ Frontend (este proyecto) ]  →  [ Backend/API Node o PHP ]  →  [ MySQL en Railway ]
        fetch()                        conexión SQL
```

Si quieres, el siguiente paso puede ser crear ese backend (API en Node.js/Express) y conectar la interfaz para dejar el despliegue 100% funcional.
