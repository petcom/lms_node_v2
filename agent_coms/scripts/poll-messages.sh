#!/bin/bash
# Poll messages directory for changes
# Run: ./poll-messages.sh

MESSAGES_DIR="/home/adam/github/cadencelms_api/agent_coms/messages"
STATE_FILE="/tmp/api_messages_state_$(date +%Y%m%d).txt"

# Initialize state file if doesn't exist
if [ ! -f "$STATE_FILE" ]; then
    ls -la "$MESSAGES_DIR" > "$STATE_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Initialized message polling state"
fi

while true; do
    # Get current state
    CURRENT_STATE=$(ls -la "$MESSAGES_DIR")
    PREVIOUS_STATE=$(cat "$STATE_FILE")
    
    if [ "$CURRENT_STATE" != "$PREVIOUS_STATE" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] CHANGE DETECTED in messages directory"
        echo "---"
        # Find new files
        diff <(echo "$PREVIOUS_STATE") <(echo "$CURRENT_STATE") | grep "^>" | head -10
        echo "---"
        # Update state
        echo "$CURRENT_STATE" > "$STATE_FILE"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] No changes detected"
    fi
    
    sleep 120  # 2 minutes
done
