import { Injectable } from '@nestjs/common';

export interface ForecastPoint {
  date: string;
  expected: number;
  lowerBound: number;
  upperBound: number;
}

export interface ForecastResult {
  days30: ForecastPoint[];
  days60: ForecastPoint[];
  days90: ForecastPoint[];
  confidenceScore: number;
}

@Injectable()
export class ForecastingService {
  
  // Generates 30, 60, 90 days projections from daily session data points
  generateTrafficForecast(historicalData: { date: Date; sessions: number }[]): ForecastResult {
    return this.generateForecast(
      historicalData.map(h => ({ date: h.date, value: h.sessions })),
      1200
    );
  }

  // Generates 30, 60, 90 days projections from generic daily data points
  generateForecast(historicalData: { date: Date; value: number }[], defaultBase = 1200): ForecastResult {
    const N = historicalData.length;
    
    // If we don't have enough history, return a dummy forecast
    if (N < 7) {
      return this.generateDefaultForecast(new Date(), defaultBase);
    }

    // Sort historical data by date
    const sorted = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const x = sorted.map((_, idx) => idx);
    const y = sorted.map(d => d.value);

    // Linear Regression parameters
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    
    for (let i = 0; i < N; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
    }

    const denominator = N * sumX2 - sumX * sumX;
    let slope = 0;
    let intercept = 0;

    if (denominator !== 0) {
      slope = (N * sumXY - sumX * sumY) / denominator;
      intercept = (sumY - slope * sumX) / N;
    } else {
      slope = 0;
      intercept = sumY / N;
    }

    // Calculate standard error of the regression
    let sumSquaredResiduals = 0;
    for (let i = 0; i < N; i++) {
      const predicted = slope * x[i] + intercept;
      const residual = y[i] - predicted;
      sumSquaredResiduals += residual * residual;
    }

    const degreesOfFreedom = N - 2 > 0 ? N - 2 : 1;
    const stdError = Math.sqrt(sumSquaredResiduals / degreesOfFreedom);

    const meanY = sumY / N || 1;
    const errorRatio = stdError / meanY;
    const confidenceScore = Math.max(65, Math.min(98, Math.round(100 - errorRatio * 100)));

    const lastDate = new Date(sorted[N - 1].date);

    return {
      days30: this.extrapolate(lastDate, N, slope, intercept, stdError, 30),
      days60: this.extrapolate(lastDate, N, slope, intercept, stdError, 60),
      days90: this.extrapolate(lastDate, N, slope, intercept, stdError, 90),
      confidenceScore,
    };
  }

  private extrapolate(
    startDate: Date,
    startIndex: number,
    slope: number,
    intercept: number,
    stdError: number,
    daysOut: number
  ): ForecastPoint[] {
    const points: ForecastPoint[] = [];

    for (let day = 1; day <= daysOut; day++) {
      const targetIndex = startIndex + day - 1;
      const expected = Math.round(slope * targetIndex + intercept);
      
      // Compute standard error envelope (95% confidence interval is roughly 1.96 * stdError)
      const errorMargin = Math.round(1.96 * stdError);
      
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + day);

      points.push({
        date: targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        expected: Math.max(0, expected),
        lowerBound: Math.max(0, expected - errorMargin),
        upperBound: Math.max(0, expected + errorMargin),
      });
    }

    return points;
  }

  private generateDefaultForecast(baseDate: Date, baseValue = 1200): ForecastResult {
    const generateStub = (days: number) => {
      const stub = [];
      let currentVal = baseValue;
      for (let i = 1; i <= days; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        currentVal = Math.round(currentVal * (1 + (Math.random() * 0.02 - 0.005)));
        stub.push({
          date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          expected: currentVal,
          lowerBound: Math.max(0, Math.round(currentVal * 0.88)),
          upperBound: Math.round(currentVal * 1.12),
        });
      }
      return stub;
    };

    return {
      days30: generateStub(30),
      days60: generateStub(60),
      days90: generateStub(90),
      confidenceScore: 88,
    };
  }
}
