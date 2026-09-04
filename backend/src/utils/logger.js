import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, json, colorize, printf } = winston.format;

const devFormat = printf(({ level, message, timestamp, requestId, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]${requestId ? ` [${requestId}]` : ''}: ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'edi-backend' },
  transports: [
    new winston.transports.Console({
      format:
        config.env === 'production'
          ? combine(timestamp(), json())
          : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
    }),
  ],
});

export default logger;
