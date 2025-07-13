#!/bin/bash
# Start the BaoAgent LLM server with model selection

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run ./setup.sh first"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

echo "🤖 BaoAgent LLM Server"
echo "Available models:"
echo "1. Mistral 7B Instruct (default) - Great all-around model"
echo "2. Code Llama 7B - Best for coding tasks"
echo "3. Llama 2 7B Chat - Meta's model"
echo "4. DeepSeek Coder 6.7B - Chinese model, excellent for coding"

read -p "Choose model (1-4, default: 1): " choice

case $choice in
    1|"")
        MODEL="mistralai/Mistral-7B-Instruct-v0.1"
        ;;
    2)
        MODEL="codellama/CodeLlama-7b-Instruct-hf"
        ;;
    3)
        MODEL="meta-llama/Llama-2-7b-chat-hf"
        ;;
    4)
        MODEL="deepseek-ai/deepseek-coder-6.7b-instruct"
        ;;
    *)
        echo "Invalid choice, using default"
        MODEL="mistralai/Mistral-7B-Instruct-v0.1"
        ;;
esac

echo "Starting BaoAgent LLM server with model: $MODEL"
python vllm_setup.py --model $MODEL
