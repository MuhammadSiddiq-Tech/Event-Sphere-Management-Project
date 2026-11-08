process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/eventsphere_test';
process.env.JWT_ACCESS_SECRET = 'test-secret-at-least-32-characters-long-key-12345';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long-12345';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.UPLOAD_DIR = './uploads';
