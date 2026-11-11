/**
 * SORTEOS HERRERA - CORE E-COMMERCE ENGINE & SHOPPING CART
 * Compatible con GitHub Pages (Frontend Reactivo Autónomo) y HostGator (Apache/PHP).
 */

(function () {
  'use strict';

  // Configuración Global del Sorteo
  const CONFIG = {
    TOTAL_FOLIOS: 200000,
    PRICE_PER_FOLIO: 5.0,
    CURRENCY: 'MXN',
    DRAW_DATE: '2026-12-24T20:00:00-06:00',
    MIN_THRESHOLD_PCT: 70,
    SECOND_PRIZE_PCT: 85,
    HOLD_MINUTES: 15,
    PER_PAGE: 60,
    CLABE: '722969010408897677',
    BENEFICIARY: 'Oscar Henoc Herrera Ayala',
    BANK: 'Mercado Pago Wallet',
    WHATSAPP: '524431234567', // Teléfono representativo de soporte
    STORAGE_KEYS: {
      CART: 'SH_CART_FOLIOS_V1',
      EXPIRY: 'SH_CART_EXPIRY_V1',
      ORDERS: 'SH_USER_ORDERS_V1'
    }
  };

  /* ==========================================================================
     1. GESTOR DE ESTADO DEL CARRITO (CART STATE & LOCALSTORAGE)
     ========================================================================== */
  class CartManager {
    constructor() {
      this.items = new Set();
      this.expiryTimestamp = null;
      this.timerInterval = null;
      this.load();
    }

    load() {
      try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.CART);
        const expiry = localStorage.getItem(CONFIG.STORAGE_KEYS.EXPIRY);
        if (saved && expiry) {
          const now = Date.now();
          if (now < Number(expiry)) {
            const parsed = JSON.parse(saved);
            this.items = new Set(parsed);
            this.expiryTimestamp = Number(expiry);
            this.startTimer();
          } else {
            this.clear();
          }
        }
      } catch (e) {
        console.warn('Error al cargar carrito desde localStorage:', e);
      }
    }

    save() {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(Array.from(this.items)));
        if (this.expiryTimestamp) {
          localStorage.setItem(CONFIG.STORAGE_KEYS.EXPIRY, String(this.expiryTimestamp));
        } else {
          localStorage.removeItem(CONFIG.STORAGE_KEYS.EXPIRY);
        }
      } catch (e) {
        console.warn('Error al guardar carrito:', e);
      }
    }

    add(folio) {
      const num = Number(folio);
      if (isNaN(num) || num < 1 || num > CONFIG.TOTAL_FOLIOS) return false;
      if (this.items.has(num)) return false;

      this.items.add(num);
      if (!this.expiryTimestamp) {
        this.resetExpiry();
      }
      this.save();
      this.notify();
      return true;
    }

    addBatch(folios) {
      let added = 0;
      folios.forEach(f => {
        const num = Number(f);
        if (!isNaN(num) && num >= 1 && num <= CONFIG.TOTAL_FOLIOS && !this.items.has(num)) {
          this.items.add(num);
          added++;
        }
      });
      if (added > 0 && !this.expiryTimestamp) {
        this.resetExpiry();
      }
      this.save();
      this.notify();
      return added;
    }

    remove(folio) {
      const num = Number(folio);
      const res = this.items.delete(num);
      if (this.items.size === 0) {
        this.clearTimer();
      }
      this.save();
      this.notify();
      return res;
    }

    clear() {
      this.items.clear();
      this.clearTimer();
      this.save();
      this.notify();
    }

    has(folio) {
      return this.items.has(Number(folio));
    }

    getCount() {
      return this.items.size;
    }

    getTotalAmount() {
      return this.items.size * CONFIG.PRICE_PER_FOLIO;
    }

    resetExpiry() {
      this.expiryTimestamp = Date.now() + CONFIG.HOLD_MINUTES * 60 * 1000;
      this.startTimer();
    }

    startTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.updateTimerDisplay();
      this.timerInterval = setInterval(() => {
        this.updateTimerDisplay();
      }, 1000);
    }

    clearTimer() {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.expiryTimestamp = null;
      this.updateTimerDisplay();
    }

    updateTimerDisplay() {
      const timerEl = document.getElementById('cartTimerCount');
      if (!timerEl) return;

      if (!this.expiryTimestamp || this.items.size === 0) {
        timerEl.textContent = '15:00';
        return;
      }

      const diff = this.expiryTimestamp - Date.now();
      if (diff <= 0) {
        this.clear();
        showToast('⚠️ Tu reserva de 15 minutos ha expirado. Selecciona tus folios nuevamente.');
        return;
      }

      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    notify() {
      updateCartUI();
      updateGridSelection();
    }
  }

  const cart = new CartManager();

  /* ==========================================================================
     2. MOTOR DE FOLIOS Y GRID (MOCK DATA REACTIVA Y OPTIMIZADA)
     ========================================================================== */
  class FoliosEngine {
    constructor() {
      this.currentPage = 1;
      this.totalPages = Math.ceil(CONFIG.TOTAL_FOLIOS / CONFIG.PER_PAGE);
      this.busyFolios = new Set();
      this.initSimulatedBusy();
    }

    initSimulatedBusy() {
      // Simular folios apartados/vendidos para darle vida real a la demo
      const baseSeed = [3, 7, 14, 28, 45, 89, 102, 115, 140, 199, 250, 412, 580, 777, 888, 999, 1200, 1540];
      baseSeed.forEach(n => this.busyFolios.add(n));
    }

    getPageItems(page) {
      const start = (page - 1) * CONFIG.PER_PAGE + 1;
      const end = Math.min(start + CONFIG.PER_PAGE - 1, CONFIG.TOTAL_FOLIOS);
      const items = [];
      for (let i = start; i <= end; i++) {
        items.push({
          folio: i,
          isBusy: this.busyFolios.has(i),
          isSelected: cart.has(i)
        });
      }
      return items;
    }

    getRandomAvailable(count) {
      const available = [];
      let attempts = 0;
      const maxAttempts = count * 20;

      while (available.length < count && attempts < maxAttempts) {
        attempts++;
        const rand = Math.floor(Math.random() * CONFIG.TOTAL_FOLIOS) + 1;
        if (!this.busyFolios.has(rand) && !cart.has(rand) && !available.includes(rand)) {
          available.push(rand);
        }
      }
      return available;
    }
  }

  const engine = new FoliosEngine();

  /* ==========================================================================
     3. ACTUALIZACIÓN DE UI: CARRITO, BADGE Y DRAWER
     ========================================================================== */
  function updateCartUI() {
    const count = cart.getCount();
    const total = cart.getTotalAmount();

    // Actualizar badges
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
    });

    document.querySelectorAll('.cart-total-badge').forEach(el => {
      el.textContent = `$${total.toFixed(2)} MXN`;
    });

    // Actualizar Drawer
    const drawerList = document.getElementById('cartDrawerList');
    const emptyState = document.getElementById('cartEmptyState');
    const drawerTotal = document.getElementById('cartDrawerTotal');
    const drawerCount = document.getElementById('cartDrawerCount');
    const checkoutBtn = document.getElementById('cartCheckoutBtn');
    const clearBtn = document.getElementById('cartClearBtn');

    if (drawerTotal) drawerTotal.textContent = `$${total.toFixed(2)} MXN`;
    if (drawerCount) drawerCount.textContent = `${count} boleto${count === 1 ? '' : 's'}`;

    if (count === 0) {
      if (drawerList) drawerList.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      if (checkoutBtn) checkoutBtn.disabled = true;
      if (clearBtn) clearBtn.disabled = true;
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (checkoutBtn) checkoutBtn.disabled = false;
    if (clearBtn) clearBtn.disabled = false;

    if (drawerList) {
      const sorted = Array.from(cart.items).sort((a, b) => a - b);
      drawerList.innerHTML = sorted.map(num => `
        <div class="cart-item" data-folio="${num}">
          <div class="cart-item-info">
            <span class="cart-item-number">#${String(num).padStart(6, '0')}</span>
            <span class="cart-item-bonus">+4 Oportunidades extra incluidas</span>
          </div>
          <div style="display:flex; align-items:center;">
            <span class="cart-item-price">$${CONFIG.PRICE_PER_FOLIO.toFixed(2)}</span>
            <button class="btn-remove-item" onclick="window.removeFolioFromCart(${num})" title="Eliminar boleto">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  function updateGridSelection() {
    document.querySelectorAll('.ticket-chip').forEach(chip => {
      const folio = Number(chip.dataset.folio);
      if (cart.has(folio)) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    });
  }

  /* ==========================================================================
     4. RENDERIZADO DEL SELECTOR DE FOLIOS
     ========================================================================== */
  function renderTicketsGrid(page = 1) {
    const grid = document.getElementById('ticketsGrid');
    const pageLabel = document.getElementById('pageIndicator');
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    if (!grid) return;

    engine.currentPage = page;
    const items = engine.getPageItems(page);

    grid.innerHTML = items.map(item => {
      const classes = ['ticket-chip'];
      if (item.isBusy) classes.push('busy');
      if (item.isSelected) classes.push('selected');
      return `
        <button class="${classes.join(' ')}" 
                data-folio="${item.folio}" 
                ${item.isBusy ? 'disabled' : ''} 
                onclick="window.toggleTicket(${item.folio})">
          ${String(item.folio).padStart(6, '0')}
        </button>
      `;
    }).join('');

    if (pageLabel) pageLabel.textContent = `Página ${page.toLocaleString()} de ${engine.totalPages.toLocaleString()}`;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= engine.totalPages;
  }

  /* ==========================================================================
     5. TOAST NOTIFICATIONS & FEEDBACK
     ========================================================================== */
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : 'ℹ️'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  /* ==========================================================================
     6. CHECKOUT Y GENERADOR DE COMPROBANTES
     ========================================================================== */
  function initCheckout() {
    const form = document.getElementById('checkoutForm');
    const modal = document.getElementById('checkoutModal');
    if (!form || !modal) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (cart.getCount() === 0) {
        showToast('El carrito está vacío. Elige tus boletos antes de pagar.', 'error');
        return;
      }

      const name = document.getElementById('custName').value.trim();
      const phone = document.getElementById('custPhone').value.trim();
      const city = document.getElementById('custCity').value.trim();
      const email = document.getElementById('custEmail').value.trim();
      const paymentMethod = document.querySelector('.payment-tab.active')?.dataset.method || 'spei';

      if (!name || !phone || !city || !email) {
        showToast('Por favor completa todos los campos requeridos.', 'error');
        return;
      }

      // Generar ID de pedido único
      const orderRef = 'SH-' + Math.floor(100000 + Math.random() * 900000);
      const purchasedFolios = Array.from(cart.items).sort((a, b) => a - b);

      // Generar 4 folios complementarios por cada boleto comercial (regla oficial de Sorteos Herrera)
      const bonusOpportunities = [];
      purchasedFolios.forEach(baseFolio => {
        for (let i = 0; i < 4; i++) {
          const bonus = Math.floor(200001 + Math.random() * 799999);
          bonusOpportunities.push(bonus);
        }
      });

      const totalAmount = cart.getTotalAmount();
      const dateStr = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

      const orderData = {
        ref: orderRef,
        date: dateStr,
        name,
        phone,
        city,
        email,
        paymentMethod,
        folios: purchasedFolios,
        bonusFolios: bonusOpportunities,
        total: totalAmount,
        status: paymentMethod === 'mercadopago_auto' ? 'Pagado y Confirmado' : 'Pendiente de Validación SPEI'
      };

      // Guardar en historial local (simulación de backend)
      saveOrderToStorage(orderData);

      // Mostrar pantalla de éxito
      showOrderSuccess(orderData);

      // Vaciar carrito
      cart.clear();
      closeCartDrawer();
    });
  }

  function saveOrderToStorage(order) {
    try {
      const orders = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ORDERS) || '[]');
      orders.unshift(order);
      localStorage.setItem(CONFIG.STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.warn('Error al guardar orden:', e);
    }
  }

  function showOrderSuccess(order) {
    const modalBody = document.getElementById('checkoutModalBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="success-screen">
        <div class="success-icon">✓</div>
        <h3 style="color:#fff; margin-bottom:0.25rem;">¡Solicitud Registrada con Éxito!</h3>
        <p style="color:var(--text-muted); font-size:0.9rem;">Conserva tu número de pedido para cualquier aclaración:</p>
        
        <div class="order-badge-ref">${order.ref}</div>

        <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.25rem; text-align:left; font-size:0.85rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
            <span style="color:var(--text-dim);">Participante:</span>
            <strong style="color:#fff;">${order.name}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
            <span style="color:var(--text-dim);">WhatsApp / Teléfono:</span>
            <strong style="color:#fff;">${order.phone}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
            <span style="color:var(--text-dim);">Boletos Comerciales:</span>
            <strong style="color:var(--gold-200);">${order.folios.length} boletos</strong>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
            <span style="color:var(--text-dim);">Total a Transferir:</span>
            <strong style="color:var(--gold-200); font-size:1.1rem;">$${order.total.toFixed(2)} MXN</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-dim);">Estado:</span>
            <span style="color:${order.paymentMethod === 'mercadopago_auto' ? 'var(--green-400)' : 'var(--gold-500)'}; font-weight:700;">
              ${order.status}
            </span>
          </div>
        </div>

        <div class="bonus-tickets-card">
          <h5>🎟️ Folios Comerciales Seleccionados:</h5>
          <div class="bonus-pills" style="margin-bottom:0.75rem;">
            ${order.folios.map(f => `<span class="bonus-pill" style="border-color:var(--gold-500); color:var(--gold-200);">#${String(f).padStart(6, '0')}</span>`).join('')}
          </div>

          <h5>🌟 Oportunidades Adicionales Asignadas (+4 por boleto):</h5>
          <div class="bonus-pills">
            ${order.bonusFolios.map(f => `<span class="bonus-pill">#${String(f).padStart(6, '0')}</span>`).join('')}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:1.5rem;">
          <button type="button" class="btn btn-secondary" onclick="window.printTicketVoucher('${order.ref}')">
            🖨️ Descargar Comprobante
          </button>
          <a href="https://api.whatsapp.com/send?phone=${CONFIG.WHATSAPP}&text=${encodeURIComponent(`Hola Sorteos Herrera, registré mi pedido ${order.ref} con ${order.folios.length} boletos por un total de $${order.total} MXN. Envío mi comprobante.`)}" 
             target="_blank" class="btn btn-accent">
            📱 Notificar por WhatsApp
          </a>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     7. VERIFICADOR DE BOLETOS (CONSULTA POR TELÉFONO O PEDIDO)
     ========================================================================== */
  function initVerifier() {
    const form = document.getElementById('verifierForm');
    const resultBox = document.getElementById('verifierResult');
    if (!form || !resultBox) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const query = document.getElementById('verifierInput').value.trim();
      if (!query) return;

      const orders = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ORDERS) || '[]');
      const matches = orders.filter(o => 
        o.phone.includes(query) || 
        o.ref.toLowerCase().includes(query.toLowerCase()) ||
        o.folios.some(f => String(f) === query || String(f).padStart(6, '0') === query)
      );

      resultBox.classList.add('active');
      if (matches.length === 0) {
        resultBox.innerHTML = `
          <div style="text-align:center; padding:1.5rem; background:var(--bg-surface); border-radius:var(--radius-md); border:1px solid rgba(255,255,255,0.08);">
            <p style="color:var(--text-muted); margin-bottom:0.5rem;">No se encontraron pedidos registrados con el criterio: <strong>${query}</strong></p>
            <small style="color:var(--text-dim);">Verifica tu número de WhatsApp de 10 dígitos o tu folio de pedido (ej. SH-123456).</small>
          </div>
        `;
        return;
      }

      resultBox.innerHTML = matches.map(order => `
        <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1.25rem; margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <strong style="color:var(--gold-200); font-family:var(--font-mono); font-size:1.1rem;">${order.ref}</strong>
            <span style="font-size:0.78rem; padding:0.2rem 0.6rem; border-radius:4px; background:#121e16; color:var(--green-400); border:1px solid var(--border-green);">
              ${order.status}
            </span>
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem;">
            <strong>Titular:</strong> ${order.name} | <strong>Fecha:</strong> ${order.date}
          </p>
          <div style="font-size:0.82rem; margin-bottom:0.75rem;">
            <span style="color:var(--text-dim);">Folios Comerciales (${order.folios.length}):</span>
            <div style="display:flex; flex-wrap:wrap; gap:0.3rem; margin-top:0.25rem;">
              ${order.folios.map(f => `<span class="bonus-pill" style="border-color:var(--gold-500); color:var(--gold-200);">#${String(f).padStart(6, '0')}</span>`).join('')}
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="window.printTicketVoucher('${order.ref}')">
            🖨️ Re-descargar Comprobante
          </button>
        </div>
      `).join('');
    });
  }

  /* ==========================================================================
     8. IMPRESIÓN Y DESCARGA DE COMPROBANTE DIGITAL
     ========================================================================== */
  window.printTicketVoucher = function (orderRef) {
    const orders = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ORDERS) || '[]');
    const order = orders.find(o => o.ref === orderRef);
    if (!order) {
      showToast('No se encontró el pedido para imprimir.', 'error');
      return;
    }

    const w = window.open('', '_blank');
    if (!w) {
      alert('Por favor permite las ventanas emergentes para generar el comprobante.');
      return;
    }

    const folioRows = [];
    for (let i = 0; i < order.folios.length; i += 6) {
      folioRows.push('<tr>' + order.folios.slice(i, i + 6).map(n => `<td style="border:1px solid #ddd; padding:8px; font-weight:bold; font-family:monospace; font-size:15px; color:#087b4d;">${String(n).padStart(6, '0')}</td>`).join('') + '</tr>');
    }

    const bonusRows = [];
    for (let i = 0; i < order.bonusFolios.length; i += 6) {
      bonusRows.push('<tr>' + order.bonusFolios.slice(i, i + 6).map(n => `<td style="border:1px solid #eee; padding:6px; font-family:monospace; font-size:12px; color:#444;">${String(n).padStart(6, '0')}</td>`).join('') + '</tr>');
    }

    const html = `
      <!doctype html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Comprobante ${order.ref} - Sorteos Herrera</title>
        <style>
          body { font: 14px Arial, sans-serif; color: #111; margin: 30px; background: #fff; }
          .header { border-bottom: 3px solid #d6b45f; padding-bottom: 12px; margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center; }
          .title { font-size: 24px; font-weight: 900; color: #087b4d; margin: 0; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .meta-table td { padding: 6px 0; font-size: 14px; }
          table.data { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; }
          .badge { display: inline-block; padding: 4px 10px; background: #e8f5e9; border: 1px solid #087b4d; color: #087b4d; font-weight: bold; border-radius: 4px; }
          .note { font-size: 11px; color: #666; margin-top: 30px; line-height: 1.5; border-top: 1px solid #eee; padding-top: 12px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">SORTEOS HERRERA</h1>
            <div style="font-size:12px; color:#666; letter-spacing:0.1em;">CONFÍA EN TU SUERTE · BOLETO DIGITAL OFICIAL</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px; font-weight:bold; color:#087b4d;">${order.ref}</div>
            <div style="font-size:11px; color:#888;">${order.date}</div>
          </div>
        </div>

        <table class="meta-table">
          <tr>
            <td><strong>Participante:</strong> ${order.name}</td>
            <td><strong>Teléfono / WhatsApp:</strong> ${order.phone}</td>
          </tr>
          <tr>
            <td><strong>Ciudad / Estado:</strong> ${order.city}</td>
            <td><strong>Correo Electrónico:</strong> ${order.email}</td>
          </tr>
          <tr>
            <td><strong>Sorteo:</strong> Nissan Frontier 2022 LE</td>
            <td><strong>Fecha del Sorteo:</strong> 24 de Diciembre de 2026 · 20:00 h</td>
          </tr>
          <tr>
            <td><strong>Total Pagado:</strong> $${order.total.toFixed(2)} MXN</td>
            <td><strong>Estado:</strong> <span class="badge">${order.status}</span></td>
          </tr>
        </table>

        <h3 style="color:#087b4d; margin-bottom:8px; font-size:15px;">FOLIOS COMERCIALES ADQUIRIDOS (${order.folios.length})</h3>
        <table class="data"><tbody>${folioRows.join('')}</tbody></table>

        <h3 style="color:#555; margin-bottom:8px; font-size:13px;">OPORTUNIDADES ADICIONALES ASIGNADAS (+4 POR BOLETO)</h3>
        <table class="data"><tbody>${bonusRows.join('')}</tbody></table>

        <div class="note">
          <strong>Bases del Sorteo:</strong> El ganador se determina con las tres últimas cifras del primer lugar del Sorteo Mayor de la Lotería Nacional del 24 de diciembre de 2026. La rifa se efectuará con un mínimo del 70% de folios comerciales pagados y validados. Conserva este comprobante digital.
        </div>

        <div class="no-print" style="margin-top:20px; text-align:center;">
          <button onclick="window.print()" style="padding:10px 20px; background:#087b4d; color:#fff; border:none; border-radius:5px; font-size:14px; font-weight:bold; cursor:pointer;">
            Imprimir / Guardar como PDF
          </button>
        </div>
      </body>
      </html>
    `;

    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 350);
  };

  /* ==========================================================================
     9. FUNCIONES GLOBALES ACCESIBLES DESDE EL HTML
     ========================================================================== */
  window.toggleTicket = function (folio) {
    if (cart.has(folio)) {
      cart.remove(folio);
      showToast(`Folio #${String(folio).padStart(6, '0')} removido del carrito`);
    } else {
      cart.add(folio);
      showToast(`Folio #${String(folio).padStart(6, '0')} agregado al carrito`, 'success');
    }
  };

  window.removeFolioFromCart = function (folio) {
    cart.remove(folio);
    showToast(`Folio #${String(folio).padStart(6, '0')} eliminado.`);
  };

  window.quickSelect = function (count) {
    const available = engine.getRandomAvailable(count);
    if (available.length === 0) {
      showToast('No se encontraron suficientes folios libres en este rango.', 'error');
      return;
    }
    cart.addBatch(available);
    showToast(`🎰 ¡${available.length} folios agregados automáticamente al carrito!`, 'success');
    openCartDrawer();
  };

  window.runRoulette = function () {
    const input = document.getElementById('rouletteCount');
    const count = parseInt(input?.value || '10', 10);
    if (isNaN(count) || count < 1 || count > 2000) {
      showToast('Ingresa una cantidad válida entre 1 y 2,000 folios.', 'error');
      return;
    }

    const btn = document.getElementById('btnRoulette');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '🎡 Girando ruleta…';
    }

    setTimeout(() => {
      window.quickSelect(count);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🎡 Ruleta de la Suerte';
      }
    }, 600);
  };

  window.searchFolio = function () {
    const input = document.getElementById('searchFolioInput');
    const val = parseInt(input?.value?.trim() || '', 10);
    if (isNaN(val) || val < 1 || val > CONFIG.TOTAL_FOLIOS) {
      showToast('Escribe un folio válido del 1 al 200,000.', 'error');
      return;
    }

    const targetPage = Math.ceil(val / CONFIG.PER_PAGE);
    renderTicketsGrid(targetPage);

    setTimeout(() => {
      const chip = document.querySelector(`.ticket-chip[data-folio="${val}"]`);
      if (chip) {
        chip.scrollIntoView({ behavior: 'smooth', block: 'center' });
        chip.style.transform = 'scale(1.2)';
        chip.style.boxShadow = '0 0 20px var(--gold-500)';
        setTimeout(() => {
          chip.style.transform = '';
          chip.style.boxShadow = '';
        }, 1500);
      }
    }, 150);
  };

  // Controles de Drawer
  window.openCartDrawer = function () {
    document.getElementById('cartDrawer')?.classList.add('active');
    document.getElementById('cartDrawerBackdrop')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeCartDrawer = function () {
    document.getElementById('cartDrawer')?.classList.remove('active');
    document.getElementById('cartDrawerBackdrop')?.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.clearWholeCart = function () {
    if (confirm('¿Deseas vaciar todos los boletos de tu carrito?')) {
      cart.clear();
      showToast('Carrito vaciado con éxito.');
    }
  };

  // Modal de Checkout
  window.openCheckoutModal = function () {
    if (cart.getCount() === 0) {
      showToast('Tu carrito está vacío. Elige tus boletos antes de continuar.', 'error');
      return;
    }
    closeCartDrawer();
    document.getElementById('checkoutModal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Resumen en modal
    const summaryEl = document.getElementById('checkoutSummaryText');
    if (summaryEl) {
      summaryEl.textContent = `${cart.getCount()} boleto(s) por un total de $${cart.getTotalAmount().toFixed(2)} MXN`;
    }
  };

  window.closeCheckoutModal = function () {
    document.getElementById('checkoutModal')?.classList.remove('active');
    document.body.style.overflow = '';
  };

  // Copiar CLABE
  window.copyClabe = function () {
    navigator.clipboard.writeText(CONFIG.CLABE).then(() => {
      showToast('CLABE copiada al portapapeles: ' + CONFIG.CLABE, 'success');
    }).catch(() => {
      prompt('Copia la CLABE manualmente:', CONFIG.CLABE);
    });
  };

  // Tabs de método de pago en checkout
  window.selectPaymentTab = function (element, method) {
    document.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
    element.classList.add('active');

    const speiBox = document.getElementById('speiDetailsBox');
    const proofGroup = document.getElementById('proofUploadGroup');

    if (method === 'spei') {
      if (speiBox) speiBox.style.display = 'block';
      if (proofGroup) proofGroup.style.display = 'block';
    } else {
      if (speiBox) speiBox.style.display = 'none';
      if (proofGroup) proofGroup.style.display = 'none';
    }
  };

  /* ==========================================================================
     10. INICIALIZACIÓN AL CARGAR EL DOM
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', function () {
    renderTicketsGrid(1);
    updateCartUI();
    initCheckout();
    initVerifier();

    // Listeners de paginación
    document.getElementById('btnPrevPage')?.addEventListener('click', () => {
      if (engine.currentPage > 1) renderTicketsGrid(engine.currentPage - 1);
    });

    document.getElementById('btnNextPage')?.addEventListener('click', () => {
      if (engine.currentPage < engine.totalPages) renderTicketsGrid(engine.currentPage + 1);
    });

    // Enter en buscador
    document.getElementById('searchFolioInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.searchFolio();
      }
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.closeCartDrawer();
        window.closeCheckoutModal();
      }
    });
  });

})();
