// Integration tests for available-client-shifts endpoint
const request = require('supertest');
const app = require('../server');
const { generateTestJWT } = require('./utils');

describe('/api/available-client-shifts', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app)
      .get('/api/available-client-shifts');
    expect(res.statusCode).toBe(401);
  });

  it('should allow System Admin to get paginated shifts', async () => {
    const token = generateTestJWT({ usertype: 'System Admin' });
    const res = await request(app)
      .get('/api/available-client-shifts?limit=2&page=1')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('availableShifts');
    expect(res.body).toHaveProperty('pagination');
  });

  it('should allow Staff - Standard User to get paginated shifts', async () => {
    const token = generateTestJWT({ usertype: 'Staff - Standard User' });
    const res = await request(app)
      .get('/api/available-client-shifts?limit=2&page=1')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('availableShifts');
    expect(res.body).toHaveProperty('pagination');
  });

  it('should allow Client - Standard User to get paginated shifts', async () => {
    const token = generateTestJWT({ usertype: 'Client - Standard User', id: 2 });
    const res = await request(app)
      .get('/api/available-client-shifts?limit=2&page=1')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('availableShifts');
    expect(res.body).toHaveProperty('pagination');
  });

  it('should allow Employee - Standard User to get paginated shifts', async () => {
    const token = generateTestJWT({ usertype: 'Employee - Standard User', id: 3 });
    const res = await request(app)
      .get('/api/available-client-shifts?limit=2&page=1')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('availableShifts');
    expect(res.body).toHaveProperty('pagination');
  });

  it('should return 403 for unknown usertype', async () => {
    const token = generateTestJWT({ usertype: 'UnknownRole', id: 4 });
    const res = await request(app)
      .get('/api/available-client-shifts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });
});
