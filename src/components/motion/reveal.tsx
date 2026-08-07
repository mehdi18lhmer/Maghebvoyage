"use client";

import { motion } from "framer-motion";

export function Reveal({
  children,
  delay = 0,
  className,
  y = 16,
  immediate = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  /**
   * Render with no entrance animation at all. Use for everything above the
   * fold: a scroll reveal starts at opacity 0 and only becomes visible once
   * JS runs an animation frame, so hero copy would stay invisible whenever
   * that never happens — reduced-motion users, a failed hydration, or a tab
   * restored from the background. The first screen must not depend on it.
   */
  immediate?: boolean;
}) {
  if (immediate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className, y = 16 }: { children: React.ReactNode; className?: string; y?: number }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
