// Settings-related enums for the EEG analysis platform
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

export enum Language {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de'
}

export enum RefreshInterval {
  NEVER = 'never',
  FIVE_SECONDS = '5s',
  TEN_SECONDS = '10s',
  THIRTY_SECONDS = '30s',
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m'
}

export enum ConfidenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum DataRetention {
  THIRTY_DAYS = '30d',
  NINETY_DAYS = '90d',
  ONE_YEAR = '1y',
  FOREVER = 'forever'
}

export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never'
}

export enum SessionTimeout {
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  EIGHT_HOURS = '8h',
  NEVER = 'never'
}