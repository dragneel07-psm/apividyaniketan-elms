// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, HeartHandshake, Palette, Trophy, Users } from 'lucide-react';
import { SectionHeading } from '@/components/school/SectionHeading';
import { PlaceholderPhoto } from '@/components/school/PlaceholderPhoto';
import {
    getFieldTrips,
    getStudentLifeActivities,
    getWellbeingSupport,
} from '@/lib/school-content/school-info';
import type { StudentLifeActivity } from '@/lib/api';

export const metadata: Metadata = {
    title: 'Student Life',
    description: 'Clubs and societies, sports, arts and music, field trips, student leadership, and counseling and wellbeing at our K-8 school in Dhangadhi, Kailali.',
};

const CATEGORY_META: Record<StudentLifeActivity['category'], { title: string; description: string; icon: typeof Users }> = {
    clubs: { title: 'Clubs & Societies', description: 'After-school groups where students go deeper into a shared interest.', icon: Users },
    sports: { title: 'Sports', description: 'Team practice, friendly matches, and an annual inter-house sports week.', icon: Trophy },
    arts: { title: 'Arts & Music', description: 'Weekly creative sessions in music, dance, art, and craft.', icon: Palette },
    leadership: { title: 'Student Leadership', description: 'Real responsibility — students helping run parts of school life.', icon: Compass },
};

const CATEGORY_ORDER: StudentLifeActivity['category'][] = ['clubs', 'sports', 'arts', 'leadership'];

export default async function StudentLifePage() {
    const [activities, fieldTrips, wellbeingSupport] = await Promise.all([
        getStudentLifeActivities(),
        getFieldTrips(),
        getWellbeingSupport(),
    ]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">Student Life</li>
                </ol>
            </nav>

            <SectionHeading
                eyebrow="Beyond the classroom"
                title="Student Life"
                description="A well-rounded school day includes friendships, teamwork, creativity, and a real sense of belonging — not just lessons."
                className="mt-6"
            />

            {CATEGORY_ORDER.map((category, i) => {
                const meta = CATEGORY_META[category];
                const items = activities.filter((a) => a.category === category);
                return (
                    <section key={category} className={i === 0 ? 'mt-12' : 'mt-16'}>
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-school-forest/10 text-school-forest">
                                <meta.icon className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="font-fraunces text-2xl text-school-ink">{meta.title}</h2>
                                <p className="font-public-sans text-sm text-school-ink/60">{meta.description}</p>
                            </div>
                        </div>
                        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {items.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-school-forest/10 p-5">
                                    {item.image_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="mb-4 aspect-video w-full rounded-xl object-cover"
                                        />
                                    )}
                                    <h3 className="font-fraunces text-lg text-school-ink">{item.name}</h3>
                                    <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/70">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}

            {/* Field trips */}
            <section className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                    <h2 className="font-fraunces text-2xl text-school-ink">Field Trips</h2>
                    <p className="mt-2 font-public-sans text-sm text-school-ink/60">Learning that leaves the classroom, grade by grade.</p>
                    <ul className="mt-6 space-y-4">
                        {fieldTrips.map((trip) => (
                            <li key={trip.id} className="flex gap-4 rounded-xl border border-school-forest/10 p-4">
                                {trip.image_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={trip.image_url}
                                        alt={trip.title}
                                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                                    />
                                )}
                                <div>
                                    <p className="font-public-sans text-xs font-semibold uppercase tracking-wide text-school-terracotta">{trip.grade_band}</p>
                                    <p className="mt-1 font-public-sans text-sm font-semibold text-school-ink">{trip.title}</p>
                                    <p className="mt-1 font-public-sans text-sm text-school-ink/70">{trip.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <PlaceholderPhoto caption="Students on a field trip to a local science expo" />
            </section>

            {/* Counseling & wellbeing */}
            <section className="mt-16 rounded-2xl bg-school-cream p-6 sm:p-10">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-school-forest text-white">
                        <HeartHandshake className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="font-fraunces text-2xl text-school-ink">Counseling & Wellbeing</h2>
                        <p className="font-public-sans text-sm text-school-ink/60">Every child&apos;s emotional wellbeing matters as much as their grades.</p>
                    </div>
                </div>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    {wellbeingSupport.map((item) => (
                        <div key={item.id} className="flex gap-4 rounded-xl border border-school-forest/10 bg-white p-5">
                            {item.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.image_url}
                                    alt={item.title}
                                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                                />
                            )}
                            <div>
                                <h3 className="font-public-sans text-sm font-semibold text-school-ink">{item.title}</h3>
                                <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/70">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
