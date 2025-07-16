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

interface ConnectedMessage {
  event: 'connected';
  protocol: string;
  version: string;
  streamSid: string;
}

interface StartMessage {
  event: 'start';
  sequenceNumber: string;
  start: {
    accountSid: string;
    callSid: string;
    streamSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
}

interface MediaMessage {
  event: 'media';
  sequenceNumber: string;
  media: {
    payload: string;
    timestamp: string;
    track: string;
    chunk: string;
  };
  streamSid: string;
}

interface StopMessage {
  event: 'stop';
  sequenceNumber: string;
  stop: {
    accountSid: string;
    callSid: string;
    streamSid: string;
  };
}

type TwilioMessage = ConnectedMessage | StartMessage | MediaMessage | StopMessage | { event: string; [key: string]: any };

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
  let currentStreamSid: string | null = null;

  ws.on('message', (message: WebSocket.RawData) => {
    try {
      const msg: TwilioMessage = JSON.parse(message.toString());

      switch (msg.event) {
        case 'connected':
          // For <Connect><Stream>, the streamSid is in the connected event
          currentStreamSid = (msg as ConnectedMessage).streamSid;
          logger.info(`Twilio WebSocket connected. Stream SID: ${currentStreamSid}`);
          break;
        case 'start':
          // For <Start><Stream>, the streamSid is in the start event
          currentStreamSid = (msg as StartMessage).start.streamSid;
          logger.info(`Media stream started for call ${(msg as StartMessage).start.callSid}. Stream SID: ${currentStreamSid}`);
          const openaiClient = sessionManager.createSession(currentStreamSid, (
            (audioPayloadBase64: string) => {
              const mediaPayload = JSON.stringify({
                streamSid: currentStreamSid,
                event: 'media',
                media: {
                  payload: audioPayloadBase64
                }
              });
              logger.info(`Sending media payload to Twilio: ${mediaPayload}`);
              ws.send(mediaPayload);

              const markPayload = JSON.stringify({
                streamSid: currentStreamSid,
                event: 'mark'
              });
              logger.info(`Sending mark payload to Twilio: ${markPayload}`);
              ws.send(markPayload);
            }));
          openaiClient.connect();
          break;
        case 'media':
          if (currentStreamSid) {
            const openaiClient = sessionManager.getSession(currentStreamSid);
            if (openaiClient) {
              openaiClient.send((msg as MediaMessage).media.payload);
            }
          }
          break;
        case 'stop':
          if (currentStreamSid) {
            const openaiClient = sessionManager.getSession(currentStreamSid);
            if (openaiClient) {
              openaiClient.close();
              sessionManager.deleteSession(currentStreamSid);
            }
          }
          logger.info('Twilio media stream stopped');
          break;
        case 'input_audio_buffer.speech_started':
          // This event is from OpenAI, not Twilio. It indicates the user has started speaking.
          // We need to clear any buffered audio on Twilio's side.
          if (currentStreamSid) {
            ws.send(JSON.stringify({
              event: 'clear',
              streamSid: currentStreamSid
            }));
            logger.info(`Sent clear event to Twilio for stream SID: ${currentStreamSid}`);
          }
          break;
        default:
          logger.info(`Unhandled event from Twilio: ${msg.event}`, msg);
          break;
      }
    } catch (error) {
      logger.error('Error parsing WebSocket message:', error);
    }
  });

  ws.on('error', (error) => {
    logger.error('Twilio WebSocket error:', error);
    if (currentStreamSid) {
      const openaiClient = sessionManager.getSession(currentStreamSid);
      if (openaiClient) {
        openaiClient.close();
        sessionManager.deleteSession(currentStreamSid);
      }
    }
  });

  ws.on('close', () => {
    if (currentStreamSid) {
      const openaiClient = sessionManager.getSession(currentStreamSid);
      if (openaiClient) {
        openaiClient.close();
        sessionManager.deleteSession(currentStreamSid);
      }
    }
    logger.info('WebSocket connection closed');
  });
});

export { app, server };
