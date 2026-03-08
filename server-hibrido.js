// ===== CLEAN HELMET BACKEND HÍBRIDO v5.0 =====
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs-extra');
const cron = require('node-cron');
const moment = require('moment');

// ===== EXPRESS =====
const app = express();
app.set("trust proxy", 1);

// ===== MIDDLEWARES DE SEGURANÇA E PERFORMANCE =====
app.use(cors()); // libera CORS básico (se quiser usar a versão com allowedOrigins, mantenha só aquela)
app.use(helmet()); // segurança de headers
app.use(compression()); // compressão gzip
app.use(express.json({ limit: '10mb' })); // parse JSON com limite
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // parse URL-encoded

// Logging com Morgan
app.use(morgan("combined"));

// Rate limiting (proteção contra flood)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo de requisições por IP
  message: {
    error: "Muitas requisições, tente novamente mais tarde."
  }
}));


// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, "public")));

// ===== FIREBASE REALTIME DATABASE =====
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cleanhelmet-e55b7-default-rtdb.firebaseio.com"
});

console.log("✅ Firebase inicializado com projeto:", serviceAccount.project_id);

// ===== ROTAS DE TESTE FIREBASE =====
app.get("/api/test-firebase", async (req, res) => {
  try {
    await admin.database().ref("test").set({
      message: "Firebase funcionando!",
      timestamp: new Date().toISOString()
    });
    res.json({ success: true, message: "Dados gravados no Firebase" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/read-firebase", async (req, res) => {
  try {
    const snapshot = await admin.database().ref("test").once("value");
    res.json({ success: true, data: snapshot.val() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔗 Função auxiliar para salvar status de pagamento
function salvarStatusPagamento(paymentId, status, method) {
  const ref = admin.database().ref("payments/" + paymentId);
  ref.set({
    status,
    method,
    updatedAt: Date.now()
  });
}

// Lista de origens permitidas via variável de ambiente
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  "http://localhost:3000"
];

// ===== INICIALIZAÇÃO DO SERVIDOR COM SOCKET.IO =====
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3000;

io.on("connection", (socket) => {
  console.log("Cliente conectado via WebSocket");
  socket.on("status_update", (data) => {
    console.log("Evento recebido:", data);
    io.emit("status_update", data);
  });
});

// ===== CONFIGURAÇÃO DE LOGS =====
const logDir = './logs';
fs.ensureDirSync(logDir);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'clean-helmet-hybrid' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'system-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d'
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '10m',
      maxFiles: '30d'
    })
  ]
});

// ===== MIDDLEWARES =====
app.use(helmet({
  contentSecurityPolicy: false, // Permitir inline scripts para desenvolvimento
}));


app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Morgan logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  message: {
    error: 'Muitas requisições, tente novamente mais tarde.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  }
});

app.use('/api/', limiter);

// Servir arquivos estáticos
app.use(express.static('.'));

// ===== ARMAZENAMENTO EM MEMÓRIA (PARA DEMO) =====
let logsMemoria = [];
let systemStats = {
  startTime: Date.now(),
  totalRequests: 0,
  errorCount: 0,
  lastActivity: Date.now()
};

// ===== WEBSOCKET =====
io.on('connection', (socket) => {
  logger.info(`Cliente WebSocket conectado: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Cliente WebSocket desconectado: ${socket.id}`);
  });
  
  // Enviar logs existentes para novo cliente
  socket.emit('initial-logs', logsMemoria.slice(-100));
  
  // ===== DEBUG EVENTS =====
  // Debug test event
  socket.on('debug-test', (data) => {
    addLog('info', 'debug', 'Debug test received via WebSocket', {
      data,
      socketId: socket.id
    });
    
    socket.emit('debug-response', { 
      message: 'Debug test successful', 
      timestamp: new Date().toISOString(),
      socketId: socket.id,
      data 
    });
  });
  
  // Device commands for testing
  socket.on('device-command', (command) => {
    addLog('info', 'device', `Device command received: ${command.device} - ${command.action}`, {
      command,
      socketId: socket.id
    });
    
    // Broadcast to all clients (for real system integration)
    socket.broadcast.emit('device-status-update', {
      device: command.device,
      action: command.action,
      timestamp: command.timestamp,
      source: 'remote-control',
      socketId: socket.id
    });
    
    // Send confirmation back to sender
    socket.emit('command-confirmed', {
      command,
      status: 'executed',
      timestamp: new Date().toISOString(),
      socketId: socket.id
    });
  });
  
  // Log subscription for real-time updates
  socket.on('subscribe-logs', () => {
    socket.join('logs-room');
    addLog('info', 'subscription', 'Client subscribed to real-time logs', {
      socketId: socket.id
    });
  });
  
  socket.on('unsubscribe-logs', () => {
    socket.leave('logs-room');
    addLog('info', 'subscription', 'Client unsubscribed from real-time logs', {
      socketId: socket.id
    });
  });
  
  // Heartbeat para manter conexão ativa
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
});

// ===== FUNÇÕES AUXILIARES =====
function addLog(level, type, message, metadata = {}) {
  const logEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    level: level,
    type: type,
    message: message,
    metadata: metadata
  };
  
  // Adicionar à memória
  logsMemoria.unshift(logEntry);
  
  // Manter apenas os últimos 1000 logs na memória
  if (logsMemoria.length > 1000) {
    logsMemoria = logsMemoria.slice(0, 1000);
  }
  
  // Log no Winston
  logger.log(level, message, { type, ...metadata });
  
  // Emitir via WebSocket
  io.emit('new-log', logEntry);
  
  return logEntry;
}

function updateSystemStats() {
  systemStats.lastActivity = Date.now();
  systemStats.uptime = Date.now() - systemStats.startTime;

   
  // Emitir estatísticas via WebSocket
  io.emit('stats-update', {
    uptime: systemStats.uptime,
    totalRequests: systemStats.totalRequests,
    errorCount: systemStats.errorCount,
    memoryUsage: process.memoryUsage(),
    connectedClients: io.sockets.sockets.size
  });
}

// ===== MIDDLEWARE DE LOGGING =====
app.use((req, res, next) => {
  systemStats.totalRequests++;
  updateSystemStats();
  next();
});

// ===== ROTAS PRINCIPAIS =====

// Servir painel híbrido
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'painel-admin-hibrido.html'));
});

app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'ok',
    message: 'Clean Helmet Backend Híbrido Online',
    timestamp: new Date().toISOString(),
    version: '5.0.0',
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    services: {
      websocket: {
        status: io.sockets.sockets.size > 0 ? 'connected' : 'available',
        connectedClients: io.engine.clientsCount,
        rooms: Object.keys(io.sockets.adapter.rooms)
      },
      logs: logsMemoria.length,
      firebase: 'external',
      mercadopago: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'configured' : 'not_configured'
    }
  };
  
  res.json(healthData);
});


// ===== ROTAS DE LOGS =====

// Listar logs
app.get('/api/admin/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const level = req.query.level;
    const type = req.query.type;
    const search = req.query.search;
    
    let filteredLogs = [...logsMemoria];
    
    // Filtrar por nível
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    // Filtrar por tipo
    if (type) {
      filteredLogs = filteredLogs.filter(log => log.type === type);
    }
    
    // Busca por texto
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.type.toLowerCase().includes(searchLower)
      );
    }
    
    // Limitar resultados
    filteredLogs = filteredLogs.slice(0, limit);
    
    res.json({
      logs: filteredLogs,
      total: filteredLogs.length,
      totalInMemory: logsMemoria.length,
      filters: { level, type, search, limit }
    });
    
  } catch (error) {
    logger.error('Erro ao listar logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar log
app.post('/api/admin/log', [
  body('level').isIn(['info', 'warn', 'error', 'debug']).withMessage('Nível inválido'),
  body('type').isLength({ min: 1 }).withMessage('Tipo é obrigatório'),
  body('message').isLength({ min: 1 }).withMessage('Mensagem é obrigatória')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { level, type, message, user } = req.body;
    
    const logEntry = addLog(level, type, message, { 
      user: user || 'sistema',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({ 
      success: true, 
      log: logEntry,
      message: 'Log adicionado com sucesso'
    });
    
  } catch (error) {
    logger.error('Erro ao adicionar log:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Limpar logs
app.delete('/api/admin/logs', (req, res) => {
  try {
    const totalRemoved = logsMemoria.length;
    logsMemoria = [];
    
    addLog('info', 'sistema', `${totalRemoved} logs limpos pelo administrador`, {
      ip: req.ip
    });
    
    res.json({ 
      success: true, 
      message: `${totalRemoved} logs removidos com sucesso`
    });
    
  } catch (error) {
    logger.error('Erro ao limpar logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE SISTEMA =====

// Status do sistema
app.get('/api/system/status', (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    
    res.json({
      server: {
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        version: process.version
      },
      application: {
        totalRequests: systemStats.totalRequests,
        errorCount: systemStats.errorCount,
        logsInMemory: logsMemoria.length,
        websocketClients: io.sockets.sockets.size,
        lastActivity: systemStats.lastActivity
      },
      services: {
        winston: 'active',
        websocket: 'active',
        firebase: 'external',
        mercadopago: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'configured' : 'not_configured'
      }
    });
    
  } catch (error) {
    logger.error('Erro ao obter status do sistema:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ===== ROTAS DE ANÚNCIOS (JSON local + Firebase) =====
const anunciosFile = path.join(__dirname, 'anuncios.json');

// Função auxiliar para carregar anúncios
function carregarAnunciosDoArquivo() {
  try {
    if (fs.existsSync(anunciosFile)) {
      const data = fs.readFileSync(anunciosFile, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    logger.error('Erro ao carregar anúncios do arquivo:', err);
  }
  return {};
}

// Função auxiliar para salvar anúncios
function salvarAnunciosNoArquivo() {
  try {
    fs.writeFileSync(anunciosFile, JSON.stringify(anuncios, null, 2));
  } catch (err) {
    logger.error('Erro ao salvar anúncios no arquivo:', err);
  }
}

// Inicializar anúncios a partir do arquivo
let anuncios = carregarAnunciosDoArquivo();

// Listar
app.get('/api/anuncios', (req, res) => {
  res.json(Object.values(anuncios));
});

// Criar
app.post('/api/anuncios', (req, res) => {
  const id = 'anuncio_' + Date.now();
  const novo = { id, ...req.body, dataCriacao: new Date().toISOString() };
  anuncios[id] = novo;
  salvarAnunciosNoArquivo(); // 🔗 salva em JSON

  // 🔗 também salva no Firebase se disponível
  if (global.firebaseDisponivel && global.firebase?.database) {
    global.firebase.database().ref('anuncios/' + id).set(novo);
  }

  io.emit('anuncio_created', novo); // broadcast WS
  res.status(201).json(novo);
});

// Atualizar
app.put('/api/anuncios/:id', (req, res) => {
  const id = req.params.id;
  if (!anuncios[id]) return res.status(404).json({ error: 'Not found' });
  anuncios[id] = { ...anuncios[id], ...req.body };
  salvarAnunciosNoArquivo(); // 🔗 salva em JSON

  if (global.firebaseDisponivel && global.firebase?.database) {
    global.firebase.database().ref('anuncios/' + id).update(anuncios[id]);
  }

  io.emit('anuncio_updated', anuncios[id]); // broadcast WS
  res.json(anuncios[id]);
});

// Excluir
app.delete('/api/anuncios/:id', (req, res) => {
  const id = req.params.id;
  if (!anuncios[id]) return res.status(404).json({ error: 'Not found' });
  delete anuncios[id];
  salvarAnunciosNoArquivo(); // 🔗 salva em JSON

  if (global.firebaseDisponivel && global.firebase?.database) {
    global.firebase.database().ref('anuncios/' + id).remove();
  }

  io.emit('anuncio_deleted', { id }); // broadcast WS
  res.status(204).end();
});

// Toggle ativo/inativo
app.patch('/api/anuncios/:id/toggle', (req, res) => {
  const id = req.params.id;
  if (!anuncios[id]) return res.status(404).json({ error: 'Not found' });
  anuncios[id].ativo = !anuncios[id].ativo;
  salvarAnunciosNoArquivo(); // 🔗 salva em JSON

  if (global.firebaseDisponivel && global.firebase?.database) {
    global.firebase.database().ref('anuncios/' + id + '/ativo').set(anuncios[id].ativo);
  }

  io.emit('anuncio_updated', anuncios[id]); // broadcast WS
  res.json(anuncios[id]);
});


// ===== ROTAS MERCADO PAGO =====

// Estatísticas Mercado Pago (simuladas para demo)
app.get('/api/mercadopago/statistics', (req, res) => {
  try {
    // Dados simulados para demonstração
    const stats = {
      total_payments: 156 + Math.floor(Math.random() * 20),
      approved_payments: 142 + Math.floor(Math.random() * 15),
      pending_payments: 8 + Math.floor(Math.random() * 5),
      rejected_payments: 6 + Math.floor(Math.random() * 3),
      total_amount: parseFloat((1247.50 + Math.random() * 500).toFixed(2)),
      average_amount: parseFloat((7.99 + Math.random() * 5).toFixed(2)),
      conversion_rate: parseFloat((91.0 + Math.random() * 8).toFixed(1)),
      weekly_growth: parseFloat((12.5 + Math.random() * 10 - 5).toFixed(1)),
      last_updated: new Date().toISOString()
    };
    
    addLog('info', 'mercadopago', 'Estatísticas solicitadas', {
      ip: req.ip,
      stats: stats
    });
    
    res.json(stats);
    
  } catch (error) {
    logger.error('Erro ao obter estatísticas MP:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

const mercadopago = require('mercadopago');
mercadopago.configure({ access_token: process.env.MERCADOPAGO_ACCESS_TOKEN });

app.post('/api/payments/webhook', async (req, res) => {
  try {
    const { data } = req.body;
    const paymentId = data?.id;

    if (!paymentId) {
      addLog('warn', 'mercadopago', 'Webhook sem paymentId', { body: req.body });
      return res.sendStatus(200);
    }

    // Consulta status real no Mercado Pago
    const mpPayment = await mercadopago.payment.findById(paymentId);

    const status = mpPayment.body.status; // "approved", "rejected", "pending"
    const method = mpPayment.body.payment_method_id; // "pix", "card"

    // 🔗 Emitir via WebSocket
    io.emit('payment-status-update', {
      id: mpPayment.body.id,
      status,
      method,
      amount: mpPayment.body.transaction_amount,
      timestamp: new Date().toISOString()
    });

    // 🔗 Salvar no Firebase Realtime Database
    salvarStatusPagamento(mpPayment.body.id, status, method);

    addLog('info', 'mercadopago', 'Pagamento validado', mpPayment.body);

    res.sendStatus(200);
  } catch (error) {
    addLog('error', 'mercadopago', 'Erro no webhook', { error: error.message });
    res.sendStatus(500);
  }
});

// Criar preferência de pagamento
app.post('/api/payments/create', async (req, res) => {
  try {
    const { method, amount } = req.body;

    const preference = {
      items: [
        {
          title: "Ciclo de Desinfecção Clean Helmet",
          quantity: 1,
          currency_id: "BRL",
          unit_price: parseFloat(amount)
        }
      ],
      payment_methods: {
        excluded_payment_types: method === "pix" ? ["credit_card", "debit_card"] : ["ticket"],
        installments: 1
      },
      back_urls: {
        success: "https://clean-helmet.netlify.app/success",
        failure: "https://clean-helmet.netlify.app/failure",
        pending: "https://clean-helmet.netlify.app/pending"
      },
      auto_return: "approved",
      notification_url: `${process.env.SERVER_URL}/api/payments/webhook`
    };

    const response = await mercadopago.preferences.create(preference);

    addLog('info', 'mercadopago', 'Preferência criada', {
      method,
      amount,
      preferenceId: response.body.id
    });

    res.json({
      init_point: response.body.init_point,
      sandbox_init_point: response.body.sandbox_init_point,
      id: response.body.id
    });
  } catch (error) {
    addLog('error', 'mercadopago', 'Erro ao criar preferência', { error: error.message });
    res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
  }
});


// ===== ROTAS MAQUINA =====

// Parada de emergência
app.post('/api/machine/emergency-stop', (req, res) => {
  addLog('warn', 'maquina', 'Parada de emergência acionada', { ip: req.ip });

  io.emit('emergency-stop', {
    timestamp: new Date().toISOString(),
    message: 'Parada de emergência acionada pelo painel admin'
  });

  res.json({ success: true });
});

// Ação em dispositivo
app.post('/api/machine/device-action', (req, res) => {
  const { device, action } = req.body;

  addLog('info', 'maquina', 'Ação em dispositivo', { device, action });

  io.emit('device-action', {
    device,
    action,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true });
});

// ===== TRATAMENTO DE ERROS =====
app.use((error, req, res, next) => {
  systemStats.errorCount++;
  
  addLog('error', 'sistema', `Erro na aplicação: ${error.message}`, {
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
  });
});

// 404 Handler
app.use((req, res) => {
  addLog('warn', 'sistema', `Rota não encontrada: ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `${req.method} ${req.url} não existe`
  });
});

// ===== ALIASES E ROTAS COMPLEMENTARES =====

// Alias para webhook Mercado Pago (caso frontend chame /api/mercadopago/webhook)
app.post("/api/mercadopago/webhook", (req, res, next) => {
  // Encaminha para a rota oficial /api/payments/webhook
  req.url = "/api/payments/webhook";
  next();
});

// Alias para criar preferência (caso frontend chame /api/create-preference)
app.post("/api/create-preference", (req, res, next) => {
  // Encaminha para a rota oficial /api/payments/create
  req.url = "/api/payments/create";
  next();
});

// Health check específico do WebSocket
app.get("/api/ws-health", (req, res) => {
  res.json({
    status: "ok",
    connectedClients: io.engine.clientsCount,
    rooms: Object.keys(io.sockets.adapter.rooms),
    timestamp: new Date().toISOString()
  });
});

// Servir arquivos estáticos do painel admin
app.use("/painel-admin", express.static(path.join(__dirname, "painel-admin"), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".js")) {
      res.setHeader("Content-Type", "application/javascript");
    }
  }
}));


// ===== TAREFAS AGENDADAS =====

// Limpeza automática de logs antigos (diária às 2:00)
cron.schedule('0 2 * * *', () => {
  const before = logsMemoria.length;
  
  // Manter apenas logs dos últimos 7 dias
  const cutoffDate = moment().subtract(7, 'days').toISOString();
  logsMemoria = logsMemoria.filter(log => log.timestamp > cutoffDate);
  
  const removed = before - logsMemoria.length;
  
  if (removed > 0) {
    addLog('info', 'sistema', `Limpeza automática: ${removed} logs antigos removidos`);
  }
  
  logger.info(`Limpeza automática de logs: ${removed} logs removidos`);
});

// Atualização de estatísticas (a cada minuto)
cron.schedule('* * * * *', () => {
  updateSystemStats();
});

// ===== INICIALIZAÇÃO DO SERVIDOR =====
server.listen(PORT, () => {
  const startMessage = `
🚀 ===== CLEAN HELMET BACKEND HÍBRIDO v5.0 ATIVO =====
📡 Painel Híbrido: http://localhost:${PORT}
🔗 API Health: http://localhost:${PORT}/api/health
📋 API Logs: http://localhost:${PORT}/api/admin/logs
📊 API Status: http://localhost:${PORT}/api/system/status
💳 API MP Stats: http://localhost:${PORT}/api/mercadopago/statistics
🌐 WebSocket: Ativo
📝 Winston Logs: ${logDir}
⏰ Iniciado: ${new Date().toLocaleString('pt-BR')}
===============================================
  `;
  
  console.log(startMessage);
  
  addLog('info', 'sistema', 'Clean Helmet Backend Híbrido v5.0 iniciado com sucesso', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  });
});

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  console.log(`\n🛑 Recebido ${signal}. Encerrando servidor...`);
  
  addLog('info', 'sistema', `Servidor encerrando: ${signal}`);
  
  server.close(() => {
    console.log('✅ Servidor HTTP encerrado.');
    
    // Fechar conexões WebSocket
    io.close(() => {
      console.log('✅ Conexões WebSocket encerradas.');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forçando encerramento do servidor.');
    process.exit(1);
  }, 10000);
}


module.exports = { app, server, io, logger };













































