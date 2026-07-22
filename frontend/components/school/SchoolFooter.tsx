// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Facebook, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GarlandDivider } from './GarlandDivider';
import type { SchoolPublicInfo } from '@/lib/school-content/school-info';

export function SchoolFooter({ school }: { school: SchoolPublicInfo }) {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    return (
        <footer className="bg-school-ink text-school-cream/90">
            <GarlandDivider className="text-school-marigold" />
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
                <div>
                    <p className="font-fraunces text-xl text-white">{school.name}</p>
                    <p className="mt-3 font-public-sans text-sm leading-relaxed text-school-cream/70">
                        A caring K-8 community in Dhangadhi, Kailali — nurturing curious,
                        confident learners since {school.established_year ?? 'our founding'}.
                    </p>
                    <div className="mt-4 flex gap-3">
                        <a href="#" aria-label="Facebook" className="rounded-full bg-white/10 p-2 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-school-marigold">
                            <Facebook className="h-4 w-4" />
                        </a>
                        <a href="#" aria-label="YouTube" className="rounded-full bg-white/10 p-2 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-school-marigold">
                            <Youtube className="h-4 w-4" />
                        </a>
                    </div>
                </div>

                <nav aria-label="Explore" className="font-public-sans text-sm">
                    <p className="font-semibold text-white">Explore</p>
                    <ul className="mt-3 space-y-2 text-school-cream/70">
                        <li><Link href="/school/about" className="hover:text-white">About Us</Link></li>
                        <li><Link href="/school/academics" className="hover:text-white">Academics</Link></li>
                        <li><Link href="/school/admissions" className="hover:text-white">Admissions</Link></li>
                        <li><Link href="/school/news" className="hover:text-white">News & Events</Link></li>
                        <li><Link href="/school/gallery" className="hover:text-white">Gallery</Link></li>
                    </ul>
                </nav>

                <div className="font-public-sans text-sm">
                    <p className="font-semibold text-white">Contact</p>
                    <ul className="mt-3 space-y-2 text-school-cream/70">
                        <li className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-school-marigold" />
                            <span>{school.address || 'Dhangadhi, Kailali, Nepal'}</span>
                        </li>
                        {school.contact_phone && (
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4 shrink-0 text-school-marigold" />
                                <a href={`tel:${school.contact_phone}`} className="hover:text-white">{school.contact_phone}</a>
                            </li>
                        )}
                        {school.contact_email && (
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4 shrink-0 text-school-marigold" />
                                <a href={`mailto:${school.contact_email}`} className="hover:text-white">{school.contact_email}</a>
                            </li>
                        )}
                    </ul>
                </div>

                <div className="font-public-sans text-sm">
                    <p className="font-semibold text-white">Stay updated</p>
                    <p className="mt-3 text-school-cream/70">Get news and event reminders by email.</p>
                    {subscribed ? (
                        <p className="mt-3 rounded-md bg-white/10 px-3 py-2 text-school-marigold">Thanks — you&apos;re on the list.</p>
                    ) : (
                        <form
                            className="mt-3 flex gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (email.trim()) setSubscribed(true);
                            }}
                        >
                            <Input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                aria-label="Email address for newsletter"
                                className="h-9 border-white/20 bg-white/5 text-white placeholder:text-school-cream/40"
                            />
                            <Button type="submit" size="sm" className="bg-school-marigold text-school-ink hover:bg-school-marigold-dark">
                                Sign up
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            <div className="border-t border-white/10 px-4 py-5 sm:px-6 lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 font-public-sans text-xs text-school-cream/60 sm:flex-row">
                    <p>&copy; {new Date().getFullYear()} {school.name}. All rights reserved.</p>
                    <div className="flex gap-4">
                        <Link href="/school/privacy" className="hover:text-white">Privacy Policy</Link>
                        <Link href="/school/terms" className="hover:text-white">Terms of Use</Link>
                        <Link href="/school/portals" className="hover:text-white">Portal Login</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
