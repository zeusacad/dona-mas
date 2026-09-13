const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'donamas-secret-key-2024';
const JWT_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

// Simulated in-memory user store (in production: replace with DB)
const users = [];
let nextId = 1;

const ROLES = {
  ADMIN: 'admin',
  DONOR: 'donor',
  BENEFICIARY: 'beneficiary'
};

function findByEmail(email) {
  return users.find(u => u.email === email) || null;
}

function findById(id) {
  return users.find(u => u.id === id) || null;
}

async function register({ name, email, password, role = ROLES.DONOR }) {
  if (!name || !email || !password) {
    throw new Error('Name, email and password are required');
  }
  if (!Object.values(ROLES).includes(role)) {
    throw new Error('Invalid role');
  }
  if (findByEmail(email)) {
    throw new Error('Email already registered');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { id: nextId++, name, email, password: hashedPassword, role, active: true };
  users.push(user);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  const user = findByEmail(email);
  if (!user) {
    throw new Error('Invalid credentials');
  }
  if (!user.active) {
    throw new Error('Account is deactivated');
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  return { accessToken, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function generateAccessToken(userId) {
  const user = findById(userId);
  if (!user) throw new Error('User not found');
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function clearUsers() {
  users.length = 0;
  nextId = 1;
}

module.exports = { register, login, verifyToken, generateAccessToken, findByEmail, findById, clearUsers, ROLES };
