// Signal types
export const SIGNAL_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL',
  HOLD: 'HOLD',
} as const;

export type SignalType = typeof SIGNAL_TYPES[keyof typeof SIGNAL_TYPES];

// Signal strengths
export const SIGNAL_STRENGTHS = {
  STRONG: 'STRONG',
  MODERATE: 'MODERATE',
  WEAK: 'WEAK',
} as const;

export type SignalStrength = typeof SIGNAL_STRENGTHS[keyof typeof SIGNAL_STRENGTHS];

// RSI thresholds
export const RSI_THRESHOLDS = {
  OVERSOLD: 30,
  OVERBOUGHT: 70,
  EXTREME_OVERSOLD: 20,
  EXTREME_OVERBOUGHT: 80,
} as const;

// Trade statuses
export const TRADE_STATUSES = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type TradeStatus = typeof TRADE_STATUSES[keyof typeof TRADE_STATUSES];

// Order types
export const ORDER_TYPES = {
  LIMIT: 'LIMIT',
  STOP: 'STOP',
  STOP_LIMIT: 'STOP_LIMIT',
  TRAILING_STOP: 'TRAILING_STOP',
} as const;

export type OrderType = typeof ORDER_TYPES[keyof typeof ORDER_TYPES];

// Order directions
export const ORDER_DIRECTIONS = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export type OrderDirection = typeof ORDER_DIRECTIONS[keyof typeof ORDER_DIRECTIONS];

// Order statuses
export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  TRIGGERED: 'TRIGGERED',
  EXECUTED: 'EXECUTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

// Queue statuses
export const QUEUE_STATUSES = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type QueueStatus = typeof QUEUE_STATUSES[keyof typeof QUEUE_STATUSES];

// User profile statuses
export const PROFILE_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ProfileStatus = typeof PROFILE_STATUSES[keyof typeof PROFILE_STATUSES];

// Default trading values
export const TRADING_DEFAULTS = {
  INITIAL_CAPITAL_SEK: 10000,
  PAPER_BALANCE: 100000,
  STOP_LOSS_PERCENT: 2,
  TAKE_PROFIT_PERCENT: 1,
  MAX_POSITION_SIZE_PERCENT: 10,
  POSITION_SIZE_SEK: 1000,
  DEFAULT_INSTRUMENT_ID: '2313155', // BULL OLJA X15 AVA
} as const;

// Time ranges for charts
export const TIME_RANGES = {
  ONE_HOUR: '1H',
  FOUR_HOURS: '4H',
  ONE_DAY: '1D',
  ONE_WEEK: '1W',
  ONE_MONTH: '1M',
} as const;

export type TimeRange = typeof TIME_RANGES[keyof typeof TIME_RANGES];

// Date range presets for historical data
export const DATE_RANGE_PRESETS = {
  ONE_MONTH: '1M',
  THREE_MONTHS: '3M',
  SIX_MONTHS: '6M',
  ONE_YEAR: '1Y',
  FIVE_YEARS: '5Y',
  TEN_YEARS: '10Y',
  ALL: 'ALL',
} as const;

export type DateRangePreset = typeof DATE_RANGE_PRESETS[keyof typeof DATE_RANGE_PRESETS];
