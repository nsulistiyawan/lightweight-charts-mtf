import type { OHLCData } from './types';

export type AggregationPeriod = '4H' | '8H' | '12H' | '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

export function aggregateOHLC(data: OHLCData[], period: AggregationPeriod): OHLCData[] {
  const getPeriodKey = getPeriodKeyFn(period);
  return aggregateByPeriod(data, getPeriodKey);
}

export function aggregateToWeekly(data: OHLCData[]): OHLCData[] {
  return aggregateByPeriod(data, getWeekStart);
}

export function aggregateToMonthly(data: OHLCData[]): OHLCData[] {
  return aggregateByPeriod(data, getMonthStart);
}

function getPeriodKeyFn(period: AggregationPeriod): (timestamp: number) => number {
  switch (period) {
    case '4H': return (ts) => getHourBucket(ts, 4);
    case '8H': return (ts) => getHourBucket(ts, 8);
    case '12H': return (ts) => getHourBucket(ts, 12);
    case '1D': return getDayStart;
    case '1W': return getWeekStart;
    case '1M': return getMonthStart;
    case '3M': return (ts) => getQuarterStart(ts, 3);
    case '6M': return (ts) => getQuarterStart(ts, 6);
    case '1Y': return getYearStart;
  }
}

function aggregateByPeriod(
  data: OHLCData[],
  getPeriodKey: (time: number) => number
): OHLCData[] {
  if (data.length === 0) return [];

  const periods: Map<number, OHLCData> = new Map();

  for (const bar of data) {
    const timestamp = timeToTimestamp(bar.time);
    const periodKey = getPeriodKey(timestamp);

    const existing = periods.get(periodKey);
    if (!existing) {
      periods.set(periodKey, {
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume ?? 0,
      });
    } else {
      existing.high = Math.max(existing.high, bar.high);
      existing.low = Math.min(existing.low, bar.low);
      existing.close = bar.close;
      existing.volume = (existing.volume ?? 0) + (bar.volume ?? 0);
    }
  }

  return Array.from(periods.values());
}

function timeToTimestamp(time: OHLCData['time']): number {
  if (typeof time === 'number') return time;
  if (typeof time === 'string') return Math.floor(new Date(time).getTime() / 1000);
  return Math.floor(
    new Date(`${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`).getTime() / 1000
  );
}

function getHourBucket(timestamp: number, hours: number): number {
  const bucketSeconds = hours * 3600;
  return Math.floor(timestamp / bucketSeconds) * bucketSeconds;
}

function getDayStart(timestamp: number): number {
  const date = new Date(timestamp * 1000);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp * 1000);
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function getMonthStart(timestamp: number): number {
  const date = new Date(timestamp * 1000);
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function getQuarterStart(timestamp: number, months: number): number {
  const date = new Date(timestamp * 1000);
  const month = date.getUTCMonth();
  const quarterMonth = Math.floor(month / months) * months;
  date.setUTCMonth(quarterMonth, 1);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function getYearStart(timestamp: number): number {
  const date = new Date(timestamp * 1000);
  date.setUTCMonth(0, 1);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}
