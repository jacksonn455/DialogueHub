import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as newrelic from 'newrelic';

@Injectable()
export class NewRelicMiddleware implements NestMiddleware {
  private readonly logger = new Logger(NewRelicMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const transactionName = `${req.method} ${req.route?.path || req.path}`;

    newrelic.addCustomAttributes({
      'http.method': req.method,
      'http.url': req.url,
      'http.referrer': req.get('Referer') || '',
      'http.userAgent': req.get('User-Agent') || '',
      'request.ip': req.ip,
    });

    newrelic.recordCustomEvent('Request', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
    });
    next();
  }
}
