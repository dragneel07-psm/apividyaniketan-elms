// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

/* eslint-disable @next/next/no-img-element */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useMemo } from 'react';

interface DocumentViewerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileUrl: string;
    fileName?: string;
}

export function DocumentViewerModal({ open, onOpenChange, fileUrl, fileName = 'Attachment' }: DocumentViewerModalProps) {
    const fileType = useMemo<'image' | 'pdf' | 'other'>(() => {
        if (!fileUrl) {
            return 'other';
        }
        const ext = fileUrl.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
            return 'image';
        }
        if (ext === 'pdf') {
            return 'pdf';
        }
        return 'other';
    }, [fileUrl]);

    const handleDownload = async () => {
        try {
            // Fetch the file as a blob to bypass CORS restrictions
            const response = await fetch(fileUrl);
            const blob = await response.blob();

            // Create a temporary URL for the blob
            const blobUrl = window.URL.createObjectURL(blob);

            // Create and trigger download
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName || 'attachment';
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback to direct link if fetch fails
            window.open(fileUrl, '_blank');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {fileType === 'image' ? (
                            <ImageIcon className="h-5 w-5 text-blue-600" />
                        ) : (
                            <FileText className="h-5 w-5 text-red-600" />
                        )}
                        {fileName}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto bg-slate-50 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                    {fileType === 'image' ? (
                        <img
                            src={fileUrl}
                            alt={fileName}
                            className="max-w-full max-h-[600px] object-contain rounded shadow-lg"
                        />
                    ) : fileType === 'pdf' ? (
                        <iframe
                            src={fileUrl}
                            className="w-full h-[600px] border-0 rounded shadow-lg bg-white"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="text-center text-slate-500">
                            <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium">Preview not available</p>
                            <p className="text-sm mt-2">Click download to view this file</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between items-center">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="gap-2"
                    >
                        <X className="h-4 w-4" />
                        Close
                    </Button>
                    <Button
                        onClick={handleDownload}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        <Download className="h-4 w-4" />
                        Download
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
