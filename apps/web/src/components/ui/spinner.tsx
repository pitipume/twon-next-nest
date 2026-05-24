'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Small inline spinner — used inside buttons
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5 animate-spin text-violet-600', className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// Full-page loader — branded ✦ mark, swap animation here to restyle globally
export function PageSpinner() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <motion.span
        className="select-none text-4xl text-violet-500"
        animate={{ rotate: 360, scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
      >
        ✦
      </motion.span>
    </div>
  );
}
