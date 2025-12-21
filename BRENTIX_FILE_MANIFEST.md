# BRENTIX FILE MANIFEST
> Generated: 2025-12-21
> Total TypeScript/TSX Lines: ~40,260

---

## PROJECT STRUCTURE OVERVIEW

```
brentix-main/
├── src/                    # Source code (React + TypeScript)
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── integrations/       # External service integrations
│   ├── locales/            # i18n translations (EN/SV)
│   ├── constants/          # App constants
│   ├── lib/                # Utility libraries
│   └── types/              # TypeScript type definitions
├── supabase/               # Supabase configuration
│   ├── functions/          # Edge Functions (Deno)
│   └── migrations/         # Database migrations
├── migrations/             # Legacy SQL migrations
├── public/                 # Static assets
└── [config files]          # Build/lint/TS configs
```

---

## MAIN FOLDER DESCRIPTIONS

### `/src/components/` (96 files)
React UI components organized by feature area:
- **analysis/** - Advanced trading analysis tools
- **auth/** - Authentication & route protection
- **dashboard/** - Main dashboard widgets (price cards, charts, signals)
- **help/** - In-app help chat system
- **history/** - Historical price charts and patterns
- **layout/** - App layout (Header, Sidebar, MainLayout)
- **pairs/** - Instrument pair correlation analysis
- **paper-history/** - Paper trading analysis
- **recyclex/** - RecycleX automated trading system
- **rules/** - Trading rule builder and analysis
- **safety/** - Safety controls (stop-loss, conditional orders)
- **settings/** - User settings panels
- **trading/** - Trade execution components
- **ui/** - Shadcn/Radix UI primitives (50+ components)

### `/src/hooks/` (50 files)
Custom React hooks for state management and data fetching:
- **analysis/** - Advanced analysis hooks (momentum, patterns, timing)
- **prisanalys/** - Price analysis specific hooks
- Core hooks: useAuth, useSignals, useTradingRules, useBacktest, etc.

### `/src/pages/` (22 files)
Application pages/routes:
- Dashboard, Trading, Rules, Signals, Safety
- Admin, Settings, Performance, Reports
- Prisanalys sub-pages (AI, Backtest, Statistics)

### `/supabase/functions/` (12 Edge Functions)
Deno-based serverless functions for backend logic.

### `/supabase/migrations/` (36 files)
Database schema migrations for Supabase PostgreSQL.

---

## COMPLETE FILE LIST WITH LINE COUNTS

### Configuration Files
| File | Lines |
|------|-------|
| brentix-main/package.json | 90 |
| brentix-main/package-lock.json | 7,161 |
| brentix-main/tsconfig.json | 16 |
| brentix-main/tsconfig.app.json | 30 |
| brentix-main/tsconfig.node.json | 22 |
| brentix-main/vite.config.ts | 35 |
| brentix-main/tailwind.config.ts | 119 |
| brentix-main/postcss.config.js | 6 |
| brentix-main/eslint.config.js | 26 |
| brentix-main/components.json | 20 |
| brentix-main/vercel.json | 9 |
| brentix-main/index.html | 24 |

### Source - Components
| File | Lines |
|------|-------|
| src/App.tsx | 254 |
| src/main.tsx | 6 |
| src/i18n.ts | 34 |
| src/index.css | 211 |
| src/vite-env.d.ts | 1 |
| src/lib/utils.ts | 6 |
| src/components/AutoTradingConfirmModal.tsx | 64 |
| src/components/ErrorBoundary.tsx | 95 |
| src/components/LanguageSelector.tsx | 49 |
| src/components/NavLink.tsx | 28 |
| src/components/NetworkStatusBanner.tsx | 36 |
| src/components/NotificationBell.tsx | 128 |
| src/components/PaperTradingBadge.tsx | 28 |
| src/components/StaleDataIndicator.tsx | 38 |
| src/components/ThemeToggle.tsx | 31 |
| src/components/analysis/AdvancedToolsPanel.tsx | 234 |
| src/components/auth/ProtectedRoute.tsx | 85 |
| src/components/dashboard/AdjustablePrice.tsx | 151 |
| src/components/dashboard/AdminPendingWidget.tsx | 72 |
| src/components/dashboard/DashboardControls.tsx | 122 |
| src/components/dashboard/DashboardSkeleton.tsx | 69 |
| src/components/dashboard/DualSignalCard.tsx | 374 |
| src/components/dashboard/PriceCard.tsx | 108 |
| src/components/dashboard/PriceChart.tsx | 356 |
| src/components/dashboard/PriceCollectionWidget.tsx | 126 |
| src/components/dashboard/RuleInsightsWidget.tsx | 150 |
| src/components/dashboard/SignalCard.tsx | 245 |
| src/components/dashboard/StatsCards.tsx | 124 |
| src/components/dashboard/TechnicalIndicators.tsx | 164 |
| src/components/dashboard/TechnicalIndicatorsCompact.tsx | 133 |
| src/components/help/HelpChat.tsx | 360 |
| src/components/help/helpKnowledge.ts | 631 |
| src/components/help/index.ts | 3 |
| src/components/history/ChartTimeControls.tsx | 238 |
| src/components/history/HistoricalPriceChart.tsx | 103 |
| src/components/history/PatternDefinitionsList.tsx | 85 |
| src/components/history/PatternList.tsx | 122 |
| src/components/history/PriceStatisticsCard.tsx | 89 |
| src/components/layout/Breadcrumbs.tsx | 56 |
| src/components/layout/Header.tsx | 349 |
| src/components/layout/MainLayout.tsx | 54 |
| src/components/layout/MobileBottomNav.tsx | 43 |
| src/components/layout/MobileDrawer.tsx | 227 |
| src/components/layout/Sidebar.tsx | 213 |
| src/components/pairs/CorrelationAnalysis.tsx | 150 |
| src/components/paper-history/PaperTradeAnalysis.tsx | 269 |
| src/components/paper-history/index.ts | 1 |
| src/components/recyclex/RecycleXBuilderForm.tsx | 437 |
| src/components/recyclex/RecycleXRuleCard.tsx | 370 |
| src/components/rules/BacktestResultsInline.tsx | 61 |
| src/components/rules/EquityCurveChart.tsx | 91 |
| src/components/rules/RuleAnalysisPanel.tsx | 406 |
| src/components/rules/RuleBuilderModal.tsx | 696 |
| src/components/rules/RuleCard.tsx | 235 |
| src/components/safety/ConditionalOrderForm.tsx | 392 |
| src/components/safety/ConditionalOrdersList.tsx | 312 |
| src/components/safety/NotificationSettings.tsx | 186 |
| src/components/safety/TrailingStopChart.tsx | 223 |
| src/components/settings/AppearanceSettingsCard.tsx | 96 |
| src/components/settings/AvanzaSettingsCard.tsx | 242 |
| src/components/settings/CapitalSettingsCard.tsx | 62 |
| src/components/settings/DataExportCard.tsx | 222 |
| src/components/settings/InstrumentSelector.tsx | 222 |
| src/components/settings/NotificationSettingsCard.tsx | 88 |
| src/components/settings/PreferredInstrumentsCard.tsx | 212 |
| src/components/settings/QueueStatusCard.tsx | 162 |
| src/components/settings/RiskManagementCard.tsx | 104 |
| src/components/settings/SetupGuideModal.tsx | 350 |
| src/components/settings/StorageManagementCard.tsx | 169 |
| src/components/settings/ToolSettingsCard.tsx | 116 |
| src/components/settings/TradingModeCard.tsx | 170 |
| src/components/trading/FourWayTradeButtons.tsx | 232 |
| src/components/trading/ManualTradeModal.tsx | 401 |
| src/components/trading/OpenPositions.tsx | 265 |
| src/components/trading/QuickTradeButtons.tsx | 198 |
| src/components/trading/TradeButtons.tsx | 260 |
| src/components/trading/index.ts | 5 |

### Source - UI Components (Shadcn/Radix)
| File | Lines |
|------|-------|
| src/components/ui/accordion.tsx | 52 |
| src/components/ui/alert-dialog.tsx | 104 |
| src/components/ui/alert.tsx | 43 |
| src/components/ui/aspect-ratio.tsx | 5 |
| src/components/ui/avatar.tsx | 38 |
| src/components/ui/badge.tsx | 29 |
| src/components/ui/breadcrumb.tsx | 90 |
| src/components/ui/button.tsx | 47 |
| src/components/ui/calendar.tsx | 54 |
| src/components/ui/card.tsx | 43 |
| src/components/ui/carousel.tsx | 224 |
| src/components/ui/chart.tsx | 303 |
| src/components/ui/checkbox.tsx | 26 |
| src/components/ui/collapsible-section.tsx | 50 |
| src/components/ui/collapsible.tsx | 9 |
| src/components/ui/command.tsx | 132 |
| src/components/ui/context-menu.tsx | 178 |
| src/components/ui/dialog.tsx | 102 |
| src/components/ui/drawer.tsx | 87 |
| src/components/ui/dropdown-menu.tsx | 179 |
| src/components/ui/empty-state.tsx | 27 |
| src/components/ui/form.tsx | 129 |
| src/components/ui/hover-card.tsx | 27 |
| src/components/ui/input-otp.tsx | 61 |
| src/components/ui/input.tsx | 22 |
| src/components/ui/label.tsx | 17 |
| src/components/ui/menubar.tsx | 207 |
| src/components/ui/navigation-menu.tsx | 120 |
| src/components/ui/pagination.tsx | 81 |
| src/components/ui/popover.tsx | 29 |
| src/components/ui/progress.tsx | 23 |
| src/components/ui/radio-group.tsx | 36 |
| src/components/ui/resizable.tsx | 37 |
| src/components/ui/scroll-area.tsx | 38 |
| src/components/ui/select.tsx | 143 |
| src/components/ui/separator.tsx | 20 |
| src/components/ui/sheet.tsx | 107 |
| src/components/ui/sidebar.tsx | 637 |
| src/components/ui/skeleton.tsx | 7 |
| src/components/ui/slider.tsx | 23 |
| src/components/ui/sonner.tsx | 27 |
| src/components/ui/switch.tsx | 27 |
| src/components/ui/table.tsx | 72 |
| src/components/ui/tabs.tsx | 53 |
| src/components/ui/textarea.tsx | 21 |
| src/components/ui/toast.tsx | 111 |
| src/components/ui/toaster.tsx | 24 |
| src/components/ui/toggle-group.tsx | 49 |
| src/components/ui/toggle.tsx | 37 |
| src/components/ui/tooltip.tsx | 28 |
| src/components/ui/trading-mode-toggle.tsx | 65 |
| src/components/ui/use-toast.ts | 3 |

### Source - Hooks
| File | Lines |
|------|-------|
| src/hooks/use-mobile.tsx | 27 |
| src/hooks/use-toast.ts | 186 |
| src/hooks/useActiveSignalsCount.ts | 31 |
| src/hooks/useAdvancedAnalysis.ts | 272 |
| src/hooks/useApiCall.ts | 145 |
| src/hooks/useAuth.ts | 130 |
| src/hooks/useAutoTrading.ts | 49 |
| src/hooks/useBacktest.ts | 505 |
| src/hooks/useDashboardLayout.ts | 137 |
| src/hooks/useDataExport.ts | 94 |
| src/hooks/useHistoricalPrices.ts | 127 |
| src/hooks/useInstruments.ts | 193 |
| src/hooks/useManualTrade.ts | 273 |
| src/hooks/useNetworkStatus.ts | 45 |
| src/hooks/useNotifications.ts | 120 |
| src/hooks/usePaperTrades.ts | 143 |
| src/hooks/usePatterns.ts | 146 |
| src/hooks/usePerformanceData.ts | 200 |
| src/hooks/usePriceCollection.ts | 105 |
| src/hooks/usePriceData.ts | 63 |
| src/hooks/usePriceHistory.ts | 287 |
| src/hooks/usePushNotifications.ts | 52 |
| src/hooks/useQueueStats.ts | 85 |
| src/hooks/useRealtimeSubscriptions.ts | 144 |
| src/hooks/useRecycleX.ts | 506 |
| src/hooks/useRuleAnalysis.ts | 330 |
| src/hooks/useRuleBacktest.ts | 215 |
| src/hooks/useSafetyControls.ts | 271 |
| src/hooks/useSignals.ts | 85 |
| src/hooks/useStorageStatus.ts | 167 |
| src/hooks/useTechnicalIndicators.ts | 51 |
| src/hooks/useTodayStats.ts | 80 |
| src/hooks/useTradingRules.ts | 210 |
| src/hooks/useUserSettings.ts | 174 |
| src/hooks/analysis/index.ts | 9 |
| src/hooks/analysis/useCorrelationRadar.ts | 82 |
| src/hooks/analysis/useFrequencyAnalyzer.ts | 157 |
| src/hooks/analysis/useMicroPatternScanner.ts | 191 |
| src/hooks/analysis/useMomentumPulse.ts | 65 |
| src/hooks/analysis/useReversalMeter.ts | 136 |
| src/hooks/analysis/useRiskPerMinute.ts | 94 |
| src/hooks/analysis/useSmartExitOptimizer.ts | 135 |
| src/hooks/analysis/useTradeTimingScore.ts | 121 |
| src/hooks/analysis/useVolatilityWindow.ts | 79 |
| src/hooks/prisanalys/useHistoricalData.ts | 180 |
| src/hooks/prisanalys/useLivePrice.ts | 137 |
| src/hooks/prisanalys/usePrisanalysBacktest.ts | 464 |
| src/hooks/prisanalys/useStatistics.ts | 291 |

### Source - Pages
| File | Lines |
|------|-------|
| src/pages/Admin.tsx | 608 |
| src/pages/Analysis.tsx | 86 |
| src/pages/HistoricalData.tsx | 266 |
| src/pages/History.tsx | 304 |
| src/pages/Index.tsx | 299 |
| src/pages/Login.tsx | 363 |
| src/pages/NotFound.tsx | 24 |
| src/pages/Pairs.tsx | 309 |
| src/pages/PaperHistory.tsx | 351 |
| src/pages/PendingApproval.tsx | 57 |
| src/pages/Performance.tsx | 462 |
| src/pages/Register.tsx | 278 |
| src/pages/Reports.tsx | 184 |
| src/pages/ResetPassword.tsx | 205 |
| src/pages/Rules.tsx | 230 |
| src/pages/Safety.tsx | 342 |
| src/pages/Settings.tsx | 256 |
| src/pages/Signals.tsx | 167 |
| src/pages/Trades.tsx | 294 |
| src/pages/prisanalys/AI.tsx | 587 |
| src/pages/prisanalys/Backtest.tsx | 508 |
| src/pages/prisanalys/Dashboard.tsx | 423 |
| src/pages/prisanalys/Historik.tsx | 377 |
| src/pages/prisanalys/Regler.tsx | 679 |
| src/pages/prisanalys/Statistik.tsx | 447 |

### Source - Other
| File | Lines |
|------|-------|
| src/integrations/supabase/client.ts | 16 |
| src/integrations/supabase/types.ts | 2,225 |
| src/constants/instruments.ts | 258 |
| src/constants/recyclex.ts | 165 |
| src/constants/trading.ts | 117 |
| src/types/recyclex.ts | 214 |
| src/locales/en/translation.json | 681 |
| src/locales/sv/translation.json | 681 |

### Supabase Edge Functions
| Function | Lines |
|----------|-------|
| supabase/functions/analyze-paper-trades/index.ts | 225 |
| supabase/functions/backfill-yahoo-data/index.ts | 214 |
| supabase/functions/detect-patterns/index.ts | 418 |
| supabase/functions/export-price-data/index.ts | 296 |
| supabase/functions/fetch-brent-price/index.ts | 404 |
| supabase/functions/fetch-historical-data/index.ts | 137 |
| supabase/functions/process-conditional-orders/index.ts | 312 |
| supabase/functions/process-trade-queue/index.ts | 647 |
| supabase/functions/recalculate-rule-stats/index.ts | 413 |
| supabase/functions/run-rule-backtest/index.ts | 428 |
| supabase/functions/send-approval-notification/index.ts | 139 |
| supabase/functions/send-signal-notification/index.ts | 191 |

### Database Migrations
| File | Lines |
|------|-------|
| migrations/01_core_tables.sql | 94 |
| migrations/02_additional_tables.sql | 133 |
| migrations/03_rls_policies.sql | 49 |
| migrations/04_functions_triggers.sql | 37 |
| migrations/05_trade_queue.sql | 95 |
| migrations/06_profiles_roles.sql | 109 |
| migrations/07_paper_trading.sql | 116 |
| migrations/08_patterns_history.sql | 77 |
| migrations/09_trading_rules.sql | 154 |
| migrations/10_safety_advanced.sql | 192 |
| migrations/COMBINED_ALL_MIGRATIONS.sql | 1,122 |
| database_migrations.sql | 1,861 |
| supabase/migrations/*.sql (36 files) | ~2,500 |

### Documentation
| File | Lines |
|------|-------|
| brentix-main/README.md | 73 |
| brentix-main/SECURITY_REPORT.md | 100 |
| docs/RecycleX-Specification-v2.md | - |
| BRENTIX_MASTERSCRIPT_KOMPLETT.md | - |

---

## ENVIRONMENT VARIABLES REQUIRED

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...your-anon-key

# Used in Edge Functions (set in Supabase dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...your-anon-key

# Optional - For Avanza integration
# AVANZA_USERNAME=
# AVANZA_PASSWORD=
# AVANZA_TOTP_SECRET=
```

---

## EXTERNAL DEPENDENCIES

### Production Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.87.1 | Database & Auth |
| @tanstack/react-query | ^5.83.0 | Data fetching/caching |
| react | ^18.3.1 | UI Framework |
| react-dom | ^18.3.1 | React DOM |
| react-router-dom | ^6.30.1 | Routing |
| recharts | ^2.15.4 | Charts/Graphs |
| i18next | ^25.7.3 | Internationalization |
| react-i18next | ^16.5.0 | React i18n bindings |
| i18next-browser-languagedetector | ^8.2.0 | Language detection |
| date-fns | ^3.6.0 | Date utilities |
| zod | ^3.25.76 | Schema validation |
| react-hook-form | ^7.61.1 | Form handling |
| @hookform/resolvers | ^3.10.0 | Form validation |
| lucide-react | ^0.462.0 | Icons |
| framer-motion | ^12.23.26 | Animations |
| next-themes | ^0.3.0 | Theme management |
| sonner | ^1.7.4 | Toast notifications |
| cmdk | ^1.1.1 | Command palette |
| vaul | ^0.9.9 | Drawer component |
| react-day-picker | ^8.10.1 | Date picker |
| react-helmet-async | ^2.0.5 | Document head |
| react-resizable-panels | ^2.1.9 | Resizable panels |
| embla-carousel-react | ^8.6.0 | Carousel |
| input-otp | ^1.4.2 | OTP input |
| class-variance-authority | ^0.7.1 | CSS variants |
| clsx | ^2.1.1 | Class utilities |
| tailwind-merge | ^2.6.0 | Tailwind merge |
| tailwindcss-animate | ^1.0.7 | Tailwind animations |
| @radix-ui/* | Various | UI primitives (20+ packages) |

### Development Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^5.4.19 | Build tool |
| typescript | ^5.8.3 | TypeScript |
| tailwindcss | ^3.4.17 | CSS Framework |
| postcss | ^8.5.6 | CSS processing |
| autoprefixer | ^10.4.21 | CSS prefixes |
| eslint | ^9.32.0 | Linting |
| @vitejs/plugin-react-swc | ^3.11.0 | React SWC plugin |
| @tailwindcss/typography | ^0.5.16 | Typography plugin |
| pg | ^8.16.3 | PostgreSQL client |
| lovable-tagger | ^1.1.13 | Build tagging |

---

## SUPABASE EDGE FUNCTIONS

| Function | Description |
|----------|-------------|
| `analyze-paper-trades` | Analyzes paper trading performance |
| `backfill-yahoo-data` | Backfills historical price data from Yahoo |
| `detect-patterns` | Pattern detection in price data |
| `export-price-data` | Exports price data to various formats |
| `fetch-brent-price` | Fetches current Brent crude price |
| `fetch-historical-data` | Fetches historical price data |
| `process-conditional-orders` | Processes conditional trade orders |
| `process-trade-queue` | Processes queued trades |
| `recalculate-rule-stats` | Recalculates trading rule statistics |
| `run-rule-backtest` | Runs backtests on trading rules |
| `send-approval-notification` | Sends admin approval notifications |
| `send-signal-notification` | Sends trading signal notifications |

---

## DATABASE TABLES

### Core Trading Tables
- `price_data` - Real-time and historical price data
- `signals` - Trading signals (BULL/BEAR)
- `trades` - Executed trades
- `trading_rules` - User-defined trading rules
- `instruments` - Trading instruments

### User & Auth Tables
- `profiles` - User profiles
- `user_roles` - User role assignments
- `user_settings` - User preferences
- `user_instrument_pairs` - User instrument preferences

### Analysis Tables
- `patterns` - Detected price patterns
- `pattern_definitions` - Pattern type definitions
- `pattern_occurrences` - Pattern instances
- `historical_prices` - Historical price archive
- `technical_indicators` - Calculated indicators

### Paper Trading Tables
- `paper_trades` - Simulated trades
- `backtest_runs` - Backtest sessions
- `equity_curve` - Equity curve data

### RecycleX Tables
- `recyclex_rules` - RecycleX automated rules
- `recyclex_cycles` - Trading cycles
- `recyclex_positions` - Open positions
- `recyclex_suggestions` - AI suggestions

### Safety & Automation Tables
- `conditional_orders` - Conditional orders
- `emergency_stops` - Emergency stop settings
- `auto_triggers` - Automated triggers
- `trade_execution_queue` - Trade queue

### Notification Tables
- `notifications` - User notifications
- `notification_settings_global` - Global settings
- `notification_log` - Notification history
- `push_subscriptions` - Push notification subs
- `price_alerts` - Price alert rules

### Performance Tables
- `rule_performance_stats` - Rule performance
- `rule_combination_stats` - Rule combinations
- `rule_recommendations` - AI recommendations
- `rule_backtest_results` - Backtest results
- `trade_rule_snapshot` - Trade snapshots

### System Tables
- `error_logs` - Error logging
- `daily_reports` - Daily summaries
- `market_events` - Market events
- `ml_predictions` - ML model predictions
- `ml_model_status` - ML model status
- `ai_suggestions` - AI suggestions
- `data_exports` - Export history
- `storage_settings` - Storage config
- `analysis_tool_settings` - Tool settings
- `frequency_analysis_results` - Frequency analysis
- `instrument_pairs` - Instrument pairs
- `price_collection_status` - Collection status

---

## TOTAL FILE COUNTS

| Category | Count |
|----------|-------|
| TypeScript/TSX files | ~170 |
| SQL migration files | ~46 |
| JSON files | 5 |
| CSS files | 1 |
| HTML files | 1 |
| Markdown files | 5 |
| Config files | 8 |
| **Total Source Files** | **~236** |
| **Total Lines (TS/TSX)** | **~40,260** |

---

*This manifest was auto-generated for project analysis purposes.*
