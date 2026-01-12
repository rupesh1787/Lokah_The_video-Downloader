"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Scissors,
  MessageSquare,
  Sparkles,
  Check,
  Clock,
  Music,
  Film,
  Youtube,
  ChevronDown,
  RotateCcw,
  X,
  Info,
  HelpCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { useToast } from "@/components/ui/toast";
import {
  AnalyzeResponse,
  processVideo,
  getProgress,
  getDownloadUrl,
  cleanupJob,
} from "@/services/api";

type ViewMode = "download" | "processing" | "completed" | "error";

// Error messages mapping for user-friendly display
const ERROR_MESSAGES: Record<string, string> = {
  "Failed to fetch": "Unable to connect to server. Please check your internet connection.",
  "Network Error": "Unable to connect to server. Please check your internet connection.",
  "Processing failed": "Video processing failed. Please try again or use a different quality.",
  "Job expired": "This session has expired. Please start a new download.",
  "timeout": "Request timed out. Please try again.",
  "default": "Something went wrong. Please try again."
};

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return ERROR_MESSAGES.default;
}

export default function AnalyzePage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const toast = useToast();

  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>("1080p");
  const [viewMode, setViewMode] = useState<ViewMode>("download");
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pollFailCount, setPollFailCount] = useState(0);

  // Handle reset and navigate home
  const handleReset = async () => {
    setIsNavigating(true);
    try {
      // Cancel any active job
      if (jobId && isProcessing) {
        await cleanupJob(jobId);
      }
    } catch {
      // Ignore cleanup errors
    }
    sessionStorage.removeItem("lokah_analysis");
    router.push("/");
  };

  // Load analysis from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("lokah_analysis");
    if (stored) {
      try {
        const data = JSON.parse(stored) as AnalyzeResponse;
        if (data.jobId === jobId) {
          setAnalysis(data);
          // Select default quality
          const defaultFormat = data.formats.find(f => f.preset === "1080p") || data.formats[0];
          if (defaultFormat) {
            setSelectedQuality(defaultFormat.preset || defaultFormat.quality);
          }
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      }
    } else {
      router.push("/");
    }
  }, [jobId, router]);

  // Poll progress when processing
  const pollProgress = useCallback(async () => {
    if (!isProcessing) return;

    try {
      const progressData = await getProgress(jobId);
      setProgress(progressData.progress);
      setProgressStage(progressData.stage);
      setPollFailCount(0); // Reset fail count on success

      if (progressData.status === "completed") {
        setViewMode("completed");
        setIsProcessing(false);
        toast.downloadReady();
      } else if (progressData.status === "failed") {
        setError(progressData.error || "Processing failed");
        setIsProcessing(false);
        setViewMode("error");
        toast.error("Processing failed", "Please try again or select a different quality");
      }
    } catch (err) {
      console.error("Progress poll error:", err);
      setPollFailCount(prev => prev + 1);
      
      // After 5 consecutive failures, show error
      if (pollFailCount >= 5) {
        setError("Connection lost. Please check your internet and retry.");
        setIsProcessing(false);
        setViewMode("error");
        toast.backendOffline();
      }
    }
  }, [jobId, isProcessing, pollFailCount, toast]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(pollProgress, 1000);
    }
    return () => clearInterval(interval);
  }, [isProcessing, pollProgress]);

  const handleDownload = async () => {
    setError(null);
    setIsProcessing(true);
    setViewMode("processing");
    setProgress(0);
    setPollFailCount(0);
    toast.processingStarted();

    try {
      await processVideo(jobId, selectedQuality);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      setIsProcessing(false);
      setViewMode("error");
      toast.error("Download failed", errorMsg);
    }
  };

  // Retry handler
  const handleRetry = () => {
    setError(null);
    setViewMode("download");
    setPollFailCount(0);
  };

  const handleActualDownload = () => {
    const url = getDownloadUrl(jobId);
    window.open(url, "_blank");
    toast.downloadStarted();
  };

  if (!analysis) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <LoadingOverlay isVisible={true} message="Loading analysis..." subMessage="Please wait" />
      </div>
    );
  }

  const { video, formats, aiInsight } = analysis;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Navigation Loading Overlay */}
      <LoadingOverlay 
        isVisible={isNavigating} 
        message="Redirecting..." 
        subMessage="Cleaning up session" 
      />
      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowAbout(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a0f] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-400" />
                About Lokah
              </h2>
              <button onClick={() => setShowAbout(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 text-zinc-300 text-sm">
              <p>
                <strong className="text-white">Lokah</strong> is a free video downloader that lets you save videos from popular platforms for personal use.
              </p>
              <div>
                <h3 className="font-medium text-white mb-2">Supported Platforms</h3>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                  <li>YouTube (public videos)</li>
                  <li>TikTok</li>
                  <li>Instagram (public posts & reels)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-white mb-2">Usage Notes</h3>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                  <li>Only download videos you have permission to use</li>
                  <li>Downloads are for personal use only</li>
                  <li>Files are temporarily stored and auto-deleted</li>
                  <li>Maximum video duration: 30 minutes</li>
                </ul>
              </div>
              <p className="text-xs text-zinc-500 pt-2 border-t border-white/10">
                © 2026 Lokah. Respect copyright and creator rights.
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Support Modal */}
      {showSupport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowSupport(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a0f] p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-emerald-400" />
                Support
              </h2>
              <button onClick={() => setShowSupport(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <p className="text-zinc-300">
                Need help with Lokah? We&apos;re here to assist you.
              </p>
              <div className="space-y-3">
                <a 
                  href="mailto:support@lokah.app?subject=Lokah Support Request"
                  className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <span className="text-lg">📧</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">Email Support</p>
                    <p className="text-xs text-zinc-500">support@lokah.app</p>
                  </div>
                </a>
                <a 
                  href="https://github.com/rupesh1787/Lokah_The_video-Downloader/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span className="text-lg">🐛</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">Report a Bug</p>
                    <p className="text-xs text-zinc-500">GitHub Issues</p>
                  </div>
                </a>
              </div>
              <p className="text-xs text-zinc-500 pt-2">
                Typical response time: 24-48 hours
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Youtube className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <span className="text-base sm:text-lg font-semibold">Lokah</span>
            </button>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] sm:text-xs hidden sm:inline-flex">
              BETA
            </Badge>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-zinc-400 hover:text-white hidden sm:inline-flex"
              onClick={() => setShowAbout(true)}
            >
              <Info className="h-4 w-4 mr-2" />
              About
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-zinc-400 hover:text-white hidden sm:inline-flex"
              onClick={() => setShowSupport(true)}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Support
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-zinc-400 hover:text-white text-xs sm:text-sm px-2 sm:px-3"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Download</span>
            </Button>
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-white/5 bg-[#0a0a0f]">
        <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <button 
              onClick={handleReset} 
              className="text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-white">Video Analysis</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="grid lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Video Preview */}
          <div className="space-y-4 sm:space-y-6">
            {/* Video Thumbnail */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-white/5"
            >
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
                <Badge className="bg-emerald-500/90 text-white border-0 text-[10px] sm:text-xs">
                  <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  Processed
                </Badge>
              </div>
              <div className="aspect-video relative">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <Film className="h-10 w-10 sm:h-12 sm:w-12 text-zinc-600" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-black/80 px-2 py-1 rounded text-xs sm:text-sm font-medium">
                  {video.duration}
                </div>
              </div>
            </motion.div>

            {/* Video Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-lg sm:text-xl font-semibold mb-2 line-clamp-2">{video.title}</h1>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  </div>
                  <span>Analysis by {aiInsight.model}</span>
                </div>
              </div>
            </motion.div>

            {/* AI Insight - Hidden on mobile, shown on larger screens */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden sm:block rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-400">AI INSIGHT</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {aiInsight.recommendation}
              </p>
            </motion.div>

            {/* File Specs - Hidden on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="hidden sm:block rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                FILE SPECS
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Resolution</p>
                  <p className="text-sm font-medium">{video.fileSpecs.resolution}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Frame Rate</p>
                  <p className="text-sm font-medium">{video.fileSpecs.frameRate}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Original Size</p>
                  <p className="text-sm font-medium">{video.fileSpecs.originalSize}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Codec</p>
                  <p className="text-sm font-medium">{video.fileSpecs.codec}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-4 sm:space-y-6">
            {/* Tabs - Scrollable on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 border-b border-white/10 pb-3 sm:pb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
            >
              <Button
                variant={viewMode === "download" || viewMode === "processing" || viewMode === "completed" || viewMode === "error" ? "default" : "ghost"}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0 text-xs sm:text-sm"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Download
              </Button>
              <Button 
                variant="ghost" 
                className="rounded-xl text-zinc-500 cursor-not-allowed opacity-60 flex-shrink-0 text-xs sm:text-sm"
                disabled
                title="Coming soon"
              >
                <Scissors className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Clip
                <Badge className="ml-1.5 sm:ml-2 text-[8px] sm:text-[9px] bg-zinc-700/50 text-zinc-400 border-zinc-600">Soon</Badge>
              </Button>
              <Button 
                variant="ghost" 
                className="rounded-xl text-zinc-500 cursor-not-allowed opacity-60 flex-shrink-0 text-xs sm:text-sm hidden sm:flex"
                disabled
                title="Coming soon"
              >
                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Captions
                <Badge className="ml-1.5 sm:ml-2 text-[8px] sm:text-[9px] bg-zinc-700/50 text-zinc-400 border-zinc-600">Soon</Badge>
              </Button>
              <Button 
                variant="ghost" 
                className="rounded-xl text-zinc-500 cursor-not-allowed opacity-60 flex-shrink-0 text-xs sm:text-sm hidden sm:flex"
                disabled
                title="Coming soon"
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                AI Tools
                <Badge className="ml-1.5 sm:ml-2 text-[8px] sm:text-[9px] bg-zinc-700/50 text-zinc-400 border-zinc-600">Soon</Badge>
              </Button>
            </motion.div>

            {/* Error View with Retry */}
            {viewMode === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl sm:rounded-2xl border border-red-500/30 bg-red-500/10 p-6 sm:p-8 text-center"
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-2">Something went wrong</h2>
                <p className="text-zinc-400 mb-6 text-sm sm:text-base">
                  {error || "Processing failed. Please try again."}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-white/10 w-full sm:w-auto"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start Over
                  </Button>
                  <Button
                    onClick={handleRetry}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 sm:px-8 w-full sm:w-auto"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Processing View */}
            {viewMode === "processing" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-8"
              >
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-semibold mb-2">Processing Video...</h2>
                  <p className="text-zinc-500 text-xs sm:text-sm uppercase tracking-wider">
                    {progressStage || "PREPARING DOWNLOAD..."}
                  </p>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-sm sm:text-base">Processing video</p>
                        <p className="text-[10px] sm:text-xs text-zinc-500 font-mono">
                          ID: {jobId.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <span className="text-2xl sm:text-3xl font-bold text-emerald-400">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 sm:h-2 bg-white/10" />
                    <div className="flex items-center justify-between mt-4 text-[10px] sm:text-xs">
                      <span className={`flex items-center gap-1 ${progress >= 20 ? "text-blue-400" : "text-zinc-500"}`}>
                        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Initialized
                      </span>
                      <span className={`flex items-center gap-1 ${progress >= 60 ? "text-blue-400" : "text-zinc-500"}`}>
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Processing
                      </span>
                      <span className={`flex items-center gap-1 ${progress >= 90 ? "text-blue-400" : "text-zinc-500"}`}>
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Finalizing
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Download View */}
            {viewMode === "download" && (
              <>
                {/* Export Quality */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold">Export Quality</h2>
                      <p className="text-xs sm:text-sm text-zinc-500">
                        Select format for your download.
                      </p>
                    </div>
                    <Button variant="ghost" className="text-zinc-400 text-xs sm:text-sm self-start sm:self-auto">
                      MP4 (H.264)
                      <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
                    </Button>
                  </div>

                  {/* Quality Options - Stack on mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    {formats.filter(f => f.type === "video").slice(0, 3).map((format) => (
                      <motion.button
                        key={format.preset || format.quality}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedQuality(format.preset || format.quality)}
                        className={`relative rounded-xl border p-3 sm:p-4 text-left transition-all ${
                          selectedQuality === (format.preset || format.quality)
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        {format.badge && (
                          <Badge 
                            className={`absolute -top-2 left-2 sm:left-3 text-[8px] sm:text-[10px] ${
                              format.badge === "BEST QUALITY" 
                                ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                                : format.badge === "MOST POPULAR"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            }`}
                          >
                            {format.badge}
                          </Badge>
                        )}
                        <div className="flex items-center justify-between mb-2 sm:mb-3 mt-1 sm:mt-2">
                          <h3 className="font-semibold text-base sm:text-lg">{format.label}</h3>
                          <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedQuality === (format.preset || format.quality)
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-zinc-600"
                          }`}>
                            {selectedQuality === (format.preset || format.quality) && (
                              <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                            )}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-500 mb-1 sm:mb-2">
                          {format.height}p • {format.fps}fps
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm text-zinc-400">{format.filesizeFormatted}</span>
                          <Film className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-zinc-600" />
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Audio Option */}
                  {formats.find(f => f.type === "audio") && (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedQuality("audio")}
                      className={`w-full rounded-xl border p-3 sm:p-4 flex items-center justify-between transition-all ${
                        selectedQuality === "audio"
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Music className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium text-sm sm:text-base">Extract Audio Only</h3>
                          <p className="text-xs sm:text-sm text-zinc-500">MP3 • 320kbps</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <span className="text-xs sm:text-sm text-zinc-400 hidden sm:inline">
                          {formats.find(f => f.type === "audio")?.filesizeFormatted || "~ MB"}
                        </span>
                        <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedQuality === "audio"
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-zinc-600"
                        }`}>
                          {selectedQuality === "audio" && (
                            <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                          )}
                        </div>
                      </div>
                    </motion.button>
                  )}
                </motion.div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Actions - Stack on mobile */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-zinc-500">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Estimated</span>
                    <span className="text-emerald-400 font-medium">{"< 30s"}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <Button 
                      variant="outline" 
                      className="border-white/10 text-white hover:bg-white/5 text-sm sm:text-base"
                      onClick={handleReset}
                    >
                      <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                      New Download
                    </Button>
                    <Button 
                      onClick={handleDownload}
                      disabled={isProcessing}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 sm:px-6 text-sm sm:text-base"
                    >
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                      Download Now
                    </Button>
                  </div>
                </motion.div>
              </>
            )}

            {/* Completed View */}
            {viewMode === "completed" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 sm:p-6 md:p-8 text-center"
              >
                <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Check className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-emerald-400" />
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">Ready to Download!</h2>
                <p className="text-xs sm:text-sm md:text-base text-zinc-400 mb-4 sm:mb-6">
                  Your video has been processed successfully.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2 sm:gap-3 md:gap-4">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="border-white/10 text-sm sm:text-base"
                  >
                    <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    New Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setViewMode("download")}
                    className="border-white/10 text-sm sm:text-base"
                  >
                    Different Quality
                  </Button>
                  <Button
                    onClick={handleActualDownload}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 sm:px-6 md:px-8 text-sm sm:text-base"
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    Download File
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}