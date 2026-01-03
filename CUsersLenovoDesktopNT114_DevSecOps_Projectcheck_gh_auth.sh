#!/bin/bash
# Check if gh is authenticated
if gh auth status 2>&1 | grep -q "Logged in"; then
  echo "authenticated"
else
  echo "not_authenticated"
fi
