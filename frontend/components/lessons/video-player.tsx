// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player/lazy';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface VideoPlayerProps {
    url: string;
    playing?: boolean;
    onProgress?: (state: { played: number, playedSeconds: number }) => void;
    onDuration?: (durationSeconds: number) => void;
    onComplete?: () => void;
    onPlay?: () => void;
    onPause?: () => void;
    initialProgress?: number; // 0 to 1
}

export function VideoPlayer({
    url,
    playing = false,
    onProgress,
    onDuration,
    onComplete,
    onPlay,
    onPause,
    initialProgress = 0
}: VideoPlayerProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const playerRef = useRef<ReactPlayer>(null);
    const hasSeekedRef = useRef(false);

    // Effect to handle initial progress seek
    useEffect(() => {
        if (isLoaded && initialProgress > 0 && playerRef.current && !hasSeekedRef.current) {
            playerRef.current.seekTo(initialProgress, 'fraction');
            hasSeekedRef.current = true;
        }
    }, [isLoaded, initialProgress]);

    useEffect(() => {
        hasSeekedRef.current = false;
    }, [url]);

    return (
        <Card className="overflow-hidden bg-black aspect-video relative group border-0 shadow-2xl rounded-2xl">
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10 transition-opacity duration-500">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
                        <p className="text-slate-400 text-xs font-medium animate-pulse">Loading Video Lecture...</p>
                    </div>
                </div>
            )}

            <div className={`w-full h-full transition-opacity duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
                <ReactPlayer
                    ref={playerRef}
                    url={url}
                    width="100%"
                    height="100%"
                    playing={playing}
                    controls={true}
                    onReady={() => setIsLoaded(true)}
                    onProgress={onProgress}
                    onDuration={onDuration}
                    onPlay={onPlay}
                    onPause={onPause}
                    onEnded={onComplete}
                    config={{
                        youtube: {
                            playerVars: {
                                showinfo: 0,
                                rel: 0,
                                modestbranding: 1
                            }
                        }
                    }}
                />
            </div>
        </Card>
    );
}
