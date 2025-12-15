#!/bin/bash

# Test AWS Bedrock Bearer Token Authentication
echo "🔍 Testing AWS Bedrock Bearer Token..."
echo ""

# Set the bearer token
export AWS_BEARER_TOKEN_BEDROCK="ABSKdXNlcjErMi1hdC0zNDg4MzE1ODYwNzU6bWx6Vk9telBacGxiNW9JdFFBUzRZZnR4N05SZHhlbWxJNlh0ckFOUEdKVmsxdUtXT1djMTAxWXplbFk9"

echo "✅ Bearer token set in environment"
echo "Token (first 50 chars): ${AWS_BEARER_TOKEN_BEDROCK:0:50}..."
echo ""

# Test with a simple API call
echo "📡 Testing /api/generate-questions endpoint..."
echo ""

curl -X POST http://localhost:3000/api/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "Manufacturing",
    "risks": {}
  }' \
  -s | jq '.'

echo ""
echo "✅ Test complete. Check the server logs for authentication method used."
