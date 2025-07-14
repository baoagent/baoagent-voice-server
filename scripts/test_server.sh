#!/bin/bash
# Test the BaoAgent LLM server (Ollama Edition)

echo "🧪 Testing BaoAgent LLM Server (Ollama Edition)..."

# Test if Ollama server is running
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama server is running"
    
    # Test generate endpoint
    echo "Testing generate endpoint..."
    curl -s http://localhost:11434/api/generate -d '{
        "model": "deepseek-r1:8b",
        "prompt": "Hello from BaoAgent!"
    }'
    echo
else
    echo "❌ Ollama server not running. Start it with: ./scripts/start_server.sh"
fi
