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
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
class MCPClient {
    constructor() {
        this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:5002/api';
    }
    invokeTool(toolName, toolArguments) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.default.info(`Invoking MCP tool: ${toolName}`, toolArguments);
            try {
                switch (toolName) {
                    case 'check_availability':
                        return yield this.checkAvailability(toolArguments.date);
                    case 'create_appointment':
                        return yield this.createAppointment(toolArguments);
                    case 'get_appointments_by_phone':
                        return yield this.getAppointmentsByPhone(toolArguments.phone_number);
                    case 'cancel_appointment':
                        return yield this.cancelAppointment(toolArguments.appointment_id);
                    default:
                        throw new Error(`Tool '${toolName}' is not a valid MCP tool.`);
                }
            }
            catch (error) {
                logger_1.default.error(`Error invoking tool '${toolName}':`, error);
                if (axios_1.default.isAxiosError(error) && error.response) {
                    throw new Error(`MCP Server responded with ${error.response.status}: ${JSON.stringify(error.response.data)}`);
                }
                throw error; // Re-throw other errors
            }
        });
    }
    checkAvailability(date) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!date) {
                throw new Error("A 'date' argument is required for check_availability.");
            }
            const response = yield axios_1.default.get(`${this.mcpServerUrl}/availability`, { params: { date } });
            return response.data;
        });
    }
    createAppointment(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const requiredFields = ['customer_phone', 'customer_name', 'appointment_date', 'appointment_time', 'origin_address', 'destination_address'];
            if (!requiredFields.every(field => args[field])) {
                throw new Error('Missing one or more required fields for create_appointment.');
            }
            const response = yield axios_1.default.post(`${this.mcpServerUrl}/appointments`, args);
            return response.data;
        });
    }
    getAppointmentsByPhone(phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!phoneNumber) {
                throw new Error("A 'phone_number' argument is required for get_appointments_by_phone.");
            }
            const response = yield axios_1.default.get(`${this.mcpServerUrl}/appointments/by-phone/${phoneNumber}`);
            return response.data;
        });
    }
    cancelAppointment(appointmentId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!appointmentId) {
                throw new Error("An 'appointment_id' argument is required for cancel_appointment.");
            }
            const response = yield axios_1.default.delete(`${this.mcpServerUrl}/appointments/${appointmentId}`);
            return response.data;
        });
    }
}
exports.default = MCPClient;
