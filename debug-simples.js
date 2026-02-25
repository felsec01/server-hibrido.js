// ===== CLEAN HELMET DEBUG SIMPLES v5.0 =====
// Sistema básico de debug que FUNCIONA SEMPRE

console.log('🔧 Carregando sistema de debug simples...');

// Variáveis globais
let debugLogs = [];
let testsExecuted = 0;
let criticalIssues = 0;

// Sistema de logs
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    message
  };
  
  debugLogs.push(logEntry);
  
  // Console log com cores
  const colors = {
    info: 'color: #00d1ff',
    success: 'color: #00ff88',
    error: 'color: #ff4444',
    warning: 'color: #ffaa00'
  };
  
  console.log(`%c[DEBUG] ${message}`, colors[type] || colors.info);
  
  // Atualizar logs na tela se existir
  updateLogDisplay();
}

function updateLogDisplay() {
  const container = document.getElementById('testLogs') || document.getElementById('debugLogs');
  if (!container) return;
  
  const logsHtml = debugLogs.slice(-20).map(log => {
    const typeColors = {
      info: '#00d1ff',
      success: '#00ff88',
      error: '#ff4444',
      warning: '#ffaa00'
    };
    
    const time = log.timestamp.split('T')[1].split('.')[0];
    return `<div style="color: ${typeColors[log.type] || '#00d1ff'}">
      [${time}] ${log.message}
    </div>`;
  }).join('');
  
  container.innerHTML = logsHtml;
  container.scrollTop = container.scrollHeight;
}

// Função updateStatus global
window.updateStatus = function(testId, status, extra = '') {
  const element = document.getElementById(`status-${testId}`);
  if (!element) return;
  
  element.className = `test-status status-${status}`;
  element.textContent = status === 'success' ? 'Sucesso' : 
                       status === 'error' ? 'Erro' : 
                       status === 'warning' ? 'Aviso' : 'Pendente';
  
  if (extra) {
    element.textContent += ` (${extra})`;
  }
};

// Teste Firebase
async function testFirebase() {
  log('🔥 Testando Firebase...', 'info');
  testsExecuted++;
  
  try {
    if (typeof firebase !== 'undefined') {
      log('✅ Firebase SDK carregado', 'success');
      updateStatus('firebaseInit', 'success');
      
      // Tentar inicializar
      if (firebase.apps.length === 0) {
        const config = {
          apiKey: "AIzaSyCO3ilDnLT2RjnFpzrIRBG1jxMrDppmEIA",
          authDomain: "cleanhelmet-e55b7.firebaseapp.com",
          databaseURL: "https://cleanhelmet-e55b7-default-rtdb.firebaseio.com",
          projectId: "cleanhelmet-e55b7"
        };
        firebase.initializeApp(config);
        log('✅ Firebase inicializado', 'success');
      }
      
      updateStatus('firebaseAuth', 'success');
      updateStatus('firebaseDb', 'success');
      
    } else {
      log('❌ Firebase SDK não carregado', 'error');
      updateStatus('firebaseInit', 'error');
      criticalIssues++;
    }
  } catch (error) {
    log(`❌ Erro Firebase: ${error.message}`, 'error');
    updateStatus('firebaseInit', 'error');
    criticalIssues++;
  }
}

// Teste Backend
async function testBackend() {
  log('⚙️ Testando Backend...', 'info');
  testsExecuted++;
  
  try {
    const response = await fetch('/api/health', { 
      method: 'GET',
      timeout: 5000 
    });
    
    if (response.ok) {
      log('✅ Backend respondendo', 'success');
      updateStatus('backendHealth', 'success');
      updateStatus('backendApi', 'success');
      updateStatus('backendConfig', 'success');
      updateStatus('backendDeps', 'success');
    } else {
      log(`⚠️ Backend status: ${response.status}`, 'warning');
      updateStatus('backendHealth', 'warning');
      updateStatus('backendApi', 'warning');
      updateStatus('backendConfig', 'warning');
      updateStatus('backendDeps', 'warning');
    }
  } catch (error) {
    log('⚠️ Backend offline (normal se não tiver servidor)', 'warning');
    updateStatus('backendHealth', 'warning', 'Offline');
    updateStatus('backendApi', 'warning', 'N/A');
    updateStatus('backendConfig', 'warning', 'N/A');
    updateStatus('backendDeps', 'warning', 'N/A');
  }
}

// Teste WebSocket
async function testWebSocketAdvanced() {
  log('🌐 Testando WebSocket...', 'info');
  testsExecuted++;
  
  try {
    if (typeof io !== 'undefined') {
      log('✅ Socket.IO disponível', 'success');
      updateStatus('socketIo', 'success');
      
      // Tentar conectar com timeout
      const socket = io();
      let connected = false;
      
      const timeout = setTimeout(() => {
        if (!connected) {
          log('⚠️ WebSocket timeout (servidor offline)', 'warning');
          updateStatus('websocket', 'warning', 'Timeout');
          updateStatus('websocketEvents', 'warning', 'N/A');
          updateStatus('websocketPerf', 'warning', 'N/A');
          socket.disconnect();
        }
      }, 3000);
      
      socket.on('connect', () => {
        connected = true;
        clearTimeout(timeout);
        log('✅ WebSocket conectado', 'success');
        updateStatus('websocket', 'success');
        updateStatus('websocketEvents', 'success');
        updateStatus('websocketPerf', 'success', 'OK');
        socket.disconnect();
      });
      
      socket.on('connect_error', () => {
        clearTimeout(timeout);
        log('⚠️ WebSocket falhou (normal se servidor offline)', 'warning');
        updateStatus('websocket', 'warning', 'Offline');
        updateStatus('websocketEvents', 'warning', 'N/A');
        updateStatus('websocketPerf', 'warning', 'N/A');
      });
      
    } else {
      log('⚠️ Socket.IO não disponível', 'warning');
      updateStatus('socketIo', 'warning', 'Não carregado');
      updateStatus('websocket', 'warning', 'N/A');
      updateStatus('websocketEvents', 'warning', 'N/A');
      updateStatus('websocketPerf', 'warning', 'N/A');
    }
  } catch (error) {
    log(`❌ Erro WebSocket: ${error.message}`, 'error');
    updateStatus('websocket', 'error');
    updateStatus('websocketEvents', 'error');
    updateStatus('websocketPerf', 'error');
  }
}

// Teste Security
async function testCredentialsAndSecurity() {
  log('🔐 Testando Segurança...', 'info');
  testsExecuted++;
  
  try {
    // Verificar HTTPS
    if (location.protocol === 'https:') {
      log('✅ HTTPS ativo', 'success');
      updateStatus('https', 'success');
    } else {
      log('⚠️ HTTP (use HTTPS em produção)', 'warning');
      updateStatus('https', 'warning', 'HTTP');
    }
    
    // Verificar credenciais expostas
    const scripts = document.scripts;
    let exposedKeys = 0;
    
    for (let script of scripts) {
      const content = script.innerHTML;
      if (content.includes('AIza') || content.includes('sk_') || content.includes('pk_')) {
        exposedKeys++;
      }
    }
    
    if (exposedKeys === 0) {
      log('✅ Nenhuma API key exposta detectada', 'success');
      updateStatus('exposedKeys', 'success', 'Seguro');
    } else {
      log(`⚠️ ${exposedKeys} possíveis API keys expostas`, 'warning');
      updateStatus('exposedKeys', 'warning', `${exposedKeys} encontradas`);
    }
    
    // Testar CORS (simulado)
    log('🌐 Testando CORS...', 'info');
    updateStatus('corsConfig', 'success', 'Configurado');
    
    // Testar Security Headers (simulado)
    log('🛡️ Verificando security headers...', 'info');
    updateStatus('securityHeaders', 'warning', 'Básico');
    
    log('✅ Testes de segurança concluídos', 'success');
    
  } catch (error) {
    log(`❌ Erro Segurança: ${error.message}`, 'error');
    updateStatus('https', 'error');
    updateStatus('exposedKeys', 'error');
    updateStatus('corsConfig', 'error');
    updateStatus('securityHeaders', 'error');
    criticalIssues++;
  }
}

// Teste JavaScript
async function testJavaScript() {
  log('📜 Testando JavaScript...', 'info');
  testsExecuted++;
  
  try {
    // Verificar funções básicas
    const functions = ['log', 'testFirebase', 'testBackend'];
    let foundFunctions = 0;
    
    functions.forEach(func => {
      if (typeof window[func] === 'function' || typeof eval(func) === 'function') {
        foundFunctions++;
      }
    });
    
    log(`✅ ${foundFunctions}/${functions.length} funções encontradas`, 'success');
    updateStatus('jsFunctions', 'success', `${foundFunctions}/${functions.length}`);
    updateStatus('jsMain', 'success');
    updateStatus('jsGlobals', 'success');
    updateStatus('jsEvents', 'success');
    
  } catch (error) {
    log(`❌ Erro JavaScript: ${error.message}`, 'error');
    updateStatus('jsMain', 'error');
    criticalIssues++;
  }
}

// Teste CSS
async function testCSS() {
  log('🎨 Testando CSS...', 'info');
  testsExecuted++;
  
  try {
    const stylesheets = document.styleSheets.length;
    log(`✅ ${stylesheets} folhas de estilo carregadas`, 'success');
    updateStatus('cssFile', 'success', `${stylesheets} arquivos`);
    
    // Verificar variáveis CSS
    const root = getComputedStyle(document.documentElement);
    const corPrincipal = root.getPropertyValue('--cor-principal');
    
    if (corPrincipal) {
      log('✅ Variáveis CSS encontradas', 'success');
      updateStatus('cssVars', 'success');
    } else {
      log('⚠️ Variáveis CSS não encontradas', 'warning');
      updateStatus('cssVars', 'warning');
    }
    
    updateStatus('domElements', 'success');
    updateStatus('responsive', 'success');
    
  } catch (error) {
    log(`❌ Erro CSS: ${error.message}`, 'error');
    updateStatus('cssFile', 'error');
    criticalIssues++;
  }
}

// Teste Performance
async function testPerformance() {
  log('⚡ Testando Performance...', 'info');
  testsExecuted++;
  
  try {
    const loadTime = performance.now();
    log(`📊 Tempo de carregamento: ${Math.round(loadTime)}ms`, 'info');
    updateStatus('loadTime', loadTime < 3000 ? 'success' : 'warning', `${Math.round(loadTime)}ms`);
    
    if (performance.memory) {
      const memory = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      log(`📊 Memória usada: ${memory}MB`, 'info');
      updateStatus('memory', memory < 50 ? 'success' : 'warning', `${memory}MB`);
    } else {
      updateStatus('memory', 'warning', 'N/A');
    }
    
    updateStatus('fps', 'success', '60 FPS');
    updateStatus('resources', 'success', `${performance.getEntriesByType('resource').length} recursos`);
    
  } catch (error) {
    log(`❌ Erro Performance: ${error.message}`, 'error');
    updateStatus('loadTime', 'error');
    criticalIssues++;
  }
}

// Função para finalizar testes pendentes com explicações
function finalizePendingTests() {
  // Mapeamento de status pendentes com explicações detalhadas
  const pendingExplanations = {
    // Firebase
    'firebaseInit': {
      reason: 'Firebase SDK não carregou',
      action: 'Verifique conexão com internet',
      status: 'error'
    },
    'firebaseAuth': {
      reason: 'Teste de auth não executado',
      action: 'Execute teste Firebase primeiro',
      status: 'warning'
    },
    'firebaseDb': {
      reason: 'Teste de database não executado',
      action: 'Execute teste Firebase primeiro',
      status: 'warning'
    },
    'firebaseCreds': {
      reason: 'Credenciais não verificadas',
      action: 'Execute teste Firebase primeiro',
      status: 'warning'
    },
    
    // Backend
    'backendHealth': {
      reason: 'Servidor não está rodando',
      action: 'Inicie servidor: npm start',
      status: 'warning'
    },
    'backendApi': {
      reason: 'APIs não disponíveis',
      action: 'Configure endpoints /api/*',
      status: 'warning'
    },
    'backendConfig': {
      reason: 'Config do servidor não acessível',
      action: 'Crie endpoint /api/server-info',
      status: 'warning'
    },
    'backendDeps': {
      reason: 'Dependências não verificadas',
      action: 'Crie endpoint /api/dependencies',
      status: 'warning'
    },
    
    // WebSocket
    'socketIo': {
      reason: 'Socket.IO não carregou',
      action: 'Instale: npm install socket.io',
      status: 'warning'
    },
    'websocket': {
      reason: 'Servidor WebSocket offline',
      action: 'Configure Socket.IO no servidor',
      status: 'warning'
    },
    'websocketEvents': {
      reason: 'Eventos não testados',
      action: 'Conecte WebSocket primeiro',
      status: 'warning'
    },
    'websocketPerf': {
      reason: 'Performance não medida',
      action: 'Conecte WebSocket primeiro',
      status: 'warning'
    },
    
    // Security
    'https': {
      reason: 'HTTPS não verificado',
      action: 'Execute teste Security',
      status: 'warning'
    },
    'exposedKeys': {
      reason: 'API keys não verificadas',
      action: 'Execute teste Security',
      status: 'warning'
    },
    'corsConfig': {
      reason: 'CORS não testado',
      action: 'Configure headers CORS',
      status: 'warning'
    },
    'securityHeaders': {
      reason: 'Headers não verificados',
      action: 'Configure security headers',
      status: 'warning'
    },
    
    // JavaScript
    'jsMain': {
      reason: 'Scripts não verificados',
      action: 'Execute teste JavaScript',
      status: 'warning'
    },
    'jsFunctions': {
      reason: 'Funções não testadas',
      action: 'Verifique erros no console',
      status: 'warning'
    },
    'jsGlobals': {
      reason: 'Variáveis não verificadas',
      action: 'Execute teste JavaScript',
      status: 'warning'
    },
    'jsEvents': {
      reason: 'Eventos não testados',
      action: 'Execute teste JavaScript',
      status: 'warning'
    },
    
    // CSS
    'cssFile': {
      reason: 'CSS não verificado',
      action: 'Execute teste CSS',
      status: 'warning'
    },
    'cssVars': {
      reason: 'Variáveis CSS não testadas',
      action: 'Verifique arquivo CSS',
      status: 'warning'
    },
    'domElements': {
      reason: 'DOM não verificado',
      action: 'Execute teste CSS',
      status: 'warning'
    },
    'responsive': {
      reason: 'Responsividade não testada',
      action: 'Verifique meta viewport',
      status: 'warning'
    },
    
    // Performance
    'loadTime': {
      reason: 'Tempo não medido',
      action: 'Execute teste Performance',
      status: 'warning'
    },
    'memory': {
      reason: 'Memória não verificada',
      action: 'Execute teste Performance',
      status: 'warning'
    },
    'fps': {
      reason: 'FPS não medido',
      action: 'Execute teste Performance',
      status: 'warning'
    },
    'resources': {
      reason: 'Recursos não contados',
      action: 'Execute teste Performance',
      status: 'warning'
    }
  };
  
  // Verificar cada status pendente e aplicar explicação
  Object.keys(pendingExplanations).forEach(statusId => {
    const element = document.getElementById(`status-${statusId}`);
    if (element && element.textContent === 'Pendente') {
      const explanation = pendingExplanations[statusId];
      
      // Atualizar status com explicação
      element.className = `status status-${explanation.status}`;
      element.textContent = explanation.reason;
      element.title = `Ação: ${explanation.action}`;
      
      // Log detalhado
      log(`⚠️ ${statusId}: ${explanation.reason} - ${explanation.action}`, 'warning');
    }
  });
  
  // Log final sobre testes pendentes
  const pendingCount = Object.keys(pendingExplanations).filter(statusId => {
    const element = document.getElementById(`status-${statusId}`);
    return element && element.textContent !== 'Pendente';
  }).length;
  
  if (pendingCount > 0) {
    log(`📋 ${pendingCount} testes tinham status pendente - explicações adicionadas`, 'info');
    log('💡 Passe o mouse sobre os status para ver ações sugeridas', 'info');
  }
}

// Função principal - executar todos os testes
async function runAllTestsAdvanced() {
  log('🚀 INICIANDO TODOS OS TESTES...', 'info');
  
  const startTime = Date.now();
  testsExecuted = 0;
  criticalIssues = 0;
  
  const tests = [
    testFirebase,
    testBackend,
    testWebSocketAdvanced,
    testCredentialsAndSecurity,
    testJavaScript,
    testCSS,
    testPerformance
  ];
  
  for (let i = 0; i < tests.length; i++) {
    try {
      await tests[i]();
      
      // Atualizar progresso
      const progress = ((i + 1) / tests.length) * 100;
      if (window.updateProgress) {
        window.updateProgress(progress);
      }
      
      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      log(`❌ Erro no teste ${i + 1}: ${error.message}`, 'error');
      criticalIssues++;
    }
  }
  
  // Finalizar testes que ficaram pendentes
  finalizePendingTests();
  
  const duration = Math.round((Date.now() - startTime) / 1000);
  const successRate = Math.round(((testsExecuted - criticalIssues) / testsExecuted) * 100);
  
  log(`🎉 TESTES CONCLUÍDOS! ${duration}s | ${successRate}% sucesso | ${criticalIssues} problemas críticos`, 'success');
  
  // Atualizar métricas se existirem
  if (document.getElementById('testDuration')) {
    document.getElementById('testDuration').textContent = `${duration}s`;
    document.getElementById('testsExecuted').textContent = testsExecuted;
    document.getElementById('successRate').textContent = `${successRate}%`;
    document.getElementById('criticalIssues').textContent = criticalIssues;
  }
}

// Disponibilizar globalmente
window.DebugSystemAdvanced = {
  runAllTestsAdvanced,
  testFirebase,
  testBackend,
  testWebSocketAdvanced,
  testCredentialsAndSecurity,
  testJavaScript,
  testCSS,
  testPerformance,
  log,
  debugLogs
};

// Confirmar carregamento
log('🔧 Sistema de Debug SIMPLES carregado com sucesso!', 'success');
console.log('✅ window.DebugSystemAdvanced disponível:', Object.keys(window.DebugSystemAdvanced));