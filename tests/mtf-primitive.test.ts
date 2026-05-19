import { describe, it, expect, vi } from 'vitest';
import { MTFPrimitive } from '../src/mtf-primitive';
import type { MTFOptions } from '../src/types';

function makeSampleOptions(overrides?: Partial<MTFOptions>): MTFOptions {
  return {
    columns: [
      {
        timeframe: '4H',
        data: [
          { time: 1704067200, open: 100, high: 110, low: 90, close: 105 },
          { time: 1704081600, open: 105, high: 115, low: 95, close: 110 },
          { time: 1704096000, open: 110, high: 120, low: 100, close: 115 },
        ],
        candleCount: 6,
      },
      {
        timeframe: '1D',
        data: [
          { time: 1704067200, open: 100, high: 120, low: 85, close: 115 },
          { time: 1704153600, open: 115, high: 130, low: 100, close: 125 },
        ],
        candleCount: 4,
      },
    ],
    ...overrides,
  };
}

function makeMockChart() {
  const seriesList: any[] = [];
  return {
    addSeries: vi.fn((_def: any, _opts: any) => {
      const series = {
        setData: vi.fn(),
        attachPrimitive: vi.fn(),
        detachPrimitive: vi.fn(),
      };
      seriesList.push(series);
      return series;
    }),
    removeSeries: vi.fn(),
    timeScale: () => ({
      fitContent: vi.fn(),
      applyOptions: vi.fn(),
    }),
    _seriesList: seriesList,
  };
}

function makeMockMainSeries() {
  return {
    setData: vi.fn(),
    attachPrimitive: vi.fn(),
    detachPrimitive: vi.fn(),
  };
}

function makeSampleData() {
  return [
    { time: 1704067200, open: 100, high: 110, low: 90, close: 105 },
    { time: 1704153600, open: 105, high: 115, low: 95, close: 110 },
    { time: 1704240000, open: 110, high: 120, low: 100, close: 115 },
    { time: 1704326400, open: 115, high: 125, low: 105, close: 120 },
    { time: 1704412800, open: 120, high: 130, low: 110, close: 125 },
  ];
}

describe('MTFPrimitive', () => {
  describe('constructor', () => {
    it('creates instance with default options', () => {
      const mtf = new MTFPrimitive(makeSampleOptions());
      expect(mtf).toBeDefined();
    });

    it('accepts custom gap and columnGap', () => {
      const mtf = new MTFPrimitive(makeSampleOptions({ gap: 10, columnGap: 5 }));
      expect(mtf).toBeDefined();
    });

    it('accepts any string as timeframe', () => {
      const mtf = new MTFPrimitive({
        columns: [
          { timeframe: '15m', data: [{ time: 1704067200, open: 100, high: 110, low: 90, close: 105 }] },
          { timeframe: 'custom', data: [{ time: 1704067200, open: 100, high: 110, low: 90, close: 105 }] },
        ],
      });
      expect(mtf).toBeDefined();
    });
  });

  describe('attach', () => {
    it('creates HTF series on the chart', () => {
      const mtf = new MTFPrimitive(makeSampleOptions());
      const chart = makeMockChart();
      const mainSeries = makeMockMainSeries();
      const data = makeSampleData();

      mtf.attach(chart as any, mainSeries as any, data);

      expect(chart.addSeries).toHaveBeenCalledTimes(2);
    });

    it('sets data on HTF series', () => {
      const mtf = new MTFPrimitive(makeSampleOptions());
      const chart = makeMockChart();
      const mainSeries = makeMockMainSeries();
      const data = makeSampleData();

      mtf.attach(chart as any, mainSeries as any, data);

      for (const series of chart._seriesList) {
        expect(series.setData).toHaveBeenCalled();
      }
    });

    it('sets whitespace + main data on mainSeries', () => {
      const mtf = new MTFPrimitive(makeSampleOptions());
      const chart = makeMockChart();
      const mainSeries = makeMockMainSeries();
      const data = makeSampleData();

      mtf.attach(chart as any, mainSeries as any, data);

      expect(mainSeries.setData).toHaveBeenCalled();
      const setDataArg = mainSeries.setData.mock.calls[0][0];
      expect(setDataArg.length).toBeGreaterThan(data.length);
    });

    it('attaches separator primitive to mainSeries', () => {
      const mtf = new MTFPrimitive(makeSampleOptions());
      const chart = makeMockChart();
      const mainSeries = makeMockMainSeries();
      const data = makeSampleData();

      mtf.attach(chart as any, mainSeries as any, data);

      expect(mainSeries.attachPrimitive).toHaveBeenCalled();
    });
  });

  describe('detach', () => {
    it('removes HTF series from chart', () => {
      const mtf = new MTFPrimitive(makeSampleOptions());
      const chart = makeMockChart();
      const mainSeries = makeMockMainSeries();
      const data = makeSampleData();

      mtf.attach(chart as any, mainSeries as any, data);
      mtf.detach();

      expect(chart.removeSeries).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    it('re-renders with new data', () => {
      const mtf = new MTFPrimitive(makeSampleOptions());
      const chart = makeMockChart();
      const mainSeries = makeMockMainSeries();
      const data = makeSampleData();

      mtf.attach(chart as any, mainSeries as any, data);
      mainSeries.setData.mockClear();

      mtf.update(data);

      expect(mainSeries.setData).toHaveBeenCalled();
    });

    it('recreates series when options change', () => {
      const mtf = new MTFPrimitive(makeSampleOptions());
      const chart = makeMockChart();
      const mainSeries = makeMockMainSeries();
      const data = makeSampleData();

      mtf.attach(chart as any, mainSeries as any, data);
      chart.addSeries.mockClear();
      chart.removeSeries.mockClear();

      mtf.update(data, { columns: [{ timeframe: '1W', data: data, candleCount: 3 }], gap: 3 });

      expect(chart.removeSeries).toHaveBeenCalled();
      expect(chart.addSeries).toHaveBeenCalled();
    });
  });

  describe('updateColumnData', () => {
    it('updates data for valid column index', () => {
      const mtf = new MTFPrimitive(makeSampleOptions());
      const newData = [{ time: 1704067200 as const, open: 200, high: 220, low: 180, close: 210 }];
      expect(() => mtf.updateColumnData(0, newData)).not.toThrow();
    });

    it('does nothing for out-of-bounds index', () => {
      const mtf = new MTFPrimitive(makeSampleOptions());
      const newData = [{ time: 1704067200 as const, open: 200, high: 220, low: 180, close: 210 }];
      expect(() => mtf.updateColumnData(99, newData)).not.toThrow();
    });
  });

  describe('separator options', () => {
    it('does not attach separator when showSeparators and showLabels are false', () => {
      const mtf = new MTFPrimitive(makeSampleOptions({ showSeparators: false, showLabels: false }));
      const chart = makeMockChart();
      const mainSeries = makeMockMainSeries();
      const data = makeSampleData();

      mtf.attach(chart as any, mainSeries as any, data);

      expect(mainSeries.attachPrimitive).not.toHaveBeenCalled();
    });
  });
});
