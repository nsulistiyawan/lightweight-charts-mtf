import type { ISeriesApi, IChartApi, CandlestickSeriesOptions } from 'lightweight-charts';
import { CandlestickSeries } from 'lightweight-charts';
import type { MTFOptions, ResolvedMTFOptions, ResolvedHTFColumnConfig, OHLCData } from './types';

const DEFAULT_OPTIONS: Omit<ResolvedMTFOptions, 'columns'> = {
  gap: 5,
  columnGap: 2,
  showSeparators: true,
  separatorColor: 'rgba(255,255,255,0.08)',
  showLabels: true,
  labelFont: '11px sans-serif',
  labelColor: 'rgba(255,255,255,0.5)',
  rightMargin: 0,
};

const DEFAULT_COLUMN = {
  candleCount: 6,
  upColor: '#26a69a',
  downColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
  borderVisible: false,
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
};

export class MTFPrimitive {
  private _chart: IChartApi | null = null;
  private _mainSeries: ISeriesApi<any> | null = null;
  private _htfSeries: ISeriesApi<'Candlestick'>[] = [];
  private _separator: MTFSeparatorPrimitive | null = null;
  private _options: ResolvedMTFOptions;
  private _barDuration: number = 86400;

  constructor(options: MTFOptions) {
    this._options = this._resolveOptions(options);
  }

  attach(chart: IChartApi, mainSeries: ISeriesApi<any>, mainData: OHLCData[]) {
    this._chart = chart;
    this._mainSeries = mainSeries;
    this._barDuration = this._detectBarDuration(mainData);
    this._createHTFSeries();
    this._render(mainData);
  }

  detach() {
    this._removeHTFSeries();
    if (this._separator && this._mainSeries) {
      this._mainSeries.detachPrimitive(this._separator);
      this._separator = null;
    }
    this._chart = null;
    this._mainSeries = null;
  }

  update(mainData: OHLCData[], options?: Partial<MTFOptions>) {
    if (options) {
      this._options = this._resolveOptions({ ...this._options, ...options } as MTFOptions);
      this._removeHTFSeries();
      this._createHTFSeries();
    }
    this._barDuration = this._detectBarDuration(mainData);
    this._render(mainData);
  }

  updateColumnData(columnIndex: number, data: OHLCData[]) {
    if (columnIndex < this._options.columns.length) {
      this._options.columns[columnIndex].data = data;
    }
  }

  private _createHTFSeries() {
    if (!this._chart) return;

    for (const col of this._options.columns) {
      const seriesOptions: Partial<CandlestickSeriesOptions> = {
        upColor: col.upColor,
        downColor: col.downColor,
        wickUpColor: col.wickUpColor,
        wickDownColor: col.wickDownColor,
        borderVisible: col.borderVisible,
        borderUpColor: col.borderUpColor,
        borderDownColor: col.borderDownColor,
      };
      const series = this._chart.addSeries(CandlestickSeries, seriesOptions);
      this._htfSeries.push(series);
    }
  }

  private _removeHTFSeries() {
    if (!this._chart) return;
    for (const series of this._htfSeries) {
      this._chart.removeSeries(series);
    }
    this._htfSeries = [];
  }

  private _render(mainData: OHLCData[]) {
    if (!this._chart || !this._mainSeries || mainData.length === 0) return;

    const lastMainTime = this._getTimeAsNumber(mainData[mainData.length - 1].time);
    const { columns, gap, columnGap } = this._options;

    let currentOffset = gap;

    const columnPositions: { startOffset: number; count: number }[] = [];

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const visibleData = col.data.slice(-col.candleCount);
      const count = visibleData.length;

      columnPositions.push({ startOffset: currentOffset, count });

      const htfData = visibleData.map((bar, idx) => ({
        time: (lastMainTime + (currentOffset + idx + 1) * this._barDuration) as any,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }));

      this._htfSeries[i].setData(htfData);
      currentOffset += count + columnGap;
    }

    const totalBars = currentOffset + 2 + this._options.rightMargin;
    const whitespace: any[] = [];
    for (let i = 1; i <= totalBars; i++) {
      whitespace.push({ time: lastMainTime + i * this._barDuration });
    }
    this._mainSeries.setData([...mainData, ...whitespace] as any);

    if (this._separator && this._mainSeries) {
      this._mainSeries.detachPrimitive(this._separator);
    }

    if (this._options.showSeparators || this._options.showLabels) {
      this._separator = new MTFSeparatorPrimitive(
        this._options,
        lastMainTime,
        this._barDuration,
        columnPositions,
      );
      this._mainSeries.attachPrimitive(this._separator);
    }

  }

  private _detectBarDuration(data: OHLCData[]): number {
    if (data.length < 2) return 86400;
    const t1 = this._getTimeAsNumber(data[data.length - 1].time);
    const t2 = this._getTimeAsNumber(data[data.length - 2].time);
    return t1 - t2;
  }

  private _getTimeAsNumber(time: OHLCData['time']): number {
    if (typeof time === 'number') return time;
    if (typeof time === 'string') return Math.floor(new Date(time).getTime() / 1000);
    return Math.floor(
      new Date(`${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`).getTime() / 1000
    );
  }

  private _resolveOptions(options: MTFOptions): ResolvedMTFOptions {
    const columns: ResolvedHTFColumnConfig[] = options.columns.map(col => ({
      timeframe: col.timeframe,
      data: col.data,
      candleCount: col.candleCount ?? DEFAULT_COLUMN.candleCount,
      upColor: col.upColor ?? DEFAULT_COLUMN.upColor,
      downColor: col.downColor ?? DEFAULT_COLUMN.downColor,
      wickUpColor: col.wickUpColor ?? col.upColor ?? DEFAULT_COLUMN.wickUpColor,
      wickDownColor: col.wickDownColor ?? col.downColor ?? DEFAULT_COLUMN.wickDownColor,
      borderVisible: col.borderVisible ?? DEFAULT_COLUMN.borderVisible,
      borderUpColor: col.borderUpColor ?? col.upColor ?? DEFAULT_COLUMN.borderUpColor,
      borderDownColor: col.borderDownColor ?? col.downColor ?? DEFAULT_COLUMN.borderDownColor,
    }));

    return {
      gap: options.gap ?? DEFAULT_OPTIONS.gap,
      columnGap: options.columnGap ?? DEFAULT_OPTIONS.columnGap,
      showSeparators: options.showSeparators ?? DEFAULT_OPTIONS.showSeparators,
      separatorColor: options.separatorColor ?? DEFAULT_OPTIONS.separatorColor,
      showLabels: options.showLabels ?? DEFAULT_OPTIONS.showLabels,
      labelFont: options.labelFont ?? DEFAULT_OPTIONS.labelFont,
      labelColor: options.labelColor ?? DEFAULT_OPTIONS.labelColor,
      rightMargin: options.rightMargin ?? DEFAULT_OPTIONS.rightMargin,
      columns,
    };
  }
}

class MTFSeparatorPrimitive {
  private _options: ResolvedMTFOptions;
  private _lastMainTime: number;
  private _barDuration: number;
  private _columnPositions: { startOffset: number; count: number }[];

  constructor(
    options: ResolvedMTFOptions,
    lastMainTime: number,
    barDuration: number,
    columnPositions: { startOffset: number; count: number }[],
  ) {
    this._options = options;
    this._lastMainTime = lastMainTime;
    this._barDuration = barDuration;
    this._columnPositions = columnPositions;
  }

  attached() {}
  detached() {}
  updateAllViews() {}

  paneViews() {
    return [{ renderer: () => this, zOrder: () => 'bottom' as const }];
  }

  draw(target: any) {
    target.useBitmapCoordinateSpace((scope: any) => {
      const ctx: CanvasRenderingContext2D = scope.context;
      const hRatio = scope.horizontalPixelRatio;
      const vRatio = scope.verticalPixelRatio;
      const chartHeight = scope.bitmapSize.height;

      const timeScale = (this as any)._chart?.timeScale?.();
      if (!timeScale) return;

      if (this._options.showSeparators) {
        ctx.strokeStyle = this._options.separatorColor;
        ctx.lineWidth = 1 * hRatio;
        ctx.setLineDash([4 * hRatio, 3 * hRatio]);

        for (const pos of this._columnPositions) {
          const sepTime = this._lastMainTime + pos.startOffset * this._barDuration;
          const x = timeScale.timeToCoordinate(sepTime as any);
          if (x === null) continue;
          const px = x * hRatio;
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.lineTo(px, chartHeight);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      if (this._options.showLabels) {
        ctx.font = this._options.labelFont;
        ctx.fillStyle = this._options.labelColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i < this._columnPositions.length; i++) {
          const pos = this._columnPositions[i];
          const midOffset = pos.startOffset + Math.floor(pos.count / 2) + 1;
          const labelTime = this._lastMainTime + midOffset * this._barDuration;
          const x = timeScale.timeToCoordinate(labelTime as any);
          if (x === null) continue;
          ctx.fillText(this._options.columns[i].timeframe, x * hRatio, 8 * vRatio);
        }
      }
    });
  }
}
