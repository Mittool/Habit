#!/bin/bash
# Auto commit and push to GitHub repository
# Usage: ./sync.sh <GITHUB_PAT_TOKEN>

TOKEN="$1"

if [ -z "$TOKEN" ]; then
  echo "================================================================="
  echo " 🚨 GitHub Security Notice: Account passwords are disabled."
  echo " To update GitHub automatically, please pass a Personal Access Token."
  echo ""
  echo " 1. Go to: https://github.com/settings/tokens"
  echo " 2. Click 'Generate new token (classic)' with 'repo' checkbox."
  echo " 3. Run this command:"
  echo ""
  echo "    ./sync.sh ghp_YOUR_GENERATED_TOKEN"
  echo "================================================================="
  exit 1
fi

echo "🔄 Staging workspace modifications..."
git add .

echo "💾 Creating snapshot commit..."
git commit -m "feat: live workspace auto-sync $(date '+%Y-%m-%d %H:%M:%S')" || true

echo "🚀 Transmitting directly to GitHub (Mittool/Habit)..."
git push https://Mittool:${TOKEN}@github.com/Mittool/Habit.git main

echo "✅ GitHub repository updated successfully!"
