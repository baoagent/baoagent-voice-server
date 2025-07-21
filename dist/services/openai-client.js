"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const logger_1 = __importDefault(require("../utils/logger"));
const mcp_client_1 = __importDefault(require("./mcp-client"));
const conversation_security_1 = __importDefault(require("./conversation-security"));
class OpenAIClient {
    constructor(onAudioReceived, onCallTerminate) {
        this.ws = null;
        this.onAudioReceived = null;
        this.audioBufferQueue = [];
        this.sendCounter = 0;
        this.isOutputAudioFormatReady = false;
        this.audioOutputBufferQueue = [];
        this.openaiRealtimeUrl = process.env.OPENAI_REALTIME_URL || 'wss://api.openai.com/v1/realtime';
        this.onAudioReceived = onAudioReceived;
        this.onCallTerminate = onCallTerminate;
        this.mcpClient = new mcp_client_1.default();
        this.conversationSecurity = new conversation_security_1.default();
    }
    connect() {
        const options = {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                'openai-beta': 'realtime=v1'
            },
        };
        const urlWithModel = `${this.openaiRealtimeUrl}?model=gpt-4o-realtime-preview`;
        this.ws = new ws_1.default(urlWithModel, options);
        this.ws.onopen = () => {
            var _a, _b;
            logger_1.default.info('Connected to OpenAI Realtime API');
            // Send initial configuration message
            (_a = this.ws) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
                "type": "session.update",
                "session": {
                    "input_audio_format": "g711_ulaw",
                    "output_audio_format": "g711_ulaw",
                    "modalities": ["text", "audio"],
                    "turn_detection": { "type": "server_vad" },
                    "voice": "sage",
                    "input_audio_transcription": { "model": "gpt-4o-transcribe" },
                    "instructions": this.conversationSecurity.getEnhancedInstructions(),
                    "tools": [
                        {
                            "type": "function",
                            "name": "invoke_mcp_tool",
                            "description": "Invokes a tool on the MCP server.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "tool_name": {
                                        "type": "string",
                                        "description": "The name of the tool to invoke."
                                    },
                                    "tool_arguments": {
                                        "type": "object",
                                        "description": "The arguments to pass to the tool."
                                    }
                                },
                                "required": ["tool_name", "tool_arguments"]
                            }
                        }
                    ]
                }
            }));
            // Send any buffered audio
            while (this.audioBufferQueue.length > 0) {
                const audio = this.audioBufferQueue.shift();
                if (audio) {
                    this.send(audio);
                }
            }
            (_b = this.ws) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify({
                "type": "response.create"
            }));
        };
        this.ws.onmessage = (event) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            const message = JSON.parse(event.data.toString());
            // Monitor conversation for security if it contains text content
            if (message.type === 'conversation.item.created' && ((_a = message.item) === null || _a === void 0 ? void 0 : _a.content)) {
                const content = Array.isArray(message.item.content)
                    ? message.item.content.map((c) => c.text || '').join(' ')
                    : message.item.content.text || '';
                if (content.trim()) {
                    const securityResult = this.conversationSecurity.recordConversationTurn(content);
                    if (securityResult.shouldTerminate) {
                        logger_1.default.warn('Terminating call due to repeated off-topic conversation');
                        // Send final warning message
                        (_b = this.ws) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify({
                            "type": "conversation.item.create",
                            "item": {
                                "type": "message",
                                "role": "assistant",
                                "content": [{
                                        "type": "text",
                                        "text": securityResult.warningMessage
                                    }]
                            }
                        }));
                        // Trigger call termination after a short delay
                        setTimeout(() => {
                            var _a;
                            (_a = this.onCallTerminate) === null || _a === void 0 ? void 0 : _a.call(this);
                        }, 3000);
                        return;
                    }
                    else if (securityResult.shouldWarn && securityResult.warningMessage) {
                        logger_1.default.info('Sending warning for off-topic conversation');
                        // Send warning message
                        (_c = this.ws) === null || _c === void 0 ? void 0 : _c.send(JSON.stringify({
                            "type": "conversation.item.create",
                            "item": {
                                "type": "message",
                                "role": "assistant",
                                "content": [{
                                        "type": "text",
                                        "text": securityResult.warningMessage
                                    }]
                            }
                        }));
                    }
                }
            }
            if (message.type === 'response.audio.delta') {
                const audioDelta = message.delta;
                if (this.isOutputAudioFormatReady) {
                    (_d = this.onAudioReceived) === null || _d === void 0 ? void 0 : _d.call(this, audioDelta);
                }
                else {
                    this.audioOutputBufferQueue.push(audioDelta);
                }
            }
            else if (message.tool_calls) {
                for (const toolCall of message.tool_calls) {
                    if (toolCall.function.name === 'invoke_mcp_tool') {
                        const { tool_name, tool_arguments } = toolCall.function.arguments;
                        try {
                            const result = yield this.mcpClient.invokeTool(tool_name, tool_arguments);
                            (_e = this.ws) === null || _e === void 0 ? void 0 : _e.send(JSON.stringify({
                                "type": "conversation.item.create",
                                "item": {
                                    "type": "function_call_output",
                                    "call_id": toolCall.id,
                                    "output": JSON.stringify(result)
                                }
                            }));
                        }
                        catch (error) {
                            console.error('Error invoking MCP tool:', error);
                            let errorMessage = 'Unknown error';
                            if (error instanceof Error) {
                                errorMessage = error.message;
                            }
                            (_f = this.ws) === null || _f === void 0 ? void 0 : _f.send(JSON.stringify({
                                "tool_outputs": [
                                    {
                                        "tool_call_id": toolCall.id,
                                        "output": JSON.stringify({ error: errorMessage })
                                    }
                                ]
                            }));
                        }
                    }
                }
            }
            else if (message.type === 'session.updated' && ((_g = message.session) === null || _g === void 0 ? void 0 : _g.output_audio_format) === 'g711_ulaw') {
                logger_1.default.info('OpenAI output audio format confirmed as g711_ulaw. Starting to send buffered audio.');
                this.isOutputAudioFormatReady = true;
                while (this.audioOutputBufferQueue.length > 0) {
                    const audio = this.audioOutputBufferQueue.shift();
                    if (audio) {
                        (_h = this.onAudioReceived) === null || _h === void 0 ? void 0 : _h.call(this, audio);
                    }
                }
            }
            else {
                logger_1.default.info('Received from OpenAI:', message);
            }
        });
        this.ws.onerror = (event) => {
            logger_1.default.error('OpenAI WebSocket error:', event.error);
        };
        this.ws.onclose = () => {
            logger_1.default.info('Disconnected from OpenAI Realtime API');
        };
    }
    send(mulawAudioPayload) {
        if (this.ws && this.ws.readyState === ws_1.default.OPEN) {
            this.sendCounter++;
            if (this.sendCounter % 100 === 0) {
                logger_1.default.info(`Actually sending audio to OpenAI. Sent ${this.sendCounter} packets.`);
            }
            // Twilio sends mulaw audio, which OpenAI can directly consume when configured for g711_ulaw.
            if (mulawAudioPayload === undefined || mulawAudioPayload === null) {
                logger_1.default.error('Attempted to send undefined or null audio payload to OpenAI.');
                return;
            }
            logger_1.default.debug(`Sending audio payload to OpenAI. Type: ${typeof mulawAudioPayload}, Length: ${mulawAudioPayload.length}`);
            const event = {
                "type": "input_audio_buffer.append",
                "audio": mulawAudioPayload
            };
            this.ws.send(JSON.stringify(event));
        }
        else {
            this.audioBufferQueue.push(mulawAudioPayload);
        }
    }
    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
    /**
     * Reset conversation security state (useful for new calls)
     */
    resetConversationSecurity() {
        this.conversationSecurity.reset();
    }
    /**
     * Get conversation security statistics
     */
    getConversationStats() {
        return this.conversationSecurity.getStats();
    }
}
exports.default = OpenAIClient;
