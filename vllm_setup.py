#!/usr/bin/env python3
"""
BaoAgent LLM Server using vLLM
Provides OpenAI-compatible API for all workflows
"""

import argparse
import sys
import os

def main():
    parser = argparse.ArgumentParser(description='BaoAgent LLM Server')
    parser.add_argument('--model', default='mistralai/Mistral-7B-Instruct-v0.1', help='Model to load')
    parser.add_argument('--port', type=int, default=8000, help='Port to run server on')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--max-model-len', type=int, default=4096, help='Maximum model length')
    
    args = parser.parse_args()
    
    print(f"🚀 Starting BaoAgent LLM Server")
    print(f"Model: {args.model}")
    print(f"Server: http://{args.host}:{args.port}")
    print(f"OpenAI-compatible endpoints:")
    print(f"  - Chat: http://localhost:{args.port}/v1/chat/completions")
    print(f"  - Completions: http://localhost:{args.port}/v1/completions")
    print(f"  - Models: http://localhost:{args.port}/v1/models")
    
    # Import here to avoid loading if just showing help
    try:
        from vllm.entrypoints.openai.api_server import run_server
        run_server(
            model=args.model,
            host=args.host,
            port=args.port,
            max_model_len=args.max_model_len,
        )
    except ImportError:
        print("❌ vLLM not installed. Run: pip install vllm")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
