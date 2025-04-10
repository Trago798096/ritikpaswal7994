// Performance monitoring utility
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]>;
  private thresholds: Map<string, number>;

  private constructor() {
    this.metrics = new Map();
    this.thresholds = new Map([
      ['pageLoad', 3000], // 3 seconds
      ['apiCall', 1000], // 1 second
      ['renderTime', 100], // 100ms
      ['interaction', 100], // 100ms
    ]);
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start measuring performance
  startMeasure(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    };
  }

  // Record a performance metric
  private recordMetric(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)?.push(duration);

    // Check if duration exceeds threshold
    const threshold = this.thresholds.get(name);
    if (threshold && duration > threshold) {
      console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
    }
  }

  // Get average duration for a metric
  getAverageDuration(name: string): number | null {
    const durations = this.metrics.get(name);
    if (!durations || durations.length === 0) return null;

    const sum = durations.reduce((acc, val) => acc + val, 0);
    return sum / durations.length;
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics.clear();
  }

  // Set custom threshold
  setThreshold(name: string, threshold: number): void {
    this.thresholds.set(name, threshold);
  }

  // Get performance report
  getReport(): Record<string, { average: number; max: number; min: number; count: number }> {
    const report: Record<string, any> = {};

    this.metrics.forEach((durations, name) => {
      if (durations.length > 0) {
        report[name] = {
          average: this.getAverageDuration(name) || 0,
          max: Math.max(...durations),
          min: Math.min(...durations),
          count: durations.length,
        };
      }
    });

    return report;
  }
}

// React hook for measuring component performance
export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();

  return {
    measureRender: () => monitor.startMeasure(`${componentName}_render`),
    measureEffect: () => monitor.startMeasure(`${componentName}_effect`),
    measureCallback: (name: string) => monitor.startMeasure(`${componentName}_${name}`),
  };
}

// API call performance wrapper
export async function measureApiCall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance();
  const end = monitor.startMeasure(`api_${name}`);

  try {
    const result = await apiCall();
    end();
    return result;
  } catch (error) {
    end();
    throw error;
  }
}

// Page load performance tracker
export function trackPageLoad(pageName: string): void {
  const monitor = PerformanceMonitor.getInstance();

  // Record navigation timing metrics
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      monitor.startMeasure(`${pageName}_domLoad`)();
      monitor.startMeasure(`${pageName}_fullLoad`)();
    }
  });
}

// Resource timing collector
export function collectResourceTimings(): PerformanceResourceTiming[] {
  return performance.getEntriesByType('resource') as PerformanceResourceTiming[];
}

// Clear performance data
export function clearPerformanceData(): void {
  performance.clearMarks();
  performance.clearMeasures();
  performance.clearResourceTimings();
  PerformanceMonitor.getInstance().clearMetrics();
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
