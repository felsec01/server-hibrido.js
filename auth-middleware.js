// ===== CLEAN HELMET - MIDDLEWARE DE AUTENTICAÇÃO =====
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const admin = require("./firebase-admin");


// ===== CONFIGURAÇÕES =====
const JWT_SECRET = process.env.JWT_SECRET || 'clean-helmet-hybrid-jwt-secret-2024-super-secure';
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '1h';

// ===== RATE LIMITING PARA LOGIN =====
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== USUÁRIOS DEMO (EM PRODUÇÃO, USAR BANCO DE DADOS) =====
const DEMO_USERS = {
  'admin@test.com': {
    id: 'admin-001',
    nome: 'Administrador',
    email: 'admin@test.com',
    cargo: 'admin',
    senha: 'admin123', // Em produção, usar hash bcrypt
    ativo: true,
    permissions: ['read', 'write', 'delete', 'admin']
  },
  'tecnico@test.com': {
    id: 'tecnico-001',
    nome: 'Técnico',
    email: 'tecnico@test.com',
    cargo: 'tecnico',
    senha: 'tecnico123',
    ativo: true,
    permissions: ['read', 'write']
  },
  'dev@test.com': {
    id: 'dev-001',
    nome: 'Desenvolvedor',
    email: 'dev@test.com',
    cargo: 'desenvolvedor',
    senha: 'dev123',
    ativo: true,
    permissions: ['read', 'write', 'debug']
  }
};

// ===== FUNÇÕES DE UTILIDADE =====
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    nome: user.nome,
    cargo: user.cargo,
    permissions: user.permissions,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: TOKEN_EXPIRY,
    issuer: 'clean-helmet-hybrid',
    audience: 'clean-helmet-users'
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'clean-helmet-hybrid',
      audience: 'clean-helmet-users'
    });
  } catch (error) {
    throw new Error('Token inválido: ' + error.message);
  }
}

// ===== MIDDLEWARE DE AUTENTICAÇÃO =====
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acesso requerido',
      message: 'Faça login para acessar este recurso'
    });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // dados do usuário autenticado pelo Firebase
    next();
  } catch (error) {
    return res.status(403).json({ 
      error: 'Token inválido',
      message: error.message
    });
  }
}

// ===== MIDDLEWARE DE AUTORIZAÇÃO POR CARGO =====
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado' 
      });
    }
    
    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRoles.includes(req.user.cargo)) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: `Cargo '${req.user.cargo}' não tem permissão. Cargos necessários: ${userRoles.join(', ')}`
      });
    }
    
    next();
  };
}

// ===== MIDDLEWARE DE AUTORIZAÇÃO POR PERMISSÃO =====
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado' 
      });
    }
    
    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Permissão insuficiente',
        message: `Permissão '${permission}' requerida`
      });
    }
    
    next();
  };
}

// ===== ROTA DE LOGIN =====
function createLoginRoute() {
  return async (req, res) => {
    try {
      const { email, senha } = req.body;
      
      if (!email || !senha) {
        return res.status(400).json({ 
          error: 'Email e senha são obrigatórios' 
        });
      }
      
      // Verificar usuário
      const user = DEMO_USERS[email.toLowerCase()];
      if (!user) {
        return res.status(401).json({ 
          error: 'Credenciais inválidas',
          message: 'Email não encontrado'
        });
      }
      
      // Verificar senha (em produção, usar bcrypt)
      if (user.senha !== senha) {
        return res.status(401).json({ 
          error: 'Credenciais inválidas',
          message: 'Senha incorreta'
        });
      }
      
      // Verificar se usuário está ativo
      if (!user.ativo) {
        return res.status(403).json({ 
          error: 'Conta desativada',
          message: 'Sua conta foi desativada. Contate o administrador.'
        });
      }
      
      // Gerar token
      const token = generateToken(user);
      
      // Log do login
      console.log(`✅ Login realizado: ${user.nome} (${user.cargo}) - IP: ${req.ip}`);
      
      res.json({
        success: true,
        message: 'Login realizado com sucesso',
        token: token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          cargo: user.cargo,
          permissions: user.permissions
        },
        expiresIn: TOKEN_EXPIRY
      });
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: 'Tente novamente mais tarde'
      });
    }
  };
}

// ===== ROTA DE VALIDAÇÃO DE TOKEN =====
function createValidateRoute() {
  return (req, res) => {
    // Se chegou aqui, o token é válido (passou pelo middleware)
    res.json({
      valid: true,
      user: {
        id: req.user.id,
        nome: req.user.nome,
        email: req.user.email,
        cargo: req.user.cargo,
        permissions: req.user.permissions
      },
      expiresAt: new Date(req.user.exp * 1000)
    });
  };
}

// ===== ROTA DE LOGOUT =====
function createLogoutRoute() {
  return (req, res) => {
    // Em uma implementação real, adicionaria o token a uma blacklist
    console.log(`👋 Logout realizado: ${req.user.nome} - IP: ${req.ip}`);
    
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  };
}

// ===== MIDDLEWARE DE LOG DE ATIVIDADES =====
function logActivity(action) {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log da atividade após resposta
      if (req.user && res.statusCode < 400) {
        console.log(`📝 Atividade: ${action} - Usuário: ${req.user.nome} (${req.user.cargo}) - IP: ${req.ip} - Status: ${res.statusCode}`);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
}

// ===== EXPORTAÇÕES =====
module.exports = {
  // Middlewares principais
  authenticateToken,
  requireRole,
  requirePermission,
  logActivity,
  loginLimiter,
  
  // Rotas de autenticação
  createLoginRoute,
  createValidateRoute,
  createLogoutRoute,
  
  // Utilitários
  generateToken,
  verifyToken,
  
  // Constantes
  DEMO_USERS,
  JWT_SECRET

};
