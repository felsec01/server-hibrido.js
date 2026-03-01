// ===== CLEAN HELMET MERCADO PAGO PANEL MANAGER =====

class MercadoPagoPanelManager {
  constructor() {
    this.initialized = false;
    this.mp = null;
  }

  init() {
    const { publicKey, sandboxMode } = window.CLEAN_HELMET_MERCADOPAGO;
    if (!publicKey) {
      console.error("❌ Chave pública do Mercado Pago não configurada");
      return;
    }

    // Inicializa SDK
    this.mp = new MercadoPago(publicKey, { locale: 'pt-BR' });
    this.initialized = true;
    console.log("💳 MercadoPagoPanelManager inicializado");
  }

  async createPreference(amount = window.CLEAN_HELMET_MERCADOPAGO.defaultAmount) {
    try {
      const response = await fetch(window.CLEAN_HELMET_CONFIG.backend.baseUrl + "/api/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            title: window.CLEAN_HELMET_MERCADOPAGO.description,
            quantity: 1,
            currency_id: window.CLEAN_HELMET_MERCADOPAGO.currency,
            unit_price: amount
          }],
          back_urls: window.CLEAN_HELMET_MERCADOPAGO.backUrls,
          auto_return: "approved"
        })
      });

      const data = await response.json();
      console.log("✅ Preferência criada:", data);
      return data.id;
    } catch (error) {
      console.error("❌ Erro ao criar preferência:", error);
      return null;
    }
  }

  async showPaymentModal(amount) {
    if (!this.initialized) {
      console.warn("⚠️ MercadoPagoPanelManager não inicializado");
      return;
    }

    const preferenceId = await this.createPreference(amount);
    if (!preferenceId) return;

    // Abre modal de checkout
    this.mp.checkout({
      preference: { id: preferenceId },
      autoOpen: true
    });
  }

  isInitialized() {
    return this.initialized;
  }
}

// Disponibiliza globalmente
window.MercadoPagoPanelManager = MercadoPagoPanelManager;
