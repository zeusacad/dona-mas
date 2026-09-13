const request = require('supertest');
const app = require('../src/app');
const authService = require('../src/auth/auth.service');
const donationsService = require('../src/donations/donations.service');

let donorToken, adminToken, beneficiaryToken;
let donorId, adminId;

beforeEach(async () => {
  authService.clearUsers();
  donationsService.clearDonations();

  const d = await authService.register({ name: 'Donor', email: 'donor@test.com', password: 'pass1234', role: 'donor' });
  const a = await authService.register({ name: 'Admin', email: 'admin@test.com', password: 'pass1234', role: 'admin' });
  const b = await authService.register({ name: 'Beneficiary', email: 'bene@test.com', password: 'pass1234', role: 'beneficiary' });
  donorId = d.id;
  adminId = a.id;

  const dLogin = await request(app).post('/api/auth/login').send({ email: 'donor@test.com', password: 'pass1234' });
  const aLogin = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'pass1234' });
  const bLogin = await request(app).post('/api/auth/login').send({ email: 'bene@test.com', password: 'pass1234' });
  donorToken = dLogin.body.accessToken;
  adminToken = aLogin.body.accessToken;
  beneficiaryToken = bLogin.body.accessToken;
});

describe('Donations - Create', () => {
  test('donor creates donation successfully', async () => {
    const res = await request(app).post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ title: 'Arroz 10kg', quantity: 10, unit: 'kg', location: 'Monterrey' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Arroz 10kg');
    expect(res.body.status).toBe('available');
  });

  test('admin can create donation', async () => {
    const res = await request(app).post('/api/donations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Leche', quantity: 20 });
    expect(res.status).toBe(201);
  });

  test('beneficiary cannot create donation', async () => {
    const res = await request(app).post('/api/donations')
      .set('Authorization', `Bearer ${beneficiaryToken}`)
      .send({ title: 'Test', quantity: 5 });
    expect(res.status).toBe(403);
  });

  test('rejects donation without quantity', async () => {
    const res = await request(app).post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ title: 'Test' });
    expect(res.status).toBe(400);
  });

  test('rejects donation with quantity 0', async () => {
    const res = await request(app).post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ title: 'Test', quantity: 0 });
    expect(res.status).toBe(400);
  });

  test('sanitizes XSS in title', async () => {
    const res = await request(app).post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ title: '<script>alert(1)</script>', quantity: 5 });
    expect(res.status).toBe(201);
    expect(res.body.title).not.toContain('<script>');
  });

  test('requires authentication', async () => {
    const res = await request(app).post('/api/donations').send({ title: 'Test', quantity: 5 });
    expect(res.status).toBe(401);
  });
});

describe('Donations - Get', () => {
  beforeEach(async () => {
    await request(app).post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ title: 'Frijoles', quantity: 15 });
  });

  test('authenticated user can list donations', async () => {
    const res = await request(app).get('/api/donations').set('Authorization', `Bearer ${beneficiaryToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  test('can get donation by id', async () => {
    const list = await request(app).get('/api/donations').set('Authorization', `Bearer ${donorToken}`);
    const id = list.body[0].id;
    const res = await request(app).get(`/api/donations/${id}`).set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Frijoles');
  });

  test('returns 404 for nonexistent donation', async () => {
    const res = await request(app).get('/api/donations/9999').set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(404);
  });

  test('unauthenticated user cannot list donations', async () => {
    const res = await request(app).get('/api/donations');
    expect(res.status).toBe(401);
  });
});

describe('Donations - Claim and Deliver', () => {
  let donationId;

  beforeEach(async () => {
    const res = await request(app).post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ title: 'Pan', quantity: 50 });
    donationId = res.body.id;
  });

  test('beneficiary can claim available donation', async () => {
    const res = await request(app).post(`/api/donations/${donationId}/claim`)
      .set('Authorization', `Bearer ${beneficiaryToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('claimed');
  });

  test('cannot claim already claimed donation', async () => {
    await request(app).post(`/api/donations/${donationId}/claim`).set('Authorization', `Bearer ${beneficiaryToken}`);
    const res = await request(app).post(`/api/donations/${donationId}/claim`).set('Authorization', `Bearer ${beneficiaryToken}`);
    expect(res.status).toBe(400);
  });

  test('donor cannot claim donation', async () => {
    const res = await request(app).post(`/api/donations/${donationId}/claim`).set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(403);
  });

  test('donor can mark own donation as delivered after claim', async () => {
    await request(app).post(`/api/donations/${donationId}/claim`).set('Authorization', `Bearer ${beneficiaryToken}`);
    const res = await request(app).post(`/api/donations/${donationId}/deliver`).set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('delivered');
  });

  test('cannot deliver donation that is not claimed', async () => {
    const res = await request(app).post(`/api/donations/${donationId}/deliver`).set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(400);
  });

  test('returns 404 for claim on nonexistent donation', async () => {
    const res = await request(app).post('/api/donations/9999/claim').set('Authorization', `Bearer ${beneficiaryToken}`);
    expect(res.status).toBe(404);
  });
});

describe('Donations Service - sanitize', () => {
  test('sanitizes XSS characters in description', () => {
    const d = donationsService.create({ title: 'Safe', description: '<img src=x onerror=alert(1)>', quantity: 1, donorId: 1 });
    expect(d.description).not.toContain('<img');
    expect(d.description).toContain('&lt;img');
  });
});
