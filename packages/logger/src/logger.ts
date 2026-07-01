import { type Logger as PinoLogger, pino } from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const level = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

/** Process-wide pino instance. */
export const logger: PinoLogger = pino({
  level,
  base: { service: process.env.SERVICE_NAME ?? "openbulls" },
  ...(isProduction || isTest
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }),
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "secret",
      "*.secret",
      "authorization",
      "headers.authorization",
      "headers.cookie",
    ],
    censor: "[REDACTED]",
  },
});

export type Logger = PinoLogger;
