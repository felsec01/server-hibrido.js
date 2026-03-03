// ===== CLEAN HELMET CONFIG MERCADO PAGO =====

// Protege contra ausência de integração
if (window.CLEAN_HELMET_INTEGRACAO && window.CLEAN_HELMET_INTEGRACAO.mercadopago) {
  window.CLEAN_HELMET_MERCADOPAGO = {
    publicKey: window.CLEAN_HELMET_INTEGRACAO.mercadopago.publicKey,
    sandboxMode: window.CLEAN_HELMET_INTEGRACAO.mercadopago.sandboxMode,
    currency: "BRL",
    defaultAmount: 5.00,
    description: "Ciclo de desinfecção Clean Helmet",
    backUrls: {
      success: window.location.origin + "/pagamento-sucesso.html",
      failure: window.location.origin + "/pagamento-falha.html",
      pending: window.location.origin + "/pagamento-pendente.html"
    }
  };

  console.log("🔧 Configuração Mercado Pago carregada:", window.CLEAN_HELMET_MERCADOPAGO);
} else {
  console.warn("⚠️ Configuração de integração MercadoPago não encontrada. Verifique se 'config-integracao.js' foi carregado antes.");
}
