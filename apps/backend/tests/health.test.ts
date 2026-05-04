import request from 'supertest';
import app from '../src/app';

describe('Health Check API', () => {
  describe('GET /health', () => {
    it('should return service health status and ISO timestamp', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(typeof res.body.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
    });
  });
});