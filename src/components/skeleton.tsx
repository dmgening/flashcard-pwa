import { motion } from "motion/react";
import { useAnim } from "@/lib/transitions";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  const anim = useAnim();
  if (anim.reduced) {
    return <div className={`bg-neutral-900 rounded-xl ${className}`} />;
  }
  return (
    <div className={`relative overflow-hidden bg-neutral-900 rounded-xl ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-800/40 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
      />
    </div>
  );
}

export function DeckLoadingSkeleton() {
  return (
    <div className="p-4 flex flex-col gap-3 h-full">
      <SkeletonBlock className="h-8 w-32" />
      <SkeletonBlock className="flex-1" />
      <div className="flex gap-2">
        <SkeletonBlock className="h-12 flex-1" />
        <SkeletonBlock className="h-12 flex-1" />
      </div>
    </div>
  );
}
