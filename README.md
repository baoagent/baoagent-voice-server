# Twilio Voice Server - Moving Company MVP

A voice AI server that integrates Twilio Voice with OpenAI's Realtime API to handle moving company bookings through natural phone conversations.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/twilio-voice-server
cd twilio-voice-server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys and configuration

# Start the development server
npm run dev
```

## Features

- 📞 **Phone Integration**: Handle incoming calls via Twilio Voice
- 🤖 **AI Voice Assistant**: Natural speech-to-speech conversations using OpenAI Realtime API
- 📅 **Booking System**: Check availability and create bookings through MCP integration
- 💬 **SMS Confirmations**: Automatic booking confirmations via Twilio SMS
- 🔄 **Real-time Processing**: Low-latency audio streaming and function calling
- 📊 **Monitoring**: Built-in logging and metrics for call tracking

## Prerequisites

- Node.js 18+ and npm
- Twilio Account with Voice API enabled
- OpenAI API access with Realtime API enabled
- MCP Server for booking system (see [MCP Server Setup](#mcp-server-setup))

## Architecture Overview

The Twilio voice server acts as a bridge between three components:
1. **Twilio Voice** - Handles phone calls and converts them to WebSocket streams
2. **OpenAI Realtime API** - Processes speech-to-speech AI interactions
3. **MCP Server** - Your custom booking system interface

```
Phone Call → Twilio Voice → Voice Server → OpenAI Realtime API
                                ↓
                          MCP Server (Booking System)
```

## Installation

### 1. Clone and Install
```bash
git clone https://github.com/your-username/twilio-voice-server
cd twilio-voice-server
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Configure your `.env` file:
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_REALTIME_URL=wss://api.openai.com/v1/realtime

# MCP Server Configuration
MCP_SERVER_URL=your_mcp_server_url
MCP_SERVER_TOKEN=your_mcp_token

# Server Configuration
PORT=8080
NODE_ENV=development
```

### 3. Local Development Setup
```bash
# Install ngrok for local testing
npm install -g ngrok

# Start the server
npm run dev

# In another terminal, expose your server
ngrok http 8080
```

### 4. Configure Twilio Webhook
In your Twilio Console:
1. Go to Phone Numbers → Manage → Active Numbers
2. Click your phone number
3. Set Voice webhook URL to: `https://your-ngrok-url.ngrok.io/voice/incoming`
4. Set HTTP method to `POST`

## Core Components

### 1. Express Server with WebSocket Support
- **Purpose**: Handle Twilio webhooks and manage WebSocket connections
- **Framework**: Express.js with WebSocket support (`ws` library)
- **Key Routes**:
  - `/voice/incoming` - Twilio webhook for incoming calls
  - `/voice/status` - Call status updates
  - `/media-stream` - WebSocket endpoint for audio streaming

### 2. OpenAI Realtime API Client
- **Purpose**: Manage persistent WebSocket connection to OpenAI
- **Key Features**:
  - Session management with custom instructions
  - Audio streaming (G.711 μ-law format)
  - Function calling integration for MCP tools
  - Interrupt handling

### 3. MCP Client Integration
- **Purpose**: Interface with your booking system
- **Connection**: WebSocket or HTTP to your MCP server
- **Tools**: Availability checking, booking creation, confirmations

## Usage

### Starting the Server
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run with debug logging
DEBUG=* npm run dev
```

### Making Test Calls
1. Call your Twilio phone number
2. The AI assistant will greet you and help with booking
3. Try saying: "I need to book a move for next Friday"
4. Follow the conversation flow to complete a booking

### Available API Endpoints
- `POST /voice/incoming` - Twilio webhook for incoming calls
- `GET /voice/status` - Call status updates
- `GET /health` - Health check endpoint
- `WS /media-stream` - WebSocket for audio streaming

## Technical Implementation Steps

### Phase 1: Project Setup and Dependencies

#### 1.1 Initialize Project Structure
```
voice-server/
├── package.json
├── .env
├── src/
│   ├── index.js              # Express server entry
│   ├── routes/
│   │   ├── voice.js          # Twilio voice routes
│   │   └── health.js         # Health check endpoint
│   ├── services/
│   │   ├── openai-client.js  # OpenAI Realtime API client
│   │   ├── mcp-client.js     # MCP server client
│   │   └── session-manager.js # Session state management
│   ├── utils/
│   │   ├── audio-utils.js    # Audio format conversion
│   │   └── logger.js         # Logging utilities
│   └── config/
│       └── constants.js      # Configuration constants
├── tests/
└── README.md
```

#### 1.2 Required Dependencies
- **Core**: `express`, `ws`, `cors`, `helmet`
- **Twilio**: `twilio` (for TwiML generation)
- **OpenAI**: `ws` (WebSocket client)
- **Environment**: `dotenv`
- **Logging**: `winston`
- **Testing**: `jest`, `supertest`

#### 1.3 Environment Configuration
```
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_REALTIME_URL=wss://api.openai.com/v1/realtime

# MCP Server Configuration
MCP_SERVER_URL=your_mcp_server_url
MCP_SERVER_TOKEN=your_mcp_token

# Server Configuration
PORT=8080
NODE_ENV=development
```

### Phase 2: Twilio Voice Integration

#### 2.1 Webhook Handler Setup
**Key Implementation Points**:
- Handle incoming call webhook from Twilio
- Generate TwiML response to establish Media Stream
- Configure stream parameters (tracks, URL, name)
- Set up call tracking and logging

**TwiML Response Structure**:
- Use `<Connect>` verb with `<Stream>` noun
- Configure WebSocket URL pointing to your server
- Set track to "inbound_track" for caller audio
- Enable bidirectional audio streaming

#### 2.2 Media Stream WebSocket Handler
**Connection Flow**:
1. Accept WebSocket connection from Twilio
2. Parse incoming media stream messages
3. Initialize OpenAI Realtime API connection
4. Set up bidirectional audio relay
5. Handle connection cleanup on call end

**Message Types to Handle**:
- `connected` - Stream connection established
- `start` - Stream metadata and configuration
- `media` - Audio data packets (base64 encoded)
- `stop` - Stream ended

#### 2.3 Audio Format Considerations
- **Twilio Format**: G.711 μ-law, 8kHz, 160 bytes per packet
- **OpenAI Format**: G.711 μ-law (compatible)
- **Conversion**: Direct pass-through (no conversion needed)
- **Buffering**: Minimal buffering for real-time performance

### Phase 3: OpenAI Realtime API Integration

#### 3.1 WebSocket Connection Management
**Connection Setup**:
- Establish persistent WebSocket to OpenAI Realtime API
- Implement connection retry logic with exponential backoff
- Handle authentication via API key in headers
- Monitor connection health and reconnect if needed

#### 3.2 Session Configuration
**Initial Session Update**:
- Set system instructions for moving company assistant
- Configure voice settings (alloy, echo, fable, onyx, nova, shimmer)
- Set up function definitions for MCP tools
- Configure turn detection and interrupt handling

**System Instructions Template**:
```
You are a professional moving company booking assistant for NYC Quick Movers.
Your role is to:
1. Greet callers professionally
2. Collect complete booking information
3. Check availability using provided tools
4. Create confirmed bookings
5. Send confirmation details
6. Handle rescheduling requests politely

Always be friendly, efficient, and thorough in gathering information.
```

#### 3.3 Function Calling Integration
**Available Functions**:
- `check_availability` - Query crew and truck availability
- `create_booking` - Generate new booking records
- `send_confirmation` - Dispatch SMS/email confirmations
- `update_job_status` - Modify booking status
- `get_job_details` - Retrieve booking information

**Function Call Flow**:
1. AI decides to call a function based on conversation
2. Server receives function call event
3. Forward request to MCP server
4. Process MCP response
5. Send function result back to OpenAI
6. AI continues conversation with updated information

#### 3.4 Audio Streaming Implementation
**Inbound Audio (Caller → AI)**:
- Receive audio from Twilio Media Stream
- Forward directly to OpenAI Realtime API
- Maintain audio continuity and timing

**Outbound Audio (AI → Caller)**:
- Receive audio response from OpenAI
- Forward to Twilio Media Stream
- Handle audio interruptions gracefully

### Phase 4: MCP Server Integration

#### 4.1 Client Setup
**Connection Management**:
- Establish WebSocket connection to MCP server
- Implement authentication if required
- Handle connection failures and reconnection
- Maintain session state across requests

#### 4.2 Tool Invocation Handler
**Request Processing**:
- Parse function calls from OpenAI
- Map to appropriate MCP tool
- Format parameters according to MCP schema
- Handle tool execution and response formatting

#### 4.3 Error Handling
**Graceful Degradation**:
- Handle MCP server unavailability
- Provide fallback responses to maintain conversation
- Log errors for debugging
- Implement retry logic for transient failures

### Phase 5: Advanced Features

#### 5.1 Call State Management
**Session Tracking**:
- Track active calls and their states
- Maintain conversation context
- Handle call transfers or holds
- Implement call recording if needed

#### 5.2 Error Recovery
**Robust Error Handling**:
- OpenAI API disconnections
- Twilio stream interruptions
- MCP server timeouts
- Audio quality issues

#### 5.3 Monitoring and Logging
**Observability**:
- Call duration and quality metrics
- Function call success rates
- Error tracking and alerting
- Performance monitoring

## MCP Server Setup

This voice server requires a separate MCP (Model Context Protocol) server for booking system integration.

### Required MCP Tools
Your MCP server should implement these tools:
- `check_availability` - Query crew and truck availability
- `create_booking` - Generate new booking records  
- `send_confirmation` - Dispatch SMS/email confirmations
- `update_job_status` - Modify booking status
- `get_job_details` - Retrieve booking information

### MCP Server Repository
For the complete MCP server implementation, see: [moving-company-mcp-server](https://github.com/your-username/moving-company-mcp-server)

## Deployment

### Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy to Railway
railway login
railway init
railway up
```

### Render
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy with automatic builds

### Heroku
```bash
# Install Heroku CLI and login
heroku create your-app-name
heroku config:set TWILIO_ACCOUNT_SID=your_sid
# ... set all environment variables
git push heroku main
```

### Docker
```bash
# Build and run with Docker
docker build -t twilio-voice-server .
docker run -p 8080:8080 --env-file .env twilio-voice-server
```

## Configuration and Deployment

### Development Environment Setup

#### 1. Local Development
- Use ngrok for Twilio webhook testing
- Set up local MCP server instance
- Configure environment variables
- Enable debug logging

#### 2. Testing Strategy
- Unit tests for individual components
- Integration tests for WebSocket connections
- End-to-end tests with actual phone calls
- Load testing for concurrent call handling

### Production Deployment

#### 1. Hosting Options
- **Recommended**: Railway, Render, or Heroku
- **Requirements**: WebSocket support, persistent connections
- **Scaling**: Auto-scaling based on concurrent connections

#### 2. Configuration
- SSL/TLS certificates for WebSocket security
- Environment-specific configuration
- Health check endpoints for load balancers
- Monitoring and alerting setup

#### 3. Security Considerations
- API key management and rotation
- Request validation and sanitization
- Rate limiting and DDoS protection
- Call recording compliance (if applicable)

## Monitoring and Troubleshooting

### Health Checks
```bash
# Check server health
curl http://localhost:8080/health

# Check WebSocket connection
wscat -c ws://localhost:8080/media-stream
```

### Logging
The server uses structured logging with different levels:
```bash
# Enable debug logging
DEBUG=twilio:*,openai:*,mcp:* npm run dev

# View logs in production
npm run logs
```

### Common Issues

**WebSocket Connection Fails**
- Check firewall settings
- Verify SSL certificate for production
- Ensure WebSocket support in hosting platform

**Audio Quality Issues**
- Check network latency
- Verify audio codec compatibility
- Monitor packet loss in Twilio console

**Function Calls Not Working**
- Verify MCP server is running and accessible
- Check API authentication
- Review function schemas match expectations

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "voice routes"

# Run tests with coverage
npm run test:coverage
```

### Integration Testing
```bash
# Test with real phone calls
npm run test:integration

# Load testing
npm run test:load
```

## Performance Optimization

### 1. Latency Minimization
- Direct audio streaming without buffering
- Efficient WebSocket message routing
- Minimize function call overhead
- Optimize MCP server response times

### 2. Resource Management
- Connection pooling for MCP clients
- Memory management for audio buffers
- Cleanup of completed call sessions
- Efficient error handling

### 3. Scalability
- Horizontal scaling with load balancers
- Session affinity for WebSocket connections
- Database connection pooling
- Caching for frequently accessed data

## Testing and Validation

### 1. Unit Testing
- WebSocket connection handling
- Audio format conversion
- MCP client integration
- Error handling scenarios

### 2. Integration Testing
- End-to-end call flow
- Function calling with MCP server
- Audio quality validation
- Concurrent call handling

### 3. User Acceptance Testing
- Real phone call scenarios
- Booking flow completion
- Error recovery testing
- Performance under load

## Cost Estimates

### Monthly Cost Breakdown (100 calls, 5 min average)
- **Twilio Voice**: $1 base + $4.25 usage = $5.25
- **OpenAI Realtime API**: $15 (input + output)
- **Server Hosting**: $5 (Railway/Render)
- **SMS Confirmations**: $0.75
- **Total**: ~$26/month

### Cost Optimization Tips
- Monitor call duration and optimize conversation flow
- Use efficient MCP server responses
- Implement intelligent call routing
- Track and analyze usage patterns

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Add tests for new features
- Update documentation
- Use conventional commit messages

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📫 **Issues**: [GitHub Issues](https://github.com/your-username/twilio-voice-server/issues)
- 📖 **Documentation**: [Wiki](https://github.com/your-username/twilio-voice-server/wiki)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-username/twilio-voice-server/discussions)

## Related Projects

- [Moving Company MCP Server](https://github.com/your-username/moving-company-mcp-server) - Booking system backend
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime) - Official documentation
- [Twilio Voice API](https://www.twilio.com/docs/voice) - Voice API documentation

## Monitoring and Maintenance

### 1. Key Metrics
- Call completion rates
- Average call duration
- Function call success rates
- Error rates and types
- Response time metrics

### 2. Alerting
- Service health monitoring
- Error rate thresholds
- Performance degradation
- Capacity planning alerts

### 3. Logging Strategy
- Structured logging for debugging
- Call flow tracing
- Error tracking and correlation
- Performance metrics collection

---

## Technical Deep Dive

### Implementation Phases

#### Phase 1: Project Setup and Dependencies (Week 1)