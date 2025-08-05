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
    try {
      // Get all completed jobs
      const response = await analysisAPI.getQueue('completed');
      const completedJobs = response.jobs;
      
      // Count unviewed completed jobs
      const unviewed = completedJobs.filter(job => !viewedJobs.has(job.id));
      setUnviewedCount(unviewed.length);
    } catch (error) {
      console.error('Error fetching queue data:', error);
      // Don't update count on error to avoid showing incorrect data
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
    refreshUnviewedCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(refreshUnviewedCount, 30000);
    return () => clearInterval(interval);
  }, [viewedJobs]); // Re-run when viewedJobs changes

  const value: QueueContextType = {
    unviewedCount,
    markAsViewed,
    refreshUnviewedCount,
    isJobViewed,
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}