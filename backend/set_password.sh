#!/bin/bash
# Helper script to set custom PostgreSQL password
echo "Enter your PostgreSQL password for user 'postgres':"
read -s DB_PASSWORD
export DB_PASSWORD
echo "Password set. Now run ./start.sh" 