# BaoAgent LLM Server (Ollama Edition)

A high-performance Large Language Model server built with [Ollama](https://ollama.com/), providing a simple HTTP API for the BaoAgent ecosystem.

## Features

- **Ollama API**: Simple, local LLM server with HTTP API
- **Multiple Model Support**: Easily switch between different LLMs (Llama 2, Mistral, etc.)
- **Production Ready**: Runs on Mac (Apple Silicon or Intel), Linux, and Windows
- **Easy Setup**: One-line install, no CUDA or GPU required

## Quick Start

### Prerequisites

- macOS (Apple Silicon or Intel), Linux, or Windows
- 8GB+ RAM (16GB+ recommended)

### Installation

1. **Install Ollama:**

   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   # Or download from https://ollama.com/download
   ```

2. **Start a model (e.g., Llama 2):**

   ```bash
   ollama run llama2
   # To see available models: ollama list
   # To pull a new model: ollama pull mistral
   ```

3. **Start the BaoAgent LLM server script:**

   ```bash
   chmod +x scripts/start_server.sh
   ./scripts/start_server.sh
   ```

## Usage

### Starting the Server

The server launches the selected Ollama model and keeps it running. You can change the model by editing `scripts/start_server.sh` or using the interactive prompt.

### API Endpoints

Once running, the server provides the following endpoints (Ollama default):

- **Generate:** `http://localhost:11434/api/generate`
- **List Models:** `http://localhost:11434/api/tags`

### Example Usage

#### Generate Completion
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Hello, how are you?"
}'
```

#### Python Client
```python
import requests

response = requests.post("http://localhost:11434/api/generate", 
    json={
        "model": "llama2",
        "prompt": "Hello from BaoAgent!"
    }
)
print(response.json())
```

## Configuration

- Change the model by editing `scripts/start_server.sh` or running `ollama run <model>` manually.
- To expose the server to a remote backend, use [ngrok](https://ngrok.com/) or similar:
  ```bash
  ngrok http 11434
  ```

## Testing

Test the server functionality:

```bash
chmod +x scripts/test_server.sh
./scripts/test_server.sh
```

This will:
- Check if the Ollama server is running
- Test the generate endpoint
- Verify API responses

## Directory Structure

```
baoagent-llm-server/
├── README.md              # This file
├── requirements.txt       # Python dependencies (optional, minimal for Ollama)
├── scripts/
│   ├── start_server.sh    # Ollama server startup script
│   └── test_server.sh     # Server testing script
```

## Dependencies

- **Ollama**: Local LLM inference engine
- **curl**: For API testing
- **requests** (Python): For API integration (optional)

## Integration with BaoAgent

This server integrates seamlessly with the BaoAgent ecosystem:

1. **Shared Client**: Use the `baoagent-llm-client` for standardized communication
2. **Workflow Support**: Powers various BaoAgent workflows
3. **API Simplicity**: Easy HTTP API for integration

## Troubleshooting

### Common Issues

1. **Out of Memory**: Use a smaller model
2. **Port Already in Use**: Change port with `ollama serve --port <port>`
3. **Model Download Fails**: Check internet connection and disk space

### Performance Tips

- Use Apple Silicon for best performance on Mac
- Use smaller models for faster responses
- Monitor memory usage with Activity Monitor or `htop`

## License

Part of the BaoAgent project. See main repository for license information.

## Support

For issues and support:
- Check the troubleshooting section above
- Review logs in the console output
- Test with the provided test script
- Ensure all dependencies are correctly installed

---

**BaoAgent LLM Server (Ollama Edition)** - Local LLM inference for the BaoAgent ecosystem
