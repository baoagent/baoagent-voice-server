import OpenAIClient from './openai-client';

class SessionManager {
  private sessions: Map<string, OpenAIClient>;

  constructor() {
    this.sessions = new Map<string, OpenAIClient>();
  }

  createSession(sessionId: string, onAudioReceived: (audioBuffer: string) => void): OpenAIClient {
    const openaiClient = new OpenAIClient(onAudioReceived);
    this.sessions.set(sessionId, openaiClient);
    return openaiClient;
  }

  getSession(sessionId: string): OpenAIClient | undefined {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export default SessionManager;
