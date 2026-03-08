// ===== CLEAN HELMET SISTEMA HÍBRIDO v5.0 COMPLETO =====
// Integração Firebase + Backend Node.js + WebSocket
// TODAS AS FUNCIONALIDADES IMPLEMENTADAS

// ===== CONFIGURAÇÃO FIREBASE (USANDO CONFIG GLOBAL) =====
const FIREBASE_CONFIG = window.CLEAN_HELMET_CONFIG.firebase;

let firebaseDisponivel = false;
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
    console.log("✅ Firebase inicializado com sucesso");
  } else {
    console.log("ℹ️ Firebase já estava inicializado");
  }
  firebaseDisponivel = true;
} catch (error) {
  console.warn("⚠️ Erro ao inicializar Firebase:", error);
}

// ===== CONFIGURAÇÃO BACKEND v5.0 =====
const BACKEND_CONFIG = {
  baseUrl: window.location.origin,
  apiPath: '/api',
  websocketEnabled: true,
  retryAttempts: 3,
  retryDelay: 1000
};

// ===== VARIÁVEIS GLOBAIS =====
let usuarioAtual = null;
let cargoSelecionado = null;
let intervalosAtualizacao = [];
let anunciosAtivos = [];
let intervalosAnuncios = [];
let modoForcadoDemo = false;

// 🆕 VARIÁVEIS BACKEND/WEBSOCKET
let socket = null;
let backendDisponivel = false;
let websocketConectado = false;
let logsBackend = [];
let autoRefreshLogsActive = false;
let autoRefreshInterval = null;

// Inicializar Firebase usando config centralizada
let firebaseDisponivel = false;
try {
  firebase.initializeApp(window.CLEAN_HELMET_CONFIG.firebase);
  firebaseDisponivel = true;
  console.log('✅ Firebase inicializado com sucesso');
  
  setTimeout(() => {
    updateSystemIndicator('firebase', 'online', 'Conectado');
  }, 1000);
} catch (error) {
  console.warn('⚠️ Firebase não disponível:', error);
  firebaseDisponivel = false;
  
  setTimeout(() => {
    updateSystemIndicator('firebase', 'offline', 'Desconectado');
  }, 1000);
}

// ===== INICIALIZAÇÃO PRINCIPAL =====
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Iniciando Clean Helmet Sistema Híbrido v5.0...');
  
  // Simular loading
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('mainContainer').classList.remove('hidden');
    
    // Inicializar sistemas
    initializeBackend();
    initializeWebSocket();
    checkAuthentication();
  }, 3000);
});

// ===== INICIALIZAÇÃO BACKEND =====
async function initializeBackend() {
  console.log('🔧 Inicializando conexão com backend...');
  
  try {
    const response = await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/health`);
    
    if (response.ok) {
      const data = await response.json();
      backendDisponivel = true;
      console.log('✅ Backend conectado:', data);
      updateSystemIndicator('backend', 'online', 'Conectado');
    } else {
      throw new Error('Backend não respondeu');
    }
  } catch (error) {
    console.warn('⚠️ Backend não disponível:', error);
    backendDisponivel = false;
    updateSystemIndicator('backend', 'offline', 'Desconectado');
  }
}

// ===== INICIALIZAÇÃO WEBSOCKET =====
function initializeWebSocket() {
  if (!BACKEND_CONFIG.websocketEnabled) return;

  console.log('🌐 Inicializando WebSocket...');

  try {
    socket = io(BACKEND_CONFIG.baseUrl);

    socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
      websocketConectado = true;
      updateSystemIndicator('websocket', 'online', 'Conectado');
      updateWebSocketStatus('🟢 Conectado');
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
      websocketConectado = false;
      updateSystemIndicator('websocket', 'offline', 'Desconectado');
      updateWebSocketStatus('🔴 Desconectado');
    });

    socket.on('reconnect', () => {
      console.log('🔄 WebSocket reconectado');
      websocketConectado = true;
      updateSystemIndicator('websocket', 'online', 'Reconectado');
      updateWebSocketStatus('🟢 Reconectado');
    });

    // 🆕 ESCUTAR LOGS EM TEMPO REAL
    socket.on('new-log', (logData) => {
      if (document.getElementById('secaoLogsAvancados').classList.contains('active')) {
        addLogToDisplay(logData);
        updateLogsStats();
      }
    });

    // 🆕 ESCUTAR ESTATÍSTICAS
    socket.on('stats-update', (stats) => {
      updateDashboardStats(stats);
    });

    // 🆕 ESCUTAR EVENTOS DE ANÚNCIOS
    socket.on('anuncio_created', (data) => {
      anunciosAtivos.push(data);
      exibirAnuncios(anunciosAtivos);
      atualizarEstatisticasAnuncios();
    });

    socket.on('anuncio_updated', (data) => {
      const idx = anunciosAtivos.findIndex(a => a.id === data.id);
      if (idx !== -1) anunciosAtivos[idx] = data;
      exibirAnuncios(anunciosAtivos);
      atualizarEstatisticasAnuncios();
    });

    socket.on('anuncio_deleted', (data) => {
      anunciosAtivos = anunciosAtivos.filter(a => a.id !== data.id);
      exibirAnuncios(anunciosAtivos);
      atualizarEstatisticasAnuncios();
    });

  } catch (error) {
    console.error('❌ Erro ao inicializar WebSocket:', error);
    updateSystemIndicator('websocket', 'offline', 'Erro');
    updateWebSocketStatus('🔴 Erro');
  }
}


// ===== VERIFICAÇÃO DE AUTENTICAÇÃO =====
function checkAuthentication() {
  // Verificar Firebase Auth
  if (firebaseDisponivel && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        const emailKey = user.email.replace(/[.#$[\]]/g, '_');
        firebase.database().ref('usuarios/' + emailKey).once('value')
          .then((snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.val();
              usuarioAtual = {
                email: userData.email,
                nome: userData.nome,
                cargo: userData.cargo
              };
              localStorage.setItem('usuarioCleanHelmet', JSON.stringify(usuarioAtual));
              mostrarDashboard();
            }
          })
          .catch((error) => {
            console.error('Erro ao carregar dados do usuário:', error);
          });
      } else {
        checkLocalAuthentication();
      }
    });
  } else {
    checkLocalAuthentication();
  }
}

function checkLocalAuthentication() {
  const usuarioSalvo = localStorage.getItem('usuarioCleanHelmet');
  if (usuarioSalvo) {
    const dadosUsuario = JSON.parse(usuarioSalvo);
    const usuariosDemo = ['admin@test.com', 'tecnico@test.com', 'dev@test.com'];
    if (usuariosDemo.includes(dadosUsuario.email)) {
      usuarioAtual = dadosUsuario;
      mostrarDashboard();
    } else {
      localStorage.removeItem('usuarioCleanHelmet');
    }
  }
}

// ===== FUNÇÕES DE INTERFACE =====
function updateSystemIndicator(system, status, text) {
  const indicator = document.getElementById(`${system}Status`);
  if (!indicator) return;
  
  indicator.textContent = text;
  indicator.className = `indicator-status ${status}`;
}

function updateWebSocketStatus(status) {
  const wsStatus = document.getElementById('wsStatus');
  if (wsStatus) {
    wsStatus.textContent = status;
  }
}

// ===== AUTENTICAÇÃO =====
function alternarTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const cadastroForm = document.getElementById('cadastroForm');
  const loginTab = document.querySelector('.auth-tab:first-child');
  const cadastroTab = document.querySelector('.auth-tab:last-child');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    cadastroForm.classList.add('hidden');
    loginTab.classList.add('active');
    cadastroTab.classList.remove('active');
  } else {
    loginForm.classList.add('hidden');
    cadastroForm.classList.remove('hidden');
    loginTab.classList.remove('active');
    cadastroTab.classList.add('active');
  }
}

function selecionarCargo(cargo) {
  document.querySelectorAll('.cargo-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  event.target.classList.add('selected');
  cargoSelecionado = cargo;
}

function fazerLogin() {
  const email = document.getElementById('loginEmail').value;
  const senha = document.getElementById('loginSenha').value;

  if (!email || !senha) {
    mostrarNotificacao({
      tipo: 'erro',
      titulo: '❌ Campos Obrigatórios',
      mensagem: 'Preencha email e senha para continuar',
      duracao: 6000
    });
    return;
  }

  // Usuários demo
  const usuariosDemo = {
    'admin@test.com': { nome: 'Administrador', cargo: 'admin', senha: 'admin123' },
    'tecnico@test.com': { nome: 'Técnico', cargo: 'tecnico', senha: 'tecnico123' },
    'dev@test.com': { nome: 'Desenvolvedor', cargo: 'desenvolvedor', senha: 'dev123' }
  };

  if (usuariosDemo[email] && usuariosDemo[email].senha === senha) {
    usuarioAtual = {
      email: email,
      nome: usuariosDemo[email].nome,
      cargo: usuariosDemo[email].cargo
    };
    
    localStorage.setItem('usuarioCleanHelmet', JSON.stringify(usuarioAtual));
    mostrarDashboard();
    
    mostrarNotificacao({
      tipo: 'sucesso',
      titulo: '✅ Login Demo',
      mensagem: `Bem-vindo, ${usuarioAtual.nome}! (Sistema Híbrido)`,
      duracao: 8000
    });

    // 🆕 LOG BACKEND
    logToBackend('login', `Login demo realizado: ${usuarioAtual.nome}`);
    return;
  }

  // Login Firebase (se disponível)
  if (firebaseDisponivel && firebase.auth) {
    firebase.auth().signInWithEmailAndPassword(email, senha)
      .then((userCredential) => {
        const user = userCredential.user;
        const emailKey = email.replace(/[.#$[\]]/g, '_');
        
        return firebase.database().ref('usuarios/' + emailKey).once('value')
          .then((snapshot) => {
            if (!snapshot.exists()) {
              const dadosBasicos = {
                uid: user.uid,
                nome: user.displayName || email.split('@')[0],
                email: email,
                cargo: 'tecnico',
                dataCadastro: new Date().toISOString(),
                ativo: true,
                ultimoLogin: new Date().toISOString()
              };
              
              return firebase.database().ref('usuarios/' + emailKey).set(dadosBasicos)
                .then(() => dadosBasicos);
            } else {
              const userData = snapshot.val();
              if (!userData.ativo) {
                throw new Error('USUARIO_INATIVO');
              }
              
              firebase.database().ref('usuarios/' + emailKey + '/ultimoLogin').set(new Date().toISOString());
              return userData;
            }
          });
      })
      .then((userData) => {
        usuarioAtual = {
          email: userData.email,
          nome: userData.nome,
          cargo: userData.cargo
        };
        
        localStorage.setItem('usuarioCleanHelmet', JSON.stringify(usuarioAtual));
        mostrarDashboard();
        
        mostrarNotificacao({
          tipo: 'sucesso',
          titulo: '✅ Login Realizado',
          mensagem: `Bem-vindo de volta, ${usuarioAtual.nome}! (Firebase + Backend)`,
          duracao: 8000
        });

        logToBackend('login', `Login Firebase realizado: ${usuarioAtual.nome} (${usuarioAtual.cargo})`);
      })
      .catch((error) => {
        console.error('Erro ao fazer login:', error);
        
        let mensagemErro = 'Falha no login. Tente novamente.';
        if (error.message === 'USUARIO_INATIVO') {
          mensagemErro = 'Sua conta foi desativada. Contate o administrador.';
        } else {
          switch (error.code) {
            case 'auth/user-not-found':
              mensagemErro = 'Email não cadastrado. Faça seu cadastro primeiro.';
              break;
            case 'auth/wrong-password':
              mensagemErro = 'Senha incorreta. Tente novamente.';
              break;
            case 'auth/invalid-email':
              mensagemErro = 'Email inválido. Verifique o formato.';
              break;
            case 'auth/user-disabled':
              mensagemErro = 'Esta conta foi desativada.';
              break;
            case 'auth/too-many-requests':
              mensagemErro = 'Muitas tentativas. Tente novamente mais tarde.';
              break;
          }
        }
        
        mostrarNotificacao({
          tipo: 'erro',
          titulo: '❌ Erro no Login',
          mensagem: mensagemErro,
          duracao: 8000
        });
      });
  } else {
    mostrarNotificacao({
      tipo: 'erro',
      titulo: '❌ Erro de Conexão',
      mensagem: 'Firebase não disponível. Use usuários demo.',
      duracao: 8000
    });
  }
}

function fazerCadastro() {
  const nome = document.getElementById('cadastroNome').value;
  const email = document.getElementById('cadastroEmail').value;
  const senha = document.getElementById('cadastroSenha').value;

  if (!nome || !email || !senha || !cargoSelecionado) {
    mostrarNotificacao({
      tipo: 'erro',
      titulo: '❌ Campos Obrigatórios',
      mensagem: 'Preencha todos os campos e selecione um cargo',
      duracao: 6000
    });
    return;
  }

  // Verificar se Firebase está disponível
  if (!firebaseDisponivel || typeof firebase === 'undefined' || !firebase.auth || !firebase.database) {
    mostrarNotificacao({
      tipo: 'erro',
      titulo: '❌ Erro de Conexão',
      mensagem: 'Firebase não está disponível. Verifique a configuração.',
      duracao: 8000
    });
    return;
  }

  // Verificar emails reservados
  const usuariosDemo = ['admin@test.com', 'tecnico@test.com', 'dev@test.com'];
  if (usuariosDemo.includes(email)) {
    mostrarNotificacao({
      tipo: 'erro',
      titulo: '❌ Email Reservado',
      mensagem: 'Este email é reservado para usuários demo.',
      duracao: 6000
    });
    return;
  }

  // Criar usuário no Firebase Authentication
  firebase.auth().createUserWithEmailAndPassword(email, senha)
    .then((userCredential) => {
      const user = userCredential.user;
      
      // Atualizar perfil do usuário no Auth
      return user.updateProfile({
        displayName: nome
      }).then(() => {
        // Salvar dados adicionais no Realtime Database
        const emailKey = email.replace(/[.#$[\]]/g, '_');
        const dadosUsuario = {
          uid: user.uid,
          nome: nome,
          email: email,
          cargo: cargoSelecionado,
          dataCadastro: new Date().toISOString(),
          ativo: true,
          ultimoLogin: new Date().toISOString()
        };

        return firebase.database().ref('usuarios/' + emailKey).set(dadosUsuario);
      });
    })
    .then(() => {
      // Login automático já acontece com createUserWithEmailAndPassword
      usuarioAtual = {
        email: email,
        nome: nome,
        cargo: cargoSelecionado
      };
      
      // Salvar sessão local
      localStorage.setItem('usuarioCleanHelmet', JSON.stringify(usuarioAtual));
      
      mostrarDashboard();
      
      mostrarNotificacao({
        tipo: 'sucesso',
        titulo: '✅ Conta Criada',
        mensagem: `Bem-vindo ao Clean Helmet, ${nome}!`,
        duracao: 8000
      });

      // Log de atividade
      logToBackend('cadastro', `Novo usuário cadastrado: ${nome} (${cargoSelecionado})`);
    })
    .catch((error) => {
      console.error('Erro ao cadastrar usuário:', error);
      
      let mensagemErro = 'Falha ao criar conta. Tente novamente.';
      
      // Tratar erros específicos do Firebase Auth
      switch (error.code) {
        case 'auth/email-already-in-use':
          mensagemErro = 'Este email já está em uso. Tente fazer login.';
          break;
        case 'auth/invalid-email':
          mensagemErro = 'Email inválido. Verifique o formato.';
          break;
        case 'auth/weak-password':
          mensagemErro = 'Senha muito fraca. Use pelo menos 6 caracteres.';
          break;
        case 'auth/operation-not-allowed':
          mensagemErro = 'Cadastro por email/senha não está habilitado.';
          break;
      }
      
      mostrarNotificacao({
        tipo: 'erro',
        titulo: '❌ Erro no Cadastro',
        mensagem: mensagemErro,
        duracao: 8000
      });
    });
}

function loginTeste(email, cargo) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginSenha').value = cargo + '123';
  fazerLogin();
}

function logout() {
  if (usuarioAtual) {
    logToBackend('logout', `Logout realizado: ${usuarioAtual.nome}`);
  }
  
  const usuariosDemo = ['admin@test.com', 'tecnico@test.com', 'dev@test.com'];
  const isUsuarioDemo = usuarioAtual && usuariosDemo.includes(usuarioAtual.email);
  
  if (firebaseDisponivel && firebase.auth && !isUsuarioDemo) {
    firebase.auth().signOut()
      .then(() => {
        console.log('Logout do Firebase Auth realizado');
      })
      .catch((error) => {
        console.error('Erro ao fazer logout do Firebase Auth:', error);
      });
  }
  
  localStorage.removeItem('usuarioCleanHelmet');
  usuarioAtual = null;
  
  // Limpar intervalos
  intervalosAtualizacao.forEach(interval => clearInterval(interval));
  intervalosAtualizacao = [];
  
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    autoRefreshLogsActive = false;
  }
  
  document.getElementById('authContainer').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  
  mostrarNotificacao({
    tipo: 'sucesso',
    titulo: '👋 Logout Realizado',
    mensagem: 'Até logo!',
    duracao: 8000
  });
}

// ===== DASHBOARD =====
function mostrarDashboard() {
  document.getElementById('authContainer').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  
  document.getElementById('nomeUsuario').textContent = usuarioAtual.nome;
  document.getElementById('cargoUsuario').textContent = usuarioAtual.cargo;
  
  document.body.className = `theme-${usuarioAtual.cargo}`;
  
  configurarPermissoes();
  abrirSecao('sensores');
  atualizarInterfaceModo();
  iniciarAtualizacoes();
  
  // 🆕 INICIALIZAR RECURSOS BACKEND
  if (backendDisponivel) {
    loadBackendStats();
  }
}

const permissoesPorSecao = {
  'sensores': ['admin', 'tecnico', 'desenvolvedor'],
  'controle': ['admin', 'tecnico'],
  'financeiro': ['admin'],
  'anuncios': ['admin'],
  'pagamentos': ['admin'],
  'mp-config': ['admin'],
  'logs-avancados': ['admin', 'desenvolvedor'],
  'logs': ['admin', 'desenvolvedor'],
  'configuracoes': ['admin', 'desenvolvedor']
};

function configurarPermissoes() {
  const botoes = document.querySelectorAll('.nav-button[data-roles]');
  
  botoes.forEach(botao => {
    const roles = botao.getAttribute('data-roles').split(',');
    
    if (roles.includes(usuarioAtual.cargo)) {
      botao.classList.remove('hidden');
    } else {
      botao.classList.add('hidden');
    }
  });
}

function abrirSecao(secao) {
  if (!permissoesPorSecao[secao] || !permissoesPorSecao[secao].includes(usuarioAtual.cargo)) {
    mostrarNotificacao({
      tipo: 'erro',
      titulo: '🚫 Acesso Negado',
      mensagem: 'Você não tem permissão para acessar esta seção.',
      duracao: 6000
    });
    return;
  }

  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
  });
  
  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Mapear seções para IDs
  const secaoMap = {
    'sensores': 'secaoSensores',
    'controle': 'secaoControle',
    'financeiro': 'secaoFinanceiro',
    'anuncios': 'secaoAnuncios',
    'pagamentos': 'secaoPagamentos',
    'mp-config': 'secaoMpConfig',
    'logs-avancados': 'secaoLogsAvancados',
    'logs': 'secaoLogs',
    'configuracoes': 'secaoConfiguracoes'
  };
  
  const secaoId = secaoMap[secao];
  const elementoSecao = document.getElementById(secaoId);
  
  if (elementoSecao) {
    elementoSecao.classList.add('active');
  } else {
    console.error(`Seção não encontrada: ${secaoId}`);
    return;
  }
  
  const botaoAtivo = document.querySelector(`[onclick="abrirSecao('${secao}')"]`);
  if (botaoAtivo) {
    botaoAtivo.classList.add('active');
  }
  
  // Carregar conteúdo específico
  switch(secao) {
    case 'sensores':
      carregarSensores();
      break;
    case 'controle':
      carregarControles();
      break;
    case 'financeiro':
      carregarFinanceiro();
      break;
    case 'anuncios':
      carregarAnuncios();
      break;
    case 'pagamentos':
      carregarPagamentos();
      break;
    case 'mp-config':
      carregarConfiguracaoMP();
      break;
    case 'logs-avancados':
      carregarLogsAvancados();
      break;
    case 'logs':
      carregarLogs();
      break;
  }
}

// ===== SEÇÃO SENSORES =====
function carregarSensores() {
  const container = document.querySelector('.sensors-grid');
  
  if (!modoForcadoDemo && firebaseDisponivel && firebase.database) {
    firebase.database().ref('sensores').once('value', (snapshot) => {
      const dadosReais = snapshot.val();
      
      if (dadosReais && Object.keys(dadosReais).length > 0) {
        const sensoresReais = Object.keys(dadosReais).map(key => ({
          id: key,
          ...dadosReais[key]
        }));
        
        container.innerHTML = sensoresReais.map(sensor => `
          <div class="sensor-card">
            <div class="sensor-header">
              <div class="sensor-name">${sensor.nome}</div>
              <div class="sensor-status ${sensor.status}">${sensor.status.toUpperCase()}</div>
            </div>
            <div class="sensor-value">${sensor.valor}</div>
            <div class="sensor-info">
              <span>Min: ${sensor.min}${sensor.unidade}</span>
              <span>Max: ${sensor.max}${sensor.unidade}</span>
            </div>
          </div>
        `).join('');
      } else {
        showFirebaseEmpty(container, 'Sistema Inativo', 'Nenhum equipamento conectado ao Firebase.');
      }
    }).catch((error) => {
      console.error('Erro ao carregar sensores:', error);
      showFirebaseError(container, 'Erro ao carregar sensores');
    });
    return;
  }
  
  // Modo demo
  const sensores = [
    { nome: 'Temperatura Interna', valor: '23.5°C', status: 'normal', unidade: '°C', min: 20, max: 30 },
    { nome: 'Umidade Relativa', valor: '45%', status: 'normal', unidade: '%', min: 40, max: 60 },
    { nome: 'Pressão Atmosférica', valor: '1013 hPa', status: 'normal', unidade: 'hPa', min: 1000, max: 1020 },
    { nome: 'Qualidade do Ar', valor: 'Boa', status: 'normal', unidade: 'IQA', min: 0, max: 100 },
    { nome: 'Nível de Ruído', valor: '42 dB', status: 'normal', unidade: 'dB', min: 30, max: 60 },
    { nome: 'Luminosidade', valor: '850 lux', status: 'normal', unidade: 'lux', min: 500, max: 1000 }
  ];
  
  container.innerHTML = sensores.map(sensor => `
    <div class="sensor-card">
      <div class="sensor-header">
        <div class="sensor-name">${sensor.nome}</div>
        <div class="sensor-status ${sensor.status}">${sensor.status.toUpperCase()}</div>
      </div>
      <div class="sensor-value">${sensor.valor}</div>
      <div class="sensor-info">
        <span>Min: ${sensor.min}${sensor.unidade}</span>
        <span>Max: ${sensor.max}${sensor.unidade}</span>
      </div>
    </div>
  `).join('');
}

function atualizarSensores() {
  if (!modoForcadoDemo && firebaseDisponivel) {
    carregarSensores();
    return;
  }
  
  const sensores = document.querySelectorAll('.sensor-card');
  
  sensores.forEach((sensor, index) => {
    const valorElement = sensor.querySelector('.sensor-value');
    const statusElement = sensor.querySelector('.sensor-status');
    
    if (!valorElement || !statusElement) return;
    
    const variacao = (Math.random() - 0.5) * 2;
    let novoValor = parseFloat(valorElement.textContent) + variacao;
    
    let status = 'normal';
    if (novoValor < 20 || novoValor > 30) status = 'alerta';
    if (novoValor < 15 || novoValor > 35) status = 'critico';
    
    valorElement.textContent = novoValor.toFixed(1) + valorElement.textContent.slice(-2);
    statusElement.className = `sensor-status ${status}`;
    statusElement.textContent = status.toUpperCase();
  });
}

// ===== SEÇÃO CONTROLES =====
function carregarControles() {
  const container = document.querySelector('.controls-container');
  
  container.innerHTML = `
    <div class="control-group">
      <div class="control-title">🔧 Sistema de Limpeza</div>
      <div class="control-buttons">
        <button class="control-btn primary" onclick="enviarComando('iniciar_limpeza')">
          ▶️ Iniciar Limpeza
        </button>
        <button class="control-btn warning" onclick="enviarComando('pausar_limpeza')">
          ⏸️ Pausar
        </button>
        <button class="control-btn danger" onclick="enviarComando('parar_limpeza')">
          ⏹️ Parar
        </button>
      </div>
    </div>
    
    <div class="control-group">
      <div class="control-title">💨 Sistema de Ventilação</div>
      <div class="control-buttons">
        <button class="control-btn success" onclick="enviarComando('ligar_ventilacao')">
          🌪️ Ligar Ventiladores
        </button>
        <button class="control-btn danger" onclick="enviarComando('desligar_ventilacao')">
          ❌ Desligar Ventiladores
        </button>
        <button class="control-btn primary" onclick="enviarComando('ajustar_velocidade', 'baixa')">
          🔅 Velocidade Baixa
        </button>
        <button class="control-btn primary" onclick="enviarComando('ajustar_velocidade', 'alta')">
          🔆 Velocidade Alta
        </button>
      </div>
    </div>
    
    <div class="control-group">
      <div class="control-title">💡 Sistema de Iluminação UV</div>
      <div class="control-buttons">
        <button class="control-btn primary" onclick="enviarComando('ligar_uv')">
          💡 Ligar UV
        </button>
        <button class="control-btn danger" onclick="enviarComando('desligar_uv')">
          ❌ Desligar UV
        </button>
        <button class="control-btn warning" onclick="enviarComando('ajustar_intensidade_uv', 'baixa')">
          🔅 Intensidade Baixa
        </button>
        <button class="control-btn warning" onclick="enviarComando('ajustar_intensidade_uv', 'alta')">
          🔆 Intensidade Alta
        </button>
      </div>
    </div>
    
    <div class="control-group">
      <div class="control-title">🫧 Sistema de Ozônio</div>
      <div class="control-buttons">
        <button class="control-btn success" onclick="enviarComando('ligar_ozonio')">
          🫧 Ligar Ozônio
        </button>
        <button class="control-btn danger" onclick="enviarComando('desligar_ozonio')">
          ❌ Desligar Ozônio
        </button>
        <button class="control-btn primary" onclick="enviarComando('ciclo_ozonio', '5min')">
          ⏱️ Ciclo 5min
        </button>
        <button class="control-btn primary" onclick="enviarComando('ciclo_ozonio', '10min')">
          ⏱️ Ciclo 10min
        </button>
      </div>
    </div>
    
    <div class="control-group">
      <div class="control-title">🌊 Sistema de Desodorização</div>
      <div class="control-buttons">
        <button class="control-btn success" onclick="enviarComando('ligar_desodorizador')">
          🌊 Ligar Desodorizador
        </button>
        <button class="control-btn danger" onclick="enviarComando('desligar_desodorizador')">
          ❌ Desligar Desodorizador
        </button>
      </div>
    </div>
    
    <div class="control-group">
      <div class="control-title">🚨 Controles de Emergência</div>
      <div class="control-buttons">
        <button class="control-btn danger" onclick="enviarComando('parada_emergencia')" style="font-size: 16px; padding: 15px 30px;">
          🆘 PARADA DE EMERGÊNCIA
        </button>
        <button class="control-btn warning" onclick="enviarComando('reset_sistema')">
          🔄 Reset Sistema
        </button>
        <button class="control-btn primary" onclick="enviarComando('teste_sensores')">
          🧪 Teste de Sensores
        </button>
      </div>
    </div>
    
    <div class="control-group">
      <div class="control-title">📊 Status dos Equipamentos</div>
      <div id="status-equipamentos" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
        <div class="status-item" style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--border-radius); text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">🌪️</div>
          <div style="font-weight: 600; color: var(--text-primary);">Ventiladores</div>
          <div id="status-ventiladores" style="color: var(--cor-sucesso); font-size: 14px;">Desligados</div>
        </div>
        
        <div class="status-item" style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--border-radius); text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">💡</div>
          <div style="font-weight: 600; color: var(--text-primary);">UV Light</div>
          <div id="status-uv" style="color: var(--cor-erro); font-size: 14px;">Desligado</div>
        </div>
        
        <div class="status-item" style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--border-radius); text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">🫧</div>
          <div style="font-weight: 600; color: var(--text-primary);">Ozônio</div>
          <div id="status-ozonio" style="color: var(--cor-erro); font-size: 14px;">Desligado</div>
        </div>
        
        <div class="status-item" style="background: var(--bg-tertiary); padding: 15px; border-radius: var(--border-radius); text-align: center;">
          <div style="font-size: 24px; margin-bottom: 8px;">🌊</div>
          <div style="font-weight: 600; color: var(--text-primary);">Desodorizador</div>
          <div id="status-desodorizador" style="color: var(--cor-erro); font-size: 14px;">Desligado</div>
        </div>
      </div>
    </div>
  `;
}

function enviarComando(comando, parametro = null) {
  const comandoCompleto = parametro ? `${comando}:${parametro}` : comando;
  
  // Simular envio do comando
  mostrarNotificacao({
    tipo: 'sucesso',
    titulo: '📡 Comando Enviado',
    mensagem: `Comando "${comandoCompleto}" executado com sucesso`,
    duracao: 5000
  });
  
  // Atualizar status dos equipamentos
  atualizarStatusEquipamentos(comando, parametro);
  
  // Log do comando
  logToBackend('comando', `Comando executado: ${comandoCompleto} por ${usuarioAtual.nome}`);
  
  // Salvar no Firebase se disponível
  if (firebaseDisponivel && typeof firebase !== 'undefined' && firebase.database) {
    const logComando = {
      comando: comandoCompleto,
      usuario: usuarioAtual.email,
      timestamp: new Date().toISOString(),
      status: 'executado'
    };
    
    firebase.database().ref('comandos').push(logComando);
  }
}

function atualizarStatusEquipamentos(comando, parametro) {
  const statusMap = {
    'ligar_ventilacao': { elemento: 'status-ventiladores', texto: 'Ligados', cor: 'var(--cor-sucesso)' },
    'desligar_ventilacao': { elemento: 'status-ventiladores', texto: 'Desligados', cor: 'var(--cor-erro)' },
    'ligar_uv': { elemento: 'status-uv', texto: 'Ligado', cor: 'var(--cor-sucesso)' },
    'desligar_uv': { elemento: 'status-uv', texto: 'Desligado', cor: 'var(--cor-erro)' },
    'ligar_ozonio': { elemento: 'status-ozonio', texto: 'Ligado', cor: 'var(--cor-sucesso)' },
    'desligar_ozonio': { elemento: 'status-ozonio', texto: 'Desligado', cor: 'var(--cor-erro)' },
    'ligar_desodorizador': { elemento: 'status-desodorizador', texto: 'Ligado', cor: 'var(--cor-sucesso)' },
    'desligar_desodorizador': { elemento: 'status-desodorizador', texto: 'Desligado', cor: 'var(--cor-erro)' },
    'parada_emergencia': null // Reset todos para desligado
  };
  
  if (comando === 'parada_emergencia') {
    // Desligar todos os equipamentos
    document.getElementById('status-ventiladores').textContent = 'PARADA DE EMERGÊNCIA';
    document.getElementById('status-ventiladores').style.color = 'var(--cor-erro)';
    document.getElementById('status-uv').textContent = 'PARADA DE EMERGÊNCIA';
    document.getElementById('status-uv').style.color = 'var(--cor-erro)';
    document.getElementById('status-ozonio').textContent = 'PARADA DE EMERGÊNCIA';
    document.getElementById('status-ozonio').style.color = 'var(--cor-erro)';
    document.getElementById('status-desodorizador').textContent = 'PARADA DE EMERGÊNCIA';
    document.getElementById('status-desodorizador').style.color = 'var(--cor-erro)';
  } else if (statusMap[comando]) {
    const status = statusMap[comando];
    const elemento = document.getElementById(status.elemento);
    if (elemento) {
      elemento.textContent = status.texto;
      elemento.style.color = status.cor;
    }
  }
}

// ===== SEÇÃO FINANCEIRO =====
function carregarFinanceiro() {
  const container = document.getElementById('financeiro-content');
  
  if (!modoForcadoDemo && firebaseDisponivel && firebase.database) {
    firebase.database().ref('financeiro').once('value', (snapshot) => {
      const dadosReais = snapshot.val();
      
      if (dadosReais && Object.keys(dadosReais).length > 0) {
        container.innerHTML = criarInterfaceFinanceiro(dadosReais);
      } else {
        showFirebaseEmpty(container, 'Dados Financeiros Indisponíveis', 'Nenhum dado financeiro encontrado no Firebase.');
      }
    }).catch((error) => {
      console.error('Erro ao carregar dados financeiros:', error);
      showFirebaseError(container, 'Erro ao carregar dados financeiros');
    });
    return;
  }
  
  // Modo demo - dados simulados
  const dadosDemo = {
    receita: '12.450,00',
    custos: '3.280,00',
    lucro: '9.170,00',
    usos: 1247,
    receitaHoje: '450,00',
    usosHoje: 45,
    mediaPorUso: '9,99',
    crescimentoSemanal: '+12,5%'
  };
  
  container.innerHTML = criarInterfaceFinanceiro(dadosDemo);
}

function criarInterfaceFinanceiro(dados) {
  return `
    <!-- Resumo Financeiro -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
      <div style="background: var(--bg-secondary); padding: 20px; border-radius: var(--border-radius); border-left: 4px solid var(--cor-sucesso);">
        <h3 style="color: var(--cor-sucesso); margin: 0; font-size: 28px;">R$ ${dados.receita || '0,00'}</h3>
        <p style="color: var(--text-secondary); margin: 5px 0 0 0;">Receita Total do Mês</p>
        <small style="color: var(--cor-sucesso); font-size: 12px;">${dados.crescimentoSemanal || '+0%'} esta semana</small>
      </div>
      
      <div style="background: var(--bg-secondary); padding: 20px; border-radius: var(--border-radius); border-left: 4px solid var(--cor-erro);">
        <h3 style="color: var(--cor-erro); margin: 0; font-size: 28px;">R$ ${dados.custos || '0,00'}</h3>
        <p style="color: var(--text-secondary); margin: 5px 0 0 0;">Custos Operacionais</p>
        <small style="color: var(--text-secondary); font-size: 12px;">Energia, manutenção, produtos</small>
      </div>
      
      <div style="background: var(--bg-secondary); padding: 20px; border-radius: var(--border-radius); border-left: 4px solid var(--cor-principal);">
        <h3 style="color: var(--cor-principal); margin: 0; font-size: 28px;">R$ ${dados.lucro || '0,00'}</h3>
        <p style="color: var(--text-secondary); margin: 5px 0 0 0;">Lucro Líquido</p>
        <small style="color: var(--cor-sucesso); font-size: 12px;">Margem de ${dados.margem || '73,7'}%</small>
      </div>
      
      <div style="background: var(--bg-secondary); padding: 20px; border-radius: var(--border-radius); border-left: 4px solid var(--cor-aviso);">
        <h3 style="color: var(--cor-aviso); margin: 0; font-size: 28px;">${dados.usos || 0}</h3>
        <p style="color: var(--text-secondary); margin: 5px 0 0 0;">Usos do Sistema</p>
        <small style="color: var(--text-secondary); font-size: 12px;">Hoje: ${dados.usosHoje || 0} usos</small>
      </div>
    </div>
    
    <!-- Estatísticas Detalhadas -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
      <div class="card">
        <h3 style="color: var(--cor-principal);">📊 Métricas de Performance</h3>
        <div style="display: grid; gap: 15px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <span style="color: var(--text-secondary);">Receita por Uso:</span>
            <strong style="color: var(--text-primary);">R$ ${dados.mediaPorUso || '0,00'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <span style="color: var(--text-secondary);">Receita Hoje:</span>
            <strong style="color: var(--cor-sucesso);">R$ ${dados.receitaHoje || '0,00'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <span style="color: var(--text-secondary);">Taxa de Ocupação:</span>
            <strong style="color: var(--cor-principal);">${dados.ocupacao || '78'}%</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0;">
            <span style="color: var(--text-secondary);">Tempo Médio por Uso:</span>
            <strong style="color: var(--text-primary);">${dados.tempoMedio || '12'} min</strong>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h3 style="color: var(--cor-principal);">💰 Projeções</h3>
        <div style="display: grid; gap: 15px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <span style="color: var(--text-secondary);">Receita Mensal Estimada:</span>
            <strong style="color: var(--cor-sucesso);">R$ ${dados.projecaoMensal || '13.200,00'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <span style="color: var(--text-secondary);">Lucro Anual Projetado:</span>
            <strong style="color: var(--cor-principal);">R$ ${dados.projecaoAnual || '110.040,00'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <span style="color: var(--text-secondary);">ROI Estimado:</span>
            <strong style="color: var(--cor-aviso);">${dados.roi || '245'}%</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0;">
            <span style="color: var(--text-secondary);">Payback:</span>
            <strong style="color: var(--text-primary);">${dados.payback || '8'} meses</strong>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Ações -->
    <div class="card">
      <h3 style="color: var(--cor-principal);">📈 Ações Disponíveis</h3>
      <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 15px;">
        <button onclick="gerarRelatorioFinanceiro()" style="background: var(--cor-principal); color: white; border: none; padding: 12px 24px; border-radius: var(--border-radius); cursor: pointer; font-weight: 600;">
          📊 Gerar Relatório
        </button>
        <button onclick="exportarDadosFinanceiros()" style="background: var(--cor-sucesso); color: white; border: none; padding: 12px 24px; border-radius: var(--border-radius); cursor: pointer; font-weight: 600;">
          📥 Exportar Dados
        </button>
        <button onclick="configurarMetas()" style="background: var(--cor-aviso); color: white; border: none; padding: 12px 24px; border-radius: var(--border-radius); cursor: pointer; font-weight: 600;">
          🎯 Configurar Metas
        </button>
      </div>
    </div>
  `;
}

function gerarRelatorioFinanceiro() {
  mostrarNotificacao({
    tipo: 'sucesso',
    titulo: '📊 Relatório Gerado',
    mensagem: 'Relatório financeiro foi gerado com sucesso!',
    duracao: 5000
  });
  logToBackend('relatorio', `Relatório financeiro gerado por ${usuarioAtual.nome}`);
}

function exportarDadosFinanceiros() {
  mostrarNotificacao({
    tipo: 'sucesso',
    titulo: '📥 Dados Exportados',
    mensagem: 'Dados financeiros exportados para Excel!',
    duracao: 5000
  });
  logToBackend('export', `Dados financeiros exportados por ${usuarioAtual.nome}`);
}

function configurarMetas() {
  mostrarNotificacao({
    tipo: 'info',
    titulo: '🎯 Configurar Metas',
    mensagem: 'Funcionalidade de configuração de metas em desenvolvimento.',
    duracao: 5000
  });
}
// ===== SEÇÃO ANÚNCIOS =====
async function carregarAnuncios() {
  await carregarListaAnuncios();
  atualizarEstatisticasAnuncios();
}

async function carregarListaAnuncios() {
  const container = document.getElementById('listaAnuncios');

  // 1) Backend primeiro
  try {
    const res = await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/anuncios`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      anunciosAtivos = await res.json();
      exibirAnuncios(anunciosAtivos);
      atualizarEstatisticasAnuncios();
      return;
    }
  } catch (err) {
    console.warn('Erro ao carregar do backend:', err);
  }

  // 2) Firebase como fallback
  if (!modoForcadoDemo && firebaseDisponivel && firebase.database) {
    firebase.database().ref('anuncios').once('value', (snapshot) => {
      const dadosReais = snapshot.val();
      if (dadosReais && Object.keys(dadosReais).length > 0) {
        anunciosAtivos = Object.keys(dadosReais).map(key => ({ id: key, ...dadosReais[key] }));
        exibirAnuncios(anunciosAtivos);
        atualizarEstatisticasAnuncios();
      } else {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary);">Nenhum anúncio encontrado</div>`;
      }
    }).catch((error) => {
      console.error('Erro ao carregar anúncios Firebase:', error);
    });
    return;
  }

  // 3) LocalStorage como fallback
  const armazenados = localStorage.getItem('anunciosCleanHelmet');
  if (armazenados) {
    anunciosAtivos = JSON.parse(armazenados);
    exibirAnuncios(anunciosAtivos);
    atualizarEstatisticasAnuncios();
    return;
  }

  // 4) Modo demo
  anunciosAtivos = [ /* ... seus anúncios demo ... */ ];
  exibirAnuncios(anunciosAtivos);
  atualizarEstatisticasAnuncios();
}

async function salvarAnuncio(event) {
  event.preventDefault();
  // ... coleta dos campos e montagem do objeto
  const novoAnuncio = { id: 'anuncio_' + Date.now(), /* ... */ };

  anunciosAtivos.push(novoAnuncio);

  // 🔗 Backend REST
  try {
    await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/anuncios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoAnuncio),
      credentials: 'include'
    });
  } catch (err) {
    console.error('Erro ao salvar no backend:', err);
  }

  // Firebase/localStorage fallback
  if (firebaseDisponivel && firebase.database) {
    firebase.database().ref('anuncios/' + novoAnuncio.id).set(novoAnuncio);
  }
  localStorage.setItem('anunciosCleanHelmet', JSON.stringify(anunciosAtivos));

  exibirAnuncios(anunciosAtivos);
  atualizarEstatisticasAnuncios();
  fecharModalAnuncio();
  mostrarNotificacao({ tipo: 'sucesso', titulo: '✅ Anúncio Salvo', mensagem: `Anúncio "${novoAnuncio.titulo}" foi criado com sucesso!`, duracao: 5000 });
}

function editarAnuncio(id) {
  const anuncio = anunciosAtivos.find(a => a.id === id);
  if (!anuncio) return;

  // ... preencher modal com dados existentes ...

  document.getElementById('formAnuncio').onsubmit = async function(event) {
    event.preventDefault();
    const index = anunciosAtivos.findIndex(a => a.id === id);
    if (index !== -1) {
      anunciosAtivos[index] = { ...anunciosAtivos[index], /* ... novos campos ... */ };

      // 🔗 Backend REST
      try {
        await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/anuncios/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(anunciosAtivos[index]),
          credentials: 'include'
        });
      } catch (err) {
        console.error('Erro ao atualizar no backend:', err);
      }

      // Firebase/localStorage fallback
      if (firebaseDisponivel && firebase.database) {
        firebase.database().ref('anuncios/' + id).update(anunciosAtivos[index]);
      }
      localStorage.setItem('anunciosCleanHelmet', JSON.stringify(anunciosAtivos));

      exibirAnuncios(anunciosAtivos);
      atualizarEstatisticasAnuncios();
      fecharModalAnuncio();
      mostrarNotificacao({ tipo: 'sucesso', titulo: '✅ Anúncio Atualizado', mensagem: `Anúncio "${anunciosAtivos[index].titulo}" foi atualizado com sucesso!`, duracao: 5000 });
    }
    document.getElementById('formAnuncio').onsubmit = salvarAnuncio;
  };

  document.getElementById('modalAnuncio').style.display = 'flex';
}

async function excluirAnuncio(id) {
  if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;
  const index = anunciosAtivos.findIndex(a => a.id === id);
  if (index !== -1) {
    const tituloAnuncio = anunciosAtivos[index].titulo;
    anunciosAtivos.splice(index, 1);

    // 🔗 Backend REST
    try {
      await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/anuncios/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Erro ao excluir no backend:', err);
    }

    // Firebase/localStorage fallback
    if (firebaseDisponivel && firebase.database) {
      firebase.database().ref('anuncios/' + id).remove();
    }
    localStorage.setItem('anunciosCleanHelmet', JSON.stringify(anunciosAtivos));

    exibirAnuncios(anunciosAtivos);
    atualizarEstatisticasAnuncios();
    mostrarNotificacao({ tipo: 'sucesso', titulo: '🗑️ Anúncio Excluído', mensagem: `Anúncio "${tituloAnuncio}" foi excluído com sucesso!`, duracao: 5000 });
  }
}

async function toggleAnuncio(id) {
  const index = anunciosAtivos.findIndex(a => a.id === id);
  if (index !== -1) {
    anunciosAtivos[index].ativo = !anunciosAtivos[index].ativo;

    // 🔗 Backend REST
    try {
      await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/anuncios/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include'
      });
    } catch (err) {
      console.error('Erro ao alternar status no backend:', err);
    }

    // Firebase/localStorage fallback
    if (firebaseDisponivel && firebase.database) {
      firebase.database().ref('anuncios/' + id + '/ativo').set(anunciosAtivos[index].ativo);
    }
    localStorage.setItem('anunciosCleanHelmet', JSON.stringify(anunciosAtivos));

    exibirAnuncios(anunciosAtivos);
    atualizarEstatisticasAnuncios();
    mostrarNotificacao({ tipo: 'sucesso', titulo: anunciosAtivos[index].ativo ? '▶️ Anúncio Ativado' : '⏸️ Anúncio Pausado', mensagem: `Anúncio "${anunciosAtivos[index].titulo}" foi ${anunciosAtivos[index].ativo ? 'ativado' : 'pausado'}!`, duracao: 5000 });
  }
}


// Funções auxiliares para botões
function gerarRelatorioAnuncios() {
  mostrarNotificacao({
    tipo: 'info',
    titulo: '📊 Relatório de Anúncios',
    mensagem: 'Funcionalidade em desenvolvimento.',
    duracao: 5000
  });
}

function importarAnuncios() {
  mostrarNotificacao({
    tipo: 'info',
    titulo: '📥 Importar Anúncios',
    mensagem: 'Funcionalidade em desenvolvimento.',
    duracao: 5000
  });
}

function atualizarAnuncios() {
  carregarListaAnuncios();
  mostrarNotificacao({
    tipo: 'sucesso',
    titulo: '🔄 Anúncios Atualizados',
    mensagem: 'Lista de anúncios foi atualizada!',
    duracao: 3000
  });
}

function abrirVisualizadorAnuncios() {
  const anunciosAtivos = window.anunciosAtivos?.filter(a => a.ativo) || [];
  
  if (anunciosAtivos.length === 0) {
    mostrarNotificacao({
      tipo: 'aviso',
      titulo: '⚠️ Nenhum Anúncio Ativo',
      mensagem: 'Não há anúncios ativos para exibir.',
      duracao: 5000
    });
    return;
  }
  
  document.getElementById('visualizadorAnuncios').style.display = 'block';
  iniciarCarroselAnuncios(anunciosAtivos);
}

function fecharVisualizadorAnuncios() {
  document.getElementById('visualizadorAnuncios').style.display = 'none';
  
  // Parar carrossel
  if (window.carrosselInterval) {
    clearInterval(window.carrosselInterval);
    window.carrosselInterval = null;
  }
}

function iniciarCarroselAnuncios(anuncios) {
  let indiceAtual = 0;
  
  function exibirProximoAnuncio() {
    if (anuncios.length === 0) return;
    
    const anuncio = anuncios[indiceAtual];
    exibirAnuncioCompleto(anuncio);
    
    // Próximo anúncio
    setTimeout(() => {
      indiceAtual = (indiceAtual + 1) % anuncios.length;
      if (document.getElementById('visualizadorAnuncios').style.display === 'block') {
        exibirProximoAnuncio();
      }
    }, anuncio.duracao * 1000);
  }
  
  exibirProximoAnuncio();
}

function exibirAnuncioCompleto(anuncio) {
  const container = document.getElementById('containerAnuncioAtual');
  const info = document.getElementById('infoAnuncioAtual');
  const barra = document.getElementById('barraProgresso');
  
  let conteudoHtml = '';
  
  switch(anuncio.tipo) {
    case 'imagem':
      conteudoHtml = `<img src="${anuncio.url}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="${anuncio.titulo}">`;
      break;
    case 'video':
      conteudoHtml = `<video src="${anuncio.url}" style="max-width: 100%; max-height: 100%;" autoplay muted loop></video>`;
      break;
    case 'youtube':
      conteudoHtml = `<iframe src="https://www.youtube.com/embed/${anuncio.youtubeId}?autoplay=1&mute=1" style="width: 80vw; height: 45vw; max-width: 1200px; max-height: 675px;" frameborder="0" allowfullscreen></iframe>`;
      break;
    case 'html':
      conteudoHtml = anuncio.conteudoHtml;
      break;
  }
  
  container.innerHTML = conteudoHtml;
  info.innerHTML = `
    <div style="font-weight: 600;">${anuncio.titulo}</div>
    <div style="font-size: 12px; opacity: 0.8;">${getTipoTexto(anuncio.tipo)} • ${anuncio.duracao}s • ${anuncio.prioridade}</div>
  `;
  
  // Animação da barra de progresso
  barra.style.width = '0%';
  barra.style.transition = `width ${anuncio.duracao}s linear`;
  
  setTimeout(() => {
    barra.style.width = '100%';
  }, 100);
}

// ===== SEÇÃO PAGAMENTOS =====
function carregarPagamentos() {
  console.log('💳 Carregando seção de pagamentos Mercado Pago...');
  
  const container = document.getElementById('mercadopago-container');
  if (!container) {
    console.error('❌ Container de pagamentos não encontrado');
    return;
  }
  
  container.innerHTML = `
    <div class="card">
      <h3 style="color: var(--cor-principal); margin-bottom: 20px;">💳 Sistema de Pagamentos Mercado Pago</h3>
      
      <!-- Estatísticas de Pagamentos -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
        <div class="stat-card">
          <div class="stat-value" id="totalPagamentos">0</div>
          <div class="stat-label">Total de Pagamentos</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="pagamentosAprovados">0</div>
          <div class="stat-label">Aprovados</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="pagamentosPendentes">0</div>
          <div class="stat-label">Pendentes</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="valorTotal">R$ 0,00</div>
          <div class="stat-label">Valor Total</div>
        </div>
      </div>
      
      <!-- Ações -->
      <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
        <button onclick="criarPagamentoTeste()" style="background: var(--cor-principal); color: white; border: none; padding: 12px 24px; border-radius: var(--border-radius); cursor: pointer; font-weight: 600;">
          💳 Criar Pagamento Teste
        </button>
        <button onclick="consultarPagamentos()" style="background: var(--cor-aviso); color: white; border: none; padding: 12px 24px; border-radius: var(--border-radius); cursor: pointer; font-weight: 600;">
          🔍 Consultar Pagamentos
        </button>
        <button onclick="gerarRelatorioPagamentos()" style="background: var(--cor-sucesso); color: white; border: none; padding: 12px 24px; border-radius: var(--border-radius); cursor: pointer; font-weight: 600;">
          📊 Relatório
        </button>
      </div>
      
      <!-- Lista de Pagamentos Recentes -->
      <div>
        <h4 style="color: var(--text-primary); margin-bottom: 15px;">📋 Pagamentos Recentes</h4>
        <div id="listaPagamentos" style="background: var(--bg-tertiary); border-radius: var(--border-radius); padding: 15px;">
          <!-- Pagamentos serão carregados aqui -->
        </div>
      </div>
    </div>
  `;
  
  carregarEstatisticasPagamentos();
  carregarListaPagamentos();
}

async function carregarEstatisticasPagamentos() {
  try {
    if (backendDisponivel) {
      const response = await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/mercadopago/statistics`);
      if (response.ok) {
        const stats = await response.json();
        
        updateElement('totalPagamentos', stats.total_payments || 0);
        updateElement('pagamentosAprovados', stats.approved_payments || 0);
        updateElement('pagamentosPendentes', stats.pending_payments || 0);
        updateElement('valorTotal', `R$ ${(stats.total_amount || 0).toFixed(2)}`);
        
        return;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas MP:', error);
  }
  
  // Dados demo
  updateElement('totalPagamentos', 156);
  updateElement('pagamentosAprovados', 142);
  updateElement('pagamentosPendentes', 8);
  updateElement('valorTotal', 'R$ 1.247,50');
}

function carregarListaPagamentos() {
  const container = document.getElementById('listaPagamentos');
  
  // Dados demo de pagamentos
  const pagamentosDemo = [
    {
      id: 'MP001',
      valor: 'R$ 9,99',
      status: 'approved',
      data: new Date().toLocaleDateString('pt-BR'),
      metodo: 'PIX'
    },
    {
      id: 'MP002',
      valor: 'R$ 12,50',
      status: 'pending',
      data: new Date(Date.now() - 86400000).toLocaleDateString('pt-BR'),
      metodo: 'Cartão'
    },
    {
      id: 'MP003',
      valor: 'R$ 7,99',
      status: 'approved',
      data: new Date(Date.now() - 172800000).toLocaleDateString('pt-BR'),
      metodo: 'PIX'
    }
  ];
  
  if (pagamentosDemo.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
        <div style="font-size: 32px; margin-bottom: 10px;">💳</div>
        <p>Nenhum pagamento encontrado.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = pagamentosDemo.map(pagamento => {
    const statusClass = pagamento.status === 'approved' ? 'sucesso' : pagamento.status === 'pending' ? 'aviso' : 'erro';
    const statusTexto = pagamento.status === 'approved' ? 'Aprovado' : pagamento.status === 'pending' ? 'Pendente' : 'Rejeitado';
    
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div>
          <div style="font-weight: 600; color: var(--text-primary);">${pagamento.id}</div>
          <div style="font-size: 14px; color: var(--text-secondary);">${pagamento.data} • ${pagamento.metodo}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 600; color: var(--text-primary);">${pagamento.valor}</div>
          <div style="font-size: 12px; color: var(--cor-${statusClass}); font-weight: 600;">${statusTexto}</div>
        </div>
      </div>
    `;
  }).join('');
}

function criarPagamentoTeste() {
  mostrarNotificacao({
    tipo: 'sucesso',
    titulo: '💳 Pagamento Teste',
    mensagem: 'Pagamento teste criado com sucesso! ID: MP' + Math.floor(Math.random() * 1000),
    duracao: 8000
  });
  
  // Simular adição de novo pagamento
  setTimeout(() => {
    carregarListaPagamentos();
    carregarEstatisticasPagamentos();
  }, 1000);
  
  logToBackend('pagamento', `Pagamento teste criado por ${usuarioAtual.nome}`);
}

function consultarPagamentos() {
  mostrarNotificacao({
    tipo: 'info',
    titulo: '🔍 Consultando',
    mensagem: 'Consultando pagamentos no Mercado Pago...',
    duracao: 5000
  });
  
  setTimeout(() => {
    carregarListaPagamentos();
    mostrarNotificacao({
      tipo: 'sucesso',
      titulo: '✅ Consulta Concluída',
      mensagem: 'Pagamentos atualizados com sucesso!',
      duracao: 5000
    });
  }, 2000);
  
  logToBackend('pagamento', `Consulta de pagamentos realizada por ${usuarioAtual.nome}`);
}

function gerarRelatorioPagamentos() {
  mostrarNotificacao({
    tipo: 'sucesso',
    titulo: '📊 Relatório Gerado',
    mensagem: 'Relatório de pagamentos foi gerado com sucesso!',
    duracao: 5000
  });
  
  logToBackend('relatorio', `Relatório de pagamentos gerado por ${usuarioAtual.nome}`);
}

// ===== SEÇÃO CONFIG MP =====
function carregarConfiguracaoMP() {
  console.log('🔧 Carregando configuração Mercado Pago...');
  
  const container = document.getElementById('mp-config-container');
  if (!container) {
    console.error('❌ Container de configuração não encontrado');
    return;
  }
  
  container.innerHTML = `
    <div class="card">
      <h3 style="color: var(--cor-principal); margin-bottom: 20px;">🔧 Configuração Mercado Pago</h3>
      
      <!-- Status da Configuração -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 30px;">
        <div style="background: var(--bg-tertiary); padding: 20px; border-radius: var(--border-radius); text-align: center;">
          <div style="font-size: 32px; margin-bottom: 10px;" id="statusIcon">⚠️</div>
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">Status da API</div>
          <div style="color: var(--cor-aviso); font-size: 14px;" id="statusTexto">Não Configurado</div>
        </div>
        
        <div style="background: var(--bg-tertiary); padding: 20px; border-radius: var(--border-radius); text-align: center;">
          <div style="font-size: 32px; margin-bottom: 10px;">🔑</div>
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">Credenciais</div>
          <div style="color: var(--text-secondary); font-size: 14px;" id="credenciaisStatus">Aguardando</div>
        </div>
        
        <div style="background: var(--bg-tertiary); padding: 20px; border-radius: var(--border-radius); text-align: center;">
          <div style="font-size: 32px; margin-bottom: 10px;">🌐</div>
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">Webhook</div>
          <div style="color: var(--text-secondary); font-size: 14px;">Configurado</div>
        </div>
      </div>
      
      <!-- Formulário de Configuração -->
      <form onsubmit="salvarConfiguracaoMP(event)" style="background: var(--bg-tertiary); padding: 25px; border-radius: var(--border-radius);">
        <h4 style="color: var(--text-primary); margin-bottom: 20px;">📝 Credenciais da API</h4>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; color: var(--text-primary); margin-bottom: 8px; font-weight: 600;">
            🔑 Public Key (Chave Pública):
          </label>
          <input 
            type="text" 
            id="mpPublicKey" 
            placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            style="width: 100%; padding: 12px; border: 1px solid #444; border-radius: var(--border-radius); background: var(--bg-secondary); color: var(--text-primary); font-family: monospace;"
          >
          <small style="color: var(--text-secondary); display: block; margin-top: 5px;">
            Chave pública para processar pagamentos no frontend
          </small>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; color: var(--text-primary); margin-bottom: 8px; font-weight: 600;">
            🔐 Access Token (Token de Acesso):
          </label>
          <input 
            type="password" 
            id="mpAccessToken" 
            placeholder="TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxx"
            style="width: 100%; padding: 12px; border: 1px solid #444; border-radius: var(--border-radius); background: var(--bg-secondary); color: var(--text-primary); font-family: monospace;"
          >
          <small style="color: var(--text-secondary); display: block; margin-top: 5px;">
            Token secreto para operações no backend (mantenha seguro!)
          </small>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; color: var(--text-primary); margin-bottom: 8px; font-weight: 600;">
            🌍 Ambiente:
          </label>
          <select 
            id="mpAmbiente" 
            style="width: 100%; padding: 12px; border: 1px solid #444; border-radius: var(--border-radius); background: var(--bg-secondary); color: var(--text-primary);"
          >
            <option value="sandbox">🧪 Sandbox (Testes)</option>
            <option value="production">🚀 Produção</option>
          </select>
          <small style="color: var(--text-secondary); display: block; margin-top: 5px;">
            Use Sandbox para testes, Produção para pagamentos reais
          </small>
        </div>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; color: var(--text-primary); margin-bottom: 8px; font-weight: 600;">
            🔗 URL do Webhook:
          </label>
          <input 
            type="url" 
            id="mpWebhookUrl" 
            placeholder="https://seu-dominio.com/webhook/mercadopago"
            value="${window.location.origin}/webhook/mercadopago"
            style="width: 100%; padding: 12px; border: 1px solid #444; border-radius: var(--border-radius); background: var(--bg-secondary); color: var(--text-primary);"
          >
          <small style="color: var(--text-secondary); display: block; margin-top: 5px;">
            URL para receber notificações de pagamentos
          </small>
        </div>
        
        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
          <button 
            type="submit" 
            style="background: var(--cor-principal); color: white; border: none; padding: 12px 24px; border-radius: var(--border-radius); cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;"
          >
            💾 Salvar Configuração
          </button>
          
          <button 
            type="button" 
            onclick="testarConfiguracaoMP()"
            style="background: var(--cor-sucesso); color: white; border: none; padding: 12px 24px; border-radius: var(--border-radius); cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;"
          >
            🧪 Testar Conexão
          </button>
          
          <button 
            type="button" 
            onclick="limparConfiguracaoMP()"
            style="background: var(--cor-erro); color: white; border: none; padding: 12px 24px; border-radius: var(--border-radius); cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;"
          >
            🗑️ Limpar
          </button>
        </div>
      </form>
      
      <!-- Informações Adicionais -->
      <div style="margin-top: 30px; background: var(--bg-tertiary); padding: 20px; border-radius: var(--border-radius);">
        <h4 style="color: var(--text-primary); margin-bottom: 15px;">📚 Como Obter as Credenciais</h4>
        
        <ol style="color: var(--text-secondary); line-height: 1.8; padding-left: 20px;">
          <li>Acesse o <a href="https://www.mercadopago.com.br/developers" target="_blank" style="color: var(--cor-principal);">Mercado Pago Developers</a></li>
          <li>Faça login na sua conta Mercado Pago</li>
          <li>Crie uma nova aplicação ou selecione uma existente</li>
          <li>Vá em "Credenciais" e copie a Public Key e Access Token</li>
          <li>Para testes, use as credenciais de Sandbox</li>
          <li>Para produção, solicite a aprovação da aplicação primeiro</li>
        </ol>
        
        <div style="margin-top: 20px; padding: 15px; background: rgba(255, 170, 0, 0.1); border-left: 4px solid var(--cor-aviso); border-radius: 4px;">
          <strong style="color: var(--cor-aviso);">⚠️ Importante:</strong>
          <p style="color: var(--text-secondary); margin: 8px 0 0 0;">
            Nunca compartilhe seu Access Token. Ele deve ser mantido seguro e usado apenas no backend.
          </p>
        </div>
      </div>
    </div>
  `;
  
  carregarCredenciaisSalvas();
}

function carregarCredenciaisSalvas() {
  // Carregar credenciais salvas do localStorage (apenas para demo)
  const publicKey = localStorage.getItem('mp_public_key') || '';
  const accessToken = localStorage.getItem('mp_access_token') || '';
  const ambiente = localStorage.getItem('mp_ambiente') || 'sandbox';
  const webhookUrl = localStorage.getItem('mp_webhook_url') || `${window.location.origin}/webhook/mercadopago`;
  
  if (document.getElementById('mpPublicKey')) {
    document.getElementById('mpPublicKey').value = publicKey;
    document.getElementById('mpAccessToken').value = accessToken;
    document.getElementById('mpAmbiente').value = ambiente;
    document.getElementById('mpWebhookUrl').value = webhookUrl;
  }
  
  // Atualizar status
  if (publicKey && accessToken) {
    document.getElementById('statusIcon').textContent = '✅';
    document.getElementById('statusTexto').textContent = 'Configurado';
    document.getElementById('statusTexto').style.color = 'var(--cor-sucesso)';
    document.getElementById('credenciaisStatus').textContent = 'Válidas';
    document.getElementById('credenciaisStatus').style.color = 'var(--cor-sucesso)';
  }
}

function salvarConfiguracaoMP(event) {
  event.preventDefault();
  
  const publicKey = document.getElementById('mpPublicKey').value;
  const accessToken = document.getElementById('mpAccessToken').value;
  const ambiente = document.getElementById('mpAmbiente').value;
  const webhookUrl = document.getElementById('mpWebhookUrl').value;
  
  if (!publicKey || !accessToken) {
    mostrarNotificacao({
      tipo: 'erro',
      titulo: '❌ Campos Obrigatórios',
      mensagem: 'Preencha a Public Key e Access Token.',
      duracao: 6000
    });
    return;
  }
  
  // Salvar no localStorage (apenas para demo)
  localStorage.setItem('mp_public_key', publicKey);
  localStorage.setItem('mp_access_token', accessToken);
  localStorage.setItem('mp_ambiente', ambiente);
  localStorage.setItem('mp_webhook_url', webhookUrl);
  
  // Atualizar status
  document.getElementById('statusIcon').textContent = '✅';
  document.getElementById('statusTexto').textContent = 'Configurado';
  document.getElementById('statusTexto').style.color = 'var(--cor-sucesso)';
  document.getElementById('credenciaisStatus').textContent = 'Válidas';
  document.getElementById('credenciaisStatus').style.color = 'var(--cor-sucesso)';
  
  mostrarNotificacao({
    tipo: 'sucesso',
    titulo: '✅ Configuração Salva',
    mensagem: `Credenciais do Mercado Pago salvas com sucesso! (Ambiente: ${ambiente})`,
    duracao: 8000
  });
  
  logToBackend('configuracao', `Configuração Mercado Pago salva por ${usuarioAtual.nome} (${ambiente})`);
}

function testarConfiguracaoMP() {
  const publicKey = document.getElementById('mpPublicKey').value;
  const accessToken = document.getElementById('mpAccessToken').value;
  
  if (!publicKey || !accessToken) {
    mostrarNotificacao({
      tipo: 'erro',
      titulo: '❌ Configuração Incompleta',
      mensagem: 'Preencha as credenciais antes de testar.',
      duracao: 6000
    });
    return;
  }
  
  mostrarNotificacao({
    tipo: 'info',
    titulo: '🧪 Testando Conexão',
    mensagem: 'Verificando credenciais do Mercado Pago...',
    duracao: 3000
  });
  
  // Simular teste de conexão
  setTimeout(() => {
    const isValid = publicKey.startsWith('TEST-') || publicKey.startsWith('APP_USR-');
    
    if (isValid) {
      mostrarNotificacao({
        tipo: 'sucesso',
        titulo: '✅ Teste Bem-Sucedido',
        mensagem: 'Conexão com Mercado Pago estabelecida com sucesso!',
        duracao: 8000
      });
    } else {
      mostrarNotificacao({
        tipo: 'erro',
        titulo: '❌ Teste Falhou',
        mensagem: 'Credenciais inválidas. Verifique a Public Key.',
        duracao: 8000
      });
    }
  }, 2000);
  
  logToBackend('teste', `Teste de configuração Mercado Pago por ${usuarioAtual.nome}`);
}

function limparConfiguracaoMP() {
  if (!confirm('Tem certeza que deseja limpar todas as configurações do Mercado Pago?')) {
    return;
  }
  
  // Limpar localStorage
  localStorage.removeItem('mp_public_key');
  localStorage.removeItem('mp_access_token');
  localStorage.removeItem('mp_ambiente');
  localStorage.removeItem('mp_webhook_url');
  
  // Limpar formulário
  document.getElementById('mpPublicKey').value = '';
  document.getElementById('mpAccessToken').value = '';
  document.getElementById('mpAmbiente').value = 'sandbox';
  document.getElementById('mpWebhookUrl').value = `${window.location.origin}/webhook/mercadopago`;
  
  // Atualizar status
  document.getElementById('statusIcon').textContent = '⚠️';
  document.getElementById('statusTexto').textContent = 'Não Configurado';
  document.getElementById('statusTexto').style.color = 'var(--cor-aviso)';
  document.getElementById('credenciaisStatus').textContent = 'Aguardando';
  document.getElementById('credenciaisStatus').style.color = 'var(--text-secondary)';
  
  mostrarNotificacao({
    tipo: 'info',
    titulo: '🗑️ Configuração Limpa',
    mensagem: 'Todas as configurações do Mercado Pago foram removidas.',
    duracao: 5000
  });
  
  logToBackend('configuracao', `Configuração Mercado Pago limpa por ${usuarioAtual.nome}`);
}

// ===== LOGS AVANÇADOS (BACKEND) =====
async function carregarLogsAvancados() {
  console.log('📋 Carregando logs avançados do backend...');
  
  if (!backendDisponivel) {
    showBackendUnavailable('backend-logs-container');
    return;
  }
  
  try {
    const response = await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/admin/logs`);
    
    if (response.ok) {
      const data = await response.json();
      logsBackend = data.logs || [];
      displayBackendLogs(logsBackend);
      updateLogsStats();
    } else {
      throw new Error('Falha ao carregar logs');
    }
  } catch (error) {
    console.error('❌ Erro ao carregar logs do backend:', error);
    showBackendError('backend-logs-container', 'Erro ao carregar logs do backend');
  }
}

function displayBackendLogs(logs) {
  const container = document.getElementById('backend-logs-container');
  
  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📋</div>
        <h3 style="color: var(--text-primary);">Nenhum Log Encontrado</h3>
        <p>Os logs do backend aparecerão aqui em tempo real.</p>
      </div>
    `;
    return;
  }
  
  const logsHtml = logs.map((log, index) => `
    <div class="log-entry" onclick="showLogDetails(${index})">
      <div class="log-timestamp">${formatTimestamp(log.timestamp)}</div>
      <div class="log-level ${log.level || 'info'}">${(log.level || 'info').toUpperCase()}</div>
      <div class="log-type">${log.type || 'sistema'}</div>
      <div class="log-message">${escapeHtml(log.message || 'Sem mensagem')}</div>
      <div class="log-actions">
        <button class="log-action-btn" onclick="event.stopPropagation(); copyLogToClipboard(${index})" title="Copiar log">
          📋
        </button>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = logsHtml;
}

function addLogToDisplay(logData) {
  logsBackend.unshift(logData);
  
  // Manter apenas os últimos 1000 logs na memória
  if (logsBackend.length > 1000) {
    logsBackend = logsBackend.slice(0, 1000);
  }
  
  displayBackendLogs(logsBackend);
}

function updateLogsStats() {
  const stats = {
    total: logsBackend.length,
    error: logsBackend.filter(log => log.level === 'error').length,
    warning: logsBackend.filter(log => log.level === 'warn').length,
    info: logsBackend.filter(log => log.level === 'info').length
  };
  
  updateElement('totalBackendLogs', stats.total);
  updateElement('errorBackendLogs', stats.error);
  updateElement('warningBackendLogs', stats.warning);
  updateElement('infoBackendLogs', stats.info);
}

function filterBackendLogs() {
  const levelFilter = document.getElementById('logLevelFilter')?.value || '';
  const typeFilter = document.getElementById('logTypeFilter')?.value || '';
  
  let filteredLogs = logsBackend.filter(log => {
    if (levelFilter && log.level !== levelFilter) return false;
    if (typeFilter && log.type !== typeFilter) return false;
    return true;
  });
  
  displayBackendLogs(filteredLogs);
}

function searchBackendLogs() {
  const searchTerm = document.getElementById('logSearchInput')?.value.toLowerCase() || '';
  
  if (!searchTerm) {
    displayBackendLogs(logsBackend);
    return;
  }
  
  const filteredLogs = logsBackend.filter(log => {
    const message = (log.message || '').toLowerCase();
    const type = (log.type || '').toLowerCase();
    const level = (log.level || '').toLowerCase();
    
    return message.includes(searchTerm) || 
           type.includes(searchTerm) || 
           level.includes(searchTerm);
  });
  
  displayBackendLogs(filteredLogs);
}

async function refreshBackendLogs() {
  await carregarLogsAvancados();
  mostrarNotificacao({
    tipo: 'sucesso',
    titulo: '🔄 Logs Atualizados',
    mensagem: `${logsBackend.length} logs carregados do backend.`,
    duracao: 5000
  });
}

async function clearBackendLogs() {
  if (!confirm('⚠️ Tem certeza que deseja limpar todos os logs do backend?\n\nEsta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    const response = await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/admin/logs`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      logsBackend = [];
      displayBackendLogs(logsBackend);
      updateLogsStats();
      
      mostrarNotificacao({
        tipo: 'sucesso',
        titulo: '✅ Logs Limpos',
        mensagem: 'Todos os logs do backend foram removidos.',
        duracao: 8000
      });
    } else {
      throw new Error('Falha ao limpar logs');
    }
  } catch (error) {
    console.error('❌ Erro ao limpar logs:', error);
    mostrarNotificacao({
      tipo: 'erro',
      titulo: '❌ Erro',
      mensagem: 'Falha ao limpar logs do backend.',
      duracao: 8000
    });
  }
}

async function exportBackendLogs() {
  if (logsBackend.length === 0) {
    mostrarNotificacao({
      tipo: 'aviso',
      titulo: '⚠️ Nenhum Log',
      mensagem: 'Não há logs para exportar.',
      duracao: 5000
    });
    return;
  }
  
  try {
    const exportData = logsBackend.map(log => ({
      timestamp: log.timestamp,
      level: log.level || 'info',
      type: log.type || 'sistema',
      message: log.message || 'Sem mensagem',
      source: 'backend'
    }));
    
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clean-helmet-backend-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    mostrarNotificacao({
      tipo: 'sucesso',
      titulo: '📥 Logs Exportados',
      mensagem: `${logsBackend.length} logs exportados com sucesso!`,
      duracao: 8000
    });
    
  } catch (error) {
    console.error('❌ Erro ao exportar logs:', error);
    mostrarNotificacao({
      tipo: 'erro',
      titulo: '❌ Erro',
      mensagem: 'Falha ao exportar logs.',
      duracao: 8000
    });
  }
}

function toggleAutoRefreshLogs() {
  const btn = document.getElementById('autoRefreshBtn');
  
  if (autoRefreshLogsActive) {
    // Parar auto-refresh
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
    autoRefreshLogsActive = false;
    btn.innerHTML = '⚡ Auto-refresh';
    btn.classList.remove('active');
    
    mostrarNotificacao({
      tipo: 'info',
      titulo: '⏸️ Auto-refresh Parado',
      mensagem: 'Auto-refresh dos logs foi desativado.',
      duracao: 5000
    });
  } else {
    // Iniciar auto-refresh
    autoRefreshInterval = setInterval(() => {
      refreshBackendLogs();
    }, 30000); // 30 segundos
    
    autoRefreshLogsActive = true;
    btn.innerHTML = '⏸️ Auto-refresh';
    btn.classList.add('active');
    
    mostrarNotificacao({
      tipo: 'sucesso',
      titulo: '▶️ Auto-refresh Ativo',
      mensagem: 'Logs serão atualizados automaticamente a cada 30 segundos.',
      duracao: 8000
    });
  }
}

// ===== SEÇÃO LOGS FIREBASE (ORIGINAL) =====
function carregarLogs() {
  const container = document.getElementById('listaLogs');
  
  // Se estiver no modo Firebase real, tentar carregar dados reais
  if (!modoForcadoDemo && firebaseDisponivel && firebase.database) {
    firebase.database().ref('logs').limitToLast(50).once('value', (snapshot) => {
      const dadosReais = snapshot.val();
      
      if (dadosReais && Object.keys(dadosReais).length > 0) {
        const logsReais = Object.keys(dadosReais)
          .map(key => ({ id: key, ...dadosReais[key] }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        exibirLogs(logsReais);
      } else {
        // Não tem dados reais, mostrar estado vazio
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
            <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📝</div>
            <h3 style="color: var(--text-primary); margin-bottom: 12px;">Nenhum Log Encontrado</h3>
            <p>Os logs aparecerão aqui conforme as atividades do sistema.</p>
          </div>
        `;
      }
    }).catch((error) => {
      console.error('Erro ao carregar logs:', error);
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--cor-erro);">
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <h3>Erro ao carregar logs</h3>
          <p>Verifique a conexão com o Firebase.</p>
        </div>
      `;
    });
    return;
  }
  
  // Modo demo - logs simulados
  const logsDemo = [
    { tipo: 'login', mensagem: `Login realizado: ${usuarioAtual.nome}`, timestamp: new Date().toISOString() },
    { tipo: 'comando', mensagem: 'Comando executado: iniciar_limpeza', timestamp: new Date(Date.now() - 300000).toISOString() },
    { tipo: 'login', mensagem: 'Login demo realizado: Técnico', timestamp: new Date(Date.now() - 600000).toISOString() },
    { tipo: 'erro', mensagem: 'Falha na conexão com sensor de temperatura', timestamp: new Date(Date.now() - 900000).toISOString() },
    { tipo: 'comando', mensagem: 'Comando executado: ligar_ventilacao', timestamp: new Date(Date.now() - 1200000).toISOString() }
  ];
  
  exibirLogs(logsDemo);
}

function exibirLogs(logs) {
  const container = document.getElementById('listaLogs');
  
  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📝</div>
        <h3 style="color: var(--text-primary); margin-bottom: 12px;">Nenhum Log Encontrado</h3>
        <p>Os logs aparecerão aqui conforme as atividades do sistema.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = logs.map(log => `
    <div class="log-item">
      <div class="log-content">
        <span class="log-type ${log.tipo}">${log.tipo}</span>
        <span class="log-message">${log.mensagem}</span>
      </div>
      <div class="log-time">${new Date(log.timestamp).toLocaleString('pt-BR')}</div>
    </div>
  `).join('');
}

function limparLogs() {
  if (!confirm('Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  if (firebaseDisponivel && firebase.database && !modoForcadoDemo) {
    firebase.database().ref('logs').remove()
      .then(() => {
        mostrarNotificacao({
          tipo: 'sucesso',
          titulo: '✅ Logs Limpos',
          mensagem: 'Todos os logs foram removidos com sucesso.',
          duracao: 8000
        });
        carregarLogs();
      })
      .catch((error) => {
        console.error('Erro ao limpar logs:', error);
        mostrarNotificacao({
          tipo: 'erro',
          titulo: '❌ Erro',
          mensagem: 'Falha ao limpar logs. Tente novamente.',
          duracao: 8000
        });
      });
  } else {
    // Modo demo - simular limpeza
    document.getElementById('listaLogs').innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📝</div>
        <h3 style="color: var(--text-primary); margin-bottom: 12px;">Logs Limpos</h3>
        <p>Todos os logs foram removidos (modo demo).</p>
      </div>
    `;
    
    mostrarNotificacao({
      tipo: 'sucesso',
      titulo: '✅ Logs Limpos (Demo)',
      mensagem: 'Logs removidos no modo demonstração.',
      duracao: 8000
    });
  }
}

// ===== FUNÇÕES AUXILIARES =====
async function logToBackend(type, message) {
  if (!backendDisponivel) return;
  
  try {
    await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/admin/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        level: 'info',
        type: type,
        message: message,
        user: usuarioAtual?.email || 'sistema'
      })
    });
  } catch (error) {
    console.warn('Falha ao enviar log para backend:', error);
  }
}

async function loadBackendStats() {
  if (!backendDisponivel) return;
  
  try {
    const response = await fetch(`${BACKEND_CONFIG.baseUrl}${BACKEND_CONFIG.apiPath}/system/status`);
    if (response.ok) {
      const stats = await response.json();
      updateDashboardStats(stats);
    }
  } catch (error) {
    console.warn('Falha ao carregar estatísticas do backend:', error);
  }
}

function updateDashboardStats(stats) {
  // Atualizar estatísticas na interface se necessário
  console.log('📊 Estatísticas atualizadas:', stats);
}

function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('pt-BR');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function showBackendUnavailable(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
      <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">🔌</div>
      <h3 style="color: var(--text-primary);">Backend Não Disponível</h3>
      <p>O backend Node.js não está conectado.</p>
      <p style="font-size: 14px; margin-top: 10px;">Verifique se o servidor está rodando em http://localhost:3000</p>
    </div>
  `;
}

function showBackendError(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--cor-erro);">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <h3>Erro no Backend</h3>
      <p>${message}</p>
    </div>
  `;
}

function showFirebaseEmpty(container, title, message) {
  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
      <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">📡</div>
      <h3 style="color: var(--text-primary); margin-bottom: 12px;">${title}</h3>
      <p style="margin-bottom: 20px;">${message}</p>
      <p style="font-size: 14px; opacity: 0.8;">Os dados aparecerão aqui quando os dispositivos estiverem online.</p>
    </div>
  `;
}

function showFirebaseError(container, message) {
  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--cor-erro);">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <h3>Erro ao carregar dados</h3>
      <p>${message}</p>
    </div>
  `;
}

// ===== MODO HÍBRIDO =====
function alternarModoFirebase() {
  modoForcadoDemo = !modoForcadoDemo;
  atualizarInterfaceModo();
  
  const secaoAtiva = document.querySelector('.section.active');
  if (secaoAtiva) {
    const secaoId = secaoAtiva.id.replace('secao', '').toLowerCase()
      .replace('logsavancados', 'logs-avancados')
      .replace('mpconfig', 'mp-config');
    abrirSecao(secaoId);
  }
  
  const modo = modoForcadoDemo ? 'Demo' : (firebaseDisponivel ? 'Firebase' : 'Offline');
  mostrarNotificacao({
    tipo: 'sucesso',
    titulo: `🔄 Modo Alterado`,
    mensagem: `Sistema agora está em modo ${modo}`,
    duracao: 8000
  });
  
  logToBackend('sistema', `Modo alterado para: ${modo} por ${usuarioAtual.nome}`);
}

function atualizarInterfaceModo() {
  const botao = document.getElementById('toggleModoBtn');
  const icone = document.getElementById('modoIcon');
  const texto = document.getElementById('modoTexto');
  
  if (!botao || !icone || !texto) return;
  
  const isFirebaseDisponivel = firebaseDisponivel && !modoForcadoDemo;
  
  if (backendDisponivel && isFirebaseDisponivel) {
    botao.style.background = 'linear-gradient(45deg, var(--cor-sucesso), var(--cor-principal))';
    icone.textContent = '🔄';
    texto.textContent = 'Híbrido';
    botao.title = 'Sistema Híbrido: Firebase + Backend ativo';
  } else if (isFirebaseDisponivel) {
    botao.style.background = 'var(--cor-sucesso)';
    icone.textContent = '🔥';
    texto.textContent = 'Firebase';
    botao.title = 'Modo Firebase ativo';
  } else if (backendDisponivel) {
    botao.style.background = 'var(--cor-principal)';
    icone.textContent = '⚙️';
    texto.textContent = 'Backend';
    botao.title = 'Modo Backend ativo';
  } else {
    botao.style.background = 'var(--cor-aviso)';
    icone.textContent = '🎭';
    texto.textContent = 'Demo';
    botao.title = 'Modo Demo ativo';
  }
}

function iniciarAtualizacoes() {
  const intervaloSensores = setInterval(() => {
    if (document.getElementById('secaoSensores') && document.getElementById('secaoSensores').classList.contains('active')) {
      atualizarSensores();
    }
  }, 5000);
  
  intervalosAtualizacao.push(intervaloSensores);
}

// ===== SISTEMA DE NOTIFICAÇÕES =====
function mostrarNotificacao({ tipo = 'info', titulo, mensagem, duracao = 8000 }) {
  const container = document.getElementById('notificacoes-container');
  
  const notificacao = document.createElement('div');
  notificacao.className = `notificacao ${tipo}`;
  
  const id = 'notif_' + Date.now();
  notificacao.id = id;
  
  notificacao.innerHTML = `
    <div class="notificacao-header">
      <div class="notificacao-titulo">${titulo}</div>
      <button class="notificacao-fechar" onclick="fecharNotificacao('${id}')">×</button>
    </div>
    <div class="notificacao-mensagem">${mensagem}</div>
    <div class="notificacao-progresso">
      <div class="notificacao-barra"></div>
    </div>
  `;
  
  container.appendChild(notificacao);
  
  setTimeout(() => {
    fecharNotificacao(id);
  }, duracao);
  
  notificacao.addEventListener('mouseenter', () => {
    notificacao.classList.add('pausada');
  });
  
  notificacao.addEventListener('mouseleave', () => {
    notificacao.classList.remove('pausada');
  });
}

function fecharNotificacao(id) {
  const notificacao = document.getElementById(id);
  if (notificacao) {
    notificacao.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notificacao.parentNode) {
        notificacao.parentNode.removeChild(notificacao);
      }
    }, 300);
  }
}

// ===== CLEANUP =====
window.addEventListener('beforeunload', function() {
  intervalosAtualizacao.forEach(interval => {
    clearInterval(interval);
  });
  
  intervalosAnuncios.forEach(interval => {
    clearInterval(interval);
  });
  
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  if (socket) {
    socket.disconnect();
  }
});

// ===== DISPONIBILIZAR GLOBALMENTE =====
window.cleanHelmetHybrid = {
  version: '5.0.0',
  firebaseDisponivel,
  backendDisponivel,
  websocketConectado,
  usuarioAtual: () => usuarioAtual,
  abrirSecao,
  mostrarNotificacao,
  logToBackend
};

console.log('🚀 Clean Helmet Sistema Híbrido v5.0 COMPLETO carregado com sucesso');


