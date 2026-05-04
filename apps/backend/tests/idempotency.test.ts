import express from 'express';
import request from 'supertest';
import { idempotencyMiddleware } from '../src/middleware/idempotency.middleware';

type StoredValue =
  | { type: 'string'; value: string; expiresAt?: number }
  | { type: 'hash'; value: Record<string, string>; expiresAt?: number };

class InMemoryRedis {
  private store = new Map<string, StoredValue>();

  private isExpired(record: StoredValue | undefined): boolean {
    return !!record?.expiresAt && record.expiresAt <= Date.now();
  }

  private getRecord(key: string): StoredValue | undefined {
    const record = this.store.get(key);
    if (!record) return undefined;
    if (this.isExpired(record)) {
      this.store.delete(key);
      return undefined;
    }
    return record;
  }

  async type(key: string): Promise<'none' | 'string' | 'hash'> {
    const record = this.getRecord(key);
    if (!record) return 'none';
    return record.type;
  }

  async get(key: string): Promise<string | null> {
    const record = this.getRecord(key);
    if (!record || record.type !== 'string') return null;
    return record.value;
  }

  async set(
    key: string,
    value: string,
    mode: 'EX',
    ttlSeconds: number,
    flag: 'NX' | 'XX'
  ): Promise<'OK' | null> {
    const existing = this.getRecord(key);
    const exists = !!existing;

    if (flag === 'NX' && exists) return null;
    if (flag === 'XX' && !exists) return null;

    this.store.set(key, {
      type: 'string',
      value,
      expiresAt: mode === 'EX' ? Date.now() + ttlSeconds * 1000 : undefined,
    });

    return 'OK';
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const record = this.getRecord(key);
    if (!record || record.type !== 'hash') return {};
    return { ...record.value };
  }

  async del(key: string): Promise<number> {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async flushdb(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }
}

const redis = new InMemoryRedis();

jest.mock('../src/utils/redis', () => ({
  getRedisClient: () => redis,
  closeRedis: async () => {},
}));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createTestApp = () => {
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    (req as express.Request & { user?: { id: string; email: string; role: 'STUDENT'; status: 'ACTIVE' } }).user = {
      id: 'user-1',
      email: 'user@example.com',
      role: 'STUDENT',
      status: 'ACTIVE',
    };
    next();
  });

  app.post('/api/v1/test/replay', idempotencyMiddleware, (req, res) => {
    res.status(201).json({ ok: true, body: req.body, route: 'replay' });
  });

  app.post('/api/v1/test/slow', idempotencyMiddleware, async (req, res) => {
    await delay(200);
    res.status(201).json({ ok: true, body: req.body, route: 'slow' });
  });

  app.post('/api/v1/test/first', idempotencyMiddleware, (req, res) => {
    res.status(202).send(`first:${req.body.message}`);
  });

  app.post('/api/v1/test/second', idempotencyMiddleware, (req, res) => {
    res.status(202).send(`second:${req.body.message}`);
  });

  return app;
};

describe('Idempotency middleware', () => {
  const app = createTestApp();

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.flushdb();
  });

  it('replays the exact same status and body for the same key and payload', async () => {
    const first = await request(app)
      .post('/api/v1/test/replay?source=ui')
      .set('Idempotency-Key', 'replay-key-1')
      .send({ alpha: 1, beta: { z: 3, a: 2 } });

    const second = await request(app)
      .post('/api/v1/test/replay?source=ui')
      .set('Idempotency-Key', 'replay-key-1')
      .send({ beta: { a: 2, z: 3 }, alpha: 1 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
  });

  it('returns 409 when a parallel request is still in flight', async () => {
    const firstRequest = request(app)
      .post('/api/v1/test/slow')
      .set('Idempotency-Key', 'parallel-key-1')
      .send({ message: 'hello' });

    const firstPromise = new Promise<request.Response>((resolve, reject) => {
      firstRequest.end((err, res) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(res);
      });
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const record = await redis.get('idempotency:user-1:parallel-key-1');
      if (record) {
        break;
      }
      await delay(10);
    }

    const second = await request(app)
      .post('/api/v1/test/slow')
      .set('Idempotency-Key', 'parallel-key-1')
      .send({ message: 'hello' });

    const first = await firstPromise;

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: 'REQUEST_IN_PROGRESS' });
  });

  it('rejects the same key with a different payload', async () => {
    const first = await request(app)
      .post('/api/v1/test/replay')
      .set('Idempotency-Key', 'payload-key-1')
      .send({ value: 'one' });

    const second = await request(app)
      .post('/api/v1/test/replay')
      .set('Idempotency-Key', 'payload-key-1')
      .send({ value: 'two' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(400);
    expect(second.body).toEqual({ error: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST' });
  });

  it('rejects the same key on a different endpoint', async () => {
    const first = await request(app)
      .post('/api/v1/test/first')
      .set('Idempotency-Key', 'endpoint-key-1')
      .send({ message: 'one' });

    const second = await request(app)
      .post('/api/v1/test/second')
      .set('Idempotency-Key', 'endpoint-key-1')
      .send({ message: 'one' });

    expect(first.status).toBe(202);
    expect(second.status).toBe(400);
    expect(second.body).toEqual({ error: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST' });
  });

  it('replays the original status for non-JSON responses', async () => {
    const first = await request(app)
      .post('/api/v1/test/first')
      .set('Idempotency-Key', 'status-key-1')
      .send({ message: 'hello' });

    const second = await request(app)
      .post('/api/v1/test/first')
      .set('Idempotency-Key', 'status-key-1')
      .send({ message: 'hello' });

    expect(first.status).toBe(202);
    expect(first.text).toBe('first:hello');
    expect(second.status).toBe(202);
    expect(second.text).toBe('first:hello');
  });
});
