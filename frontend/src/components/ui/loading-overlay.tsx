"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  subMessage?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  message = "Processing...", 
  subMessage 
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[#0a0a0f]/90 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="flex flex-col items-center gap-4 p-8"
          >
            {/* Animated loader */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 blur-xl opacity-50 animate-pulse" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            </div>
            
            {/* Message */}
            <div className="text-center">
              <p className="text-lg font-medium text-white">{message}</p>
              {subMessage && (
                <p className="text-sm text-zinc-400 mt-1">{subMessage}</p>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-white/30"
                  animate={{
                    backgroundColor: ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.8)", "rgba(255,255,255,0.3)"],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
