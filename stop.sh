#!/bin/bash

# Stop script - Stop the running service on port 3004
# Usage: ./stop.sh

set -e  # Exit on error

echo "🛑 Stopping service..."

# Check if service is running on port 3004
if lsof -Pi :3004 -sTCP:LISTEN -t >/dev/null ; then
    echo "🔍 Service found running on port 3004"
    
    # Find process using port 3004
    PID=$(lsof -ti:3004)
    
    if [ ! -z "$PID" ]; then
        echo "🛑 Stopping process PID: $PID"
        
        # Try graceful shutdown first
        kill -TERM $PID
        
        # Wait for graceful shutdown
        echo "⏳ Waiting for graceful shutdown..."
        sleep 5
        
        # Check if process still exists
        if kill -0 $PID 2>/dev/null; then
            echo "🔨 Process still running, force killing..."
            kill -KILL $PID
            sleep 2
        fi
        
        # Final check
        if kill -0 $PID 2>/dev/null; then
            echo "❌ Failed to stop process PID: $PID"
            exit 1
        else
            echo "✅ Service stopped successfully"
        fi
    else
        echo "⚠️  No process found using port 3004"
    fi
else
    echo "ℹ️  No service running on port 3004"
fi

echo "🎉 Stop process completed!" 
