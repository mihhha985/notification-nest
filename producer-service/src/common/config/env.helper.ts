import { ConfigService } from '@nestjs/config';

export function getEnvNumber(
  configService: ConfigService,
  key: string,
  defaultValue: number,
): number {
  const raw = configService.get<string>(key);
  if (raw === undefined || raw === '') {
    return defaultValue;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}
