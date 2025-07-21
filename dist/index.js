"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = __importDefault(require("http"));
const ws_1 = __importDefault(require("ws"));
const health_1 = __importDefault(require("./routes/health"));
const voice_1 = __importDefault(require("./routes/voice"));
const logger_1 = __importDefault(require("./utils/logger"));
const session_manager_1 = __importDefault(require("./services/session-manager"));
const sessionManager = new session_manager_1.default();
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
const wss = new ws_1.default.Server({ server });
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/health', health_1.default);
app.use('/voice', voice_1.default);
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    logger_1.default.info(`Server is listening on port ${PORT}`);
});
wss.on('connection', (ws) => {
    logger_1.default.info('New WebSocket connection from Twilio');
    let currentStreamSid = null;
    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message.toString());
            switch (msg.event) {
                case 'connected':
                    // For <Connect><Stream>, the streamSid is in the connected event
                    currentStreamSid = msg.streamSid;
                    logger_1.default.debug(`Twilio WebSocket connected. Stream SID: ${currentStreamSid}`);
                    break;
                case 'start':
                    // For <Start><Stream>, the streamSid is in the start event
                    currentStreamSid = msg.start.streamSid;
                    logger_1.default.debug(`Media stream started for call ${msg.start.callSid}. Stream SID: ${currentStreamSid}`);
                    // Create call termination handler
                    const handleCallTermination = () => {
                        logger_1.default.info(`Terminating call for security reasons. Stream SID: ${currentStreamSid}`);
                        // Close the WebSocket connection to end the call
                        ws.close();
                    };
                    const openaiClient = sessionManager.createSession(currentStreamSid, ((audioPayloadBase64) => {
                        const mediaPayload = JSON.stringify({
                            streamSid: currentStreamSid,
                            event: 'media',
                            media: {
                                payload: audioPayloadBase64,
                                track: 'outbound_track'
                            }
                        });
                        logger_1.default.debug(`Received audio from OpenAI for Twilio. Payload length: ${audioPayloadBase64.length}`);
                        logger_1.default.debug(`Sending media payload to Twilio: ${mediaPayload}`);
                        ws.send(mediaPayload);
                    }), handleCallTermination);
                    openaiClient.connect();
                    break;
                case 'media':
                    if (currentStreamSid) {
                        const openaiClient = sessionManager.getSession(currentStreamSid);
                        if (openaiClient) {
                            logger_1.default.debug(`Received media from Twilio for stream SID: ${currentStreamSid}`);
                            openaiClient.send(msg.media.payload);
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
                    logger_1.default.info('Twilio media stream stopped');
                    break;
                case 'input_audio_buffer.speech_started':
                    // This event is from OpenAI, not Twilio. It indicates the user has started speaking.
                    // We need to clear any buffered audio on Twilio's side.
                    if (currentStreamSid) {
                        ws.send(JSON.stringify({
                            event: 'clear',
                            streamSid: currentStreamSid
                        }));
                        logger_1.default.info(`Sent clear event to Twilio for stream SID: ${currentStreamSid}`);
                    }
                    break;
                default:
                    logger_1.default.info(`Unhandled event from Twilio: ${msg.event}`, msg);
                    break;
            }
        }
        catch (error) {
            logger_1.default.error('Error parsing WebSocket message:', error);
        }
    });
    ws.on('error', (error) => {
        logger_1.default.error('Twilio WebSocket error:', error);
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
        logger_1.default.info('WebSocket connection closed');
    });
});
