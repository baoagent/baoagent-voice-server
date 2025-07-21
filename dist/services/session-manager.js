"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_client_1 = __importDefault(require("./openai-client"));
class SessionManager {
    constructor() {
        this.sessions = new Map();
    }
    createSession(sessionId, onAudioReceived, onCallTerminate) {
        const openaiClient = new openai_client_1.default(onAudioReceived, onCallTerminate);
        this.sessions.set(sessionId, openaiClient);
        return openaiClient;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.resetConversationSecurity();
        }
        this.sessions.delete(sessionId);
    }
}
exports.default = SessionManager;
