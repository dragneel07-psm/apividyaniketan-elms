// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { academicAPI, LessonMaterial } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, File, Trash, Download, Plus, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonMaterialsManagerProps {
    lessonId: number;
}

export function LessonMaterialsManager({ lessonId }: LessonMaterialsManagerProps) {
    const [materials, setMaterials] = useState<LessonMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const normalizeMaterials = (payload: unknown): LessonMaterial[] => {
        if (Array.isArray(payload)) return payload as LessonMaterial[];
        if (payload && typeof payload === 'object' && Array.isArray((payload as { results?: unknown[] }).results)) {
            return (payload as { results: LessonMaterial[] }).results;
        }
        return [];
    };

    const loadMaterials = async () => {
        try {
            const data = await academicAPI.getMaterials(lessonId);
            setMaterials(normalizeMaterials(data));
        } catch (error) {
            console.error("Failed to load materials", error);
            setMaterials([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMaterials();
    }, [lessonId]);

    const onDrop = async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        setUploading(true);
        // Upload one by one or Promise.all. One by one allows better error handling per file.
        for (const file of acceptedFiles) {
            try {
                const formData = new FormData();
                formData.append('lesson', lessonId.toString());
                formData.append('title', file.name);
                formData.append('file', file);
                formData.append('material_type', 'pdf'); // Default or detect

                await academicAPI.createMaterial(formData);
                toast.success(`Uploaded ${file.name}`);
            } catch (error) {
                console.error(`Failed to upload ${file.name}`, error);
                toast.error(`Failed to upload ${file.name}`);
            }
        }
        setUploading(false);
        loadMaterials();
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    const handleDelete = async (id: number) => {
        try {
            // Optimistic update?
            setMaterials(prev => prev.filter(m => m.id !== id));
            await academicAPI.deleteMaterial(id);
            toast.success("Material deleted");
        } catch (error) {
            console.error("Failed to delete material", error);
            toast.error("Failed to delete material");
            loadMaterials(); // Revert
        }
    };

    if (loading) return <div className="p-4"><Loader2 className="animate-spin h-5 w-5 text-indigo-500" /></div>;

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50",
                    isDragActive && "border-indigo-500 bg-indigo-50",
                    uploading && "opacity-50 pointer-events-none"
                )}
            >
                <input {...getInputProps()} />
                {uploading ? (
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
                ) : (
                    <UploadCloud className="h-8 w-8 text-indigo-400 mb-2" />
                )}
                <p className="font-medium text-slate-700">
                    {isDragActive ? "Drop files here" : "Click or drag files to upload"}
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF, Slides, Images</p>
            </div>

            <div className="space-y-2">
                {materials.map(material => (
                    <div key={material.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="h-8 w-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <File className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{material.title}</p>
                            <p className="text-xs text-slate-500">{new Date(material.created_at || '').toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {material.file && (
                                <a href={material.file} target="_blank" rel="noopener noreferrer">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </a>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-600"
                                onClick={() => handleDelete(material.id)}
                            >
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {materials.length === 0 && !uploading && (
                    <p className="text-xs text-center text-slate-400 py-2">No learning materials added yet</p>
                )}
            </div>
        </div>
    );
}
