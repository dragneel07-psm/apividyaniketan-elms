// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
    { href: '/school/about', label: 'About' },
    { href: '/school/academics', label: 'Academics' },
    { href: '/school/admissions', label: 'Admissions' },
    { href: '/school/student-life', label: 'Student Life' },
    { href: '/school/news', label: 'News & Events' },
    { href: '/school/gallery', label: 'Gallery' },
    { href: '/school/contact', label: 'Contact' },
];

export function SchoolNav({ schoolName }: { schoolName: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');

    const handleSearch = (event: React.FormEvent) => {
        event.preventDefault();
        if (!query.trim()) return;
        router.push(`/school/news?q=${encodeURIComponent(query.trim())}`);
        setSearchOpen(false);
    };

    return (
        <header className="sticky top-0 z-50 border-b border-school-forest/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <Link
                    href="/school"
                    className="flex shrink-0 items-center gap-2 font-fraunces text-lg font-semibold text-school-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-school-marigold rounded"
                >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-school-forest text-sm font-bold text-school-cream">
                        {schoolName.charAt(0)}
                    </span>
                    <span className="hidden sm:inline">{schoolName}</span>
                </Link>

                <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                'rounded-md px-3 py-2 font-public-sans text-sm font-medium text-school-ink/80 transition-colors hover:bg-school-cream hover:text-school-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-school-marigold',
                                pathname === link.href && 'bg-school-cream text-school-forest',
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <div className="hidden items-center sm:flex">
                        {searchOpen ? (
                            <form onSubmit={handleSearch} className="flex items-center gap-1" role="search">
                                <Input
                                    autoFocus
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search news, notices…"
                                    aria-label="Search the site"
                                    className="h-9 w-48 border-school-forest/20"
                                />
                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(false)} aria-label="Close search">
                                    <X className="h-4 w-4" />
                                </Button>
                            </form>
                        ) : (
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-school-forest" onClick={() => setSearchOpen(true)} aria-label="Open search">
                                <Search className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <Button asChild variant="outline" className="hidden border-school-forest/30 text-school-forest hover:bg-school-cream sm:inline-flex">
                        <Link href="/school/portals">Portal Login</Link>
                    </Button>
                    <Button asChild className="hidden bg-school-marigold text-school-ink hover:bg-school-marigold-dark sm:inline-flex">
                        <Link href="/school/admissions/apply">Apply Now</Link>
                    </Button>

                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72 bg-white">
                            <SheetTitle className="font-fraunces text-school-forest">{schoolName}</SheetTitle>
                            <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1 px-1">
                                {NAV_LINKS.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="rounded-md px-3 py-2.5 font-public-sans text-base font-medium text-school-ink hover:bg-school-cream"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                <div className="mt-4 flex flex-col gap-2 border-t border-school-forest/10 pt-4">
                                    <Button asChild variant="outline" className="border-school-forest/30 text-school-forest">
                                        <Link href="/school/portals">Portal Login</Link>
                                    </Button>
                                    <Button asChild className="bg-school-marigold text-school-ink hover:bg-school-marigold-dark">
                                        <Link href="/school/admissions/apply">Apply Now</Link>
                                    </Button>
                                </div>
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
