// IMPORTANTE: Em produção, carregue via variáveis de ambiente

window.CLEAN_HELMET_CONFIG = {
  // ===== FIREBASE CONFIGURATION =====
  firebase: {
    apiKey: "AIzaSyCO3ilDnLT2RjnFpzrIRBG1jxMrDppmEIA",
    authDomain: "cleanhelmet-e55b7.firebaseapp.com",
    databaseURL: "https://cleanhelmet-e55b7-default-rtdb.firebaseio.com",
    projectId: "cleanhelmet-e55b7",
    storageBucket: "cleanhelmet-e55b7.firebasestorage.app",
    messagingSenderId: "862264948080",
    appId: "1:862264948080:web:c45791659355e509634bb5"
  },

  // ===== BACKEND CONFIGURATION =====
  backend: {
    baseUrl: window.location.origin,
    apiPath: '/api',
    websocketEnabled: true,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // ===== FEATURES CONFIGURATION =====
  features: {
    antiburla: true,
    mercadopago: true,
    debug: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    realTimeUpdates: true,
    advancedLogs: true
  },

  // ===== SECURITY CONFIGURATION =====
  security: {
    requireAuth: true,
    tokenExpiry: 3600000, // 1 hora
    maxLoginAttempts: 5,
    lockoutTime: 300000 // 5 minutos
  },

  // ===== DEVICE SYSTEM CONFIGURATION =====
  deviceSystem: {
    maxFreeCycles: 1,
    maxFreeCyclesPerDay: 50,
    resetHour: 6,
    maxSuspiciousActions: 5,
    cooldownTime: 300000,
    maxIpChanges: 3
  }
};

// ===== ENVIRONMENT DETECTION =====
window.CLEAN_HELMET_ENV = {
  isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
  isProduction: window.location.protocol === 'https:' && !window.location.hostname.includes('localhost'),
  isFileProtocol: window.location.protocol === 'file:',
  
  getConfig: function(path) {
    const config = window.CLEAN_HELMET_CONFIG;
    return path.split('.').reduce((obj, key) => obj && obj[key], config);
  },
  
  setConfig: function(path, value) {
    const config = window.CLEAN_HELMET_CONFIG;
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, config);
    target[lastKey] = value;
  }
};

console.log('🔧 Clean Helmet Config carregado para ambiente:', 
  window.CLEAN_HELMET_ENV.isDevelopment ? 'DESENVOLVIMENTO' : 'PRODUÇÃO'
);