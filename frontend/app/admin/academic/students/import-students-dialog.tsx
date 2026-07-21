// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { academicAPI } from '@/lib/api';

interface ImportStudentsDialogProps {
    onSuccess: () => void;
}

export function ImportStudentsDialog({ onSuccess }: ImportStudentsDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<{ created: number; failed: number; errors: any[] } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null); // Reset previous results
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        try {
            const response = await academicAPI.importStudents(file);
            setResult(response.results);
            if (response.results.created > 0) {
                toast.success(`Successfully imported ${response.results.created} students`);
                onSuccess();
            } else if (response.results.failed > 0) {
                toast.error(`Failed to import students. Check errors.`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload file");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import Students</DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file to bulk create student accounts.
                        <br />
                        Required columns: <code className="bg-slate-100 px-1 rounded">first_name, last_name, email, class, section</code>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="file">Select File</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            onChange={handleFileChange}
                        />
                    </div>

                    {result && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-md flex items-center gap-3 ${result.failed > 0 ? 'bg-amber-50 text-amber-900' : 'bg-green-50 text-green-900'}`}>
                                {result.failed > 0 ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                <div>
                                    <p className="font-medium">Import Processed</p>
                                    <p className="text-sm">Created: {result.created} | Failed: {result.failed}</p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="border rounded-md p-2 bg-red-50 text-red-900 text-sm max-h-40 overflow-y-auto">
                                    <p className="font-semibold mb-2 sticky top-0 bg-red-50">Errors:</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {result.errors.map((err, idx) => (
                                            <li key={idx}>
                                                Row {err.row}: {typeof err.error === 'string' ? err.error : JSON.stringify(err.error)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                    <Button onClick={handleUpload} disabled={!file || uploading}>
                        {uploading ? "Importing..." : "Import Students"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
