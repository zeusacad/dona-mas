const request = require('supertest');
const app = require('../src/app');
const authService = require('../src/auth/auth.service');
const donationsService = require('../src/donations/donations.service');
const reportsService = require('../src/reports/reports.service');

let adminToken, donorToken, donorId;

beforeEach(async () => {
  authService.clearUsers();
  donationsService.clearDonations();

  const d = await authService.register({ name: 'Donor', email: 'donor@test.com', password: 'pass1234', role: 'donor' });
  const a = await authService.register({ name: 'Admin', email: 'admin@test.com', password: 'pass1234', role: 'admin' });
  donorId = d.id;

  const dLogin = await request(app).post('/api/auth/login').send({ email: 'donor@test.com', password: 'pass1234' });
  const aLogin = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'pass1234' });
  donorToken = dLogin.body.accessToken;
  adminToken = aLogin.body.accessToken;

  donationsService.create({ title: 'Arroz', quantity: 10, donorId });
  donationsService.create({ title: 'Leche', quantity: 5, donorId });
  const d3 = donationsService.create({ title: 'Pan', quantity: 20, donorId });
  donationsService.claim(d3.id, 999);
  const d4 = donationsService.create({ title: 'Frijol', quantity: 8, donorId });
  donationsService.claim(d4.id, 888);
  donationsService.markDelivered(d4.id, donorId, 'donor');
});

describe('Reports - Impact Report', () => {
  test('admin can get impact report', async () => {
    const res = await request(app).get('/api/reports/impact').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.total).toBe(4);
    expect(res.body.summary.delivered).toBe(1);
    expect(res.body.summary.claimed).toBe(1);
    expect(res.body.summary.available).toBe(2);
  });

  test('impact report includes delivery rate', async () => {
    const res = await request(app).get('/api/reports/impact').set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.summary.deliveryRate).toBeDefined();
    expect(res.body.summary.deliveryRate).toBe('25.0%');
  });

  test('donor cannot access impact report', async () => {
    const res = await request(app).get('/api/reports/impact').set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(403);
  });

  test('unauthenticated cannot access impact report', async () => {
    const res = await request(app).get('/api/reports/impact');
    expect(res.status).toBe(401);
  });
});

describe('Reports - Donor Report', () => {
  test('donor can access own report', async () => {
    const res = await request(app).get(`/api/reports/donor/${donorId}`).set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalDonations).toBe(4);
    expect(res.body.delivered).toBe(1);
  });

  test('admin can access any donor report', async () => {
    const res = await request(app).get(`/api/reports/donor/${donorId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('donor cannot access another donor report', async () => {
    const other = await authService.register({ name: 'Other', email: 'other@test.com', password: 'pass1234', role: 'donor' });
    const res = await request(app).get(`/api/reports/donor/${other.id}`).set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Reports Service - unit', () => {
  test('generateImpactReport returns correct structure', () => {
    const report = reportsService.generateImpactReport();
    expect(report.summary).toBeDefined();
    expect(report.generatedAt).toBeDefined();
    expect(typeof report.summary.total).toBe('number');
  });

  test('generateDonorReport throws without donorId', () => {
    expect(() => reportsService.generateDonorReport(null)).toThrow('donorId is required');
  });

  test('generateImpactReport with empty database returns zero counts', () => {
    donationsService.clearDonations();
    const report = reportsService.generateImpactReport();
    expect(report.summary.total).toBe(0);
    expect(report.summary.deliveryRate).toBe('0.0%');
  });
});
