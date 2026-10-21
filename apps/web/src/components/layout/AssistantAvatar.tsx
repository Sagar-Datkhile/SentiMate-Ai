'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface AssistantAvatarProps {
  className?: string;
  animated?: boolean;
  isLatest?: boolean;
}

/**
 * Shared Assistant Avatar component for Sentimate assistant replies.
 * - For the most recent reply (isLatest / animated = true):
 *   Renders the colorful vector orb with mouse-tracking eyes and subtle eye blink.
 * - For earlier replies (isLatest = false):
 *   Renders the clean static monochrome assistant avatar icon.
 */
export function AssistantAvatar({
  className = '',
  animated = false,
  isLatest = false,
}: AssistantAvatarProps) {
  const avatarRef = useRef<HTMLDivElement>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isDocVisible, setIsDocVisible] = useState(true);

  // The vector orb is only shown to the most recent assistant reply
  const isOrb = isLatest || animated;

  // Track visibility to pause animations when document is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Track mouse movement to move the orb's eyes (only active on latest reply)
  useEffect(() => {
    if (!isOrb || !isDocVisible) {
      setEyeOffset({ x: 0, y: 0 });
      return;
    }

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setEyeOffset({ x: 0, y: 0 });
      return;
    }

    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!avatarRef.current) return;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        if (!avatarRef.current) return;
        const rect = avatarRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist === 0) {
          setEyeOffset({ x: 0, y: 0 });
          return;
        }

        // Maximum offset within the orb's eye region (in SVG coordinates)
        const maxOffset = 7.5;
        // Smooth interpolation based on cursor distance (up to 300px)
        const factor = Math.min(dist / 300, 1);
        const offsetX = (dx / dist) * maxOffset * factor;
        const offsetY = (dy / dist) * maxOffset * factor;

        setEyeOffset({
          x: Math.round(offsetX * 10) / 10,
          y: Math.round(offsetY * 10) / 10,
        });
      });
    };

    const handleMouseLeave = () => {
      setEyeOffset({ x: 0, y: 0 });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isOrb, isDocVisible]);

  // If not the most recent reply, do not show any icon
  if (!isOrb) {
    return null;
  }

  // For the most recent reply, render the vector orb with mouse-tracking eyes
  const shouldAnimate = isOrb && isDocVisible;

  return (
    <div
      ref={avatarRef}
      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-transparent select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full text-black dark:text-white transition-colors"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="sm-orb-base" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </radialGradient>
          <radialGradient id="sm-orb-purple" cx="55%" cy="15%" r="45%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#9333ea" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sm-orb-coral" cx="65%" cy="85%" r="45%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#db2777" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#db2777" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sm-orb-cyan" cx="25%" cy="45%" r="35%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sm-orb-rim" cx="75%" cy="35%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="25%" stopColor="#f472b6" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sm-orb-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
          </linearGradient>
          <clipPath id="sm-orb-clip">
            <circle cx="100" cy="100" r="99" />
          </clipPath>
        </defs>

        {/* Sphere Artwork */}
        <g clipPath="url(#sm-orb-clip)">
          <circle cx="100" cy="100" r="100" fill="url(#sm-orb-base)" />
          <circle cx="100" cy="100" r="100" fill="url(#sm-orb-cyan)" />
          <circle cx="100" cy="100" r="100" fill="url(#sm-orb-purple)" />
          <circle cx="100" cy="100" r="100" fill="url(#sm-orb-coral)" />
          <circle cx="100" cy="100" r="100" fill="url(#sm-orb-rim)" />
          <circle cx="100" cy="100" r="100" fill="url(#sm-orb-shadow)" />
          <image
            href="/assistant-orb.png"
            x="0"
            y="0"
            width="200"
            height="200"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>

        {/* Symmetrical Eyes with Mouse Tracking & Gentle Blink */}
        <g
          transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`}
          style={{
            transition: 'transform 0.12s cubic-bezier(0.2, 0.8, 0.4, 1)',
            willChange: 'transform',
          }}
        >
          <g className={shouldAnimate ? 'sentimate-eye-animating' : ''}>
            <rect
              id="sentimate-eye-left"
              x="75"
              y="88"
              width="13"
              height="27"
              rx="6.5"
              fill="currentColor"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
            <rect
              id="sentimate-eye-right"
              x="112"
              y="88"
              width="13"
              height="27"
              rx="6.5"
              fill="currentColor"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
