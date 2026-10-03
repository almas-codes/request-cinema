import type { StorageAdapter } from '@request-cinema/store';
import type { Trace } from '@request-cinema/trace-model';

export interface PipelineMetrics {
  ingestedTraces: number;
  droppedTraces: number;
  queueDepth: number;
}

export class IngestionPipeline {
  private queue: Trace[] = [];
  private readonly maxQueueSize: number;
  private readonly store: StorageAdapter;
  private isProcessing = false;
  private metrics: PipelineMetrics = {
    ingestedTraces: 0,
    droppedTraces: 0,
    queueDepth: 0,
  };

  constructor(store: StorageAdapter, maxQueueSize = 5000) {
    this.store = store;
    this.maxQueueSize = maxQueueSize;
  }

  enqueue(trace: Trace): void {
    if (this.queue.length >= this.maxQueueSize) {
      // Drop oldest to relieve memory backpressure
      this.queue.shift();
      this.metrics.droppedTraces++;
    }

    this.queue.push(trace);
    this.metrics.ingestedTraces++;
    this.metrics.queueDepth = this.queue.length;

    this.scheduleDrain();
  }

  private scheduleDrain(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    setImmediate(async () => {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, 50);
        for (const trace of batch) {
          try {
            await this.store.putTrace(trace);
          } catch (err) {
            console.error('Failed to persist trace in pipeline:', err);
          }
        }
        this.metrics.queueDepth = this.queue.length;
      }
      this.isProcessing = false;
    });
  }

  async drainAndShutdown(): Promise<void> {
    while (this.queue.length > 0) {
      const trace = this.queue.shift();
      if (trace) {
        await this.store.putTrace(trace);
      }
    }
    this.metrics.queueDepth = 0;
  }

  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }
}
