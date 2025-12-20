# 🛢️ MASTERSCRIPT: BRENTIX
## Komplett migreringsguide från Lovable till Claude Code

> **Instruktion till Claude Code:** Detta dokument innehåller ALL information du behöver för att bygga en exakt kopia av projektet med förbättringar. Läs igenom HELA dokumentet innan du börjar. Fråga INGA frågor - allt du behöver finns här.

> **⚠️ KRITISKT - SVENSKA TECKEN:** Alla filer MÅSTE sparas som UTF-8. Verifiera att å, ä, ö, Å, Ä, Ö fungerar korrekt överallt.

---

# ⚠️ KRITISKA REGLER

## INGEN MOCKDATA - ALDRIG!

Brentix ska **ENDAST** använda **VERKLIG data**:

### ✅ TILLÅTET:
- Historisk prisdata från `/data`-mappen (CSV-filer)
- Live-data från Yahoo Finance API
- Data från Supabase-databasen
- Användarinput och användarskapat innehåll

### ❌ FÖRBJUDET:
- Skapa fake/mock prisdata
- Generera påhittade trades eller signaler
- Använda placeholder-data i produktion
- Hårdkoda testdata som ser ut som riktig data
- `generateMockData()` eller liknande funktioner

### VID SAKNAD DATA:
```
Om data saknas → visa "Ingen data tillgänglig" eller "Väntar på datainsamling..."
```

**Denna regel gäller ALLTID och får ALDRIG brytas.**

---

# 📋 INNEHÅLLSFÖRTECKNING
1. [Projektöversikt](#1-projektöversikt)
2. [Tech Stack](#2-tech-stack)
3. [Databasschema](#3-databasschema)
4. [Environment Variables](#4-environment-variables)
5. [Autentisering](#5-autentisering)
6. [Tredjepartsintegrationer](#6-tredjepartsintegrationer)
7. [Sidstruktur & Routing](#7-sidstruktur--routing)
8. [Komponenter](#8-komponenter)
9. [Avancerade Analysverktyg](#9-avancerade-analysverktyg)
10. [Design System](#10-design-system)
11. [Affärslogik & Funktioner](#11-affärslogik--funktioner)
12. [Edge Functions](#12-edge-functions)
13. [Adminpanel](#13-adminpanel)
14. [Flerspråksstöd](#14-flerspråksstöd-i18n)
15. [Deployment & Hosting](#15-deployment--hosting)
16. [Kända buggar att fixa](#16-kända-buggar-att-fixa)
17. [Önskade förbättringar](#17-önskade-förbättringar)

---

# 1. PROJEKTÖVERSIKT

## 1.1 Projektnamn
```
Brentix - Brent Crude Oil Trading App
```

## 1.2 Kort beskrivning
```
Brentix är en real-time tradingapplikation för Brent Crude Oil. Den hämtar 
live-prisdata från Yahoo Finance, beräknar tekniska indikatorer (RSI, MACD, 
Bollinger Bands, SMA), genererar automatiska handelssignaler (KÖP/SÄLJ/HÅLL), 
och stödjer både paper trading och riktig handel via Avanza.
```

## 1.3 Målgrupp
```
Svenska privatpersoner som vill handla oljerelaterade certifikat (BULL/BEAR) 
via Avanza med stöd av teknisk analys och automatiserade signaler.
```

## 1.4 Huvudfunktioner
```
1. Live-prisdata från Yahoo Finance (BZ=F)
2. Teknisk analys (RSI, MACD, Bollinger Bands, SMA, EMA)
3. Automatiska handelssignaler (BUY/SELL/HOLD)
4. Dubbla signalkort för BULL och BEAR certifikat
5. Fyra handelsknappar (Köp/Sälj × BULL/BEAR)
6. Paper trading simulering
7. Avanza-integration för riktig handel med TOTP
8. Användargodkännandesystem med adminpanel
9. Mönsterigenkänning och analys
10. Backtesting-motor
11. Conditional orders (Limit, Stop, Stop-Limit, Trailing Stop)
12. Emergency stop-funktionalitet
13. Drag-and-drop dashboard
14. In-app hjälpchat
15. 9 avancerade analysverktyg (se sektion 9)
```

## 1.5 Domän
```
www.brentix.se
```

## 1.6 GitHub-repo
```
https://github.com/caterinakullman-a11y/brentix
```

---

# 2. TECH STACK

## 2.1 Frontend
```
Framework: React 18.x + Vite 5.x
Språk: TypeScript 5.x
Styling: Tailwind CSS 3.x
UI-bibliotek: shadcn/ui (Latest)
State: TanStack Query 5.x
Routing: React Router 6.x
Charts: Recharts 2.x
Tema: next-themes
Validering: Zod 3.x
Datum: date-fns 3.x
```

## 2.2 Backend
```
Database: Supabase (PostgreSQL)
Auth: Supabase Auth
Storage: Supabase Storage
Edge Functions: Deno runtime
Realtime: Supabase Realtime
```

## 2.3 Externa APIs
```
Yahoo Finance: Real-time Brent Crude prices (BZ=F)
Avanza: Swedish broker för handelexekvering med TOTP 2FA
```

---

# 3. DATABASSCHEMA

## 3.1 Enums
```sql
CREATE TYPE app_role AS ENUM ('admin', 'user');
CREATE TYPE signal_type AS ENUM ('BUY', 'SELL', 'HOLD');
CREATE TYPE signal_strength AS ENUM ('STRONG', 'MODERATE', 'WEAK');
CREATE TYPE trade_status AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE event_impact AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');
CREATE TYPE event_type AS ENUM (
  'EIA_REPORT', 'OPEC_DECISION', 'API_REPORT', 'NEWS', 
  'SANCTION', 'GEOPOLITICAL', 'PRODUCTION', 'OTHER'
);
CREATE TYPE pattern_type AS ENUM (
  'DOUBLE_TOP', 'DOUBLE_BOTTOM', 'HEAD_SHOULDERS', 
  'INVERSE_HEAD_SHOULDERS', 'TRIANGLE_ASCENDING', 'TRIANGLE_DESCENDING',
  'CHANNEL_UP', 'CHANNEL_DOWN', 'BREAKOUT', 'BREAKDOWN', 
  'RECURRING_MINUTE', 'OTHER'
);
```

## 3.2 Tabeller

### `profiles` - Användarprofiler
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  full_name VARCHAR,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);
```

### `user_roles` - Användarroller
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);
```

### `user_settings` - Användarinställningar
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  initial_capital_sek DECIMAL DEFAULT 10000,
  current_capital_sek DECIMAL,
  stop_loss_percent DECIMAL DEFAULT 2,
  take_profit_percent DECIMAL DEFAULT 1,
  max_position_size_percent DECIMAL DEFAULT 10,
  position_size_sek DECIMAL DEFAULT 1000,
  enable_push_notifications BOOLEAN DEFAULT false,
  enable_email_notifications BOOLEAN DEFAULT false,
  enable_sms_notifications BOOLEAN DEFAULT false,
  auto_trading_enabled BOOLEAN DEFAULT false,
  paper_trading_enabled BOOLEAN DEFAULT true,
  paper_balance DECIMAL DEFAULT 100000,
  paper_starting_balance DECIMAL DEFAULT 100000,
  avanza_account_id VARCHAR,
  avanza_instrument_id VARCHAR DEFAULT '2313155',
  preferred_bull_id VARCHAR DEFAULT '2313155',
  preferred_bear_id VARCHAR DEFAULT '2313156',
  show_loading_skeletons BOOLEAN DEFAULT true,
  notify_new_signals BOOLEAN DEFAULT true,
  notify_trade_executed BOOLEAN DEFAULT true,
  notify_daily_summary BOOLEAN DEFAULT false,
  notify_sound_enabled BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  phone_number VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `price_data` - Prisdata
```sql
CREATE TABLE price_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  open DECIMAL NOT NULL,
  high DECIMAL NOT NULL,
  low DECIMAL NOT NULL,
  close DECIMAL NOT NULL,
  volume BIGINT,
  source VARCHAR DEFAULT 'yahoo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_price_data_timestamp ON price_data(timestamp DESC);
```

### `technical_indicators` - Tekniska indikatorer
```sql
CREATE TABLE technical_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_data_id UUID REFERENCES price_data(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  rsi_14 DECIMAL,
  sma_5 DECIMAL,
  sma_10 DECIMAL,
  sma_20 DECIMAL,
  sma_50 DECIMAL,
  ema_12 DECIMAL,
  ema_26 DECIMAL,
  macd DECIMAL,
  macd_signal DECIMAL,
  macd_histogram DECIMAL,
  bollinger_upper DECIMAL,
  bollinger_middle DECIMAL,
  bollinger_lower DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `signals` - Handelssignaler
```sql
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  signal_type signal_type NOT NULL,
  strength signal_strength NOT NULL,
  probability_up DECIMAL,
  probability_down DECIMAL,
  confidence DECIMAL,
  current_price DECIMAL NOT NULL,
  target_price DECIMAL,
  stop_loss DECIMAL,
  reasoning TEXT,
  is_active BOOLEAN DEFAULT true,
  indicators_used JSONB,
  executed BOOLEAN DEFAULT false,
  auto_executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMPTZ,
  execution_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_signals_active ON signals(is_active, timestamp DESC);
```

### `trades` - Riktiga trades
```sql
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  signal_id UUID REFERENCES signals(id),
  entry_price DECIMAL NOT NULL,
  entry_timestamp TIMESTAMPTZ DEFAULT NOW(),
  exit_price DECIMAL,
  exit_timestamp TIMESTAMPTZ,
  quantity DECIMAL NOT NULL,
  profit_loss_sek DECIMAL,
  profit_loss_percent DECIMAL,
  position_value_sek DECIMAL,
  status trade_status DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `paper_trades` - Paper trades
```sql
CREATE TABLE paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  signal_id UUID REFERENCES signals(id),
  instrument_type VARCHAR CHECK (instrument_type IN ('BULL', 'BEAR')),
  instrument_id VARCHAR,
  direction VARCHAR CHECK (direction IN ('BUY', 'SELL')),
  entry_price DECIMAL NOT NULL,
  entry_timestamp TIMESTAMPTZ DEFAULT NOW(),
  exit_price DECIMAL,
  exit_timestamp TIMESTAMPTZ,
  quantity DECIMAL,
  amount_sek DECIMAL,
  profit_loss_sek DECIMAL,
  profit_loss_percent DECIMAL,
  position_value_sek DECIMAL,
  status VARCHAR DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
```

### `trade_execution_queue` - Exekveringskö
```sql
CREATE TABLE trade_execution_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  signal_id UUID REFERENCES signals(id),
  status VARCHAR DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

### `conditional_orders` - Villkorade ordrar
```sql
CREATE TABLE conditional_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_type VARCHAR NOT NULL CHECK (order_type IN ('LIMIT', 'STOP', 'STOP_LIMIT', 'TRAILING_STOP')),
  direction VARCHAR NOT NULL CHECK (direction IN ('BUY', 'SELL')),
  trigger_price DECIMAL,
  limit_price DECIMAL,
  quantity DECIMAL NOT NULL,
  trailing_percent DECIMAL,
  status VARCHAR DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'TRIGGERED', 'EXECUTED', 'CANCELLED', 'EXPIRED')),
  instrument_id VARCHAR,
  expires_at TIMESTAMPTZ,
  triggered_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  execution_result JSONB,
  peak_price DECIMAL,
  trough_price DECIMAL,
  initial_trigger_price DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `emergency_stops` - Nödstopp
```sql
CREATE TABLE emergency_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  is_active BOOLEAN DEFAULT false,
  reason TEXT,
  close_all_positions BOOLEAN DEFAULT false,
  disable_auto_trading BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `auto_triggers` - Automatiska triggers
```sql
CREATE TABLE auto_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR NOT NULL,
  trigger_type VARCHAR NOT NULL,
  threshold_type VARCHAR DEFAULT 'PERCENT',
  threshold_value DECIMAL NOT NULL,
  action VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT true,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `trading_rules` - Handelsregler
```sql
CREATE TABLE trading_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR NOT NULL,
  description TEXT,
  rule_type VARCHAR CHECK (rule_type IN ('BUY', 'SELL', 'BOTH')),
  conditions JSONB NOT NULL,
  action_config JSONB,
  backtest_results JSONB,
  is_active BOOLEAN DEFAULT false,
  is_system_suggested BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `backtest_runs` - Backtester
```sql
CREATE TABLE backtest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rule_id UUID REFERENCES trading_rules(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  win_rate DECIMAL,
  net_profit DECIMAL,
  gross_profit DECIMAL,
  gross_loss DECIMAL,
  profit_factor DECIMAL,
  max_drawdown_percent DECIMAL,
  max_consecutive_losses INTEGER,
  avg_win DECIMAL,
  avg_loss DECIMAL,
  trades JSONB,
  equity_curve JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `patterns` - Mönster
```sql
CREATE TABLE patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type pattern_type NOT NULL,
  start_timestamp TIMESTAMPTZ,
  end_timestamp TIMESTAMPTZ,
  confidence DECIMAL,
  expected_direction VARCHAR,
  expected_magnitude DECIMAL,
  actual_direction VARCHAR,
  actual_magnitude DECIMAL,
  verified BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `pattern_definitions` - Mönsterdefinitioner
```sql
CREATE TABLE pattern_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  pattern_type VARCHAR NOT NULL,
  category VARCHAR,
  direction VARCHAR,
  description TEXT,
  parameters JSONB,
  success_rate DECIMAL,
  avg_return_percent DECIMAL,
  timeframe VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `historical_prices` - Historisk data
```sql
CREATE TABLE historical_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  price DECIMAL NOT NULL,
  source VARCHAR DEFAULT 'yahoo',
  series_id VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_historical_prices_date ON historical_prices(date DESC);
```

### `notifications` - Notifikationer
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `analysis_tool_settings` - Analysverktyg-inställningar
```sql
CREATE TABLE analysis_tool_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  frequency_analyzer_enabled BOOLEAN DEFAULT true,
  frequency_lookback_days INTEGER DEFAULT 30,
  momentum_pulse_enabled BOOLEAN DEFAULT true,
  momentum_sensitivity INTEGER DEFAULT 50,
  volatility_window_enabled BOOLEAN DEFAULT true,
  volatility_window_hours INTEGER DEFAULT 24,
  smart_exit_enabled BOOLEAN DEFAULT true,
  reversal_meter_enabled BOOLEAN DEFAULT true,
  timing_score_enabled BOOLEAN DEFAULT true,
  correlation_radar_enabled BOOLEAN DEFAULT true,
  risk_per_minute_enabled BOOLEAN DEFAULT true,
  micro_pattern_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `daily_reports` - Dagliga rapporter
```sql
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  open_price DECIMAL,
  high_price DECIMAL,
  low_price DECIMAL,
  close_price DECIMAL,
  daily_change_percent DECIMAL,
  total_signals INTEGER DEFAULT 0,
  buy_signals INTEGER DEFAULT 0,
  sell_signals INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL,
  gross_profit_sek DECIMAL,
  gross_loss_sek DECIMAL,
  net_profit_sek DECIMAL,
  best_trade_profit_sek DECIMAL,
  worst_trade_loss_sek DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `error_logs` - Felloggar
```sql
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  error_type VARCHAR,
  error_message TEXT,
  severity VARCHAR,
  endpoint VARCHAR,
  stack_trace TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

## 3.3 Views

### `pending_trades` - Väntande trades
```sql
CREATE VIEW pending_trades AS
SELECT 
  q.id as queue_id,
  q.user_id,
  q.signal_id,
  q.status,
  q.created_at,
  s.signal_type,
  s.current_price,
  s.confidence,
  us.avanza_account_id,
  us.avanza_instrument_id,
  us.position_size_sek
FROM trade_execution_queue q
JOIN signals s ON q.signal_id = s.id
JOIN user_settings us ON q.user_id = us.user_id
WHERE q.status = 'PENDING';
```

## 3.4 Database Functions

### `has_role` - Kontrollera roll
```sql
CREATE OR REPLACE FUNCTION has_role(_role app_role, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `is_approved` - Kontrollera godkänd
```sql
CREATE OR REPLACE FUNCTION is_approved(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = _user_id AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `promote_to_admin` - Gör till admin
```sql
CREATE OR REPLACE FUNCTION promote_to_admin(user_email TEXT)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  IF target_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role) 
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### `create_signal_atomic` - Skapa signal atomiskt
```sql
CREATE OR REPLACE FUNCTION create_signal_atomic(
  p_signal_type TEXT,
  p_strength TEXT,
  p_probability_up DECIMAL,
  p_probability_down DECIMAL,
  p_confidence DECIMAL,
  p_current_price DECIMAL,
  p_target_price DECIMAL,
  p_stop_loss DECIMAL,
  p_reasoning TEXT,
  p_indicators_used JSONB
) RETURNS UUID AS $$
DECLARE
  new_signal_id UUID;
BEGIN
  -- Deactivate previous signals
  UPDATE signals SET is_active = false WHERE is_active = true;
  
  -- Create new signal
  INSERT INTO signals (
    signal_type, strength, probability_up, probability_down,
    confidence, current_price, target_price, stop_loss,
    reasoning, indicators_used, is_active
  ) VALUES (
    p_signal_type::signal_type, p_strength::signal_strength,
    p_probability_up, p_probability_down, p_confidence,
    p_current_price, p_target_price, p_stop_loss,
    p_reasoning, p_indicators_used, true
  ) RETURNING id INTO new_signal_id;
  
  RETURN new_signal_id;
END;
$$ LANGUAGE plpgsql;
```

## 3.5 Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditional_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_tool_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (has_role('admin', auth.uid()));
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (has_role('admin', auth.uid()));

-- User settings policies
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Trades policies
CREATE POLICY "Users can manage own trades" ON trades
  FOR ALL USING (auth.uid() = user_id);

-- Paper trades policies
CREATE POLICY "Users can manage own paper trades" ON paper_trades
  FOR ALL USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can manage own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Trading rules policies
CREATE POLICY "Users can manage own rules" ON trading_rules
  FOR ALL USING (auth.uid() = user_id);

-- Signals - public read
CREATE POLICY "Anyone can read signals" ON signals
  FOR SELECT USING (true);

-- Price data - public read
CREATE POLICY "Anyone can read price data" ON price_data
  FOR SELECT USING (true);
```

---

# 4. ENVIRONMENT VARIABLES

## 4.1 Supabase (PRODUCTION)
```env
VITE_SUPABASE_URL=https://vaoddzhefpthybuglxfp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQzOTUsImV4cCI6MjA4MTA0MDM5NX0.cQTt4yIjMX3QyDBVsZzNPIsv3uoK7BHjEHC41_cr__4
VITE_SUPABASE_PROJECT_ID=vaoddzhefpthybuglxfp
```

## 4.2 Supabase Service Role Key (för Edge Functions)
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2NDM5NSwiZXhwIjoyMDgxMDQwMzk1fQ.HUYdv25XWe-hZwJcfgc4ikrHfxKWNAFgIqBGRYJZgac
```

## 4.3 Supabase Database
```
Database Password: DdJeW9K4Leee3m1Fd
Publishable Key: sb_publishable_PCQYXg--FQ4ytPARDSP8bg_31nzUAPg
Secret Key: sb_secret_gciPMPRda2nUUIPierr-VA_wU7evSuQ
```

## 4.4 FRED API (Federal Reserve Economic Data)
```env
FRED_API_KEY=7d27ae72f8b4c4b3ba81a86baf56ec36
```
API Portal: https://fredaccount.stlouisfed.org/apikey

## 4.5 Resend (Email)
```env
RESEND_API_KEY=DdJeW9K4Leee3m1Fd19
```

## 4.6 Edge Function Secrets (i Supabase Dashboard)
```
AVANZA_USERNAME=[användarens Avanza-användarnamn]
AVANZA_PASSWORD=[användarens Avanza-lösenord]
AVANZA_TOTP_SECRET=[TOTP-hemlighet för 2FA]
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2NDM5NSwiZXhwIjoyMDgxMDQwMzk1fQ.HUYdv25XWe-hZwJcfgc4ikrHfxKWNAFgIqBGRYJZgac
FRED_API_KEY=7d27ae72f8b4c4b3ba81a86baf56ec36
RESEND_API_KEY=DdJeW9K4Leee3m1Fd19
```

---

# 5. AUTENTISERING

## 5.1 Auth-providers
```
- [x] Email/Password
```

## 5.2 Användarroller
```
user: Standardroll, tillgång till alla handelsfunktioner
admin: Kan hantera användare, se adminpanel, godkänna användare
```

## 5.3 Godkännandeflöde
```
1. Användare registrerar sig på /register
2. Profil skapas med status: 'pending'
3. Admin ser väntande användare i adminpanelen
4. Admin godkänner/avvisar
5. Godkända användare kan använda appen
6. Avvisade användare ser meddelande om avvisning
```

## 5.4 Skyddade routes
```
Alla routes utom:
- /login
- /register
- /reset-password
- /pending

/admin kräver roll: 'admin'
```

## 5.5 Förkonfigurerade Admin-konton
```
ADMINISTRATÖR 1:
Email: caterina.kullman@gmail.com
Password: Brentix1122!!
Roll: admin

ADMINISTRATÖR 2:
Email: mattias.kullman@gmail.com
Password: Brentix111222!!!
Roll: admin
```

> **OBS:** Dessa konton finns redan i Supabase och ska ha admin-roll tilldelad via user_roles-tabellen.

---

# 6. TREDJEPARTSINTEGRATIONER

## 6.1 Yahoo Finance API
```
Endpoint: Yahoo Finance API för BZ=F (Brent Crude)
Hämtar: open, high, low, close, volume
Frekvens: Varje minut via cron job
```

## 6.2 FRED API (Federal Reserve Economic Data)
```
URL: https://fredaccount.stlouisfed.org/apikey
API Key: 7d27ae72f8b4c4b3ba81a86baf56ec36
Användning: Ekonomiska indikatorer, makrodata
```

## 6.3 Resend (Email)
```
API Key: DdJeW9K4Leee3m1Fd19
Användning: Skicka notifikationer, godkännande-mail
```

## 6.4 Avanza Integration
```
Funktion: Handelsexekvering för svenska certifikat
Auth: Username + Password + TOTP (2FA)
TOTP: Custom implementation i Edge Function

Tillgängliga certifikat:
- BULL OLJA X15 AVA (ID: 2313155) - Default BULL
- BEAR OLJA X15 AVA (ID: 2313156) - Default BEAR
- BULL OLJA X10 AVA
- BEAR OLJA X10 AVA
- BULL OLJA X5 AVA
- BEAR OLJA X5 AVA
- BULL BRENT X10 VON
- BEAR BRENT X10 VON
- BULL BRENT X5 VON
- BEAR BRENT X5 VON
- BULL OLJA X8 NORDNET
- BEAR OLJA X8 NORDNET
```

---

# 7. SIDSTRUKTUR & ROUTING

## 7.1 Alla routes

```
/ (Dashboard)
├── Komponent: Index
├── Auth krävs: Ja
├── Beskrivning: Huvuddashboard med prisdata, signaler, handelsknappar

/login
├── Komponent: Login
├── Auth krävs: Nej
├── Beskrivning: Inloggning

/register
├── Komponent: Register
├── Auth krävs: Nej
├── Beskrivning: Registrering

/reset-password
├── Komponent: ResetPassword
├── Auth krävs: Nej
├── Beskrivning: Återställ lösenord

/pending
├── Komponent: PendingApproval
├── Auth krävs: Nej
├── Beskrivning: Väntar på godkännande

/admin
├── Komponent: Admin
├── Auth krävs: Ja (admin)
├── Beskrivning: Adminpanel med användarhantering

/signals
├── Komponent: Signals
├── Auth krävs: Ja
├── Beskrivning: Lista alla signaler

/trades
├── Komponent: Trades
├── Auth krävs: Ja
├── Beskrivning: Handelshistorik

/paper-history
├── Komponent: PaperHistory
├── Auth krävs: Ja
├── Beskrivning: Paper trading historik och analys

/analysis
├── Komponent: Analysis
├── Auth krävs: Ja
├── Beskrivning: Teknisk analys och avancerade verktyg

/history
├── Komponent: History
├── Auth krävs: Ja
├── Beskrivning: Historisk data och mönster

/historical-data
├── Komponent: HistoricalData
├── Auth krävs: Ja
├── Beskrivning: Historisk prisdata

/performance
├── Komponent: Performance
├── Auth krävs: Ja
├── Beskrivning: Prestanda och statistik

/reports
├── Komponent: Reports
├── Auth krävs: Ja
├── Beskrivning: Dagliga rapporter

/settings
├── Komponent: Settings
├── Auth krävs: Ja
├── Beskrivning: Användarinställningar

/rules
├── Komponent: Rules
├── Auth krävs: Ja
├── Beskrivning: Handelsregler och backtesting

/pairs
├── Komponent: Pairs
├── Auth krävs: Ja
├── Beskrivning: BULL/BEAR par-analys

/safety
├── Komponent: Safety
├── Auth krävs: Ja
├── Beskrivning: Säkerhetskontroller och conditional orders
```

## 7.2 Navigation/Meny-struktur

### Sidebar (grupperad)
```
ÖVERSIKT
■ Dashboard (/)
○ Signaler (/signals)

HANDEL
○ Trades (/trades)
○ Paper History (/paper-history)
○ Säkerhet (/safety)
○ BULL/BEAR (/pairs)

ANALYS
○ Prestanda (/performance)
○ Historik (/history)
○ Analys (/analysis)
○ Regler (/rules)

─────────────
○ Rapporter (/reports)
⚙ Inställningar (/settings)
```

---

# 8. KOMPONENTER

## 8.1 Dashboard-komponenter

### DualSignalCard
```
Visar två signalkort sida vid sida:
- BULL-signal (original signal)
- BEAR-signal (inverterad signal)

När BULL säger KÖP → BEAR säger SÄLJ
När BULL säger SÄLJ → BEAR säger KÖP
Sannolikheter inverteras
```

### FourWayTradeButtons
```
Fyra handelsknappar:
🐂 BULL: [KÖP BULL] [SÄLJ BULL]
🐻 BEAR: [KÖP BEAR] [SÄLJ BEAR]

Med rekommendationer:
- Oljan stiger → ✨ Köp BULL, ⚠️ Sälj BEAR
- Oljan faller → ✨ Köp BEAR, ⚠️ Sälj BULL
```

### AdjustablePrice
```
Inline Stop-Loss/Take-Profit redigering:
- Klickbar prisbox som expanderar
- +/- knappar (0.5% steg)
- Slider
- Live preview av beräknat pris
- Spara/Avbryt knappar
```

### PriceCard
```
Visar aktuellt pris med:
- Pris i USD
- 24h förändring
- High/Low
- Volym
```

### PriceChart
```
Candlestick/Line chart med Recharts
Visar historiska priser
```

### TechnicalIndicators
```
Visar alla tekniska indikatorer:
- RSI (14)
- MACD + Signal + Histogram
- Bollinger Bands
- SMA (5, 10, 20, 50)
```

### SignalCard
```
Enskilt signalkort med:
- Signal typ (BUY/SELL/HOLD)
- Styrka (STRONG/MODERATE/WEAK)
- Konfidensgrad
- Sannolikheter
- Entry/Target/StopLoss priser
- Resonemang
```

## 8.2 Layout-komponenter

### Header
```
Kompakt header:
[🛢️ $75.56 ↗+0.12%] [Just now 🔄] [⚙️] [📝 Paper ▼] [🔔] [👤]
```

### Sidebar
```
Grupperad navigation med collapsible sektioner
```

### MainLayout
```
Wrapper med Header + Sidebar + Content area
```

### MobileBottomNav + MobileDrawer
```
Mobil navigation
```

## 8.3 Settings-komponenter

### PreferredInstrumentsCard
```
Välj föredragna BULL/BEAR certifikat:
- Dropdown med alla certifikat
- Auto-matchning (samma hävstång/utgivare)
- Varning om par inte matchar
```

### InstrumentSelector
```
Dropdown för att välja certifikat
Visar: namn, hävstång, utgivare
```

---

# 9. AVANCERADE ANALYSVERKTYG

> **VIKTIGT:** Dessa 9 verktyg är kärnan i analyskapaciteten och ska implementeras exakt som beskrivet.

## 9.1 useFrequencyAnalyzer - Optimal Handelsfrekvens
```typescript
// Analyserar vilken tidsintervall som ger bäst resultat
// Testar: 1 min, 5 min, 15 min, 1 timme, 4 timmar, 1 dag

interface ToolResult {
  name: string;         // "Frekvensanalysator"
  score: number;        // -5 till +15
  confidence: number;   // 0-95%
  signal: "BUY" | "SELL" | "HOLD";
  reasoning: string;    // "Optimalt intervall: X (Score: Y/100)"
}

Logik:
1. Gruppera prisdata efter intervall
2. Simulera momentum-trades för varje intervall
3. Beräkna win rate, total return, noise ratio
4. Optimal score = (winRate * 0.4) + (return * 0.3) + ((1-noise) * 0.3)
```

## 9.2 useMomentumPulse - Momentum-detektor
```typescript
// Detekterar nuvarande momentum i marknaden

Beräknar:
- Rate of Change (ROC)
- Momentum acceleration/deceleration
- Styrka på nuvarande trend

Output:
- Score: -10 till +10
- Signal baserat på momentum-riktning
```

## 9.3 useVolatilityWindow - Volatilitetsfönster
```typescript
// Identifierar perioder med hög/låg volatilitet

Beräknar:
- Average True Range (ATR)
- Volatilitetsnivå relativt historiskt genomsnitt
- Optimal handelstid

Output:
- Volatilitetsstatus: HIGH/NORMAL/LOW
- Rekommendation om att handla eller vänta
```

## 9.4 useSmartExitOptimizer - Smart Exit
```typescript
// Optimerar take-profit och stop-loss nivåer

Analyserar:
- Historiska prisrörelser
- Support/Resistance nivåer
- Trailing stop effektivitet

Output:
- Rekommenderad take-profit %
- Rekommenderad stop-loss %
- Confidence i rekommendationerna
```

## 9.5 useReversalMeter - Vändningsmätare
```typescript
// Beräknar sannolikhet för prisvändning

Faktorer:
- RSI extrema nivåer
- Divergens mellan pris och indikatorer
- Historiska vändningsmönster

Output:
- Reversal probability: 0-100%
- Direction: UP/DOWN
- Confidence
```

## 9.6 useTradeTimingScore - Timing-poäng
```typescript
// Ger en sammanvägd timing-score för att handla nu

Väger samman:
- Alla tekniska indikatorer
- Momentum
- Volatilitet
- Mönster

Output:
- Score: 0-100
- Recommendation: TRADE_NOW / WAIT / AVOID
```

## 9.7 useCorrelationRadar - Korrelationsradar
```typescript
// Analyserar korrelation med relaterade marknader

Jämför med:
- S&P 500
- USD/SEK
- Naturgas
- Andra commodities

Output:
- Korrelationsstyrka per marknad
- Divergenser att uppmärksamma
```

## 9.8 useRiskPerMinute - Risk per minut
```typescript
// Beräknar aktuell risknivå baserat på volatilitet

Beräknar:
- Genomsnittlig rörelse per minut
- Max rörelse senaste timmen
- Risk i SEK per minut för given position

Output:
- Risk i SEK/min
- Risk-rating: LOW/MEDIUM/HIGH/EXTREME
```

## 9.9 useMicroPatternScanner - Mikromönster
```typescript
// Detekterar kortsiktiga mönster i prisdata

Letar efter:
- Micro double tops/bottoms
- Breakout patterns
- Consolidation patterns
- Spike patterns

Output:
- Detekterade mönster med confidence
- Trading-implikationer
```

---

# 10. DESIGN SYSTEM

## 10.1 Färgpalett (HSL)

### Light Mode
```css
:root {
  --background: 0 0% 98%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --primary: 160 84% 35%;          /* Grön - huvudfärg */
  --primary-foreground: 0 0% 100%;
  --secondary: 220 14% 96%;
  --muted: 220 14% 96%;
  --muted-foreground: 220 9% 46%;
  --destructive: 349 89% 55%;      /* Röd - sälj/bear */
  --success: 160 84% 35%;          /* Grön - köp/bull */
  --warning: 38 92% 50%;           /* Orange - hold/neutral */
  --border: 220 13% 91%;
  --radius: 0.75rem;
  
  /* Trading colors */
  --bullish: 160 84% 35%;
  --bearish: 349 89% 55%;
  --neutral: 38 92% 50%;
}
```

### Dark Mode
```css
.dark {
  --background: 222 47% 6%;
  --foreground: 210 40% 98%;
  --card: 222 47% 8%;
  --primary: 160 84% 39%;
  --destructive: 349 89% 60%;
  --success: 160 84% 39%;
  --bullish: 160 84% 39%;
  --bearish: 349 89% 60%;
}
```

## 10.2 Typografi
```css
Font-family sans: Inter, system-ui, sans-serif
Font-family heading: Inter, system-ui, sans-serif
Font-family mono: JetBrains Mono, monospace  /* För siffror/data */

h1: 2rem, font-weight 700
h2: 1.5rem, font-weight 600
h3: 1.25rem, font-weight 600
body: 1rem, font-weight 400
```

## 10.3 Effekter
```css
.glass-card {
  @apply bg-card/50 backdrop-blur-xl border border-border/50;
}

.glow-bullish {
  box-shadow: 0 0 20px hsl(var(--bullish) / 0.3);
}

.glow-bearish {
  box-shadow: 0 0 20px hsl(var(--bearish) / 0.3);
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

---

# 11. AFFÄRSLOGIK & FUNKTIONER

## 11.1 Signalgenerering
```
Trigger: Varje minut via cron job

Steg:
1. Hämta senaste pris från Yahoo Finance
2. Spara i price_data
3. Beräkna tekniska indikatorer på senaste 50 priser
4. Spara i technical_indicators
5. Utvärdera signalvillkor:
   - RSI < 30 → BUY signal
   - RSI > 70 → SELL signal
   - RSI < 20 → STRONG BUY
   - RSI > 80 → STRONG SELL
   - MACD crossover förstärker signal
6. Om villkor uppfylls → Skapa signal via create_signal_atomic()
```

## 11.2 Paper Trading
```
Flöde:
1. Användare klickar KÖP/SÄLJ
2. Kontrollera paper_trading_enabled = true
3. Beräkna quantity baserat på position_size_sek och pris
4. Skapa paper_trade med status 'OPEN'
5. Dra från paper_balance

Stängning:
1. Användare klickar SÄLJ på öppen position
2. Beräkna profit/loss
3. Uppdatera paper_balance
4. Sätt status = 'CLOSED'
```

## 11.3 Avanza-handel
```
Flöde:
1. Användare klickar KÖP/SÄLJ (ej paper mode)
2. Lägg till i trade_execution_queue
3. Edge function process-trade-queue körs varje minut
4. Logga in på Avanza (username + password + TOTP)
5. Placera order
6. Uppdatera status och execution_result
```

## 11.4 Conditional Orders
```
Typer:
- LIMIT: Köp/sälj vid specifikt pris
- STOP: Trigger vid pris, sedan market order
- STOP_LIMIT: Trigger vid pris, sedan limit order
- TRAILING_STOP: Dynamisk trigger som följer pris

Trailing Stop logik:
- SELL: Tracka peak price, trigger = peak × (1 - trailing_percent%)
- BUY: Tracka trough price, trigger = trough × (1 + trailing_percent%)
```

---

# 12. EDGE FUNCTIONS

## 12.1 fetch-brent-price
```
Trigger: Cron varje minut
Syfte: Hämta pris, beräkna indikatorer, generera signaler

Flöde:
1. Fetch från Yahoo Finance API (BZ=F)
2. INSERT i price_data
3. Hämta senaste 50 priser
4. Beräkna RSI, SMA, EMA, MACD, Bollinger Bands
5. INSERT i technical_indicators
6. Kontrollera signalvillkor
7. Om match → create_signal_atomic()
```

## 12.2 process-trade-queue
```
Trigger: Cron varje minut
Syfte: Exekvera väntande trades via Avanza

Flöde:
1. Hämta PENDING items från trade_execution_queue
2. För varje item:
   - Hämta Avanza-credentials från secrets
   - Generera TOTP-kod
   - Logga in
   - Placera order
   - Uppdatera status
```

## 12.3 process-conditional-orders
```
Trigger: Cron varje minut
Syfte: Kontrollera och exekvera conditional orders

Logik per ordertyp:
- LIMIT BUY: Trigga om pris <= limit_price
- LIMIT SELL: Trigga om pris >= limit_price
- STOP BUY: Trigga om pris >= trigger_price
- STOP SELL: Trigga om pris <= trigger_price
- TRAILING_STOP: Uppdatera peak/trough, kontrollera trigger
```

## 12.4 run-rule-backtest
```
Trigger: Manuell request
Syfte: Köra backtest på en handelsregel

Input: rule_id, start_date, end_date
Output: Trades, equity curve, statistik
```

## 12.5 detect-patterns
```
Trigger: Manuell/Scheduled
Syfte: Scanna historisk data för mönster
```

---

# 13. ADMINPANEL

## 13.1 Dashboard
```
Visa:
- Totalt antal användare
- Väntande godkännanden
- Aktiva signaler
- Systemstatus
```

## 13.2 Användarhantering
```
Funktioner:
- Lista alla användare
- Godkänn/Avvisa väntande
- Ändra roller
- Visa användarstatistik
```

---

# 14. FLERSPRÅKSSTÖD (i18n)

## 14.1 Konfiguration
```
⚠️ KRITISKT - SVENSKA TECKEN (å, ä, ö):
- Alla filer: UTF-8 encoding
- HTML: <meta charset="UTF-8">
- API: Content-Type: application/json; charset=utf-8

Bibliotek: react-i18next
Standardspråk: Svenska (sv)
Stöd för: Svenska (sv), Engelska (en)
```

## 14.2 Svenska översättningar (src/locales/sv/translation.json)
```json
{
  "common": {
    "save": "Spara",
    "cancel": "Avbryt",
    "delete": "Ta bort",
    "loading": "Laddar...",
    "error": "Ett fel uppstod"
  },
  "nav": {
    "dashboard": "Översikt",
    "signals": "Signaler",
    "trades": "Affärer",
    "analysis": "Analys",
    "settings": "Inställningar"
  },
  "trading": {
    "buy": "Köp",
    "sell": "Sälj",
    "hold": "Håll",
    "bull": "BULL",
    "bear": "BEAR",
    "openPosition": "Öppen position",
    "closePosition": "Stäng position"
  },
  "signals": {
    "strong": "STARK",
    "moderate": "MÅTTLIG", 
    "weak": "SVAG",
    "confidence": "Konfidens",
    "probability": "Sannolikhet"
  }
}
```

---

# 15. DEPLOYMENT & HOSTING

## 15.1 Konfiguration
```
Frontend: Vercel
Backend: Supabase (vaoddzhefpthybuglxfp)
Domän: brentix.se (www.brentix.se)
```

## 15.2 Supabase Project
```
Project URL: https://vaoddzhefpthybuglxfp.supabase.co
Project ID: vaoddzhefpthybuglxfp
Region: [Standard region]
```

## 15.3 Build-inställningar
```
Build command: npm run build
Output directory: dist
Install command: npm install
Node version: 20
```

## 15.4 Environment Variables för Vercel
```env
VITE_SUPABASE_URL=https://vaoddzhefpthybuglxfp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQzOTUsImV4cCI6MjA4MTA0MDM5NX0.cQTt4yIjMX3QyDBVsZzNPIsv3uoK7BHjEHC41_cr__4
VITE_SUPABASE_PROJECT_ID=vaoddzhefpthybuglxfp
```

## 15.5 Cron Jobs (Supabase)
```
fetch-brent-price: * * * * * (varje minut)
process-trade-queue: * * * * * (varje minut)
process-conditional-orders: * * * * * (varje minut)
```

---

# 16. KÄNDA BUGGAR ATT FIXA

```
1. PriceChart använder mock data
   - Behöver hämta riktig data från price_data
   - Prioritet: HÖG

2. MACD signal-beräkning
   - Behöver proper EMA av historiska MACD-värden
   - Prioritet: MEDIUM

3. Race condition i signalskapande
   - Behöver atomic operations (löst med create_signal_atomic)
   - Prioritet: HÖG
```

---

# 17. ÖNSKADE FÖRBÄTTRINGAR

```
1. Adminpanel - utökad
   - Mer statistik
   - Systemhälsa

2. Notifikationer
   - Push-notifikationer
   - Email vid viktiga signaler

3. Performance-optimering
   - Lazy loading av sidor
   - Optimerade queries
```

---

# 📎 CERTIFIKAT-DATABAS

```typescript
// src/constants/instruments.ts

export interface Instrument {
  id: string;
  name: string;
  fullName: string;
  type: "BULL" | "BEAR";
  leverage: number;
  issuer: string;
  isin: string;
}

export const OIL_INSTRUMENTS: Instrument[] = [
  { id: "2313155", name: "BULL OLJA X15 AVA", type: "BULL", leverage: 15, issuer: "Avanza" },
  { id: "2313156", name: "BEAR OLJA X15 AVA", type: "BEAR", leverage: 15, issuer: "Avanza" },
  { id: "...", name: "BULL OLJA X10 AVA", type: "BULL", leverage: 10, issuer: "Avanza" },
  { id: "...", name: "BEAR OLJA X10 AVA", type: "BEAR", leverage: 10, issuer: "Avanza" },
  { id: "...", name: "BULL OLJA X5 AVA", type: "BULL", leverage: 5, issuer: "Avanza" },
  { id: "...", name: "BEAR OLJA X5 AVA", type: "BEAR", leverage: 5, issuer: "Avanza" },
  { id: "...", name: "BULL BRENT X10 VON", type: "BULL", leverage: 10, issuer: "Vontobel" },
  { id: "...", name: "BEAR BRENT X10 VON", type: "BEAR", leverage: 10, issuer: "Vontobel" },
  { id: "...", name: "BULL BRENT X5 VON", type: "BULL", leverage: 5, issuer: "Vontobel" },
  { id: "...", name: "BEAR BRENT X5 VON", type: "BEAR", leverage: 5, issuer: "Vontobel" },
  { id: "...", name: "BULL OLJA X8 NORDNET", type: "BULL", leverage: 8, issuer: "Nordnet" },
  { id: "...", name: "BEAR OLJA X8 NORDNET", type: "BEAR", leverage: 8, issuer: "Nordnet" },
];

export const DEFAULT_BULL_ID = "2313155";
export const DEFAULT_BEAR_ID = "2313156";
```

---

# 🎯 INSTRUKTION TILL CLAUDE CODE

När du bygger detta projekt:

1. **Läs igenom HELA detta dokument först**
2. **Klona källkoden** från GitHub: https://github.com/caterinakullman-a11y/brentix
3. **Använd befintlig Supabase-instans**: https://vaoddzhefpthybuglxfp.supabase.co
4. **Kör alla migrations** för att skapa/uppdatera databasschema
5. **Implementera alla komponenter** enligt sektion 8
6. **Implementera alla 9 analysverktyg** enligt sektion 9 - KRITISKT
7. **Implementera design system** enligt sektion 10
8. **Skapa Edge Functions** enligt sektion 12
9. **Implementera i18n** med svenska som standard
10. **Fixa kända buggar** enligt sektion 16
11. **Deploy till Vercel** med rätt environment variables
12. **Koppla domän** brentix.se

**⚠️ KRITISKT - SVENSKA TECKEN:**
- Verifiera att å, ä, ö, Å, Ä, Ö fungerar korrekt i ALLA delar
- Alla filer ska vara UTF-8

**⚠️ ADMIN-KONTON REDAN SKAPADE:**
- caterina.kullman@gmail.com (admin)
- mattias.kullman@gmail.com (admin)

**Fråga INGA frågor - all information finns här.**

---

# 📋 SAMMANFATTNING AV ALLA CREDENTIALS

## Supabase
```
URL: https://vaoddzhefpthybuglxfp.supabase.co
Project ID: vaoddzhefpthybuglxfp
Database Password: DdJeW9K4Leee3m1Fd
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NjQzOTUsImV4cCI6MjA4MTA0MDM5NX0.cQTt4yIjMX3QyDBVsZzNPIsv3uoK7BHjEHC41_cr__4
Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhb2RkemhlZnB0aHlidWdseGZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ2NDM5NSwiZXhwIjoyMDgxMDQwMzk1fQ.HUYdv25XWe-hZwJcfgc4ikrHfxKWNAFgIqBGRYJZgac
Publishable: sb_publishable_PCQYXg--FQ4ytPARDSP8bg_31nzUAPg
Secret: sb_secret_gciPMPRda2nUUIPierr-VA_wU7evSuQ
```

## API Keys
```
FRED: 7d27ae72f8b4c4b3ba81a86baf56ec36
RESEND: DdJeW9K4Leee3m1Fd19
```

## Admin-konton
```
caterina.kullman@gmail.com / Brentix1122!!
mattias.kullman@gmail.com / Brentix111222!!!
```

## GitHub
```
https://github.com/caterinakullman-a11y/brentix
```

## Domän
```
brentix.se
```

---

*Genererat: 2025-12-14*
*Uppdaterat med kompletta credentials*
*Källa: Lovable export + Custom Knowledge v3*
