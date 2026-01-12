"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Link2, 
  Zap, 
  Shield, 
  Sparkles, 
  Clock, 
  Youtube,
  Download,
  Scissors,
  Copy,
  X,
  HelpCircle,
  Info,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { analyzeVideo } from "@/services/api";

// Error messages mapping for user-friendly display
const ERROR_MESSAGES: Record<string, string> = {
  "Failed to fetch": "Unable to connect to server. Please check your internet connection and try again.",
  "Network Error": "Unable to connect to server. Please check your internet connection and try again.",
  "Invalid URL": "Please enter a valid video URL from YouTube, TikTok, or Instagram.",
  "Unsupported platform": "This platform is not supported. Please use YouTube, TikTok, or Instagram links.",
  "Video not found": "Video not found. Please check the URL and try again.",
  "Video unavailable": "This video is unavailable or may be private.",
  "default": "Something went wrong. Please try again later."
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

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  // Clear any stale job data on home page load
  useEffect(() => {
    sessionStorage.removeItem("lokah_analysis");
  }, []);

  const handleReset = () => {
    setUrl("");
    setError(null);
    setIsLoading(false);
    inputRef.current?.focus();
  };

  // Handle paste detection - auto-analyze on paste
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText && isValidVideoUrl(pastedText.trim())) {
      // Let the paste happen naturally, then trigger analysis after state updates
      setTimeout(() => {
        const form = e.currentTarget.closest("form");
        if (form) {
          form.requestSubmit();
        }
      }, 100);
    }
  };

  // Simple URL validation
  const isValidVideoUrl = (text: string): boolean => {
    const patterns = [
      /youtube\.com\/watch/i,
      /youtu\.be\//i,
      /tiktok\.com/i,
      /instagram\.com/i,
      /^https?:\/\//i
    ];
    return patterns.some(pattern => pattern.test(text));
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Basic URL validation
    if (!url.trim().startsWith("http")) {
      toast.invalidLink();
      setError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setIsLoading(true);
    setError(null);
    toast.analyzing();

    try {
      const result = await analyzeVideo(url.trim());
      sessionStorage.setItem("lokah_analysis", JSON.stringify(result));
      setIsNavigating(true);
      toast.processingStarted();
      router.push(`/analyze/${result.jobId}`);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      
      // Show appropriate toast based on error type
      if (message.includes("connect")) {
        toast.backendOffline();
      } else if (message.includes("not supported")) {
        toast.unsupportedSite();
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Shield, label: "No signup required" },
    { icon: Zap, label: "Fast download" },
    { icon: Shield, label: "Secure processing" },
    { icon: Clock, label: "Lightning fast" },
  ];

  const workflow = [
    {
      icon: Copy,
      step: "1. Copy Link",
      description: "Copy the URL from your platform of choice.",
    },
    {
      icon: Scissors,
      step: "2. Paste & Process",
      description: "Our engine automatically parses the source.",
    },
    {
      icon: Download,
      step: "3. Export",
      description: "Save the raw video file to your local drive.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
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

      {/* Loading Overlay for Navigation */}
      <LoadingOverlay isVisible={isNavigating} message="Loading analysis..." />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <Youtube className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <span className="text-base sm:text-lg font-semibold">Lokah</span>
          </button>
          
          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <button 
              onClick={() => setShowAbout(true)}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              About
            </button>
            <button 
              onClick={() => setShowSupport(true)}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Support
            </button>
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-white/5 bg-[#0a0a0f]/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-3 flex flex-col gap-2">
              <button 
                onClick={() => { setShowAbout(true); setShowMobileMenu(false); }}
                className="text-left text-sm text-zinc-400 hover:text-white transition-colors py-2"
              >
                About
              </button>
              <button 
                onClick={() => { setShowSupport(true); setShowMobileMenu(false); }}
                className="text-left text-sm text-zinc-400 hover:text-white transition-colors py-2"
              >
                Support
              </button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Hero Section */}
      <main className="relative pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] md:w-[800px] h-[200px] sm:h-[300px] md:h-[400px] bg-blue-500/10 rounded-full blur-[80px] sm:blur-[100px] md:blur-[120px]" />
        </div>

        <div className="container relative mx-auto px-4 sm:px-6">
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-6 sm:mb-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
              <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-400">Ready for analysis</span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center max-w-4xl mx-auto mb-4 sm:mb-6"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight">
              Turn any video into{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                usable content
              </span>{" "}
              in seconds.
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center text-sm sm:text-base md:text-lg lg:text-xl text-zinc-400 max-w-2xl mx-auto mb-8 sm:mb-10 md:mb-12 px-2"
          >
            Download, clip, and convert videos from YouTube, TikTok, and Instagram — no signup required.
          </motion.p>

          {/* URL Input Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto mb-6 sm:mb-8"
          >
            <form onSubmit={handleAnalyze}>
              <div className="relative rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-1.5 sm:p-2 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-2 sm:p-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1">
                    <Link2 className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-500 flex-shrink-0" />
                    <input
                      ref={inputRef}
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onPaste={handlePaste}
                      placeholder="Paste any video link..."
                      className="flex-1 bg-transparent text-white placeholder:text-zinc-500 focus:outline-none text-sm sm:text-base min-w-0"
                      disabled={isLoading}
                    />
                    {url && !isLoading && (
                      <button
                        type="button"
                        onClick={handleReset}
                        className="text-zinc-500 hover:text-white transition-colors p-1"
                        aria-label="Clear input"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading || !url.trim()}
                    className="rounded-lg sm:rounded-xl bg-white text-black hover:bg-zinc-200 px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base font-medium transition-all disabled:opacity-50 w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                        <span className="sm:inline">Analyzing...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>Analyze</span>
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </span>
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-3 sm:gap-4 px-3 sm:px-4 pb-2 sm:pb-3 pt-0.5 sm:pt-1 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Youtube className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-zinc-600" />
                    <span className="text-[10px] sm:text-xs text-zinc-600">YouTube</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-zinc-600">🎵 TikTok</span>
                  <span className="text-[10px] sm:text-xs text-zinc-600">📸 Instagram</span>
                </div>
              </div>
            </form>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm text-center"
              >
                {error}
              </motion.div>
            )}
          </motion.div>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-16 sm:mb-20 md:mb-24 px-2"
          >
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-400"
              >
                <feature.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{feature.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Workflow Section */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4">Workflow</h2>
            <p className="text-xs sm:text-sm md:text-base text-zinc-400 mb-8 sm:mb-10 md:mb-12 px-4">
              Professional-grade extraction in three simple steps.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto px-4">
              {workflow.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 mb-3 sm:mb-4">
                    <item.icon className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                  </div>
                  <h3 className="font-medium text-white text-sm sm:text-base mb-1 sm:mb-2">{item.step}</h3>
                  <p className="text-xs sm:text-sm text-zinc-500">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-zinc-500">
              <button 
                onClick={() => setShowAbout(true)} 
                className="hover:text-white transition-colors"
              >
                About
              </button>
              <button 
                onClick={() => setShowSupport(true)} 
                className="hover:text-white transition-colors"
              >
                Support
              </button>
              <a 
                href="https://github.com/rupesh1787/Lokah_The_video-Downloader"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                GitHub
              </a>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600">
              © 2026 Lokah. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
