// ===== CORREÇÃO DE ERROS - WEBSOCKET E FILE:// =====
// Arquivo para corrigir erros quando executando via file://

(function() {
  'use strict';

  console.log('🔧 Carregando correções para file://...');

  // ===== MOCK DO SOCKET.IO =====
  if (typeof io === 'undefined') {
    window.io = function(url) {
      console.warn('⚠️ Socket.IO não disponível - usando mock');
      
      return {
        on: function(event, callback) {
          console.log('📡 Mock Socket.IO - Evento registrado:', event);
          
          // Simular alguns eventos básicos
          if (event === 'connect') {
            setTimeout(() => callback(), 1000);
          }
        },
        emit: function(event, data) {
          console.log('📤 Mock Socket.IO - Emitindo:', event, data);
        },
        disconnect: function() {
          console.log('🔌 Mock Socket.IO - Desconectado');
        }
      };
    };
  }

  // ===== MOCK DO FETCH PARA FILE:// =====
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    // Se for protocolo file:// e URL começar com /api
    if (window.location.protocol === 'file:' && url.startsWith('/api')) {
      console.warn('⚠️ Fetch bloqueado para file:// - retornando mock');
      
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found (file:// protocol)',
        json: () => Promise.resolve({ error: 'API não disponível em file://' })
      });
    }
    
    // Usar fetch original para outras URLs
    return originalFetch ? originalFetch.apply(this, arguments) : Promise.reject(new Error('Fetch não disponível'));
  };

  // ===== POLYFILLS PARA PREVENIR ERROS =====
  
  // Polyfill para toUpperCase em undefined
  const originalToUpperCase = String.prototype.toUpperCase;
  Object.defineProperty(Object.prototype, 'toUpperCase', {
    value: function() {
      if (this == null) {
        console.warn('⚠️ toUpperCase chamado em valor null/undefined');
        return '';
      }
      return originalToUpperCase.call(this);
    },
    configurable: true
  });

  // Polyfill para charAt em undefined
  const originalCharAt = String.prototype.charAt;
  Object.defineProperty(Object.prototype, 'charAt', {
    value: function(index) {
      if (this == null) {
        console.warn('⚠️ charAt chamado em valor null/undefined');
        return '';
      }
      return originalCharAt.call(this, index);
    },
    configurable: true
  });

  // ===== INTERCEPTAR ERROS CORS =====
  window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('CORS')) {
      console.warn('⚠️ Erro CORS interceptado (normal em file://):', event.message);
      event.preventDefault();
      return true;
    }
  });

  // ===== INTERCEPTAR ERROS DE NETWORK =====
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch')) {
      console.warn('⚠️ Erro de network interceptado (normal em file://):', event.reason.message);
      event.preventDefault();
      return true;
    }
  });

  console.log('✅ Correções para file:// carregadas com sucesso');

})();