'use client';

import { useEffect, useRef, useState } from 'react';

export type WebcamStatus = 'off' | 'requesting' | 'ready' | 'denied' | 'unsupported';

/**
 * The player's own tile, from their own camera.
 *
 * Video only — no audio track is ever requested. The stream is rendered
 * locally into a <video> element and nothing is recorded, uploaded or sent
 * anywhere; there is no server in this game to send it to. The stream is
 * acquired once when a round starts, because a permission prompt in the middle
 * of a five-second callout is an automatic loss, and it is stopped on the way
 * out so the camera light goes off with the round.
 */
export function useWebcam(wanted: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<WebcamStatus>('off');
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    const stop = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    };

    if (!wanted) {
      stop();
      setStatus('off');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }

    setStatus('requesting');
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 }, audio: false })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = media;
        setStream(media);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('denied');
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, [wanted]);

  // Stop the camera if the tab goes away mid-round rather than holding it open.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return { stream, status, streamRef };
}
