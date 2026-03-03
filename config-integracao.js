// ===== CLEAN HELMET CONFIG INTEGRAÇÃO =====

window.CLEAN_HELMET_INTEGRACAO = {
  firebase: window.CLEAN_HELMET_CONFIG.firebase,
  backend: window.CLEAN_HELMET_CONFIG.backend,
  features: window.CLEAN_HELMET_CONFIG.features,
  security: window.CLEAN_HELMET_CONFIG.security,
  deviceSystem: window.CLEAN_HELMET_CONFIG.deviceSystem,
  mercadopago: {
    publicKey: "TEST-336e3af6-b446-444e-9fc8-cfb46d8ef480", // substitua pela sua chave pública
    sandboxMode: window.CLEAN_HELMET_ENV.isDevelopment
  }
};

console.log("🔧 Configuração de integração carregada:", window.CLEAN_HELMET_INTEGRACAO);

