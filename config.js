// Configuración del frontend: URL base de la API.
//
// Por defecto usa una ruta relativa ('/api'), que funciona cuando el
// backend sirve también el frontend (mismo dominio) — tanto en local
// (http://localhost:3000) como desplegado en Railway.
//
// Solo cambia esto a una URL completa si alojas el frontend en un
// dominio DISTINTO al del backend, por ejemplo:
//   window.INVENTORY_API_URL = 'https://inventorycloud-api.up.railway.app/api';
window.INVENTORY_API_URL = '/api';
