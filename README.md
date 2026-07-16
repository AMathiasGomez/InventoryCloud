# InventoryCloud

Sistema web de control de inventario para papelerías escolares, hecho en **HTML, CSS y JavaScript puro** (sin backend), usando `localStorage` / `sessionStorage` para persistir los datos.

## Características

- **Login de administrador** — usuario por defecto `admin` / `admin123` (se crea automáticamente en el primer inicio). Sesión protegida; todas las pantallas requieren sesión activa.
- **Inventario general** — listado de productos con stock, estado, búsqueda por nombre y filtro por categoría (Cuadernos, Escritura, Arte, Oficina).
- **Registrar producto** — nombre, categoría, cantidad inicial, stock mínimo y precio unitario, con validación.
- **Detalle / Editar producto** — edición y eliminación (con confirmación) de cada producto.
- **Entrada de stock** — registra mercancía que llega y suma al stock.
- **Salida de stock** — registra ventas/retiros y descuenta del stock (nunca negativo).
- **Alertas de stock bajo** — vista dedicada de productos por debajo del mínimo.
- **Historial de movimientos** — registro de todas las entradas y salidas, ordenable por fecha y filtrable por tipo.
- **Notificaciones** — campana en la barra superior con las alertas de stock bajo en tiempo real.

## Estructura

```
index.html    # Estructura de todas las pantallas
styles.css    # Estilos (tema ámbar/marrón, tipografía Plus Jakarta Sans)
app.js        # Lógica: navegación, CRUD, sesión, movimientos, notificaciones
```

## Uso

Abre `index.html` en un navegador, o sírvelo con cualquier servidor estático:

```bash
python -m http.server 8000
# luego visita http://localhost:8000
```

Inicia sesión con `admin` / `admin123`.
