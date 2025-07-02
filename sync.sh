#!/bin/bash
# Quick sync script - run this when you start your day

cd "$(dirname "$0")"
echo "🔄 Syncing emails to PocketBase..."
python scripts/sync_emails_to_pb_simple.py 1
echo "✅ Sync complete!"