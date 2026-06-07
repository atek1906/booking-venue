import type { NextRequest } from "next/server";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const REDACTED_KEY_PARTS = [
  "authorization",
  "cookie",
  "password",
  "secret",
  "server_key",
  "client_key",
  "signature",
  "token"
];

function shouldRedact(key: string) {
  const normalized = key.toLowerCase();
  return REDACTED_KEY_PARTS.some((part) => normalized.includes(part));
}

function serialize(_key: string, value: unknown) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack
    };
  }
  return value;
}

function safeFields(fields: LogFields = {}) {
  return JSON.parse(JSON.stringify(fields, (key, value) => shouldRedact(key) ? "[redacted]" : serialize(key, value)));
}

function write(level: LogLevel, message: string, fields?: LogFields) {
  const entry = {
    level,
    message,
    service: process.env.LOG_SERVICE_NAME || "courtbook",
    environment: process.env.APP_ENV || process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    ...safeFields(fields)
  };
  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => {
    if (process.env.LOG_LEVEL === "debug") write("debug", message, fields);
  },
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields)
};

export function getRequestContext(request: NextRequest, route: string) {
  return {
    route,
    requestId: request.headers.get("x-request-id") || crypto.randomUUID(),
    method: request.method,
    path: request.nextUrl.pathname,
    userAgent: request.headers.get("user-agent") || undefined
  };
}

export function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack
    };
  }
  return { message: String(error) };
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
