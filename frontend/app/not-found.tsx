// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
            <Compass className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold tracking-widest text-indigo-600 uppercase">
            404
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
          <p className="text-slate-600">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex justify-center pt-2">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" /> Back to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
