import WebSocket from 'ws';
import logger from '../utils/logger';
import { convertMulawToPCM } from '../utils/audio-utils';
import { mulaw } from 'alawmulaw';
import MCPClient from './mcp-client';

class OpenAIClient {
  private ws: WebSocket | null = null;
  private readonly openaiRealtimeUrl: string;
  private onAudioReceived: ((audioBuffer: Buffer) => void) | null = null;
  private mcpClient: MCPClient;

  constructor(onAudioReceived: (audioBuffer: Buffer) => void) {
    this.openaiRealtimeUrl = process.env.OPENAI_REALTIME_URL || 'wss://api.openai.com/v1/realtime';
    this.onAudioReceived = onAudioReceived;
    this.mcpClient = new MCPClient();
  }

  connect() {
    this.ws = new WebSocket(this.openaiRealtimeUrl);

    this.ws.onopen = () => {
      logger.info('Connected to OpenAI Realtime API');
      // Send initial configuration message
      this.ws?.send(JSON.stringify({
        "audio_format": {
          "type": "linear16",
          "sample_rate": 8000
        },
        "model": "gpt-4o",
        "input_mode": "speech",
        "conversation_mode": "true",
        "system_instructions": "You are a helpful assistant.",
        "tool_config": {
          "tools": [
            {
              "type": "function",
              "function": {
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
            }
          ]
        }
      }));
    };

    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data.toString());
      if (message.audio_chunk) {
        const audioBuffer = Buffer.from(message.audio_chunk, 'base64');
        // Convert PCM from OpenAI to Mulaw for Twilio
        const mulawAudio = Buffer.from(mulaw.encode(new Int16Array(audioBuffer.buffer)));
        this.onAudioReceived?.(mulawAudio);
      } else if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.function.name === 'invoke_mcp_tool') {
            const { tool_name, tool_arguments } = toolCall.function.arguments;
            try {
              const result = await this.mcpClient.invokeTool(tool_name, tool_arguments);
              this.ws?.send(JSON.stringify({
                "tool_outputs": [
                  {
                    "tool_call_id": toolCall.id,
                    "output": JSON.stringify(result)
                  }
                ]
              }));
            } catch (error: unknown) {
              console.error('Error invoking MCP tool:', error);
              let errorMessage = 'Unknown error';
              if (error instanceof Error) {
                errorMessage = error.message;
              }
              this.ws?.send(JSON.stringify({
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
      } else {
        logger.info('Received from OpenAI:', message);
      }
    };

    this.ws.onerror = (event) => {
      logger.error('OpenAI WebSocket error:', event.error);
    };

    this.ws.onclose = () => {
      logger.info('Disconnected from OpenAI Realtime API');
    };
  }

  send(mulawAudioPayload: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const audioBuffer = Buffer.from(mulawAudioPayload, 'base64');
      const pcmAudio = convertMulawToPCM(audioBuffer);
      this.ws.send(pcmAudio);
    } else {
      logger.warn('OpenAI WebSocket not open. Cannot send audio.');
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default OpenAIClient;