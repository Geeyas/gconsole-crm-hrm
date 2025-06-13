// Integration tests for authentication endpoints
const request = require('supertest');
const app = require('../server');

describe('Authentication Endpoints', () => {
  it('should fail login with missing credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  // Add more tests for login, refresh, register, etc.
});

describe('Client-centric API Endpoints', () => {
  let adminToken;
  const adminCreds = { username: 'admin@gmail.com', password: 'Password123' };
  const clientUserEmail = 'clientuser@example.com'; // Change to a real client user email in your DB
  const validClientLocationId = 9; // Change to a real clientlocationid in your DB

  beforeAll(async () => {
    // Login as admin and get JWT token
    const res = await request(app)
      .post('/api/login')
      .send(adminCreds);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    adminToken = res.body.token;
  });

  it('should link a client user to a client and return all locations for that client', async () => {
    const res = await request(app)
      .post('/api/link-client-user-location')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ emailaddress: clientUserEmail, clientlocationid: validClientLocationId });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('client');
    expect(res.body).toHaveProperty('locations');
    expect(Array.isArray(res.body.locations)).toBe(true);
  });

  it('should return all clients and their locations for the client user', async () => {
    // Login as the client user to get their token
    const clientRes = await request(app)
      .post('/api/login')
      .send({ username: clientUserEmail, password: 'Password123' }); // Adjust password if needed
    expect(clientRes.statusCode).toBe(200);
    expect(clientRes.body).toHaveProperty('token');
    const clientToken = clientRes.body.token;

    const res = await request(app)
      .get('/api/my-client-locations')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('clients');
    expect(Array.isArray(res.body.clients)).toBe(true);
    if (res.body.clients.length > 0) {
      expect(res.body.clients[0]).toHaveProperty('locations');
      expect(Array.isArray(res.body.clients[0].locations)).toBe(true);
    }
  });
});
