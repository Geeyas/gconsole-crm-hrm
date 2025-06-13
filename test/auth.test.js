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
