import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'top', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [calculatedPosition, setCalculatedPosition] = useState(position);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && containerRef.current && tooltipRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let newPosition = position;

      // Simple collision detection for top/bottom
      if (position === 'top' && containerRect.top < tooltipRect.height + 10) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && window.innerHeight - containerRect.bottom < tooltipRect.height + 10) {
        newPosition = 'top';
      }
      
      // Simple collision detection for left/right
      if (position === 'left' && containerRect.left < tooltipRect.width + 10) {
        newPosition = 'right';
      } else if (position === 'right' && window.innerWidth - containerRect.right < tooltipRect.width + 10) {
        newPosition = 'left';
      }

      setCalculatedPosition(newPosition);
    }
  }, [isVisible, position]);

  const getPositionClasses = () => {
    switch (calculatedPosition) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.8, y: calculatedPosition === 'top' ? 10 : calculatedPosition === 'bottom' ? -10 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: calculatedPosition === 'top' ? 10 : calculatedPosition === 'bottom' ? -10 : 0 }}
            className={`absolute z-[100] px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-xl whitespace-nowrap pointer-events-none ${getPositionClasses()}`}
          >
            {content}
            {/* Arrow */}
            <div className={`absolute border-4 border-transparent ${
              calculatedPosition === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-slate-800' :
              calculatedPosition === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-slate-800' :
              calculatedPosition === 'left' ? 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-slate-800' :
              'right-full top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-slate-800'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;

