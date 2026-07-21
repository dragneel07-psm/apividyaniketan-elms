// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/localization';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
    const { locale, setLocale } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100">
                <Globe className="h-5 w-5 text-slate-500" />
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100">
                    <Globe className="h-5 w-5 text-slate-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-2 w-[140px]">
                <DropdownMenuItem
                    className={`rounded-xl font-bold cursor-pointer transition-colors ${locale === 'en' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`}
                    onClick={() => setLocale('en')}
                >
                    English
                </DropdownMenuItem>
                <DropdownMenuItem
                    className={`rounded-xl font-bold cursor-pointer transition-colors ${locale === 'ne' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`}
                    onClick={() => setLocale('ne')}
                >
                    नेपाली
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
