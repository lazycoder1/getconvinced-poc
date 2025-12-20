#!/bin/bash

# Test script for local Railway browser service

echo "🧪 Testing Railway Browser Control Service Locally"
echo ""

# Check if service is running
echo "1. Checking if service is running..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Service is running"
    curl -s http://localhost:3001/health | jq .
else
    echo "❌ Service is not running. Start it with: npm run dev"
    exit 1
fi

echo ""
echo "2. Testing session creation..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3001/session \
  -H "Content-Type: application/json" \
  -d '{
    "tabId": "test-tab-123",
    "headless": false
  }')

echo "$SESSION_RESPONSE" | jq .

TAB_ID=$(echo "$SESSION_RESPONSE" | jq -r '.id // "test-tab-123"')
echo "Using tabId: $TAB_ID"

echo ""
echo "3. Testing get state..."
curl -s "http://localhost:3001/state?tabId=$TAB_ID&lite=true" | jq .

echo ""
echo "4. Testing action (navigate)..."
curl -s -X POST http://localhost:3001/action \
  -H "Content-Type: application/json" \
  -d "{
    \"tabId\": \"$TAB_ID\",
    \"type\": \"navigate\",
    \"url\": \"https://example.com\"
  }" | jq .

echo ""
echo "5. Testing get state after navigation..."
sleep 2
curl -s "http://localhost:3001/state?tabId=$TAB_ID&lite=true" | jq .

echo ""
echo "6. Testing live URL (if using Browserbase)..."
curl -s "http://localhost:3001/live-url?tabId=$TAB_ID" | jq .

echo ""
echo "✅ All tests completed!"

