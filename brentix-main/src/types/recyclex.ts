// RecycleX Types
// Automated trading strategy for Bull & Bear certificates

// ============================================
// Enums / Union Types
// ============================================

export type RecycleXType = 'BULL' | 'BEAR';

export type RecycleXStatus =
  | 'INACTIVE'   // Rule created, not started (manual start mode)
  | 'WAITING'    // Waiting for auto-start price or reference price
  | 'ACTIVE'     // Currently running a cycle
  | 'COMPLETED'  // All target cycles completed
  | 'STOPPED'    // Manually stopped by user
  | 'PAUSED';    // Paused due to error or manual pause

export type RecycleXStartMode = 'MANUAL' | 'AUTO';

export type CapitalMode =
  | 'COMPOUND'  // Roll profits into next cycle
  | 'FIXED';    // Use fixed capital each cycle

export type CycleRestartMode =
  | 'CURRENT_PRICE'        // Start immediately with current price as reference
  | 'WAIT_FOR_REFERENCE'   // Wait for price to return to original reference
  | 'ADJUSTED';            // Use previous target price as new reference

export type PositionStatus = 'PENDING' | 'OPEN' | 'CLOSING' | 'CLOSED';

export type ClosedReason =
  | 'TARGET'       // Hit target price
  | 'STOPLOSS'     // Hit stop-loss price
  | 'TIMEOUT'      // Max cycle duration exceeded
  | 'MARKET_CLOSE' // Closed before market close
  | 'MANUAL';      // Manually closed by user

export type CycleResult = 'WIN' | 'LOSS' | 'TIMEOUT' | 'MANUAL';

// ============================================
// Config & State Interfaces
// ============================================

export interface RecycleXConfig {
  referencePrice: number;
  capital: number;
  orderCount: number;
  orderSpread: number;
  targetPercent: number;
  stopLossPercent: number;
  targetCycles: number;
  capitalMode: CapitalMode;
  cycleRestartMode: CycleRestartMode;
  cycleRestartTolerance: number;
  feePerTrade: number;
  feePercent: number;
  maxCycleDuration: number | null;
  closeBeforeMarketClose: boolean;
  closeBeforeMinutes: number;
}

export interface RecycleXState {
  currentCycle: number;
  completedCycles: number;
  totalProfit: number;
  totalFees: number;
  currentCapital: number;
  initialCapital: number;
  lastError: string | null;
}

// ============================================
// Main Entities
// ============================================

export interface RecycleXRule {
  id: string;
  user_id: string;
  name: string;
  type: RecycleXType;
  status: RecycleXStatus;
  start_mode: RecycleXStartMode;
  auto_start_price: number | null;
  auto_start_tolerance: number;
  config: RecycleXConfig;
  state: RecycleXState;
  linked_rule_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecycleXPosition {
  id: string;
  rule_id: string;
  order_index: number;
  expected_buy_price: number | null;
  actual_buy_price: number | null;
  quantity: number | null;
  invested_amount: number | null;
  status: PositionStatus;
  target_price: number | null;
  stop_loss_price: number | null;
  sell_price: number | null;
  gross_profit: number | null;
  fees: number | null;
  net_profit: number | null;
  closed_reason: ClosedReason | null;
  buy_filled_at: string | null;
  sell_filled_at: string | null;
  created_at: string;
}

export interface RecycleXCycle {
  id: string;
  rule_id: string;
  cycle_number: number;
  start_time: string | null;
  end_time: string | null;
  start_capital: number | null;
  end_capital: number | null;
  gross_profit: number | null;
  fees: number | null;
  net_profit: number | null;
  profit_percent: number | null;
  result: CycleResult | null;
  reference_price: number | null;
  positions_snapshot: RecycleXPosition[] | null;
}

export interface RecycleXSuggestion {
  id: string;
  user_id: string;
  triggered_by: string;
  suggested_type: RecycleXType;
  suggested_config: Partial<RecycleXConfig> | null;
  message: string | null;
  dismissed: boolean;
  created_at: string;
}

// ============================================
// Input Types for Mutations
// ============================================

export interface CreateRecycleXRuleInput {
  name: string;
  type: RecycleXType;
  start_mode: RecycleXStartMode;
  auto_start_price?: number | null;
  auto_start_tolerance?: number;
  config: Partial<RecycleXConfig> & {
    capital: number;
    targetPercent?: number;
    stopLossPercent?: number;
    targetCycles?: number;
  };
}

export interface UpdateRecycleXRuleInput {
  id: string;
  name?: string;
  status?: RecycleXStatus;
  auto_start_price?: number | null;
  auto_start_tolerance?: number;
  config?: Partial<RecycleXConfig>;
  state?: Partial<RecycleXState>;
}

// ============================================
// Helper Types
// ============================================

export interface RecycleXRuleWithCategory extends RecycleXRule {
  ruleCategory: 'recyclex';
}

export interface RecycleXStats {
  totalRules: number;
  activeRules: number;
  completedRules: number;
  totalProfit: number;
  totalFees: number;
  winRate: number;
  totalCycles: number;
}

// Default config values
export const DEFAULT_RECYCLEX_CONFIG: RecycleXConfig = {
  referencePrice: 0,
  capital: 10000,
  orderCount: 1,
  orderSpread: 0,
  targetPercent: 25.71,
  stopLossPercent: 10,
  targetCycles: 28,
  capitalMode: 'COMPOUND',
  cycleRestartMode: 'CURRENT_PRICE',
  cycleRestartTolerance: 0.2,
  feePerTrade: 0,
  feePercent: 0,
  maxCycleDuration: null,
  closeBeforeMarketClose: false,
  closeBeforeMinutes: 15,
};

export const DEFAULT_RECYCLEX_STATE: RecycleXState = {
  currentCycle: 0,
  completedCycles: 0,
  totalProfit: 0,
  totalFees: 0,
  currentCapital: 0,
  initialCapital: 0,
  lastError: null,
};
