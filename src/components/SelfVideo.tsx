'use client';

import { useEffect, useRef } from 'react';

/**
 * Stays mounted for the whole round and is only hidden when the player goes
 * dark, so toggling the camera is instant — remounting it would re-attach the
 * stream and cost a visible beat, which matters when a callout is counting down.
 */
export function SelfVideo({ stream, visible }: { stream: MediaStream; visible: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || video.srcObject === stream) return;
    video.srcObject = stream;
    video.play().catch(() => {
      // Autoplay can be refused; the tile falls back to the placeholder.
    });
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="h-full w-full object-cover"
      // Self-view is mirrored in every call app; anything else feels wrong.
      style={{ transform: 'scaleX(-1)', display: visible ? 'block' : 'none' }}
    />
  );
}
