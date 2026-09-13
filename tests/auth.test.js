const request = require('supertest');
const app = require('../src/app');
const authService = require('../src/auth/auth.service');

beforeEach(() => authService.clearUsers());

describe('Auth - Register', () => {
  test('registers a donor successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Maria Lopez', email: 'maria@empresa.com', password: 'segura123', role: 'donor'
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Maria Lopez', email: 'maria@empresa.com', role: 'donor' });
    expect(res.body.user.password).toBeUndefined();
  });

  test('registers an admin successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Admin', email: 'admin@donamas.com', password: 'admin123', role: 'admin'
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
  });

  test('registers a beneficiary successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'ONG Corazon', email: 'ong@corazon.org', password: 'ong1234', role: 'beneficiary'
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('beneficiary');
  });

  test('rejects duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send({ name: 'A', email: 'dup@test.com', password: '123456' });
    const res = await request(app).post('/api/auth/register').send({ name: 'B', email: 'dup@test.com', password: '123456' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  test('rejects missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com', password: '123456' });
    expect(res.status).toBe(400);
  });

  test('rejects missing email', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', password: '123456' });
    expect(res.status).toBe(400);
  });

  test('rejects password shorter than 6 chars', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@x.com', password: '123' });
    expect(res.status).toBe(400);
  });

  test('rejects invalid role', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@x.com', password: '123456', role: 'superuser' });
    expect(res.status).toBe(400);
  });

  test('password is not returned in response', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Z', email: 'z@z.com', password: 'pass1234' });
    expect(res.body.user.password).toBeUndefined();
  });
});

describe('Auth - Login', () => {
  beforeEach(async () => {
    await authService.register({ name: 'Test User', email: 'user@test.com', password: 'pass1234', role: 'donor' });
  });

  test('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'pass1234' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe('user@test.com');
  });

  test('rejects wrong password with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('rejects nonexistent email with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'pass1234' });
    expect(res.status).toBe(401);
  });

  test('rejects missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com' });
    expect(res.status).toBe(401);
  });

  test('does not reveal if email exists on wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'bad' });
    expect(res.body.error).toBe('Invalid credentials');
    expect(res.body.error).not.toContain('email');
  });
});

describe('Auth - /me endpoint', () => {
  let token;
  beforeEach(async () => {
    await authService.register({ name: 'Me User', email: 'me@test.com', password: 'pass1234', role: 'donor' });
    const res = await request(app).post('/api/auth/login').send({ email: 'me@test.com', password: 'pass1234' });
    token = res.body.accessToken;
  });

  test('returns current user with valid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns 401 with malformed token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer notavalidtoken');
    expect(res.status).toBe(401);
  });

  test('returns 401 with no Bearer prefix', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', token);
    expect(res.status).toBe(401);
  });
});

describe('Auth - Role-based access', () => {
  let donorToken, adminToken;

  beforeEach(async () => {
    await authService.register({ name: 'Donor', email: 'donor@test.com', password: 'pass1234', role: 'donor' });
    await authService.register({ name: 'Admin', email: 'admin@test.com', password: 'pass1234', role: 'admin' });
    const d = await request(app).post('/api/auth/login').send({ email: 'donor@test.com', password: 'pass1234' });
    const a = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'pass1234' });
    donorToken = d.body.accessToken;
    adminToken = a.body.accessToken;
  });

  test('donor cannot access impact report (admin only)', async () => {
    const res = await request(app).get('/api/reports/impact').set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(403);
  });

  test('admin can access impact report', async () => {
    const res = await request(app).get('/api/reports/impact').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Auth Service - verifyToken', () => {
  test('verifyToken throws on invalid token', () => {
    expect(() => authService.verifyToken('badtoken')).toThrow();
  });

  test('generateAccessToken throws if user not found', () => {
    expect(() => authService.generateAccessToken(9999)).toThrow('User not found');
  });
});
