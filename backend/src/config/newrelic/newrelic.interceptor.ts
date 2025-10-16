import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as newrelic from 'newrelic';
import { NewRelicService } from './newrelic.service';

@Injectable()
export class NewRelicInterceptor implements NestInterceptor {
  private readonly logger = new Logger(NewRelicInterceptor.name);

  constructor(private readonly newRelicService: NewRelicService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const transactionName = `${request.method} ${request.route?.path || request.path}`;

    this.newRelicService.setTransactionName(transactionName);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;

          this.newRelicService.recordMetric('ResponseTime', duration);

          this.newRelicService.addCustomAttributes({
            'response.time': duration,
            'response.statusCode': context.switchToHttp().getResponse()
              .statusCode,
          });
        },
        error: (error) => {
          this.newRelicService.noticeError(error, {
            transaction: transactionName,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }
}
