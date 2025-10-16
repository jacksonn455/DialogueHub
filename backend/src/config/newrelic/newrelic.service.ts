import { Injectable, Logger } from '@nestjs/common';
import * as newrelic from 'newrelic';
import { NewRelicConfig } from './newrelic.config';

@Injectable()
export class NewRelicService {
  private readonly logger = new Logger(NewRelicService.name);

  constructor(private readonly newRelicConfig: NewRelicConfig) {
    if (this.newRelicConfig.isEnabled) {
    } else {
      this.logger.warn('New Relic disabled - NEW_RELIC_LICENSE_KEY not found');
    }
  }

  startTransaction(name: string, group: string = 'WebTransaction/NestJS'): any {
    if (!this.newRelicConfig.isEnabled) return null;

    return newrelic.startTransaction(name, group);
  }

  endTransaction(transaction: any): void {
    if (transaction && this.newRelicConfig.isEnabled) {
      transaction.end();
    }
  }

  addCustomAttributes(attributes: Record<string, any>): void {
    if (this.newRelicConfig.isEnabled) {
      newrelic.addCustomAttributes(attributes);
    }
  }

  recordCustomEvent(eventType: string, attributes: Record<string, any>): void {
    if (this.newRelicConfig.isEnabled) {
      newrelic.recordCustomEvent(eventType, attributes);
    }
  }

  recordMetric(name: string, value: number): void {
    if (this.newRelicConfig.isEnabled) {
      newrelic.recordMetric(name, value);
    }
  }

  noticeError(error: Error, customAttributes?: Record<string, any>): void {
    if (this.newRelicConfig.isEnabled) {
      newrelic.noticeError(error, customAttributes);
    }
  }

  setTransactionName(name: string): void {
    if (this.newRelicConfig.isEnabled) {
      newrelic.setTransactionName(name);
    }
  }

  getBrowserTimingHeader(): string {
    if (this.newRelicConfig.isEnabled) {
      return newrelic.getBrowserTimingHeader();
    }
    return '';
  }

  isEnabled(): boolean {
    return this.newRelicConfig.isEnabled;
  }
}
