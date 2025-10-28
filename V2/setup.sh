#!/bin/bash

echo "========================================"
echo "IoT Scales V2 - Setup Script (Linux/macOS)"
echo "========================================"
echo

echo "[1/6] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "Node.js is installed: $(node --version)"

echo
echo "[2/6] Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    echo "ERROR: PostgreSQL not found. Please install PostgreSQL:"
    echo "Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "macOS: brew install postgresql"
    exit 1
fi
echo "PostgreSQL is installed: $(psql --version)"

echo
echo "[3/6] Installing application dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
echo "Dependencies installed successfully."

echo
echo "[4/6] Setting up database..."
sudo -u postgres psql -c "CREATE DATABASE FLB_MOWS;" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Database might already exist, continuing..."
fi

echo
echo "[5/6] Importing database schema..."
sudo -u postgres psql -d FLB_MOWS -f database/schema.sql
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to import database schema"
    echo "Please check database connection and try again"
    exit 1
fi
echo "Database schema imported successfully."

echo
echo "[6/6] Starting application..."
echo "Application will start at http://localhost:3000"
echo "Press Ctrl+C to stop the application"
echo
npm run dev

