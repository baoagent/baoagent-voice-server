#!/bin/bash
# Setup script for LLM Server with virtual environment

echo "Setting up BaoAgent LLM Server..."

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Setup complete!"
echo "To activate the environment: source venv/bin/activate"
echo "To start the server: python vllm_setup.py"