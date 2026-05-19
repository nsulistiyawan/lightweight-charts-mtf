# lightweight-charts-mtf

Multi-timeframe (MTF) candle display plugin for [TradingView Lightweight Charts](https://github.com/nickolasburr/lightweight-charts). Renders higher-timeframe candles as native candlestick series alongside your main chart.

![lightweight-charts >=4.0.0](https://img.shields.io/badge/lightweight--charts-%3E%3D4.0.0-blue)
![npm](https://img.shields.io/npm/v/lightweight-charts-mtf)
![license](https://img.shields.io/npm/l/lightweight-charts-mtf)

## Features

- Display any number of higher-timeframe columns next to your main chart
- Native candlestick rendering — HTF candles share the same price scale
- Accepts any timeframe string as label (e.g. `'4H'`, `'1D'`, `'1W'`, `'1M'`)
- Built-in OHLC aggregation from lower timeframes (4H, 8H, 12H, 1D, 1W, 1M, 3M, 6M, 1Y)
- Per-column candle colors (body + wick, up + down)
- Separator lines and labels between columns
- Configurable gap between main chart and HTF zone, and between HTF columns

## Install

```bash
npm install lightweight-charts-mtf
```

## Quick Start

### With pre-aggregated data (from API)

If your data source already provides higher-timeframe candles (e.g., Bybit, Binance):

```typescript
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { MTFPrimitive } from 'lightweight-charts-mtf';

const chart = createChart(container);
const mainSeries = chart.addSeries(CandlestickSeries);

// Fetch data at different timeframes from your API
const hourlyData = await fetchKlines('BTCUSDT', '1h');
const dailyData = await fetchKlines('BTCUSDT', '1d');
const weeklyData = await fetchKlines('BTCUSDT', '1w');

// Create and attach
const mtf = new MTFPrimitive({
  columns: [
    { timeframe: '1D', data: dailyData, candleCount: 6 },
    { timeframe: '1W', data: weeklyData, candleCount: 4 },
  ],
  gap: 5,
  columnGap: 2,
});

mtf.attach(chart, mainSeries, hourlyData);
```

### With self-aggregated data

If you only have lower-timeframe data and need to derive higher timeframes:

```typescript
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { MTFPrimitive, aggregateOHLC } from 'lightweight-charts-mtf';

const chart = createChart(container);
const mainSeries = chart.addSeries(CandlestickSeries);

const hourlyData = [...];

// Aggregate into higher timeframes
const fourHour = aggregateOHLC(hourlyData, '4H');
const daily = aggregateOHLC(hourlyData, '1D');
const weekly = aggregateOHLC(hourlyData, '1W');

const mtf = new MTFPrimitive({
  columns: [
    { timeframe: '4H', data: fourHour, candleCount: 10 },
    { timeframe: '1D', data: daily, candleCount: 6 },
    { timeframe: '1W', data: weekly, candleCount: 4 },
  ],
  gap: 5,
  columnGap: 2,
});

mtf.attach(chart, mainSeries, hourlyData);
```

## Data Format

The plugin accepts standard Lightweight Charts OHLC data:

```typescript
// Unix timestamp (seconds)
{ time: 1704067200, open: 42000, high: 42500, low: 41800, close: 42300, volume: 1500 }

// Date string
{ time: '2024-01-01', open: 42000, high: 42500, low: 41800, close: 42300 }

// Object
{ time: { year: 2024, month: 1, day: 1 }, open: 42000, high: 42500, low: 41800, close: 42300 }
```

The `volume` field is optional.

## Aggregation

If your data source doesn't provide higher-timeframe candles directly, use `aggregateOHLC`:

```typescript
import { aggregateOHLC } from 'lightweight-charts-mtf';

const fourHour = aggregateOHLC(hourlyCandles, '4H');
const daily = aggregateOHLC(hourlyCandles, '1D');
const weekly = aggregateOHLC(hourlyCandles, '1W');
const monthly = aggregateOHLC(dailyCandles, '1M');
```

Supported periods: `'4H'`, `'8H'`, `'12H'`, `'1D'`, `'1W'`, `'1M'`, `'3M'`, `'6M'`, `'1Y'`

Legacy helpers are also available:

```typescript
import { aggregateToWeekly, aggregateToMonthly } from 'lightweight-charts-mtf';
```

## Options

```typescript
interface MTFOptions {
  columns: HTFColumnConfig[];
  gap?: number;                // whitespace bars between main chart and HTF (default: 5)
  columnGap?: number;          // whitespace bars between HTF columns (default: 2)
  showSeparators?: boolean;    // default: true
  separatorColor?: string;     // default: 'rgba(255,255,255,0.08)'
  showLabels?: boolean;        // default: true
  labelFont?: string;          // default: '11px sans-serif'
  labelColor?: string;         // default: 'rgba(255,255,255,0.5)'
}

interface HTFColumnConfig {
  timeframe: string;           // any label: '4H', '1D', '1W', etc.
  data: OHLCData[];
  candleCount?: number;        // default: 6
  upColor?: string;            // default: '#26a69a'
  downColor?: string;          // default: '#ef5350'
  wickUpColor?: string;        // defaults to upColor
  wickDownColor?: string;      // defaults to downColor
  borderVisible?: boolean;     // default: false
  borderUpColor?: string;      // defaults to upColor
  borderDownColor?: string;    // defaults to downColor
}
```

## API

```typescript
// Create the plugin
const mtf = new MTFPrimitive(options);

// Attach to chart (creates HTF series and renders)
mtf.attach(chart, mainSeries, mainData);

// Update with new data and/or options
mtf.update(newMainData);
mtf.update(newMainData, { columns: [...], gap: 8 });

// Update a single column's data
mtf.updateColumnData(0, newWeeklyData);

// Detach and clean up
mtf.detach();
```

## Example

See [`example/index.html`](./example/index.html) for a live demo using BTC data from Bybit with configurable base timeframe, HTF columns, gap, and column gap.

To run locally:

```bash
npm run build
npx serve .
# Open http://localhost:3000/example/
```

## Development

```bash
npm install
npm run build       # Build CJS, ESM, and type declarations
npm run dev         # Watch mode
npm run typecheck   # Type check without emitting
npm test            # Run unit tests
npm run test:watch  # Watch mode for tests
```

## License

MIT
