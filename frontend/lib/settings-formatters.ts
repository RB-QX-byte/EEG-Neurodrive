// String formatters for settings values
export const formatThemeMode = (mode: string): string => {
  const modes: Record<string, string> = {
    light: 'Light',
    dark: 'Dark', 
    system: 'System'
  };
  return modes[mode] || mode;
};

export const formatRefreshInterval = (interval: string): string => {
  const intervals: Record<string, string> = {
    never: 'Never',
    '5s': '5 seconds',
    '10s': '10 seconds',
    '30s': '30 seconds',
    '1m': '1 minute',
    '5m': '5 minutes'
  };
  return intervals[interval] || interval;
};

export const formatDataRetention = (retention: string): string => {
  const retentions: Record<string, string> = {
    '30d': '30 days',
    '90d': '90 days',
    '1y': '1 year',
    forever: 'Forever'
  };
  return retentions[retention] || retention;
};

export const formatConfidenceLevel = (level: string): string => {
  return level.charAt(0).toUpperCase() + level.slice(1);
};

export const formatSessionTimeout = (timeout: string): string => {
  const timeouts: Record<string, string> = {
    '15m': '15 minutes',
    '30m': '30 minutes',
    '1h': '1 hour',
    '4h': '4 hours',
    '8h': '8 hours',
    never: 'Never'
  };
  return timeouts[timeout] || timeout;
};