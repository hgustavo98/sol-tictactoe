import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1];

const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.2, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: EASE_IN },
  },
};

interface ViewTransitionProps {
  viewKey: string;
  children: ReactNode;
  className?: string;
}

export function ViewTransition({
  viewKey,
  children,
  className,
}: ViewTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("app-view-transition", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export const slideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 120 : -120,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.38, ease: EASE_OUT },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -120 : 120,
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.28, ease: EASE_IN },
  }),
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

export const stagger: Variants = {
  show: { transition: { staggerChildren: 0.08 } },
};
