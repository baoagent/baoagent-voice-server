import OpenAIClient from '../../src/services/openai-client';
import WebSocket from 'ws';

jest.mock('ws');

describe('OpenAIClient', () => {
  let openaiClient: OpenAIClient;
  let mockOnAudioReceived: jest.Mock;
  let mockWebSocketInstance: any; // Use any for easier mocking

  beforeEach(() => {
    mockOnAudioReceived = jest.fn();
    openaiClient = new OpenAIClient(mockOnAudioReceived);
    openaiClient.connect();
    // Cast WebSocket to any to access mock properties
    mockWebSocketInstance = (WebSocket as any).mock.instances[0];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send an empty text message after session.updated is received', () => {
    // Simulate onopen event
    if (mockWebSocketInstance.onopen) {
      mockWebSocketInstance.onopen({} as Event);
    }

    // Simulate session.updated message
    const sessionUpdatedMessage = {
      type: 'session.updated',
      session: { output_audio_format: 'g711_ulaw' },
    };
    if (mockWebSocketInstance.onmessage) {
      mockWebSocketInstance.onmessage({ data: JSON.stringify(sessionUpdatedMessage) } as MessageEvent);
    }

    // Expect the empty text message to be sent
    expect(mockWebSocketInstance.send).toHaveBeenCalledWith(JSON.stringify({
      "type": "conversation.item.create",
      "item": {
        "type": "text",
        "text": ""
      }
    }));
  });
});