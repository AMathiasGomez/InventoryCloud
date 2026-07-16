# Base de datos — InventoryCloud

Script SQL (`schema.sql`) que recrea el modelo de datos de la aplicación en una base de datos relacional **MySQL / MariaDB**.

## Contenido

- **Tablas:** `usuarios`, `categorias`, `productos`, `movimientos` (con llaves foráneas, índices y restricciones `CHECK`).
- **Datos iniciales:** usuario `admin` / `admin123`, las 4 categorías y los 6 productos de ejemplo que trae la app.
- **Procedimientos almacenados:** `registrar_entrada` y `registrar_salida`, que actualizan el stock y registran el movimiento de forma atómica (misma lógica que la interfaz web).
- **Consultas de referencia** (comentadas) para inventario general, alertas de stock bajo, historial y valor del inventario.

## Cómo importarlo

```bash
# Desde la línea de comandos de MySQL
mysql -u root -p < schema.sql
```

O desde un cliente como MySQL Workbench / phpMyAdmin: abrir `schema.sql` y ejecutarlo.

El script crea la base de datos `inventorycloud` si no existe y la deja lista para usar.

## Relación con la app

La aplicación web actual persiste los datos en `localStorage`/`sessionStorage` (sin backend). Este esquema es la base para, más adelante, conectar la interfaz a un backend real (por ejemplo Node.js/PHP) que lea y escriba en esta base de datos en lugar del navegador.

> Nota de seguridad: en producción, la contraseña del usuario no debe guardarse en texto plano. Almacena el hash (por ejemplo `bcrypt`) en la columna `password`.
