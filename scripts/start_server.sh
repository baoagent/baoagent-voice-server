#!/bin/bash
# Start the BaoAgent LLM server using Ollama

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Install it from https://ollama.com/download or run: curl -fsSL https://ollama.com/install.sh | sh"
    exit 1
fi

# List available models
AVAILABLE_MODELS=("smollm2:1.7b" "mistral:7b" "gemma3n:e4b" "qwen3:8b" "gemma3:4b" "gemma3:12b-it-qat" "deepseek-r1:8b")
echo "🤖 BaoAgent LLM Server (Ollama Edition)"
echo "Available models:"
for i in "${!AVAILABLE_MODELS[@]}"; do
    echo "$((i+1)). ${AVAILABLE_MODELS[$i]}"
done

read -p "Choose model (1-${#AVAILABLE_MODELS[@]}, default: 1): " choice

if [[ -z "$choice" || ! "$choice" =~ ^[1-9][0-9]*$ || "$choice" -lt 1 || "$choice" -gt ${#AVAILABLE_MODELS[@]} ]]; then
    MODEL="${AVAILABLE_MODELS[0]}"
    echo "No valid choice, using default: $MODEL"
else
    MODEL="${AVAILABLE_MODELS[$((choice-1))]}"
fi

echo "Starting Ollama with model: $MODEL"
ollama run "$MODEL"
