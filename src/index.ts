import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import WebSocket from 'ws';
import healthRouter from './routes/health';
import voiceRouter from './routes/voice';
import logger from './utils/logger';
import SessionManager from './services/session-manager';
import OpenAIClient from './services/openai-client';

const sessionManager = new SessionManager();

const app: Express = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/health', healthRouter);
app.use('/voice', voiceRouter);

const PORT: string | number = process.env.PORT || 8080;

server.listen(PORT, () => {
  logger.info(`Server is listening on port ${PORT}`);
});

wss.on('connection', (ws: WebSocket) => {
  logger.info('New WebSocket connection');
  let currentCallSid: string | null = null;

  ws.on('message', (message: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(message.toString());
      const event = msg.event;
      switch (event) {
        case 'connected':
          logger.info('Twilio WebSocket connected');
          break;
        case 'start':
          currentCallSid = msg.start.callSid;
          logger.info(`Media stream started for call ${currentCallSid}`);
          const openaiClient = new OpenAIClient(
            (audioBuffer: Buffer) => {
              ws.send(JSON.stringify({
                streamSid: msg.start.streamSid,
                event: 'media',
                media: {
                  payload: audioBuffer.toString('base64')
                }
              }));
            });
          openaiClient.connect();
          break;
        case 'media':
          if (currentCallSid) {
            const openaiClient = sessionManager.getSession(currentCallSid);
            if (openaiClient) {
              openaiClient.send(msg.media.payload);
            }
          }
          break;
        case 'stop':
          if (currentCallSid) {
            const openaiClient = sessionManager.getSession(currentCallSid);
            if (openaiClient) {
              openaiClient.close();
              sessionManager.deleteSession(currentCallSid);
            }
          }
          logger.info('Twilio media stream stopped');
          break;
      }
    } catch (error) {
      logger.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('error', (error) => {
    logger.error('Twilio WebSocket error:', error);
    if (currentCallSid) {
      const openaiClient = sessionManager.getSession(currentCallSid);
      if (openaiClient) {
        openaiClient.close();
        sessionManager.deleteSession(currentCallSid);
      }
    }
  });

  ws.on('close', () => {
    if (currentCallSid) {
      const openaiClient = sessionManager.getSession(currentCallSid);
      if (openaiClient) {
        openaiClient.close();
        sessionManager.deleteSession(currentCallSid);
      }
    }
    logger.info('WebSocket connection closed');
  });
});

export { app, server };
