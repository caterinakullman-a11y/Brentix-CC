// RecycleX Constants
// Default values and configuration options

export const RECYCLEX_DEFAULTS = {
  TARGET_PERCENT: 25.71,
  STOP_LOSS_PERCENT: 10,
  TARGET_CYCLES: 28,
  CAPITAL: 10000,
  ORDER_COUNT: 1,
  ORDER_SPREAD: 0,
  AUTO_START_TOLERANCE: 0.2,
  CYCLE_RESTART_TOLERANCE: 0.2,
  CLOSE_BEFORE_MINUTES: 15,
  FEE_PER_TRADE: 0,
  FEE_PERCENT: 0,
} as const;

export const RECYCLEX_TYPE = {
  BULL: 'BULL',
  BEAR: 'BEAR',
} as const;

export const RECYCLEX_STATUS = {
  INACTIVE: 'INACTIVE',
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  STOPPED: 'STOPPED',
  PAUSED: 'PAUSED',
} as const;

export const RECYCLEX_START_MODE = {
  MANUAL: 'MANUAL',
  AUTO: 'AUTO',
} as const;

export const CAPITAL_MODE = {
  COMPOUND: 'COMPOUND',
  FIXED: 'FIXED',
} as const;

export const CYCLE_RESTART_MODE = {
  CURRENT_PRICE: 'CURRENT_PRICE',
  WAIT_FOR_REFERENCE: 'WAIT_FOR_REFERENCE',
  ADJUSTED: 'ADJUSTED',
} as const;

export const POSITION_STATUS = {
  PENDING: 'PENDING',
  OPEN: 'OPEN',
  CLOSING: 'CLOSING',
  CLOSED: 'CLOSED',
} as const;

export const CLOSED_REASON = {
  TARGET: 'TARGET',
  STOPLOSS: 'STOPLOSS',
  TIMEOUT: 'TIMEOUT',
  MARKET_CLOSE: 'MARKET_CLOSE',
  MANUAL: 'MANUAL',
} as const;

export const CYCLE_RESULT = {
  WIN: 'WIN',
  LOSS: 'LOSS',
  TIMEOUT: 'TIMEOUT',
  MANUAL: 'MANUAL',
} as const;

// Status colors for UI
export const RECYCLEX_STATUS_COLORS = {
  INACTIVE: 'gray',
  WAITING: 'yellow',
  ACTIVE: 'green',
  COMPLETED: 'blue',
  STOPPED: 'red',
  PAUSED: 'orange',
} as const;

// Type colors for UI
export const RECYCLEX_TYPE_COLORS = {
  BULL: '#5B9A6F', // Green for bull
  BEAR: '#9A5B5B', // Red for bear
} as const;

// Validation limits
export const RECYCLEX_LIMITS = {
  NAME_MAX_LENGTH: 100,
  CAPITAL_MIN: 100,
  CAPITAL_MAX: 10000000,
  TARGET_PERCENT_MIN: 0.1,
  TARGET_PERCENT_MAX: 100,
  STOP_LOSS_PERCENT_MIN: 0.1,
  STOP_LOSS_PERCENT_MAX: 100,
  TARGET_CYCLES_MIN: 1,
  TARGET_CYCLES_MAX: 1000,
  ORDER_COUNT_MIN: 1,
  ORDER_COUNT_MAX: 10,
  ORDER_SPREAD_MIN: 0,
  ORDER_SPREAD_MAX: 20,
  TOLERANCE_MIN: 0.01,
  TOLERANCE_MAX: 5,
  CLOSE_BEFORE_MINUTES_MIN: 1,
  CLOSE_BEFORE_MINUTES_MAX: 60,
  FEE_PERCENT_MAX: 10,
} as const;

// Helper functions
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    INACTIVE: 'Inaktiv',
    WAITING: 'Väntar',
    ACTIVE: 'Aktiv',
    COMPLETED: 'Avslutad',
    STOPPED: 'Stoppad',
    PAUSED: 'Pausad',
  };
  return labels[status] || status;
}

export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BULL: 'Bull',
    BEAR: 'Bear',
  };
  return labels[type] || type;
}

export function getCapitalModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    COMPOUND: 'Ackumulerande',
    FIXED: 'Fast kapital',
  };
  return labels[mode] || mode;
}

export function getCycleRestartModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    CURRENT_PRICE: 'Aktuellt pris',
    WAIT_FOR_REFERENCE: 'Vänta på referenspris',
    ADJUSTED: 'Justerat pris',
  };
  return labels[mode] || mode;
}

export function getClosedReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    TARGET: 'Vinstmål',
    STOPLOSS: 'Stop-loss',
    TIMEOUT: 'Timeout',
    MARKET_CLOSE: 'Marknad stänger',
    MANUAL: 'Manuell',
  };
  return labels[reason] || reason;
}

export function getCycleResultLabel(result: string): string {
  const labels: Record<string, string> = {
    WIN: 'Vinst',
    LOSS: 'Förlust',
    TIMEOUT: 'Timeout',
    MANUAL: 'Manuell',
  };
  return labels[result] || result;
}
