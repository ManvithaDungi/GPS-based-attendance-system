describe('Required auth secrets', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalRefreshSecret = process.env.REFRESH_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.REFRESH_SECRET = originalRefreshSecret;
    jest.resetModules();
  });

  it('should fail fast when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    process.env.REFRESH_SECRET = 'test-refresh-secret';

    expect(() => {
      jest.isolateModules(() => {
        require('../src/utils/env');
      });
    }).toThrow('JWT_SECRET environment variable is required');
  });

  it('should fail fast when REFRESH_SECRET is missing', () => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    delete process.env.REFRESH_SECRET;

    expect(() => {
      jest.isolateModules(() => {
        require('../src/utils/env');
      });
    }).toThrow('REFRESH_SECRET environment variable is required');
  });
});
