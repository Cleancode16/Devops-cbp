// Runs before each test file (see "jest.setupFiles" in package.json).
process.env.LOG_LEVEL = 'silent';
process.env.QR_SIGNING_SECRET = 'test-secret';
process.env.APP_BASE_URL = 'http://localhost:8080';
