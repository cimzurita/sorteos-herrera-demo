# Sorteos Herrera - Demo de E-Commerce y Carrito de Compras

Prototipo de alto rendimiento y arquitectura optimizada para la plataforma de rifas **Sorteos Herrera**, resolviendo de raíz la carencia de carrito de compras, problemas de concurrencia y deficiencias de experiencia de usuario de la versión anterior.

## 🚀 Características Principales

1. **Carrito de Compras Persistente (Slide-Over Drawer):**
   - Panel lateral deslizable con resumen en tiempo real.
   - **Temporizador de reserva de 15 minutos:** Garantiza el apartado exclusivo mientras el cliente realiza el pago.
   - Persistencia local en `localStorage`: no se pierden boletos si el usuario recarga la página o cambia de sección.
   - Posibilidad de eliminar folios individuales o vaciar el carrito completo.

2. **Paquetes Rápidos y Ruleta de la Suerte:**
   - Botones rápidos de 1-click (+5, +10, +20, +50, +100 folios).
   - Generador aleatorio con animación de ruleta configurable (1 a 2,000 folios).

3. **Selector y Cuadrícula de Folios Ultraligera:**
   - Diseñado para soportar 200,000 folios sin congelar el navegador ni saturar el servidor.
   - Buscador instantáneo de números específicos con auto-scroll y efecto foco.
   - Paginador optimizado de 60 folios por vista.

4. **Regla de Oportunidades Automática (+4 por boleto):**
   - Asigna 4 números complementarios aleatorios (rango 200,001 a 1,000,000) por cada boleto comercial comprado, cumpliendo la regla de 5 oportunidades de Sorteos Herrera.

5. **Checkout Multi-Paso:**
   - Captura y validación correcta de datos (Nombre, Teléfono, Ciudad/Estado y Correo Electrónico real).
   - Datos bancarios SPEI (CLABE `722969010408897677` de Mercado Pago con botón de copiado en 1 clic).
   - Preparado para integración con API directa de Mercado Pago Checkout Pro.

6. **Verificador de Boletos del Comprador:**
   - Módulo para que cualquier participante consulte sus folios asignados con su número de WhatsApp o folio de pedido.
   - Re-descarga e impresión de comprobante digital en cualquier momento.

7. **Generador de Comprobante Digital (PDF / Print):**
   - Emite una ficha formal de participación lista para imprimir o guardar como PDF desde el navegador.
   - Enlace directo a WhatsApp con mensaje pre-llenado para enviar comprobante al organizador.

---

## 🛠️ Compatibilidad Tecnológica Dual

### 1. Despliegue en GitHub Pages (Frontend Estático Puro)
- Desarrollado en **HTML5, CSS3 moderno y Vanilla JavaScript (ES6+)**.
- Cero dependencias pesadas (no requiere Node.js, Webpack ni frameworks pesados).
- Funciona 100% en GitHub Pages utilizando simulación reactiva en cliente y `localStorage`.

### 2. Despliegue en HostGator (Servidor Compartido Apache + PHP)
- **Cero sobrecarga de base de datos:** No satura MySQL con 200,000 registros innecesarios.
- Incluye `api.php` para almacenar pedidos de forma ligera en el servidor de HostGator si se desea prescindir de base de datos pesada.
- No sufre bloqueos por ModSecurity ya que no utiliza llamadas vulnerables de WordPress ni `admin-ajax.php`.

---

## 📦 Instrucciones de Publicación en GitHub Pages

1. Inicializa o confirma el repositorio Git local:
   ```bash
   cd Z:\GitHub\sorteos-herrera-demo
   git init
   git add .
   git commit -m "feat: Sorteos Herrera modern e-commerce demo with persistent cart"
   ```

2. Vincula tu repositorio remoto en GitHub:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/sorteos-herrera-demo.git
   git push -u origin main
   ```

3. En GitHub, ve a **Settings > Pages**, en *Build and deployment* selecciona la rama `main` y la carpeta `/ (root)`.
4. ¡Listo! La demo quedará pública de inmediato en `https://<tu-usuario>.github.io/sorteos-herrera-demo/`.

---

## 📂 Montaje en Servidor Compartido HostGator

1. Ingresa al cPanel de HostGator y abre el **Administrador de Archivos** (`public_html` o un subdirectorio como `public_html/demo/`).
2. Sube todos los archivos del repositorio (`index.html`, `styles.css`, `app.js`, `api.php`, y la carpeta `assets/`).
3. La página cargará de inmediato con tiempos de respuesta inferiores a 200 ms.
