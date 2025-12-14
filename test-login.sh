#!/bin/bash

API_URL="http://a18e7d2bebd654513b654c708224ed16-529493887.us-east-1.elb.amazonaws.com:8080"

echo "Testing admin login..."
curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"123456"}'

echo -e "\n\nTesting phuochv login..."
curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"phuochv@example.com","password":"123456"}'
