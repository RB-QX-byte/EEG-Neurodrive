// Formatting functions for EEG application
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatChannelName = (channel: string): string => {
  return channel.replace('channel_', 'Ch ');
};

export const formatTimeValue = (value: string): string => {
  return new Date(value).toLocaleTimeString();
};

export const formatDateShort = (value: string): string => {
  return new Date(value).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

export const formatProgress = (progress: number): string => {
  return `${progress}%`;
};