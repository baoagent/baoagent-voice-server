import axios from 'axios';
import logger from '../utils/logger';

class MCPClient {
  private readonly mcpServerUrl: string;
  private readonly mcpServerToken: string;

  constructor() {
    this.mcpServerUrl = process.env.MCP_SERVER_URL || '';
    this.mcpServerToken = process.env.MCP_SERVER_TOKEN || '';

    if (!this.mcpServerUrl || !this.mcpServerToken) {
      logger.warn('MCP_SERVER_URL or MCP_SERVER_TOKEN is not set. MCP client may not function correctly.');
    }
  }

  async invokeTool(toolName: string, toolArguments: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.mcpServerUrl}/invoke`,
        {
          toolName,
          toolArguments,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.mcpServerToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`Error invoking MCP tool ${toolName}:`, error);
      throw error;
    }
  }
}

export default MCPClient;
