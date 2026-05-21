import type { Time } from 'lightweight-charts';

/** OHLC candle data for a single timeframe period */
export interface OHLCData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Supported higher timeframes — any string label is accepted */
export type HTFTimeframe = string;

/** Configuration for a single HTF column displayed to the right */
export interface HTFColumnConfig {
  /** Timeframe label (e.g., '1W', '1M') */
  timeframe: HTFTimeframe;
  /** OHLC data for this timeframe — most recent N candles */
  data: OHLCData[];
  /** Number of candles to display (default: 6) */
  candleCount?: number;
  /** Up candle color */
  upColor?: string;
  /** Down candle color */
  downColor?: string;
  /** Wick color for up candles (defaults to upColor) */
  wickUpColor?: string;
  /** Wick color for down candles (defaults to downColor) */
  wickDownColor?: string;
  /** Border visible on candle bodies (default: false) */
  borderVisible?: boolean;
  /** Border up color */
  borderUpColor?: string;
  /** Border down color */
  borderDownColor?: string;
}

/** Options for the MTF plugin */
export interface MTFOptions {
  /** Array of HTF columns to display, ordered left-to-right */
  columns: HTFColumnConfig[];
  /** Number of whitespace bars between main chart and first HTF column (default: 5) */
  gap?: number;
  /** Number of whitespace bars between HTF columns (default: 2) */
  columnGap?: number;
  /** Show separator lines between columns (default: true) */
  showSeparators?: boolean;
  /** Separator line color (default: 'rgba(255,255,255,0.08)') */
  separatorColor?: string;
  /** Show timeframe labels (default: true) */
  showLabels?: boolean;
  /** Label font (default: '11px sans-serif') */
  labelFont?: string;
  /** Label color (default: 'rgba(255,255,255,0.5)') */
  labelColor?: string;
  /** Extra whitespace bars after the last HTF column (default: 0) */
  rightMargin?: number;
}

/** Resolved options with all defaults applied */
export interface ResolvedMTFOptions extends Required<MTFOptions> {
  columns: ResolvedHTFColumnConfig[];
}

/** Resolved column config with defaults applied */
export interface ResolvedHTFColumnConfig extends Required<Omit<HTFColumnConfig, 'data' | 'volume'>> {
  data: OHLCData[];
}
