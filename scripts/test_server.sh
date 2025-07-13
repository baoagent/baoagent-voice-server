#!/bin/bash
# Test the BaoAgent LLM server

source venv/bin/activate

echo "🧪 Testing BaoAgent LLM Server..."

# Test if server is running
if curl -s http://localhost:8000/v1/models > /dev/null; then
    echo "✅ Server is running"
    
    # Test chat completion
    echo "Testing chat completion..."
    curl -X POST "http://localhost:8000/v1/chat/completions" \
        -H "Content-Type: application/json" \
        -d '{
            "model": "mistralai/Mistral-7B-Instruct-v0.1",
            "messages": [{"role": "user", "content": "Hello from BaoAgent!"}],
            "max_tokens": 100
        }'
else
    echo "❌ Server not running. Start it with: ./scripts/start_server.sh"
fi
