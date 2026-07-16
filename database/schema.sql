-- =====================================================================
-- InventoryCloud - Base de datos
-- Sistema de control de inventario para papelerías escolares
-- Motor: MySQL / MariaDB
-- =====================================================================
-- Este script recrea, en una base de datos relacional, el modelo de
-- datos que la aplicación web maneja actualmente en localStorage:
--   - usuarios      (login del administrador)
--   - categorias    (Cuadernos, Escritura, Arte, Oficina)
--   - productos     (inventario)
--   - movimientos   (historial de entradas y salidas de stock)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Crear la base de datos y seleccionarla.
--
--  * LOCAL (MySQL Workbench):  deja estas dos líneas tal cual.
--  * RAILWAY: Railway ya te entrega una base llamada `railway` y el
--    usuario NO tiene permiso para crear otras. En ese caso COMENTA
--    (o borra) las dos líneas de abajo y en su lugar usa:  USE railway;
-- ---------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS inventorycloud
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE inventorycloud;
-- USE railway;   -- <-- descomenta esta línea al desplegar en Railway

-- Empezar limpio (útil al reimportar). Se borran en orden por las llaves foráneas.
DROP TABLE IF EXISTS movimientos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

-- ---------------------------------------------------------------------
-- Tabla: usuarios
-- Administradores que pueden iniciar sesión en el sistema.
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,   -- en producción, guardar el hash (bcrypt), no texto plano
  creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Tabla: categorias
-- Categorías de productos de la papelería.
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(50) NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------
-- Tabla: productos
-- Artículos del inventario.
--   stock       = cantidad actual disponible
--   stock_minimo= umbral para la alerta de "stock bajo"
--   precio      = precio unitario
-- ---------------------------------------------------------------------
CREATE TABLE productos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(120)   NOT NULL,
  categoria_id  INT            NOT NULL,
  stock         INT            NOT NULL DEFAULT 0,
  stock_minimo  INT            NOT NULL DEFAULT 0,
  precio        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  creado_en     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT chk_stock_no_negativo   CHECK (stock >= 0),
  CONSTRAINT chk_minimo_no_negativo  CHECK (stock_minimo >= 0),
  CONSTRAINT chk_precio_no_negativo  CHECK (precio >= 0)
);

CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_nombre     ON productos(nombre);

-- ---------------------------------------------------------------------
-- Tabla: movimientos
-- Historial de entradas y salidas de stock.
--   tipo     = 'Entrada' (compra/reposición) o 'Salida' (venta/retiro)
--   cantidad = unidades movidas
-- Se conserva producto_id (FK) para relación, y producto_nombre como
-- copia histórica por si el producto se elimina o se renombra.
-- ---------------------------------------------------------------------
CREATE TABLE movimientos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  producto_id     INT          NULL,
  producto_nombre VARCHAR(120) NOT NULL,
  tipo            ENUM('Entrada','Salida') NOT NULL,
  cantidad        INT          NOT NULL,
  fecha           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimientos_producto
    FOREIGN KEY (producto_id) REFERENCES productos(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0)
);

CREATE INDEX idx_movimientos_producto ON movimientos(producto_id);
CREATE INDEX idx_movimientos_fecha    ON movimientos(fecha);
CREATE INDEX idx_movimientos_tipo     ON movimientos(tipo);

-- =====================================================================
-- DATOS INICIALES (equivalentes a los que crea la app por defecto)
-- =====================================================================

-- Usuario administrador por defecto (admin / admin123)
INSERT INTO usuarios (username, password) VALUES
  ('admin', 'admin123');

-- Categorías
INSERT INTO categorias (nombre) VALUES
  ('Cuadernos'),
  ('Escritura'),
  ('Arte'),
  ('Oficina');

-- Productos de ejemplo (mismos que trae la aplicación)
INSERT INTO productos (nombre, categoria_id, stock, stock_minimo, precio) VALUES
  ('Cuaderno Premium A4',         (SELECT id FROM categorias WHERE nombre = 'Cuadernos'),  45, 15, 3.50),
  ('Bolígrafo Azul Punta Fina',   (SELECT id FROM categorias WHERE nombre = 'Escritura'),   8, 20, 0.80),
  ('Set de Acuarelas 12 colores', (SELECT id FROM categorias WHERE nombre = 'Arte'),       12, 10, 6.20),
  ('Papel Bond A4 80g (Resma)',   (SELECT id FROM categorias WHERE nombre = 'Oficina'),   150, 30, 4.00),
  ('Lápiz Mecánico 0.5mm',        (SELECT id FROM categorias WHERE nombre = 'Escritura'),   4, 40, 1.20),
  ('Marcadores Punta Fina x12',   (SELECT id FROM categorias WHERE nombre = 'Arte'),       25, 10, 5.50);

-- =====================================================================
-- CONSULTAS ÚTILES (referencia para el backend / reportes)
-- =====================================================================

-- Inventario general con nombre de categoría y estado calculado
-- SELECT p.id, p.nombre, c.nombre AS categoria, p.stock, p.stock_minimo, p.precio,
--        CASE WHEN p.stock < p.stock_minimo THEN 'Stock bajo' ELSE 'En stock' END AS estado
-- FROM productos p
-- JOIN categorias c ON c.id = p.categoria_id
-- ORDER BY p.nombre;

-- Productos con stock bajo (para la pantalla de alertas)
-- SELECT p.nombre, c.nombre AS categoria, p.stock, p.stock_minimo
-- FROM productos p
-- JOIN categorias c ON c.id = p.categoria_id
-- WHERE p.stock < p.stock_minimo;

-- Historial de movimientos, más reciente primero
-- SELECT fecha, producto_nombre, tipo, cantidad
-- FROM movimientos
-- ORDER BY fecha DESC;

-- Valor total estimado del inventario
-- SELECT SUM(stock * precio) AS valor_inventario FROM productos;

-- =====================================================================
-- PROCEDIMIENTOS ALMACENADOS
-- Replican la lógica de negocio de la app (entrada/salida de stock)
-- de forma atómica: actualizan el producto y registran el movimiento.
-- =====================================================================
DELIMITER //

-- Registrar entrada de stock (compra / reposición)
CREATE PROCEDURE registrar_entrada (IN p_producto_id INT, IN p_cantidad INT)
BEGIN
  DECLARE v_nombre VARCHAR(120);

  IF p_cantidad <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cantidad debe ser mayor a 0.';
  END IF;

  SELECT nombre INTO v_nombre FROM productos WHERE id = p_producto_id;
  IF v_nombre IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El producto no existe.';
  END IF;

  START TRANSACTION;
    UPDATE productos SET stock = stock + p_cantidad WHERE id = p_producto_id;
    INSERT INTO movimientos (producto_id, producto_nombre, tipo, cantidad)
    VALUES (p_producto_id, v_nombre, 'Entrada', p_cantidad);
  COMMIT;
END //

-- Registrar salida de stock (venta / retiro). Evita que el stock quede negativo.
CREATE PROCEDURE registrar_salida (IN p_producto_id INT, IN p_cantidad INT)
BEGIN
  DECLARE v_nombre VARCHAR(120);
  DECLARE v_stock  INT;

  IF p_cantidad <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cantidad debe ser mayor a 0.';
  END IF;

  SELECT nombre, stock INTO v_nombre, v_stock FROM productos WHERE id = p_producto_id;
  IF v_nombre IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El producto no existe.';
  END IF;

  IF p_cantidad > v_stock THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El stock no puede ser negativo: la cantidad supera el stock actual.';
  END IF;

  START TRANSACTION;
    UPDATE productos SET stock = stock - p_cantidad WHERE id = p_producto_id;
    INSERT INTO movimientos (producto_id, producto_nombre, tipo, cantidad)
    VALUES (p_producto_id, v_nombre, 'Salida', p_cantidad);
  COMMIT;
END //

DELIMITER ;

-- Ejemplos de uso:
-- CALL registrar_entrada(1, 20);   -- suma 20 unidades al producto 1
-- CALL registrar_salida(1, 5);     -- descuenta 5 unidades del producto 1
