# BaoAgent LLM Server

A high-performance Large Language Model server built with vLLM, providing OpenAI-compatible API endpoints for the BaoAgent ecosystem.

## Features

- **OpenAI-Compatible API**: Drop-in replacement for OpenAI's API endpoints
- **High Performance**: Powered by vLLM for efficient inference
- **Multiple Model Support**: Easy switching between different LLMs
- **Production Ready**: Built with FastAPI and Uvicorn
- **Easy Setup**: Automated scripts for quick deployment

## Quick Start

### Prerequisites

- Python 3.8+
- CUDA-compatible GPU (recommended)
- 8GB+ RAM (16GB+ recommended)

### Installation

1. Clone and navigate to the baoagent-llm-server directory:
```bash
cd baoagent-llm-server
```

2. Run the setup script:
```bash
chmod +x setup.sh
./setup.sh
```

3. Start the server:
```bash
chmod +x scripts/start_server.sh
./scripts/start_server.sh
```

### Manual Installation

If you prefer manual setup:

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start server with default model
python vllm_setup.py
```

## Usage

### Starting the Server

The server provides an interactive model selection menu:

```bash
./scripts/start_server.sh
```

Available models:
1. **Mistral 7B Instruct** (default) - Great all-around model
2. **Code Llama 7B** - Best for coding tasks  
3. **Llama 2 7B Chat** - Meta's conversational model
4. **DeepSeek Coder 6.7B** - Excellent for coding, Chinese-trained

### API Endpoints

Once running, the server provides OpenAI-compatible endpoints:

- **Chat Completions**: `http://localhost:8000/v1/chat/completions`
- **Text Completions**: `http://localhost:8000/v1/completions`
- **Models List**: `http://localhost:8000/v1/models`

### Example Usage

#### Chat Completion
```bash
curl -X POST "http://localhost:8000/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistralai/Mistral-7B-Instruct-v0.1",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "max_tokens": 100
  }'
```

#### Python Client
```python
import requests

response = requests.post("http://localhost:8000/v1/chat/completions", 
    json={
        "model": "mistralai/Mistral-7B-Instruct-v0.1",
        "messages": [{"role": "user", "content": "Hello from BaoAgent!"}],
        "max_tokens": 100
    }
)
print(response.json())
```

## Configuration

### Command Line Options

```bash
python vllm_setup.py --help
```

Available options:
- `--model`: Model to load (default: mistralai/Mistral-7B-Instruct-v0.1)
- `--port`: Server port (default: 8000)
- `--host`: Host to bind to (default: 0.0.0.0)
- `--max-model-len`: Maximum model length (default: 4096)

### Custom Model

```bash
python vllm_setup.py --model "your-custom-model" --port 8001
```

## Testing

Test the server functionality:

```bash
chmod +x scripts/test_server.sh
./scripts/test_server.sh
```

This will:
- Check if the server is running
- Test the chat completion endpoint
- Verify API responses

## Directory Structure

```
baoagent-llm-server/
├── README.md              # This file
├── requirements.txt       # Python dependencies
├── setup.sh              # Setup script
├── vllm_setup.py         # Main server script
├── models/               # Model storage (auto-created)
└── scripts/
    ├── start_server.sh   # Interactive server startup
    └── test_server.sh    # Server testing script
```

## Dependencies

- **vLLM 0.3.0**: High-performance LLM inference engine
- **FastAPI 0.104.1**: Modern web framework for APIs
- **Uvicorn 0.24.0**: ASGI server implementation
- **Pydantic 2.5.0**: Data validation and settings management
- **python-multipart 0.0.6**: Multipart form data parsing

## Integration with BaoAgent

This server integrates seamlessly with the BaoAgent ecosystem:

1. **Shared Client**: Use the `baoagent-llm-client` for standardized communication
2. **Workflow Support**: Powers various BaoAgent workflows
3. **API Consistency**: Maintains OpenAI compatibility for easy switching

## Troubleshooting

### Common Issues

1. **Out of Memory**: Reduce `--max-model-len` or use a smaller model
2. **CUDA Not Available**: Server will fall back to CPU (slower)
3. **Port Already in Use**: Change port with `--port` option
4. **Model Download Fails**: Check internet connection and disk space

### Performance Tips

- Use GPU for better performance
- Increase `--max-model-len` for longer contexts
- Consider model quantization for lower memory usage
- Monitor GPU memory usage with `nvidia-smi`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Part of the BaoAgent project. See main repository for license information.

## Support

For issues and support:
- Check the troubleshooting section above
- Review logs in the console output
- Test with the provided test script
- Ensure all dependencies are correctly installed

---

**BaoAgent LLM Server** - High-performance LLM inference for the BaoAgent ecosystem
