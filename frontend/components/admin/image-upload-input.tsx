// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadInputProps {
    value: File | null;
    existingUrl?: string | null;
    onChange: (file: File | null) => void;
}

export function ImageUploadInput({ value, existingUrl, onChange }: ImageUploadInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    // Derived during render, not effect state — only the cleanup (revoking
    // the URL once it's no longer displayed) needs to be an effect.
    const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const displayUrl = previewUrl || existingUrl || null;

    return (
        <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {displayUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={displayUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    <ImageIcon className="h-6 w-6 text-slate-300" />
                )}
            </div>
            <div className="flex flex-col gap-2">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => inputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5" /> {displayUrl ? 'Replace image' : 'Upload image'}
                </Button>
                {value && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-slate-500"
                        onClick={() => {
                            if (inputRef.current) inputRef.current.value = '';
                            onChange(null);
                        }}
                    >
                        <X className="h-3.5 w-3.5" /> Remove selection
                    </Button>
                )}
            </div>
        </div>
    );
}
