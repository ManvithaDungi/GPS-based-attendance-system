import request from 'supertest';
import app from '../src/app';

describe('Support API', () => {
  describe('POST /api/v1/support/report-issue', () => {
    it('accepts a support report and returns success', async () => {
      const payload = {
        name: 'Test User',
        email: 'test.user@example.com',
        subject: 'Test support',
        description: 'This is a test support message',
      };

      const res = await request(app)
        .post('/api/v1/support/report-issue')
        .send(payload)
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/support report submitted/i);
    });
  });
});
