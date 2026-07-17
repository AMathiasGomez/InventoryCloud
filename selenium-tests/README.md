# Pruebas automatizadas (Selenium + JUnit)

Pruebas end-to-end del **login** de InventoryCloud con **Selenium WebDriver**,
**JUnit 5** y **Maven**.

## Requisitos

- **Java 17+** (probado con JDK 21).
- **Maven 3.9+**.
- **Google Chrome** instalado. Selenium Manager (incluido en Selenium 4)
  descarga el ChromeDriver correcto automáticamente, no hay que instalarlo.

## Casos de prueba (`LoginTest.java`)

| Prueba | Qué valida |
|--------|------------|
| `loginExitoso` | Con `admin` / `admin123` entra y muestra el "Inventario General". |
| `loginIncorrecto` | Con credenciales incorrectas muestra "Usuario o contraseña incorrectos" y no inicia sesión. |
| `camposRequeridos` | El formulario no se envía si faltan datos (validación `required`). |

## Ejecutar

Desde esta carpeta (`selenium-tests`):

```bash
mvn test
```

Por defecto corre contra el despliegue de producción en Vercel
(`https://inventory-cloud-zeta.vercel.app/`).

### Elegir otro entorno

La URL se toma de la variable de entorno `BASE_URL`. Por ejemplo, para
probar contra el backend local (con `npm start` corriendo):

```bash
# Windows (PowerShell)
$env:BASE_URL = "http://localhost:3000/"; mvn test

# Linux / macOS
BASE_URL="http://localhost:3000/" mvn test
```

### Ver el navegador (modo no headless)

Por defecto las pruebas corren en *headless* (sin ventana). Para verlas,
comenta la línea `options.addArguments("--headless=new");` en
`src/test/java/com/inventorycloud/tests/LoginTest.java`.

## Notas

- Las advertencias `Unable to find CDP implementation matching ...` son
  inofensivas: aparecen cuando tu versión de Chrome es más nueva que el
  CDP incluido en Selenium; no afectan estas pruebas.
- Los resultados detallados quedan en `target/surefire-reports/`.
