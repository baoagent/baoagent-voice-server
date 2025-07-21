import WebSocket from 'ws';
import logger from '../utils/logger';

import MCPClient from './mcp-client';
import ConversationSecurityService from './conversation-security';

class OpenAIClient {
  private ws: WebSocket | null = null;
  private readonly openaiRealtimeUrl: string;
  private onAudioReceived: ((audioBuffer: string) => void) | null = null;
  private mcpClient: MCPClient;
  private conversationSecurity: ConversationSecurityService;
  private audioBufferQueue: string[] = [];
  private sendCounter: number = 0;
  private isOutputAudioFormatReady: boolean = false;
  private audioOutputBufferQueue: string[] = [];
  private onCallTerminate?: () => void;

  constructor(onAudioReceived: (audioBuffer: string) => void, onCallTerminate?: () => void) {
    this.openaiRealtimeUrl = process.env.OPENAI_REALTIME_URL || 'wss://api.openai.com/v1/realtime';
    this.onAudioReceived = onAudioReceived;
    this.onCallTerminate = onCallTerminate;
    this.mcpClient = new MCPClient();
    this.conversationSecurity = new ConversationSecurityService();
  }

  connect() {
    const options = {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'openai-beta': 'realtime=v1'
      },
    };

    const urlWithModel = `${this.openaiRealtimeUrl}?model=gpt-4o-realtime-preview`;
    this.ws = new WebSocket(urlWithModel, options);

    this.ws.onopen = () => {
      logger.info('Connected to OpenAI Realtime API');
      // Send initial configuration message
      this.ws?.send(JSON.stringify({
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
      this.ws?.send(JSON.stringify({
        "type": "response.create"
      }));
    };

    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data.toString());
      
      // Monitor conversation for security if it contains text content
      if (message.type === 'conversation.item.created' && message.item?.content) {
        const content = Array.isArray(message.item.content) 
          ? message.item.content.map((c: any) => c.text || '').join(' ')
          : message.item.content.text || '';
        
        if (content.trim()) {
          const securityResult = this.conversationSecurity.recordConversationTurn(content);
          
          if (securityResult.shouldTerminate) {
            logger.warn('Terminating call due to repeated off-topic conversation');
            // Send final warning message
            this.ws?.send(JSON.stringify({
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
              this.onCallTerminate?.();
            }, 3000);
            return;
          } else if (securityResult.shouldWarn && securityResult.warningMessage) {
            logger.info('Sending warning for off-topic conversation');
            // Send warning message
            this.ws?.send(JSON.stringify({
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
          this.onAudioReceived?.(audioDelta);
        } else {
          this.audioOutputBufferQueue.push(audioDelta);
        }
      } else if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.function.name === 'invoke_mcp_tool') {
            const { tool_name, tool_arguments } = toolCall.function.arguments;
            try {
              const result = await this.mcpClient.invokeTool(tool_name, tool_arguments);
              this.ws?.send(JSON.stringify({
                "type": "conversation.item.create",
                "item": {
                  "type": "function_call_output",
                  "call_id": toolCall.id,
                  "output": JSON.stringify(result)
                }
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
      } else if (message.type === 'session.updated' && message.session?.output_audio_format === 'g711_ulaw') {
        logger.info('OpenAI output audio format confirmed as g711_ulaw. Starting to send buffered audio.');
        this.isOutputAudioFormatReady = true;
        while (this.audioOutputBufferQueue.length > 0) {
          const audio = this.audioOutputBufferQueue.shift();
          if (audio) {
            this.onAudioReceived?.(audio);
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
      this.sendCounter++;
      if (this.sendCounter % 100 === 0) {
        logger.info(`Actually sending audio to OpenAI. Sent ${this.sendCounter} packets.`);
      }
      // Twilio sends mulaw audio, which OpenAI can directly consume when configured for g711_ulaw.
      if (mulawAudioPayload === undefined || mulawAudioPayload === null) {
        logger.error('Attempted to send undefined or null audio payload to OpenAI.');
        return;
      }
      logger.debug(`Sending audio payload to OpenAI. Type: ${typeof mulawAudioPayload}, Length: ${mulawAudioPayload.length}`);
      const event = {
        "type": "input_audio_buffer.append",
        "audio": mulawAudioPayload
      };
      this.ws.send(JSON.stringify(event));
    } else {
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
  resetConversationSecurity(): void {
    this.conversationSecurity.reset();
  }

  /**
   * Get conversation security statistics
   */
  getConversationStats() {
    return this.conversationSecurity.getStats();
  }

  
}

export default OpenAIClient;

