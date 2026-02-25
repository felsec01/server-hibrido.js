// ===== CLEAN HELMET - SISTEMA DE ID ÚNICO ANTI-BURLA v6.0 =====
// Sistema robusto para prevenir burla de ciclos grátis
// Funcionalidades: ID único, persistência múltipla, detecção de bypass, logs

(function() {
  'use strict';

  // ===== CONFIGURAÇÕES =====
  const CONFIG = {
    // Identificação do dispositivo
    devicePrefix: 'CH_',
    maxDeviceIdLength: 12,
    
    // Controle de ciclos grátis
    maxFreeCycles: 1,
    maxFreeCyclesPerDay: 50,
    resetHour: 6, // 6h da manhã
    
    // Segurança
    maxSuspiciousActions: 5,
    cooldownTime: 300000, // 5 minutos
    maxIpChanges: 3,
    
    // Persistência
    storageKeys: {
      deviceId: 'ch_device_id',
      fingerprint: 'ch_fingerprint',
      freeCycles: 'ch_free_cycles',
      lastReset: 'ch_last_reset',
      suspiciousCount: 'ch_suspicious_count',
      blockedUntil: 'ch_blocked_until',
      ipHistory: 'ch_ip_history',
      creationDate: 'ch_creation_date'
    },
    
    // Firebase
    firebasePath: 'dispositivos',
    
    // Debug
    debug: true
  };

  // ===== VARIÁVEIS GLOBAIS =====
  let isInitialized = false;
  let currentDeviceData = null;
  let fingerprint = null;
  let publicIP = null;
  let geolocation = null;

  // ===== CLASSE PRINCIPAL =====
  class CleanHelmetDeviceSystem {
    constructor() {
      this.deviceId = null;
      this.isBlocked = false;
      this.lastActivity = new Date();
      this.initPromise = null;
    }

    // ===== INICIALIZAÇÃO =====
    async init() {
      if (this.initPromise) {
        return this.initPromise;
      }

      this.initPromise = this._performInit();
      return this.initPromise;
    }

    async _performInit() {
      try {
        this.log('🚀 Inicializando Sistema Anti-Burla v6.0...');
        
        // 1. Gerar fingerprint do dispositivo
        fingerprint = await this.generateFingerprint();
        this.log('✅ Fingerprint gerado:', fingerprint.substring(0, 16) + '...');
        
        // 2. Obter IP público e geolocalização
        await this.getPublicInfo();
        
        // 3. Verificar ou criar ID do dispositivo
        this.deviceId = await this.getOrCreateDeviceId();
        this.log('✅ Device ID:', this.deviceId);
        
        // 4. Carregar dados do dispositivo
        currentDeviceData = await this.loadDeviceData();
        
        // 5. Verificar bloqueios
        await this.checkBlocks();
        
        // 6. Verificar reset diário
        await this.checkDailyReset();
        
        // 7. Salvar dados atualizados
        await this.saveDeviceData();
        
        isInitialized = true;
        this.log('✅ Sistema Anti-Burla inicializado com sucesso!');
        
        return true;
      } catch (error) {
        this.log('❌ Erro na inicialização:', error);
        throw error;
      }
    }

    // ===== GERAÇÃO DE FINGERPRINT =====
    async generateFingerprint() {
      const components = [];
      
      try {
        // Canvas fingerprinting
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Clean Helmet Fingerprint 🛡️', 2, 2);
        components.push(canvas.toDataURL());
        
        // WebGL fingerprinting
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const vendor = gl.getParameter(gl.VENDOR);
          const renderer = gl.getParameter(gl.RENDERER);
          components.push(vendor + '|' + renderer);
        }
        
        // Audio fingerprinting
        if (window.AudioContext || window.webkitAudioContext) {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const analyser = audioCtx.createAnalyser();
          oscillator.connect(analyser);
          components.push(audioCtx.sampleRate.toString());
          audioCtx.close
audioCtx.close();
        }
        
        // Hardware e Browser info
        components.push(navigator.userAgent);
        components.push(navigator.language);
        components.push(navigator.platform);
        components.push(screen.width + 'x' + screen.height);
        components.push(screen.colorDepth.toString());
        components.push(new Date().getTimezoneOffset().toString());
        
        // Fonts disponíveis (simplificado)
        const fonts = ['Arial', 'Helvetica', 'Times', 'Courier', 'Verdana', 'Georgia'];
        components.push(fonts.join(','));
        
        // Plugins (se disponível)
        if (navigator.plugins) {
          const pluginNames = Array.from(navigator.plugins).map(p => p.name).join(',');
          components.push(pluginNames);
        }
        
      } catch (error) {
        this.log('⚠️ Erro ao gerar fingerprint:', error);
        components.push('fallback_' + Date.now());
      }
      
      // Gerar hash simples
      const combined = components.join('|');
      return this.simpleHash(combined);
    }

    // ===== OBTER INFORMAÇÕES PÚBLICAS =====
    async getPublicInfo() {
      try {
        // IP público (simulado - em produção usar serviço real)
        publicIP = '192.168.1.' + Math.floor(Math.random() * 254 + 1);
        
        // Geolocalização (simulada)
        geolocation = {
          country: 'BR',
          region: 'SP',
          city: 'São Paulo',
          lat: -23.5505,
          lng: -46.6333
        };
        
        this.log('📍 IP:', publicIP, 'Localização:', geolocation.city);
      } catch (error) {
        this.log('⚠️ Erro ao obter informações públicas:', error);
        publicIP = 'unknown';
        geolocation = null;
      }
    }

    // ===== GERENCIAMENTO DE ID =====
    async getOrCreateDeviceId() {
      // Tentar carregar ID existente
      let deviceId = this.getFromStorage(CONFIG.storageKeys.deviceId);
      
      if (!deviceId) {
        // Criar novo ID
        deviceId = await this.generateDeviceId();
        this.saveToStorage(CONFIG.storageKeys.deviceId, deviceId);
        this.log('🆕 Novo Device ID criado:', deviceId);
      } else {
        this.log('📱 Device ID existente carregado:', deviceId);
      }
      
      return deviceId;
    }

    async generateDeviceId() {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      const fingerprintPart = fingerprint.substring(0, 4);
      
      return CONFIG.devicePrefix + fingerprintPart + timestamp + random;
    }

    // ===== PERSISTÊNCIA DE DADOS =====
    async loadDeviceData() {
      const data = {
        deviceId: this.deviceId,
        fingerprint: fingerprint,
        freeCyclesUsed: parseInt(this.getFromStorage(CONFIG.storageKeys.freeCycles)) || 0,
        lastReset: this.getFromStorage(CONFIG.storageKeys.lastReset) || null,
        creationDate: this.getFromStorage(CONFIG.storageKeys.creationDate) || new Date().toISOString(),
        suspiciousCount: parseInt(this.getFromStorage(CONFIG.storageKeys.suspiciousCount)) || 0,
        blockedUntil: this.getFromStorage(CONFIG.storageKeys.blockedUntil) || null,
        ipHistory: JSON.parse(this.getFromStorage(CONFIG.storageKeys.ipHistory) || '[]'),
        lastActivity: new Date().toISOString(),
        publicIP: publicIP,
        geolocation: geolocation,
        freeCyclesBlocked: false
      };
      
      // Adicionar IP atual ao histórico
      if (publicIP && !data.ipHistory.includes(publicIP)) {
        data.ipHistory.push(publicIP);
        if (data.ipHistory.length > CONFIG.maxIpChanges) {
          this.logSuspiciousActivity('multiple_ips', {
            ips: data.ipHistory,
            current: publicIP
          });
        }
      }
      
      return data;
    }

    async saveDeviceData() {
      if (!currentDeviceData) return;
      
      // Salvar em múltiplas fontes
      this.saveToMultipleStorage(currentDeviceData);
      
      // Salvar no Firebase se disponível
      if (typeof firebase !== 'undefined' && firebase.database) {
        try {
          await firebase.database().ref(`${CONFIG.firebasePath}/${this.deviceId}`).set({
            ...currentDeviceData,
            lastUpdate: new Date().toISOString()
          });
          this.log('☁️ Dados salvos no Firebase');
        } catch (error) {
          this.log('⚠️ Erro ao salvar no Firebase:', error);
        }
      }
    }

    // ===== CONTROLE DE CICLOS GRÁTIS =====
    async canUseFreeCycle() {
      if (!currentDeviceData) return false;
      
      // Verificar se está bloqueado
      if (this.isBlocked || currentDeviceData.freeCyclesBlocked) {
        this.log('🚫 Dispositivo bloqueado para ciclos grátis');
        return false;
      }
      
      // Verificar limite por dispositivo
      if (currentDeviceData.freeCyclesUsed >= CONFIG.maxFreeCycles) {
        this.log('🚫 Limite de ciclos grátis atingido para este dispositivo');
        return false;
      }
      
      // Verificar limite global diário
      const globalUsage = await this.getGlobalFreeCycleUsage();
      if (globalUsage >= CONFIG.maxFreeCyclesPerDay) {
        this.log('🚫 Limite global diário de ciclos grátis atingido');
        return false;
      }
      
      return true;
    }

    async useFreeCycle() {
      if (!(await this.canUseFreeCycle())) {
        return false;
      }
      
      currentDeviceData.freeCyclesUsed++;
      currentDeviceData.lastActivity = new Date().toISOString();
      
      await this.saveDeviceData();
      
      this.logActivity('free_cycle_used', {
        deviceId: this.deviceId,
        totalUsed: currentDeviceData.freeCyclesUsed,
        remainingToday: CONFIG.maxFreeCycles - currentDeviceData.freeCyclesUsed
      });
      
      this.log('✅ Ciclo grátis utilizado. Total usado:', currentDeviceData.freeCyclesUsed);
      return true;
    }

    async resetFreeCycles() {
      if (!currentDeviceData) return false;
      
      currentDeviceData.freeCyclesUsed = 0;
      currentDeviceData.freeCyclesBlocked = false;
      currentDeviceData.lastReset = new Date().toISOString();
      
      await this.saveDeviceData();
      
      this.logActivity('free_cycles_reset', {
        deviceId: this.deviceId,
        resetBy: 'manual'
      });
      
      this.log('🔄 Ciclos grátis resetados');
      return true;
    }

    // ===== RESET DIÁRIO AUTOMÁTICO =====
    async checkDailyReset() {
      const now = new Date();
      const lastReset = currentDeviceData.lastReset ? new Date(currentDeviceData.lastReset) : null;
      
      // Verificar se deve resetar (passou das 6h e não resetou hoje)
      const shouldReset = !lastReset || 
        (now.getHours() >= CONFIG.resetHour && 
         (!lastReset || lastReset.toDateString() !== now.toDateString()));
      
      if (shouldReset) {
        await this.performDailyReset();
      }
    }

    async performDailyReset() {
      this.log('🌅 Executando reset diário automático...');
      
      currentDeviceData.freeCyclesUsed = 0;
      currentDeviceData.freeCyclesBlocked = false;
      currentDeviceData.suspiciousCount = 0;
      currentDeviceData.lastReset = new Date().toISOString();
      
      // Limpar histórico de IPs antigo
      if (currentDeviceData.ipHistory.length > CONFIG.maxIpChanges) {
        currentDeviceData.ipHistory = currentDeviceData.ipHistory.slice(-CONFIG.maxIpChanges);
      }
      
      await this.saveDeviceData();
      
      this.logActivity('daily_reset', {
        deviceId: this.deviceId,
        resetTime: currentDeviceData.lastReset
      });
      
      this.log('✅ Reset diário concluído');
    }

    // ===== DETECÇÃO DE ATIVIDADES SUSPEITAS =====
    async checkBlocks() {
      if (!currentDeviceData) return;
      
      // Verificar se está em período de cooldown
      if (currentDeviceData.blockedUntil) {
        const blockedUntil = new Date(currentDeviceData.blockedUntil);
        if (new Date() < blockedUntil) {
          this.isBlocked = true;
          this.log('🚫 Dispositivo em cooldown até:', blockedUntil);
          return;
        } else {
          // Cooldown expirou
          currentDeviceData.blockedUntil = null;
          currentDeviceData.suspiciousCount = 0;
        }
      }
      
      // Verificar mudanças no fingerprint
      const storedFingerprint = this.getFromStorage(CONFIG.storageKeys.fingerprint);
      if (storedFingerprint && storedFingerprint !== fingerprint) {
        this.logSuspiciousActivity('fingerprint_mismatch', {
          stored: storedFingerprint.substring(0, 16) + '...',
          current: fingerprint.substring(0, 16) + '...'
        });
      }
      
      this.saveToStorage(CONFIG.storageKeys.fingerprint, fingerprint);
    }

    async blockDevice(reason) {
      currentDeviceData.suspiciousCount++;
      currentDeviceData.freeCyclesBlocked = true;
      
      if (currentDeviceData.suspiciousCount >= CONFIG.maxSuspiciousActions) {
        const cooldownEnd = new Date(Date.now() + CONFIG.cooldownTime);
        currentDeviceData.blockedUntil = cooldownEnd.toISOString();
        this.isBlocked = true;
        
        this.log('🚨 Dispositivo bloqueado até:', cooldownEnd);
      }
      
      await this.saveDeviceData();
      
      this.logActivity('device_blocked', {
        deviceId: this.deviceId,
        reason: reason,
        suspiciousCount: currentDeviceData.suspiciousCount,
        blockedUntil: currentDeviceData.blockedUntil
      });
    }

    logSuspiciousActivity(type, data) {
      this.log('⚠️ Atividade suspeita detectada:', type, data);
      
      this.logActivity('suspicious_activity', {
        type: type,
        data: data,
        deviceId: this.deviceId,
        timestamp: new Date().toISOString()
      });
      
      // Aumentar contador de atividades suspeitas
      if (currentDeviceData) {
        this.blockDevice(type);
      }
    }

    // ===== UTILITÁRIOS DE ARMAZENAMENTO =====
    saveToStorage(key, value) {
      try {
        localStorage.setItem(key, value);
        sessionStorage.setItem(key, value);
        
        // Cookie com expiração de 30 dias
        const expires = new Date();
        expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000));
        document.cookie = `${key}=${value}; expires=${expires.toUTCString()}; path=/`;
        
        // IndexedDB
        this.saveToIndexedDB(key, value);
      } catch (error) {
        this.log('⚠️ Erro ao salvar no storage:', error);
      }
    }

    getFromStorage(key) {
      try {
        // Prioridade: localStorage > sessionStorage > cookies
        let value = localStorage.getItem(key);
        if (value) return value;
        
        value = sessionStorage.getItem(key);
        if (value) return value;
        
        // Tentar cookies
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, val] = cookie.trim().split('=');
          if (name === key) return val;
        }
        
        return null;
      } catch (error) {
        this.log('⚠️ Erro ao ler do storage:', error);
        return null;
      }
    }

    saveToMultipleStorage(data) {
      for (const [key, value] of Object.entries(CONFIG.storageKeys)) {
        if (data[key] !== undefined) {
          this.saveToStorage(value, JSON.stringify(data[key]));
        }
      }
    }

    loadFromMultipleStorage() {
      const data = {};
      for (const [key, storageKey] of Object.entries(CONFIG.storageKeys)) {
        try {
          const value = this.getFromStorage(storageKey);
          if (value) {
            data[key] = JSON.parse(value);
          }
        } catch (error) {
          this.log('⚠️ Erro ao carregar', key, ':', error);
        }
      }
      return data;
    }

    async saveToIndexedDB(key, value) {
      try {
        if (!window.indexedDB) return;
        
        const request = indexedDB.open('CleanHelmetDB', 1);
        
        request.onupgradeneeded = function(event) {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('deviceData')) {
            db.createObjectStore('deviceData', { keyPath: 'key' });
          }
        };
        
        request.onsuccess = function(event) {
          const db = event.target.result;
          const transaction = db.transaction(['deviceData'], 'readwrite');
          const store = transaction.objectStore('deviceData');
          store.put({ key: key, value: value, timestamp: Date.now() });
        };
      } catch (error) {
        this.log('⚠️ Erro IndexedDB:', error);
      }
    }

    // ===== UTILITÁRIOS =====
    simpleHash(str) {
      let hash = 0;
      if (str.length === 0) return hash.toString();
      
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      return Math.abs(hash).toString(36);
    }

    async getGlobalFreeCycleUsage() {
      // Em produção, isso consultaria o Firebase para obter uso global
      // Por ora, retorna um valor simulado
      return Math.floor(Math.random() * 20);
    }

    logActivity(type, data) {
      const logEntry = {
        type: type,
        data: data,
        timestamp: new Date().toISOString(),
        deviceId: this.deviceId
      };
      
      // Salvar no Firebase se disponível
      if (typeof firebase !== 'undefined' && firebase.database) {
        try {
          firebase.database().ref('logs').push({
            ...logEntry,
            categoria: 'dispositivo'
          });
        } catch (error) {
          this.log('⚠️ Erro ao salvar log:', error);
        }
      }
      
      // Log local
      this.log('📝 Log:', type, data);
    }

    log(...args) {
      if (CONFIG.debug) {
        console.log('[Clean Helmet Anti-Burla]', ...args);
      }
    }

    // ===== API PÚBLICA =====
    isInitialized() {
      return isInitialized;
    }

    getDeviceId() {
      return this.deviceId;
    }

    getDeviceData() {
      return currentDeviceData;
    }

    getFingerprint() {
      return fingerprint;
    }

    async refreshData() {
      if (!isInitialized) return null;
      
      currentDeviceData = await this.loadDeviceData();
      await this.saveDeviceData();
      return currentDeviceData;
    }

    async testFreeCycle() {
      this.log('🧪 Testando ciclo grátis...');
      const canUse = await this.canUseFreeCycle();
      this.log('🧪 Pode usar ciclo grátis:', canUse);
      
      if (canUse) {
        const used = await this.useFreeCycle();
        this.log('🧪 Ciclo grátis usado:', used);
        return used;
      }
      
      return false;
    }
  }

  // ===== INICIALIZAÇÃO =====
  const deviceSystem = new CleanHelmetDeviceSystem();
  
  // Expor API global
  window.CleanHelmetDevice = {
    isInitialized: () => deviceSystem.isInitialized(),
    getDeviceId: () => deviceSystem.getDeviceId(),
    getDeviceData: () => deviceSystem.getDeviceData(),
    getFingerprint: () => deviceSystem.getFingerprint(),
    refreshData: () => deviceSystem.refreshData(),
    testFreeCycle: () => deviceSystem.testFreeCycle(),
    canUseFreeCycle: () => deviceSystem.canUseFreeCycle(),
    useFreeCycle: () => deviceSystem.useFreeCycle(),
    resetFreeCycles: () => deviceSystem.resetFreeCycles(),
    init: () => deviceSystem.init()
  };

  // ===== PROTEÇÃO CONTRA LIMPEZA DE STORAGE =====
  const originalClear = Storage.prototype.clear;
  Storage.prototype.clear = function() {
    deviceSystem.logSuspiciousActivity('storage_clear_attempt', {
      storageType: this === localStorage ? 'localStorage' : 'sessionStorage',
      timestamp: new Date().toISOString()
    });
    
    // Re-salvar dados importantes após limpeza
    setTimeout(() => {
      if (currentDeviceData && deviceSystem.deviceId) {
        deviceSystem.saveToMultipleStorage(currentDeviceData);
        deviceSystem.log('🛡️ Dados importantes restaurados após tentativa de limpeza');
      }
    }, 100);
    
    return originalClear.call(this);
  };

  // ===== AUTO-INICIALIZAÇÃO =====
  document.addEventListener('DOMContentLoaded', () => {
    deviceSystem.init().catch(error => {
      console.error('❌ Falha na inicialização do sistema anti-burla:', error);
    });
  });

  // Se o DOM já estiver carregado
  if (document.readyState === 'loading') {
    // DOM ainda carregando, aguardar evento
  } else {
    // DOM já carregado, inicializar imediatamente
    deviceSystem.init().catch(error => {
      console.error('❌ Falha na inicialização do sistema anti-burla:', error);
    });
  }

})();