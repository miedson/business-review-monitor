type LogLevel = "info" | "error";

type LogFields = Record<string, boolean | number | string | null | undefined>;

export function logInfo(message: string, fields: LogFields = {}): void {
  writeLog("info", message, fields);
}

export function logError(message: string, fields: LogFields = {}): void {
  writeLog("error", message, fields);
}

function writeLog(level: LogLevel, message: string, fields: LogFields): void {
  process.stdout.write(
    `${JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...fields
    })}\n`
  );
}
