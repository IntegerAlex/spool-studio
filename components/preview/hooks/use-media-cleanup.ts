"use client"

import { useCallback, useEffect, useRef } from "react"

export function useMediaCleanup() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
  }, [])

  const setAudioRef = useCallback((el: HTMLAudioElement | null) => {
    audioRef.current = el
  }, [])

  const setIframeRef = useCallback((el: HTMLIFrameElement | null) => {
    iframeRef.current = el
  }, [])

  const cleanup = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause()
        videoRef.current.removeAttribute("src")
        videoRef.current.load()
      } catch {
        // ignore cleanup errors
      }
    }

    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.removeAttribute("src")
        audioRef.current.load()
      } catch {
        // ignore cleanup errors
      }
    }

    if (iframeRef.current) {
      try {
        iframeRef.current.src = "about:blank"
      } catch {
        // ignore cleanup errors
      }
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  return { setVideoRef, setAudioRef, setIframeRef, cleanup }
}
