"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { analysisAPI, AnalysisJob } from './api';

interface QueueContextType {
  unviewedCount: number;
  markAsViewed: (jobId: number) => void;
  refreshUnviewedCount: () => Promise<void>;
  isJobViewed: (jobId: number) => boolean;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};

interface QueueProviderProps {
  children: ReactNode;
}

export function QueueProvider({ children }: QueueProviderProps) {
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [viewedJobs, setViewedJobs] = useState<Set<number>>(new Set());
  const [errorCount, setErrorCount] = useState(0);
  const [isPolling, setIsPolling] = useState(true);

  // Load viewed jobs from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('viewed_analysis_jobs');
    if (stored) {
      try {
        const viewedArray = JSON.parse(stored);
        setViewedJobs(new Set(viewedArray));
      } catch (error) {
        console.error('Error loading viewed jobs from localStorage:', error);
      }
    }
  }, []);

  // Save viewed jobs to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('viewed_analysis_jobs', JSON.stringify(Array.from(viewedJobs)));
  }, [viewedJobs]);

  const refreshUnviewedCount = async () => {
    // Stop polling if too many consecutive errors
    if (!isPolling || errorCount >= 5) {
      console.warn('Queue polling stopped due to repeated errors');
      return;
    }

    try {
      // Get all completed jobs
      const response = await analysisAPI.getQueue('completed');
      const completedJobs = response.jobs;
      
      // Count unviewed completed jobs
      const unviewed = completedJobs.filter(job => !viewedJobs.has(job.id));
      setUnviewedCount(unviewed.length);
      
      // Reset error count on success
      setErrorCount(0);
    } catch (error: any) {
      console.error('Error fetching queue data:', error);
      
      // Increment error count
      setErrorCount(prev => prev + 1);
      
      // If unauthorized or rate limited, stop polling completely
      if (error.status === 401 || error.message?.includes('Unauthorized')) {
        console.warn('Authentication failed, stopping queue polling');
        setIsPolling(false);
        setUnviewedCount(0);
        return;
      }
      
      if (error.status === 429 || error.message?.includes('busy')) {
        console.warn('Rate limited, temporarily stopping queue polling');
        setIsPolling(false);
        // Re-enable polling after 30 seconds
        setTimeout(() => {
          console.log('Re-enabling queue polling after rate limit');
          setIsPolling(true);
          setErrorCount(0);
        }, 30000);
        return;
      }
      
      // Stop polling after 5 consecutive errors
      if (errorCount >= 4) {
        console.warn('Too many queue polling errors, stopping');
        setIsPolling(false);
      }
    }
  };

  const markAsViewed = (jobId: number) => {
    setViewedJobs(prev => {
      const newSet = new Set(prev);
      newSet.add(jobId);
      return newSet;
    });
    
    // Immediately update the count
    setUnviewedCount(prev => Math.max(0, prev - 1));
  };

  const isJobViewed = (jobId: number) => {
    return viewedJobs.has(jobId);
  };

  // Refresh count on mount and periodically
  useEffect(() => {
    if (isPolling) {
      refreshUnviewedCount();
    }
    
    // Only set up interval if polling is enabled
    if (!isPolling) return;
    
    // Refresh every 60 seconds (increased from 30 to reduce load)
    const interval = setInterval(() => {
      if (isPolling) {
        refreshUnviewedCount();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [viewedJobs, isPolling, errorCount]); // Re-run when polling state changes

  const value: QueueContextType = {
    unviewedCount,
    markAsViewed,
    refreshUnviewedCount,
    isJobViewed,
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}