import { describe, it, expect } from 'vitest';
import { aggregateOHLC, aggregateToWeekly, aggregateToMonthly } from '../src/data-aggregator';
import type { OHLCData } from '../src/types';

function makeHourlyBars(startTimestamp: number, count: number): OHLCData[] {
  const bars: OHLCData[] = [];
  for (let i = 0; i < count; i++) {
    const time = startTimestamp + i * 3600;
    const open = 100 + i;
    bars.push({
      time,
      open,
      high: open + 2,
      low: open - 1,
      close: open + 1,
      volume: 1000,
    });
  }
  return bars;
}

function makeDailyBars(startTimestamp: number, count: number): OHLCData[] {
  const bars: OHLCData[] = [];
  for (let i = 0; i < count; i++) {
    const time = startTimestamp + i * 86400;
    const open = 50000 + i * 100;
    bars.push({
      time,
      open,
      high: open + 500,
      low: open - 200,
      close: open + 300,
      volume: 5000,
    });
  }
  return bars;
}

describe('aggregateOHLC', () => {
  describe('4H aggregation', () => {
    it('groups 4 hourly bars into one 4H bar', () => {
      const start = 1704067200; // 2024-01-01 00:00:00 UTC
      const hourly = makeHourlyBars(start, 8);
      const result = aggregateOHLC(hourly, '4H');

      expect(result).toHaveLength(2);
    });

    it('uses first bar open and last bar close', () => {
      const start = 1704067200;
      const hourly = makeHourlyBars(start, 4);
      const result = aggregateOHLC(hourly, '4H');

      expect(result[0].open).toBe(hourly[0].open);
      expect(result[0].close).toBe(hourly[3].close);
    });

    it('tracks highest high and lowest low', () => {
      const start = 1704067200;
      const hourly: OHLCData[] = [
        { time: start, open: 100, high: 110, low: 90, close: 105, volume: 100 },
        { time: start + 3600, open: 105, high: 120, low: 95, close: 115, volume: 100 },
        { time: start + 7200, open: 115, high: 130, low: 80, close: 125, volume: 100 },
        { time: start + 10800, open: 125, high: 125, low: 100, close: 110, volume: 100 },
      ];
      const result = aggregateOHLC(hourly, '4H');

      expect(result[0].high).toBe(130);
      expect(result[0].low).toBe(80);
    });

    it('sums volume across bars', () => {
      const start = 1704067200;
      const hourly: OHLCData[] = [
        { time: start, open: 100, high: 110, low: 90, close: 105, volume: 100 },
        { time: start + 3600, open: 105, high: 115, low: 95, close: 110, volume: 200 },
        { time: start + 7200, open: 110, high: 120, low: 100, close: 115, volume: 300 },
        { time: start + 10800, open: 115, high: 125, low: 105, close: 120, volume: 400 },
      ];
      const result = aggregateOHLC(hourly, '4H');

      expect(result[0].volume).toBe(1000);
    });
  });

  describe('1D aggregation', () => {
    it('groups 24 hourly bars into one daily bar', () => {
      const start = 1704067200; // 2024-01-01 00:00:00 UTC
      const hourly = makeHourlyBars(start, 48);
      const result = aggregateOHLC(hourly, '1D');

      expect(result).toHaveLength(2);
    });

    it('handles bars spanning midnight correctly', () => {
      const start = 1704067200; // 2024-01-01 00:00:00 UTC
      const hourly = makeHourlyBars(start, 25);
      const result = aggregateOHLC(hourly, '1D');

      expect(result).toHaveLength(2);
      expect(result[0].open).toBe(hourly[0].open);
      expect(result[0].close).toBe(hourly[23].close);
    });
  });

  describe('1W aggregation', () => {
    it('groups daily bars into weekly bars', () => {
      // Monday 2024-01-01
      const start = 1704067200;
      const daily = makeDailyBars(start, 14);
      const result = aggregateOHLC(daily, '1W');

      expect(result).toHaveLength(2);
    });

    it('produces same result as aggregateToWeekly', () => {
      const start = 1704067200;
      const daily = makeDailyBars(start, 21);
      const resultNew = aggregateOHLC(daily, '1W');
      const resultLegacy = aggregateToWeekly(daily);

      expect(resultNew).toEqual(resultLegacy);
    });
  });

  describe('1M aggregation', () => {
    it('groups daily bars into monthly bars', () => {
      const start = 1704067200; // 2024-01-01
      const daily = makeDailyBars(start, 60);
      const result = aggregateOHLC(daily, '1M');

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('produces same result as aggregateToMonthly', () => {
      const start = 1704067200;
      const daily = makeDailyBars(start, 60);
      const resultNew = aggregateOHLC(daily, '1M');
      const resultLegacy = aggregateToMonthly(daily);

      expect(resultNew).toEqual(resultLegacy);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(aggregateOHLC([], '4H')).toEqual([]);
      expect(aggregateOHLC([], '1D')).toEqual([]);
      expect(aggregateOHLC([], '1W')).toEqual([]);
    });

    it('returns single bar when input fits in one period', () => {
      const start = 1704067200;
      const hourly = makeHourlyBars(start, 3);
      const result = aggregateOHLC(hourly, '4H');

      expect(result).toHaveLength(1);
    });

    it('handles string time format', () => {
      const bars: OHLCData[] = [
        { time: '2024-01-01', open: 100, high: 110, low: 90, close: 105 },
        { time: '2024-01-02', open: 105, high: 115, low: 95, close: 110 },
        { time: '2024-01-03', open: 110, high: 120, low: 100, close: 115 },
        { time: '2024-01-04', open: 115, high: 125, low: 105, close: 120 },
        { time: '2024-01-05', open: 120, high: 130, low: 110, close: 125 },
        { time: '2024-01-06', open: 125, high: 135, low: 115, close: 130 },
        { time: '2024-01-07', open: 130, high: 140, low: 120, close: 135 },
      ];
      const result = aggregateOHLC(bars, '1W');

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('handles object time format { year, month, day }', () => {
      const bars: OHLCData[] = [
        { time: { year: 2024, month: 1, day: 1 }, open: 100, high: 110, low: 90, close: 105 },
        { time: { year: 2024, month: 1, day: 2 }, open: 105, high: 115, low: 95, close: 110 },
        { time: { year: 2024, month: 1, day: 3 }, open: 110, high: 120, low: 100, close: 115 },
      ];
      const result = aggregateOHLC(bars, '1D');

      expect(result).toHaveLength(3);
    });

    it('handles missing volume gracefully', () => {
      const bars: OHLCData[] = [
        { time: 1704067200, open: 100, high: 110, low: 90, close: 105 },
        { time: 1704070800, open: 105, high: 115, low: 95, close: 110 },
      ];
      const result = aggregateOHLC(bars, '4H');

      expect(result[0].volume).toBe(0);
    });
  });

  describe('8H and 12H aggregation', () => {
    it('groups 8 hourly bars into one 8H bar', () => {
      const start = 1704067200;
      const hourly = makeHourlyBars(start, 16);
      const result = aggregateOHLC(hourly, '8H');

      expect(result).toHaveLength(2);
    });

    it('groups 12 hourly bars into one 12H bar', () => {
      const start = 1704067200;
      const hourly = makeHourlyBars(start, 24);
      const result = aggregateOHLC(hourly, '12H');

      expect(result).toHaveLength(2);
    });
  });

  describe('3M, 6M, 1Y aggregation', () => {
    it('groups daily bars into quarterly (3M)', () => {
      const start = 1704067200; // 2024-01-01
      const daily = makeDailyBars(start, 180);
      const result = aggregateOHLC(daily, '3M');

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('groups daily bars into half-yearly (6M)', () => {
      const start = 1704067200;
      const daily = makeDailyBars(start, 365);
      const result = aggregateOHLC(daily, '6M');

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('groups daily bars into yearly (1Y)', () => {
      const start = 1672531200; // 2023-01-01
      const daily = makeDailyBars(start, 730);
      const result = aggregateOHLC(daily, '1Y');

      expect(result).toHaveLength(2);
    });
  });
});
