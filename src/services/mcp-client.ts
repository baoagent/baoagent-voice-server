import axios from 'axios';
import logger from '../utils/logger';

class MCPClient {
  private readonly mcpServerUrl: string;

  constructor() {
    this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:5002/api';
  }

  async invokeTool(toolName: string, toolArguments: any): Promise<any> {
    logger.info(`Invoking MCP tool: ${toolName}`, toolArguments);

    try {
      switch (toolName) {
        case 'check_availability':
          return await this.checkAvailability(toolArguments.date);
        case 'create_appointment':
          return await this.createAppointment(toolArguments);
        case 'get_appointments_by_phone':
          return await this.getAppointmentsByPhone(toolArguments.phone_number);
        case 'cancel_appointment':
          return await this.cancelAppointment(toolArguments.appointment_id);
        default:
          throw new Error(`Tool '${toolName}' is not a valid MCP tool.`);
      }
    } catch (error: unknown) {
      logger.error(`Error invoking tool '${toolName}':`, error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`MCP Server responded with ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error; // Re-throw other errors
    }
  }

  private async checkAvailability(date: string): Promise<any> {
    if (!date) {
      throw new Error("A 'date' argument is required for check_availability.");
    }
    const response = await axios.get(`${this.mcpServerUrl}/availability`, { params: { date } });
    return response.data;
  }

  private async createAppointment(args: any): Promise<any> {
    const requiredFields = ['customer_phone', 'customer_name', 'appointment_date', 'appointment_time', 'origin_address', 'destination_address'];
    if (!requiredFields.every(field => args[field])) {
      throw new Error('Missing one or more required fields for create_appointment.');
    }
    const response = await axios.post(`${this.mcpServerUrl}/appointments`, args);
    return response.data;
  }

  private async getAppointmentsByPhone(phoneNumber: string): Promise<any> {
    if (!phoneNumber) {
      throw new Error("A 'phone_number' argument is required for get_appointments_by_phone.");
    }
    const response = await axios.get(`${this.mcpServerUrl}/appointments/by-phone/${phoneNumber}`);
    return response.data;
  }

  private async cancelAppointment(appointmentId: number): Promise<any> {
    if (!appointmentId) {
      throw new Error("An 'appointment_id' argument is required for cancel_appointment.");
    }
    const response = await axios.delete(`${this.mcpServerUrl}/appointments/${appointmentId}`);
    return response.data;
  }
}

export default MCPClient;