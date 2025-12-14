#!/bin/bash
# Brentix Database Verification Script

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQzOTUsImV4cCI6MjA4MTA0MDM5NX0.cQTt4yIjMX3QyDBVsZzNPIsv3uoK7BHjEHC41_cr__4"
BASE_URL="https://vaoddzhefpthybuglxfp.supabase.co/rest/v1"

echo "Verifying Brentix database tables..."
echo "======================================"

tables=("profiles" "price_data" "technical_indicators" "signals" "paper_trades" "real_trades" "daily_reports" "settings" "user_roles")

for table in "${tables[@]}"; do
    response=$(curl -s "$BASE_URL/$table?select=count&limit=0" \
        -H "apikey: $ANON_KEY" \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Prefer: count=exact")

    if [[ "$response" == *"PGRST205"* ]]; then
        echo "❌ $table - NOT FOUND"
    else
        echo "✅ $table - OK"
    fi
done

echo ""
echo "Verification complete!"
