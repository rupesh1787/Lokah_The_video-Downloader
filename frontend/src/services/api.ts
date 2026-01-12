/**
 * Lokah API Service
 * Handles all communication with the backend
 */

// Only use localhost in development, require proper env var in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (
  typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : ''
);

// Validate API URL is configured
if (typeof window !== 'undefined' && !API_BASE_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not configured. API calls may fail.');
}

export interface VideoFormat {
  formatId: string;
  type: 'video' | 'audio';
  quality: string;
  height?: number;
  width?: number;
  fps?: number;
  ext: string;
  filesize: number;
  filesizeFormatted: string;
  codec: string;
  label: string;
  preset?: string;
  badge?: string | null;
  bitrate?: number;
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  uploader: string;
  viewCount: number;
  fileSpecs: {
    resolution: string;
    frameRate: string;
    codec: string;
    originalSize: string;
  };
}

export interface AIInsight {
  model: string;
  confidence: number;
  recommendation: string;
  insights: string[];
}

export interface AnalyzeResponse {
  success: boolean;
  jobId: string;
  platform: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  video: VideoInfo;
  formats: VideoFormat[];
  aiInsight: AIInsight;
  error?: string;
}

export interface ProgressResponse {
  success: boolean;
  jobId: string;
  status: 'pending' | 'analyzing' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  stage: string;
  stages: Record<string, { status: string; message: string }>;
  error?: string;
  canDownload: boolean;
  expiresAt?: string;
}

export interface ProcessResponse {
  success: boolean;
  jobId: string;
  status: string;
  message: string;
  selectedFormat: VideoFormat;
  error?: string;
}

/**
 * Check backend health
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.json();
  } catch (error) {
    throw new Error('Backend offline');
  }
}

/**
 * Analyze a video URL
 */
export async function analyzeVideo(url: string): Promise<AnalyzeResponse> {
  if (!API_BASE_URL) {
    throw new Error('API not configured. Please contact support.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw new Error('Failed to fetch');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to analyze video');
  }
  
  return data;
}

/**
 * Start processing a video
 */
export async function processVideo(jobId: string, quality?: string): Promise<ProcessResponse> {
  if (!API_BASE_URL) {
    throw new Error('API not configured. Please contact support.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId, quality }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw new Error('Failed to fetch');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to process video');
  }
  
  return data;
}

/**
 * Get job progress
 */
export async function getProgress(jobId: string): Promise<ProgressResponse> {
  if (!API_BASE_URL) {
    throw new Error('API not configured');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/progress/${jobId}`, {
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new Error('Failed to fetch');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get progress');
  }
  
  return data;
}

/**
 * Get download URL
 */
export function getDownloadUrl(jobId: string): string {
  return `${API_BASE_URL}/api/download/${jobId}`;
}

/**
 * Cancel and cleanup job
 */
export async function cleanupJob(jobId: string): Promise<void> {
  if (!API_BASE_URL) {
    return; // Silently fail if API not configured
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/cleanup/${jobId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to cleanup job');
    }
  } catch {
    // Silently fail cleanup errors - not critical
  }
}
