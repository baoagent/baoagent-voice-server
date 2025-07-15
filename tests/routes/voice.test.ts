
import request from 'supertest';
import express from 'express';
import voiceRouter from '../../src/routes/voice';

const app = express();
app.use(express.json());
app.use('/voice', voiceRouter);

describe('POST /voice/incoming', () => {
  it('should return a 200 OK response', async () => {
    const response = await request(app).post('/voice/incoming');
    expect(response.status).toBe(200);
  });
});
