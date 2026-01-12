"use client";

import { motion } from "framer-motion";

interface VideoCardProps {
  title?: string;
  thumbnail?: string;
  duration?: string;
}

export function VideoCard({ title, thumbnail, duration }: VideoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border bg-card p-4 shadow-sm"
    >
      {thumbnail && (
        <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
          <img src={thumbnail} alt={title} className="object-cover w-full h-full" />
          {duration && (
            <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {duration}
            </span>
          )}
        </div>
      )}
      {title && <h3 className="mt-3 font-medium line-clamp-2">{title}</h3>}
    </motion.div>
  );
}
