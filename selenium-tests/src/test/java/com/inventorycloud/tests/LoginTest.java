package com.inventorycloud.tests;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pruebas automatizadas del login de InventoryCloud con Selenium + JUnit 5.
 *
 * URL objetivo: se toma de la variable de entorno BASE_URL; si no existe,
 * usa el despliegue de producción en Vercel.
 *
 * Requisitos: Java 17+, Maven y Google Chrome instalados. Selenium Manager
 * (incluido en Selenium 4) descarga el ChromeDriver automáticamente.
 */
public class LoginTest {

    private static final String BASE_URL =
            System.getenv().getOrDefault("BASE_URL", "https://inventory-cloud-zeta.vercel.app/");

    private WebDriver driver;
    private WebDriverWait wait;

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        // Modo headless (sin ventana). Quita esta línea si quieres ver el navegador.
        options.addArguments("--headless=new");
        options.addArguments("--window-size=1280,900");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        // Evita el popup del gestor de contraseñas de Chrome.
        options.addArguments("--disable-features=PasswordManagerEnabled,PasswordLeakDetection");

        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(25));
        driver.get(BASE_URL);

        // Espera a que la pantalla de login esté lista.
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("loginUser")));
    }

    @AfterEach
    void tearDown() {
        if (driver != null) {
            driver.quit();
        }
    }

    private void iniciarSesion(String usuario, String password) {
        driver.findElement(By.id("loginUser")).clear();
        driver.findElement(By.id("loginUser")).sendKeys(usuario);
        driver.findElement(By.id("loginPass")).clear();
        driver.findElement(By.id("loginPass")).sendKeys(password);
        driver.findElement(By.cssSelector("#loginForm button[type='submit']")).click();
    }

    @Test
    @DisplayName("Login exitoso: admin/admin123 entra al inventario general")
    void loginExitoso() {
        iniciarSesion("admin", "admin123");

        // Al iniciar sesión, aparece el panel principal (la barra de búsqueda del topbar).
        WebElement search = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.id("globalSearch")));
        assertTrue(search.isDisplayed(), "El panel principal debería mostrarse tras el login.");

        // La pantalla de login debe quedar oculta.
        boolean loginOculto = driver.findElement(By.id("loginScreen"))
                .getAttribute("class").contains("hidden");
        assertTrue(loginOculto, "La pantalla de login debería ocultarse tras el login.");

        // El título del dashboard debe estar visible.
        WebElement titulo = driver.findElement(By.cssSelector("#view-dashboard h1"));
        assertTrue(titulo.getText().contains("Inventario General"),
                "Debería verse el título 'Inventario General'.");
    }

    @Test
    @DisplayName("Login incorrecto: muestra mensaje de error y no entra")
    void loginIncorrecto() {
        iniciarSesion("admin", "claveIncorrecta");

        // Debe aparecer el mensaje de error.
        WebElement error = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.id("loginError")));
        assertTrue(error.getText().contains("Usuario o contraseña incorrectos"),
                "Debería mostrarse 'Usuario o contraseña incorrectos'.");

        // No debe haberse iniciado sesión: el panel principal sigue oculto.
        boolean appOculto = driver.findElement(By.id("appRoot"))
                .getAttribute("class").contains("hidden");
        assertTrue(appOculto, "La aplicación no debería mostrarse con credenciales incorrectas.");
    }

    @Test
    @DisplayName("Campos requeridos: no envía el formulario si faltan datos")
    void camposRequeridos() {
        // Enviar sin escribir nada.
        driver.findElement(By.cssSelector("#loginForm button[type='submit']")).click();

        // La validación nativa (required) impide el envío: seguimos en el login
        // y no aparece el mensaje de error del servidor.
        boolean loginVisible = !driver.findElement(By.id("loginScreen"))
                .getAttribute("class").contains("hidden");
        assertTrue(loginVisible, "Debería seguir en la pantalla de login.");

        boolean errorOculto = driver.findElement(By.id("loginError"))
                .getAttribute("class").contains("hidden");
        assertTrue(errorOculto, "No debería mostrarse el error del servidor sin enviar datos.");

        // Confirmamos que el campo usuario es obligatorio.
        boolean requerido = driver.findElement(By.id("loginUser")).getAttribute("required") != null;
        assertTrue(requerido, "El campo usuario debería ser obligatorio.");
    }
}
