import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, Pause, Volume2, Volume1, VolumeX, 
  Maximize, Minimize, PictureInPicture2, Loader2, Check, AlertCircle, Lock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBaseURL } from '../services/api';

interface UniversalVideoPlayerProps {
  src: string;
  className?: string;
  poster?: string;
  title?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  onEnded?: () => void;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  playbackSpeed?: number;
  onSpeedChange?: (speed: number) => void;
  autoPlay?: boolean;
  disableForwardSeeking?: boolean;
  initialResumeTime?: number;
}

function parseVideoSource(srcStr: string) {
  if (!srcStr || typeof srcStr !== 'string') return { type: 'empty', url: '' };

  const trimmed = srcStr.trim();

  // 1. Google Drive -> Stream via high-performance backend proxy for custom Apex Cyber UI
  const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (trimmed.includes('drive.google.com') || driveMatch) {
    const fileId = driveMatch ? driveMatch[1] : '';
    const apiBase = getBaseURL().replace(/\/+$/, '');
    const streamProxyUrl = fileId ? `${apiBase}/videos/stream/?id=${fileId}` : trimmed;
    return { type: 'video', url: streamProxyUrl };
  }

  // 2. YouTube
  const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || ytMatch) {
    const ytId = ytMatch ? ytMatch[1] : '';
    const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1` : trimmed;
    return { type: 'iframe', url: embedUrl };
  }

  // 3. Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:.*\/)?([0-9]+)/);
  if (trimmed.includes('vimeo.com') || vimeoMatch) {
    const vimeoId = vimeoMatch ? vimeoMatch[1] : '';
    const embedUrl = vimeoId ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0` : trimmed;
    return { type: 'iframe', url: embedUrl };
  }

  // 4. Relative /media/ path -> Prepend backend server host
  if (trimmed.startsWith('/media/')) {
    const apiBase = getBaseURL().replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return { type: 'video', url: `${apiBase}${trimmed}` };
  }

  // 5. Cloudflare Stream ID (non-URL string like "d3a4b..." or "cf-stream-...")
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
    return { type: 'iframe', url: `https://iframe.videodelivery.net/${trimmed}?preload=true&autoplay=true` };
  }

  // 6. Direct Video File URL (MP4, WebM, CDN link, etc.)
  return { type: 'video', url: trimmed };
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);

  if (hrs > 0) {
    const remainMins = mins % 60;
    return `${hrs}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const UniversalVideoPlayer: React.FC<UniversalVideoPlayerProps> = ({
  src,
  className = "w-full h-full object-cover",
  poster,
  title,
  videoRef: externalRef,
  onTimeUpdate,
  onEnded,
  onLoadedMetadata,
  playbackSpeed = 1,
  onSpeedChange,
  autoPlay = false,
  disableForwardSeeking = true,
  initialResumeTime = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoElement = externalRef || internalVideoRef;

  const parsed = parseVideoSource(src);

  // Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(playbackSpeed);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Maximum Watched Tracking for Anti-Skipping Enforcement
  const maxWatchedRef = useRef<number>(initialResumeTime || 0);
  const [maxWatchedTime, setMaxWatchedTime] = useState<number>(initialResumeTime || 0);
  const [lockWarning, setLockWarning] = useState<string | null>(null);
  const lockWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerLockWarning = () => {
    setLockWarning("Forward skipping is locked. Please listen to the entire lesson to complete it.");
    if (lockWarningTimeoutRef.current) clearTimeout(lockWarningTimeoutRef.current);
    lockWarningTimeoutRef.current = setTimeout(() => {
      setLockWarning(null);
    }, 3000);
  };

  useEffect(() => {
    if (initialResumeTime > maxWatchedRef.current) {
      maxWatchedRef.current = initialResumeTime;
      setMaxWatchedTime(initialResumeTime);
    }
  }, [initialResumeTime]);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubBarRef = useRef<HTMLDivElement>(null);

  // Sync external speed changes
  useEffect(() => {
    setCurrentSpeed(playbackSpeed);
    if (videoElement.current) {
      videoElement.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, videoElement]);

  // Handle Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Controls Auto-Hide timer
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSpeedMenu && !isScrubbing) {
          setShowControls(false);
        }
      }, 2500);
    }
  }, [isPlaying, showSpeedMenu, isScrubbing]);

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !showSpeedMenu && !isScrubbing) {
      setShowControls(false);
    }
  };

  // Play / Pause Toggle
  const togglePlay = () => {
    const el = videoElement.current;
    if (!el) return;

    if (el.paused || el.ended) {
      el.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  };

  // Seek Relative with strict forward protection
  const seekRelative = (delta: number) => {
    const el = videoElement.current;
    if (!el) return;

    if (delta > 0 && disableForwardSeeking) {
      const target = el.currentTime + delta;
      if (target > maxWatchedRef.current + 0.5) {
        el.currentTime = maxWatchedRef.current;
        triggerLockWarning();
        resetControlsTimeout();
        return;
      }
    }

    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + delta));
    resetControlsTimeout();
  };

  // Volume & Mute
  const handleVolumeChange = (newVol: number) => {
    const el = videoElement.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    el.volume = clamped;
    setVolume(clamped);
    if (clamped === 0) {
      el.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      el.muted = false;
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const el = videoElement.current;
    if (!el) return;
    if (isMuted) {
      el.muted = false;
      setIsMuted(false);
      el.volume = volume || 0.5;
    } else {
      el.muted = true;
      setIsMuted(true);
    }
  };

  // Speed Handler
  const handleSpeedSelect = (speed: number) => {
    const el = videoElement.current;
    if (el) el.playbackRate = speed;
    setCurrentSpeed(speed);
    setShowSpeedMenu(false);
    if (onSpeedChange) onSpeedChange(speed);
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
    const el = videoElement.current;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await el.requestPictureInPicture();
      }
    } catch {}
  };

  // Scrub bar interactions with strict forward bounds
  const handleScrubMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubBarRef.current) return;
    const rect = scrubBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;

    setHoverPos(pos * 100);
    setHoverTime(targetTime);

    if (isScrubbing && videoElement.current) {
      if (disableForwardSeeking && targetTime > maxWatchedRef.current + 1) {
        videoElement.current.currentTime = maxWatchedRef.current;
        triggerLockWarning();
      } else {
        videoElement.current.currentTime = targetTime;
      }
    }
  };

  const handleScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubBarRef.current || !videoElement.current) return;
    const rect = scrubBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;

    if (disableForwardSeeking && targetTime > maxWatchedRef.current + 1) {
      videoElement.current.currentTime = maxWatchedRef.current;
      triggerLockWarning();
      return;
    }
    videoElement.current.currentTime = targetTime;
  };

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
      case 'j':
        e.preventDefault();
        seekRelative(-10);
        break;
      case 'ArrowRight':
      case 'l':
        e.preventDefault();
        seekRelative(10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  };

  // Native Video Event Listeners
  const handleTimeUpdateInternal = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const el = videoElement.current;
    if (el) {
      const current = el.currentTime;

      // Strict enforcement: if user attempts skipping ahead of max watched time
      if (disableForwardSeeking && current > maxWatchedRef.current + 2) {
        el.currentTime = maxWatchedRef.current;
        triggerLockWarning();
        return;
      }

      if (current > maxWatchedRef.current) {
        maxWatchedRef.current = current;
        setMaxWatchedTime(current);
      }

      setCurrentTime(current);
      if (el.buffered.length > 0) {
        setBuffered((el.buffered.end(el.buffered.length - 1) / (el.duration || 1)) * 100);
      }
    }
    if (onTimeUpdate) onTimeUpdate(e);
  };

  const handleLoadedMetadataInternal = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const el = videoElement.current;
    if (el) {
      setDuration(el.duration || 0);
      setCurrentTime(el.currentTime || 0);
      el.playbackRate = currentSpeed;
    }
    if (onLoadedMetadata) onLoadedMetadata(e);
  };

  if (parsed.type === 'empty' || !parsed.url) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2 p-6 rounded-2xl border border-slate-800">
        <AlertCircle size={28} className="text-slate-500" />
        <span className="text-xs font-semibold">No valid video stream URL provided.</span>
      </div>
    );
  }

  // Google Drive & External Iframes (YouTube, Vimeo, Cloudflare stream embed)
  if (parsed.type === 'gdrive' || parsed.type === 'iframe') {
    return (
      <div 
        ref={containerRef}
        className="relative w-full h-full bg-black overflow-hidden rounded-2xl border border-cyan-500/30 shadow-2xl group select-none"
      >
        {/* Stream Iframe with top cropping to remove drive/external headers & popout buttons */}
        <div className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center">
          <iframe
            src={parsed.url}
            className="w-full border-0 absolute left-0"
            style={{
              top: parsed.type === 'gdrive' ? '-56px' : '0px',
              height: parsed.type === 'gdrive' ? 'calc(100% + 56px)' : '100%'
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            title={title || "Video Stream"}
          />
        </div>

        {/* Full-Width Top Shield to block external popouts & prompts */}
        <div 
          className="absolute top-0 inset-x-0 h-16 sm:h-20 z-30 pointer-events-auto cursor-default bg-transparent"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onTouchStart={(e) => { e.stopPropagation(); }}
        />

        {/* Sleek Title Bar overlay */}
        {title && (
          <div className="absolute top-0 inset-x-0 p-3.5 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none z-20 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              Lesson Stream
            </span>
            <h3 className="text-xs font-bold text-white drop-shadow-md truncate max-w-md">{title}</h3>
          </div>
        )}

        {/* Cyber Custom Fullscreen Button */}
        <div className="absolute bottom-3 right-3 z-30 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-black/70 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 backdrop-blur-md transition-all shadow-lg hover:scale-105 cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>
    );
  }

  // HTML5 Custom Cyber Video Player
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const maxWatchedPercent = duration > 0 ? (maxWatchedTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-full bg-black overflow-hidden group select-none focus:outline-none ${className}`}
    >
      {/* Video element */}
      <video
        ref={videoElement}
        src={parsed.url}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        autoPlay={autoPlay}
        playsInline
        controls={false}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onTimeUpdate={handleTimeUpdateInternal}
        onLoadedMetadata={handleLoadedMetadataInternal}
        onEnded={() => {
          setIsPlaying(false);
          maxWatchedRef.current = duration;
          setMaxWatchedTime(duration);
          if (onEnded) onEnded();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
      />

      {/* Skipping Locked Warning Banner */}
      <AnimatePresence>
        {lockWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-12 inset-x-0 flex justify-center pointer-events-none z-40 px-4"
          >
            <div className="px-4 py-2 rounded-xl bg-slate-950/90 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md">
              <Lock size={14} className="text-amber-400 shrink-0" />
              <span>{lockWarning}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buffering Spinner */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none z-20"
          >
            <div className="p-4 rounded-2xl cyber-glass-card flex items-center gap-3 text-cyan-400 border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.4)]">
              <Loader2 className="animate-spin" size={26} />
              <span className="text-xs font-black tracking-wider uppercase">Buffering</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Big Play/Pause Button (on hover/pause) */}
      <AnimatePresence>
        {(!isPlaying || showControls) && !isBuffering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-auto z-10"
          >
            <div className="h-16 w-16 rounded-2xl cyber-glass-card flex items-center justify-center text-white border border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.45)] hover:scale-110 hover:border-cyan-300 transition-all duration-200">
              {isPlaying ? (
                <Pause size={28} className="text-cyan-300 fill-cyan-400/30" />
              ) : (
                <Play size={28} className="text-cyan-300 fill-cyan-400 ml-1" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Gradient Header */}
      <AnimatePresence>
        {showControls && title && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-20 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Lesson Stream
              </span>
              <h3 className="text-xs font-bold text-white drop-shadow-md truncate max-w-md">{title}</h3>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Cyber Glassmorphic Controls Bar */}
      <AnimatePresence>
        {(showControls || !isPlaying) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 inset-x-0 p-3.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-30 space-y-2 pointer-events-auto"
          >
            {/* Interactive Timeline Progress Bar */}
            <div 
              ref={scrubBarRef}
              onMouseMove={handleScrubMove}
              onMouseDown={() => setIsScrubbing(true)}
              onMouseUp={() => setIsScrubbing(false)}
              onClick={handleScrubClick}
              onMouseLeave={() => setHoverTime(null)}
              className="relative h-2 w-full bg-slate-800/80 hover:h-3 rounded-full cursor-pointer transition-all duration-150 group/scrub flex items-center"
            >
              {/* Buffer Bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-slate-600/50 rounded-full transition-all"
                style={{ width: `${buffered}%` }}
              />

              {/* Unlocked / Watched Progression Track (subtle cyan marker) */}
              {disableForwardSeeking && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-cyan-500/20 rounded-full transition-all"
                  style={{ width: `${maxWatchedPercent}%` }}
                />
              )}

              {/* Current Progress Bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Scrubber Knob */}
              <div 
                className="absolute h-3.5 w-3.5 bg-white rounded-full border-2 border-cyan-400 shadow-md shadow-cyan-500/50 -translate-x-1/2 scale-0 group-hover/scrub:scale-100 transition-transform"
                style={{ left: `${progressPercent}%` }}
              />

              {/* Hover Timestamp Tooltip */}
              {hoverTime !== null && (
                <div 
                  className="absolute -top-8 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900/95 border border-cyan-500/30 text-[10px] font-mono font-bold text-white shadow-xl pointer-events-none flex items-center gap-1.5 z-30"
                  style={{ left: `${hoverPos}%` }}
                >
                  {disableForwardSeeking && hoverTime > maxWatchedTime + 1 && (
                    <Lock size={10} className="text-amber-400 shrink-0" />
                  )}
                  <span>{formatTime(hoverTime)}</span>
                  {disableForwardSeeking && hoverTime > maxWatchedTime + 1 && (
                    <span className="text-[8px] uppercase text-amber-400 font-sans font-black tracking-wider">(Locked)</span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              {/* Left: Play/Pause, Volume, Time */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play / Pause Toggle */}
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg text-white hover:text-cyan-400 hover:bg-white/10 transition-colors"
                  title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                  {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                </button>

                {/* Volume Slider */}
                <div className="flex items-center gap-1.5 group/volume">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-white/10 transition-colors"
                    title={isMuted ? "Unmute (m)" : "Mute (m)"}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={16} className="text-rose-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 size={16} />
                    ) : (
                      <Volume2 size={16} />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-14 sm:w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 opacity-80 hover:opacity-100 transition-opacity"
                  />
                </div>

                {/* Time Display */}
                <div className="text-[11px] font-mono font-medium text-slate-300 select-none pl-1">
                  <span className="text-white font-bold">{formatTime(currentTime)}</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right: Speed, PiP, Fullscreen */}
              <div className="flex items-center gap-1 sm:gap-2 relative">
                {/* Speed Dropdown Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide text-slate-300 hover:text-cyan-400 hover:bg-white/10 transition-colors border border-slate-700/60"
                  >
                    {currentSpeed}×
                  </button>

                  {/* Speed Popup */}
                  <AnimatePresence>
                    {showSpeedMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-2 p-1.5 rounded-xl cyber-glass-card border border-cyan-500/40 shadow-2xl min-w-[90px] z-50 flex flex-col gap-0.5"
                      >
                        {SPEED_OPTIONS.map((speed) => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedSelect(speed)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between transition-colors ${
                              currentSpeed === speed
                                ? 'bg-cyan-500/20 text-cyan-400 font-extrabold'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <span>{speed}×</span>
                            {currentSpeed === speed && <Check size={12} className="text-cyan-400" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Picture in Picture */}
                <button
                  onClick={togglePiP}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-white/10 transition-colors"
                  title="Picture in Picture"
                >
                  <PictureInPicture2 size={16} />
                </button>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-white/10 transition-colors"
                  title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UniversalVideoPlayer;

