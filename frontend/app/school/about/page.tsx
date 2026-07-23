// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { SectionHeading } from '@/components/school/SectionHeading';
import { PlaceholderPhoto } from '@/components/school/PlaceholderPhoto';
import { getCoreValues, getHistoryMilestones, getSchoolInfo } from '@/lib/school-content/school-info';
import { LEADERSHIP } from '@/lib/school-content/sample-data';

export const metadata: Metadata = {
    title: 'About Us',
    description: 'Our history, mission and values, principal\'s message, leadership team, and accreditations.',
};

export default async function AboutPage() {
    const [school, historyMilestones, coreValues] = await Promise.all([
        getSchoolInfo(),
        getHistoryMilestones(),
        getCoreValues(),
    ]);

    return (
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">About Us</li>
                </ol>
            </nav>

            <SectionHeading eyebrow="Our story" title={`About ${school.name}`} className="mt-6" />

            {/* History */}
            <section className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
                <PlaceholderPhoto caption="The school building and courtyard" aspect="aspect-[4/3]" />
                <div>
                    <h2 className="font-fraunces text-2xl text-school-ink">Our History</h2>
                    <p className="mt-3 font-public-sans text-sm leading-relaxed text-school-ink/75">
                        {school.name} was founded in Dhangadhi with a simple goal: give local families access to
                        an affordable, caring, academically strong school close to home. What began as a small
                        primary school has grown, grade by grade, into a full K-8 institution — shaped by the
                        same community that has trusted us with their children ever since.
                    </p>
                    <ol className="mt-6 space-y-4 border-l-2 border-school-marigold pl-5">
                        {historyMilestones.map((m) => (
                            <li key={m.id} className="flex gap-4">
                                {m.image_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={m.image_url}
                                        alt={m.title}
                                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                                    />
                                )}
                                <div>
                                    <span className="font-mono text-xs font-semibold text-school-terracotta">{m.year}</span>
                                    <p className="font-public-sans text-sm font-semibold text-school-ink">{m.title}</p>
                                    <p className="font-public-sans text-sm text-school-ink/70">{m.description}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* Mission / Vision */}
            <section className="mt-16 grid gap-6 rounded-2xl bg-school-cream p-6 sm:grid-cols-2 sm:p-10">
                <div>
                    <h2 className="font-fraunces text-xl text-school-ink">Our Mission</h2>
                    <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/75">
                        To provide every child in Dhangadhi with a safe, inclusive, and academically rigorous
                        K-8 education that builds strong foundations in literacy, numeracy, and character.
                    </p>
                </div>
                <div>
                    <h2 className="font-fraunces text-xl text-school-ink">Our Vision</h2>
                    <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/75">
                        To be a school where every graduate leaves confident, curious, and prepared — academically
                        and personally — for secondary school and beyond.
                    </p>
                </div>
            </section>

            {/* Values */}
            <section className="mt-16">
                <h2 className="font-fraunces text-2xl text-school-ink">Our Values</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {coreValues.map((v) => (
                        <div key={v.id} className="rounded-2xl border border-school-forest/10 p-5">
                            {v.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={v.image_url}
                                    alt={v.title}
                                    className="mb-4 aspect-video w-full rounded-xl object-cover"
                                />
                            )}
                            <h3 className="font-fraunces text-lg text-school-ink">{v.title}</h3>
                            <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/70">{v.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Principal's message */}
            <section className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
                <PlaceholderPhoto caption={`Principal ${school.principal_name || '(name pending)'}`} />
                <div>
                    <h2 className="font-fraunces text-2xl text-school-ink">Principal&apos;s Message</h2>
                    <blockquote className="mt-4 font-fraunces text-lg italic leading-relaxed text-school-ink/85">
                        &ldquo;We believe school should be a place where children feel safe enough to try, fail,
                        and try again — and where families feel like true partners in their child&apos;s growth.
                        Thank you for considering{' '}{school.name} for your child&apos;s education.&rdquo;
                    </blockquote>
                    <p className="mt-4 font-public-sans text-sm font-semibold text-school-ink">
                        {school.principal_name || 'Principal name — to be confirmed'}
                    </p>
                </div>
            </section>

            {/* Leadership */}
            <section className="mt-16">
                <h2 className="font-fraunces text-2xl text-school-ink">Leadership Team</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {LEADERSHIP.map((person) => (
                        <div key={person.id}>
                            <PlaceholderPhoto caption={person.name} aspect="aspect-square" />
                            <p className="mt-3 font-public-sans text-sm font-semibold text-school-ink">{person.name}</p>
                            <p className="font-public-sans text-xs font-medium text-school-terracotta">{person.role}</p>
                            <p className="mt-1 font-public-sans text-xs leading-relaxed text-school-ink/60">{person.bio}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Accreditation */}
            <section className="mt-16 flex items-start gap-4 rounded-2xl border border-school-forest/10 bg-white p-6 sm:p-8">
                <ShieldCheck className="mt-1 h-7 w-7 shrink-0 text-school-forest" />
                <div>
                    <h2 className="font-fraunces text-xl text-school-ink">Registration &amp; Achievements</h2>
                    <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/75">
                        {school.name} is registered with the Government of Nepal under the Ministry of Education,
                        Science and Technology, and follows the national curriculum framework for Basic Level
                        (Grade 1-8) and Early Childhood Development. Recent student achievements are shared on
                        our <Link href="/school/news" className="font-semibold text-school-forest hover:underline">News &amp; Events</Link> page as they happen.
                    </p>
                </div>
            </section>
        </div>
    );
}
