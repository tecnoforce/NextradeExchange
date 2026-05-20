class ChartManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.candlestickSeries = null;
    this.volumeSeries = null;
    this.ma7Series = null;
    this.ma25Series = null;
    this.ma99Series = null;
    this.currentData = [];
    this.currentPair = 'BTC/USDT';
    this.currentTimeframe = '1h';
  }

  init() {
    if (!this.container || typeof LightweightCharts === 'undefined') {
      console.error('[Chart] Lightweight Charts not loaded or container not found');
      return;
    }

    this.chart = LightweightCharts.createChart(this.container, {
      layout: {
        background: { type: 'solid', color: '#0b0e11' },
        textColor: '#848e9c',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#1e2329' },
        horzLines: { color: '#1e2329' },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color: '#474d57',
          width: 1,
          style: LightweightCharts.LineStyle.Dashed,
          labelBackgroundColor: '#2b3139',
        },
        horzLine: {
          color: '#474d57',
          width: 1,
          style: LightweightCharts.LineStyle.Dashed,
          labelBackgroundColor: '#2b3139',
        },
      },
      rightPriceScale: {
        borderColor: '#2b3139',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#2b3139',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    this.candlestickSeries = this.chart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderVisible: false,
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
    });

    this.volumeSeries = this.chart.addSeries(LightweightCharts.HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    this.volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    this.ma7Series = this.chart.addSeries(LightweightCharts.LineSeries, {
      color: '#f0b90b',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    this.ma25Series = this.chart.addSeries(LightweightCharts.LineSeries, {
      color: '#a66bff',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    this.ma99Series = this.chart.addSeries(LightweightCharts.LineSeries, {
      color: '#6ba0ff',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    this.chart.timeScale().fitContent();

    window.addEventListener('resize', () => {
      this.chart.applyOptions({
        width: this.container.clientWidth,
        height: this.container.clientHeight,
      });
    });
  }

  calculateMA(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, value: undefined });
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        result.push({ time: data[i].time, value: sum / period });
      }
    }
    return result;
  }

  async loadData(pair, timeframe) {
    this.currentPair = pair;
    this.currentTimeframe = timeframe;

    try {
      const klines = await API.getKlines(pair, timeframe, 200);

      this.currentData = klines;

      this.candlestickSeries.setData(klines);

      const volumeData = klines.map(k => ({
        time: k.time,
        value: k.volume,
        color: k.close >= k.open ? '#0ecb81' : '#f6465d',
      }));
      this.volumeSeries.setData(volumeData);

      this.ma7Series.setData(this.calculateMA(klines, 7));
      this.ma25Series.setData(this.calculateMA(klines, 25));
      this.ma99Series.setData(this.calculateMA(klines, 99));

      this.chart.timeScale().fitContent();
    } catch (error) {
      console.error('[Chart] Failed to load data:', error);
    }
  }

  updateLastCandle(candle) {
    if (!candle || !this.candlestickSeries) return;

    const lastCandle = this.currentData[this.currentData.length - 1];
    if (lastCandle && lastCandle.time === candle.time) {
      this.currentData[this.currentData.length - 1] = candle;
    } else {
      this.currentData.push(candle);
    }

    this.candlestickSeries.update(candle);

    const volColor = candle.close >= candle.open ? '#0ecb81' : '#f6465d';
    this.volumeSeries.update({
      time: candle.time,
      value: candle.volume || 0,
      color: volColor,
    });

    const ma7 = this.calculateMA(this.currentData, 7);
    const ma25 = this.calculateMA(this.currentData, 25);
    const ma99 = this.calculateMA(this.currentData, 99);

    const lastMa7 = ma7[ma7.length - 1];
    const lastMa25 = ma25[ma25.length - 1];
    const lastMa99 = ma99[ma99.length - 1];

    if (lastMa7.value !== undefined) this.ma7Series.update(lastMa7);
    if (lastMa25.value !== undefined) this.ma25Series.update(lastMa25);
    if (lastMa99.value !== undefined) this.ma99Series.update(lastMa99);
  }

  setTimeframe(timeframe) {
    this.currentTimeframe = timeframe;
    this.loadData(this.currentPair, timeframe);
  }

  setPair(pair) {
    this.currentPair = pair;
    this.loadData(pair, this.currentTimeframe);
  }

  onChartUpdate(data) {
    if (!data || !data.candle) return;
    const candle = data.candle;
    if (candle.isFinal) {
      const idx = this.currentData.findIndex(c => c.time === candle.time);
      if (idx !== -1) {
        this.currentData[idx] = {
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        };
      }
    }
    this.updateLastCandle({
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    });
  }

  resize() {
    if (this.chart && this.container) {
      this.chart.applyOptions({
        width: this.container.clientWidth,
        height: this.container.clientHeight,
      });
    }
  }
}
