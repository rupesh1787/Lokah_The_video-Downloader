"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Loader2,
  Wifi,
  WifiOff,
  Link2,
  Download,
  Clock
} from "lucide-react";

// Toast types
type ToastType = "success" | "error" | "info" | "loading" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  dismissible?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Toast icons mapping
const toastIcons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  loading: Loader2,
  warning: AlertCircle,
};

// Toast colors mapping
const toastColors: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: "text-emerald-400",
  },
  error: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: "text-red-400",
  },
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: "text-blue-400",
  },
  loading: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    icon: "text-purple-400",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: "text-amber-400",
  },
};

// Single Toast Component
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const Icon = toastIcons[toast.type];
  const colors = toastColors[toast.type];

  useEffect(() => {
    if (toast.type !== "loading" && toast.duration !== 0) {
      const timer = setTimeout(() => {
        onRemove();
      }, toast.duration || 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex items-start gap-3 p-4 rounded-xl border ${colors.bg} ${colors.border} backdrop-blur-xl shadow-lg max-w-sm w-full`}
    >
      <div className={`flex-shrink-0 ${colors.icon}`}>
        <Icon className={`h-5 w-5 ${toast.type === "loading" ? "animate-spin" : ""}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-zinc-400 mt-1">{toast.description}</p>
        )}
      </div>
      {toast.dismissible !== false && toast.type !== "loading" && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}

// Toast Container Component
export function ToastContainer({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      {/* Toast Portal */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// Hook to use toasts
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastContainer");
  }

  const { addToast, removeToast, clearToasts } = context;

  // Convenience methods for common toast types
  const toast = {
    success: (title: string, description?: string) =>
      addToast({ type: "success", title, description }),
    
    error: (title: string, description?: string) =>
      addToast({ type: "error", title, description, duration: 6000 }),
    
    info: (title: string, description?: string) =>
      addToast({ type: "info", title, description }),
    
    warning: (title: string, description?: string) =>
      addToast({ type: "warning", title, description, duration: 5000 }),
    
    loading: (title: string, description?: string) =>
      addToast({ type: "loading", title, description, duration: 0, dismissible: false }),
    
    // Specific app-related toasts
    analyzing: () =>
      addToast({ 
        type: "loading", 
        title: "Analyzing video...", 
        description: "This may take a few seconds",
        duration: 0,
        dismissible: false 
      }),
    
    invalidLink: () =>
      addToast({ 
        type: "error", 
        title: "Invalid link", 
        description: "Please enter a valid YouTube, TikTok, or Instagram URL" 
      }),
    
    unsupportedSite: () =>
      addToast({ 
        type: "warning", 
        title: "Unsupported platform", 
        description: "We currently support YouTube, TikTok, and Instagram" 
      }),
    
    backendOffline: () =>
      addToast({ 
        type: "error", 
        title: "Server unavailable", 
        description: "Please try again in a moment" 
      }),
    
    downloadStarted: () =>
      addToast({ 
        type: "success", 
        title: "Download started!", 
        description: "Your file will be ready shortly" 
      }),
    
    downloadReady: () =>
      addToast({ 
        type: "success", 
        title: "Ready to download!", 
        description: "Click the download button to save your file" 
      }),
    
    jobExpired: () =>
      addToast({ 
        type: "warning", 
        title: "Session expired", 
        description: "Please analyze the video again" 
      }),
    
    processingStarted: () =>
      addToast({ 
        type: "info", 
        title: "Processing video...", 
        description: "Preparing your download" 
      }),

    custom: addToast,
    remove: removeToast,
    clear: clearToasts,
  };

  return toast;
}

export { ToastContext };
export type { Toast, ToastType };
