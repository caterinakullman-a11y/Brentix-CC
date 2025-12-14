#!/bin/bash
# Brentix Admin Setup Script
# Run this AFTER database migrations are complete

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2NDM5NSwiZXhwIjoyMDgxMDQwMzk1fQ.1zOGjuaKcDcX9Bpw86ut6X7DLGP1qfrHf4riWdw0gMA"
BASE_URL="https://vaoddzhefpthybuglxfp.supabase.co"

echo "Setting up admin profiles..."
echo "=============================="

# Get admin user IDs
echo "Fetching admin users..."
USERS=$(curl -s "$BASE_URL/auth/v1/admin/users" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY")

# Extract user info
CATERINA_ID=$(echo "$USERS" | grep -A5 '"email": "caterina.kullman@gmail.com"' | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')
MATTIAS_ID=$(echo "$USERS" | grep -A5 '"email": "mattias.kullman@gmail.com"' | grep '"id"' | head -1 | sed 's/.*"id": "\([^"]*\)".*/\1/')

echo "Caterina ID: $CATERINA_ID"
echo "Mattias ID: $MATTIAS_ID"

# Create profile for Caterina
if [ -n "$CATERINA_ID" ]; then
    echo "Creating profile for Caterina..."
    curl -s -X POST "$BASE_URL/rest/v1/profiles" \
        -H "apikey: $SERVICE_KEY" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{\"id\": \"$CATERINA_ID\", \"email\": \"caterina.kullman@gmail.com\", \"full_name\": \"Caterina Kullman\", \"is_active\": true}"
    echo " Done"

    # Add admin role
    echo "Adding admin role for Caterina..."
    curl -s -X POST "$BASE_URL/rest/v1/user_roles" \
        -H "apikey: $SERVICE_KEY" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{\"user_id\": \"$CATERINA_ID\", \"role\": \"admin\"}"
    echo " Done"
fi

# Create profile for Mattias
if [ -n "$MATTIAS_ID" ]; then
    echo "Creating profile for Mattias..."
    curl -s -X POST "$BASE_URL/rest/v1/profiles" \
        -H "apikey: $SERVICE_KEY" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{\"id\": \"$MATTIAS_ID\", \"email\": \"mattias.kullman@gmail.com\", \"full_name\": \"Mattias Kullman\", \"is_active\": true}"
    echo " Done"

    # Add admin role
    echo "Adding admin role for Mattias..."
    curl -s -X POST "$BASE_URL/rest/v1/user_roles" \
        -H "apikey: $SERVICE_KEY" \
        -H "Authorization: Bearer $SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{\"user_id\": \"$MATTIAS_ID\", \"role\": \"admin\"}"
    echo " Done"
fi

echo ""
echo "Admin setup complete!"
