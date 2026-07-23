// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import Link from 'next/link';
import {
    ArrowRight,
    BookOpen,
    Calendar,
    FileText,
    FlaskConical,
    Palette,
    ReceiptText,
    ShieldCheck,
    Trophy,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaceholderPhoto } from '@/components/school/PlaceholderPhoto';
import { SectionHeading } from '@/components/school/SectionHeading';
import { GarlandDivider } from '@/components/school/GarlandDivider';
import {
    getPrograms,
    getPublicEvents,
    getPublicNotices,
    getSchoolInfo,
    getTestimonials,
} from '@/lib/school-content/school-info';
import type { Program } from '@/lib/api';

const PROGRAM_ICONS: Record<Program['icon'], typeof BookOpen> = {
    book: BookOpen,
    flask: FlaskConical,
    palette: Palette,
    trophy: Trophy,
};

const QUICK_LINKS = [
    { href: '/school/admissions', label: 'Admissions', icon: FileText },
    { href: '/school/news', label: 'Calendar', icon: Calendar },
    { href: '/school/admissions/apply', label: 'Apply Now', icon: ArrowRight },
    { href: '/school/news', label: 'Notices', icon: ShieldCheck },
    { href: '/school/contact', label: 'Fees', icon: ReceiptText },
    { href: '/school/contact', label: 'Contact', icon: Users },
];

export default async function SchoolHomePage() {
    const [school, notices, events, programs, testimonials] = await Promise.all([
        getSchoolInfo(),
        getPublicNotices(),
        getPublicEvents(),
        getPrograms(),
        getTestimonials(),
    ]);
    const latestNotices = notices.slice(0, 3);
    const upcomingEvents = events.slice(0, 3);

    const currentYear = new Date().getFullYear();
    const yearsServing = school.established_year && currentYear - school.established_year > 0
        ? currentYear - school.established_year
        : null;

    const stats = [
        { label: 'Enrolled students', value: school.student_count > 0 ? `${school.student_count}+` : '—' },
        { label: 'Teachers & staff', value: school.teacher_count > 0 ? `${school.teacher_count}` : '—' },
        { label: 'Years serving Dhangadhi', value: yearsServing ? `${yearsServing}` : '—' },
        { label: 'Grade levels', value: 'Nursery – 8' },
    ];

    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="relative overflow-hidden bg-school-cream">
                <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
                    <div>
                        <Badge className="rounded-full bg-school-forest/10 px-3 py-1 font-public-sans text-xs font-semibold text-school-forest hover:bg-school-forest/10">
                            K-8 School · Dhangadhi, Kailali
                        </Badge>
                        <h1 className="mt-5 font-fraunces text-4xl font-medium leading-[1.1] text-school-ink sm:text-5xl lg:text-6xl">
                            Where every child in Dhangadhi is known,
                            <span className="text-school-forest"> challenged</span>, and cared for.
                        </h1>
                        <p className="mt-5 max-w-xl font-public-sans text-lg leading-relaxed text-school-ink/75">
                            {school.name} pairs a strong academic foundation with small-class attention,
                            character development, and a safe, welcoming campus — from Nursery through Grade 8.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button asChild size="lg" className="bg-school-forest text-white hover:bg-school-forest-dark">
                                <Link href="/school/admissions/apply">Apply Now</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="border-school-forest/30 text-school-forest hover:bg-white">
                                <Link href="/school/about">Learn About Us</Link>
                            </Button>
                        </div>
                    </div>
                    <PlaceholderPhoto
                        caption="Students and teachers in the courtyard, morning assembly"
                        aspect="aspect-[5/4]"
                    />
                </div>
                <GarlandDivider className="absolute inset-x-0 bottom-0 text-school-marigold" />
            </section>

            {/* Quick links */}
            <section aria-label="Quick links" className="border-b border-school-forest/10 bg-white py-8">
                <div className="mx-auto grid max-w-7xl grid-cols-3 gap-3 px-4 sm:grid-cols-6 sm:px-6 lg:px-8">
                    {QUICK_LINKS.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="group flex flex-col items-center gap-2 rounded-2xl border border-transparent p-3 text-center transition-colors hover:border-school-forest/15 hover:bg-school-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-school-marigold"
                        >
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-school-forest/10 text-school-forest group-hover:bg-school-forest group-hover:text-white">
                                <link.icon className="h-5 w-5" />
                            </span>
                            <span className="font-public-sans text-xs font-medium text-school-ink">{link.label}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Principal's welcome */}
            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-16">
                    <PlaceholderPhoto caption={`Principal ${school.principal_name || '(name pending)'}, welcoming families`} />
                    <div>
                        <SectionHeading eyebrow="A note from our principal" title="A message from the Principal" />
                        <blockquote className="mt-5 font-fraunces text-xl italic leading-relaxed text-school-ink/85">
                            &ldquo;Every child who walks through our gates deserves to feel safe, seen, and capable of
                            great things. Our teachers know each student by name and by need — that&apos;s the kind
                            of school we&apos;ve built together with Dhangadhi families.&rdquo;
                        </blockquote>
                        <p className="mt-4 font-public-sans text-sm font-semibold text-school-ink">
                            {school.principal_name || 'Principal name — to be confirmed'}
                        </p>
                        <p className="font-public-sans text-sm text-school-ink/60">Principal, {school.name}</p>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="bg-school-forest py-14 text-school-cream">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
                    {stats.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="font-mono text-4xl font-semibold text-school-marigold">{stat.value}</p>
                            <p className="mt-2 font-public-sans text-sm text-school-cream/80">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Programs */}
            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <SectionHeading
                    eyebrow="What we offer"
                    title="Featured programs & facilities"
                    description="A well-rounded K-8 experience built around strong fundamentals, hands-on learning, and student wellbeing."
                    align="center"
                    className="mx-auto"
                />
                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {programs.map((program) => {
                        const Icon = PROGRAM_ICONS[program.icon];
                        return (
                            <Card key={program.id} className="border-school-forest/10 shadow-none transition-shadow hover:shadow-md">
                                <CardContent className="pt-2">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-school-marigold/15 text-school-terracotta">
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <h3 className="mt-4 font-fraunces text-lg text-school-ink">{program.title}</h3>
                                    <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/70">
                                        {program.description}
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* News + Events */}
            <section className="bg-school-cream py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <SectionHeading eyebrow="Stay in the loop" title="Latest news & upcoming events" />
                        <Link href="/school/news" className="font-public-sans text-sm font-semibold text-school-forest hover:underline">
                            View all →
                        </Link>
                    </div>
                    <div className="mt-8 grid gap-8 lg:grid-cols-2">
                        <div>
                            <h3 className="font-public-sans text-sm font-semibold uppercase tracking-wide text-school-ink/50">Notices</h3>
                            <ul className="mt-3 space-y-3">
                                {latestNotices.length === 0 && (
                                    <li className="rounded-xl border border-dashed border-school-forest/20 bg-white p-4 font-public-sans text-sm text-school-ink/60">
                                        No notices published yet — check back soon.
                                    </li>
                                )}
                                {latestNotices.map((notice) => (
                                    <li key={notice.id}>
                                        <Link
                                            href="/school/news"
                                            className="block rounded-xl border border-school-forest/10 bg-white p-4 transition-colors hover:border-school-forest/30"
                                        >
                                            <p className="font-public-sans text-sm font-semibold text-school-ink">{notice.title}</p>
                                            <p className="mt-1 line-clamp-2 font-public-sans text-sm text-school-ink/60">{notice.content}</p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-public-sans text-sm font-semibold uppercase tracking-wide text-school-ink/50">Upcoming events</h3>
                            <ul className="mt-3 space-y-3">
                                {upcomingEvents.length === 0 && (
                                    <li className="rounded-xl border border-dashed border-school-forest/20 bg-white p-4 font-public-sans text-sm text-school-ink/60">
                                        No upcoming events scheduled yet.
                                    </li>
                                )}
                                {upcomingEvents.map((event) => (
                                    <li key={event.event_id}>
                                        <Link
                                            href={`/school/events/${event.event_id}`}
                                            className="flex items-center gap-4 rounded-xl border border-school-forest/10 bg-white p-4 transition-colors hover:border-school-forest/30"
                                        >
                                            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-school-forest text-white">
                                                <span className="font-mono text-base font-semibold leading-none">
                                                    {new Date(event.start_date).getDate()}
                                                </span>
                                                <span className="text-[10px] uppercase">
                                                    {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' })}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-public-sans text-sm font-semibold text-school-ink">{event.title}</p>
                                                <p className="font-public-sans text-xs text-school-ink/60">{event.event_type_display}{event.location ? ` · ${event.location}` : ''}</p>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <SectionHeading eyebrow="From our community" title="What families & students say" align="center" className="mx-auto" />
                <div className="mt-10 grid gap-6 md:grid-cols-3">
                    {testimonials.map((t) => (
                        <Card key={t.id} className="border-school-forest/10 shadow-none">
                            <CardContent className="pt-2">
                                <p className="font-fraunces text-base italic leading-relaxed text-school-ink/85">&ldquo;{t.quote}&rdquo;</p>
                                <p className="mt-4 font-public-sans text-sm font-semibold text-school-ink">{t.name}</p>
                                <p className="font-public-sans text-xs text-school-ink/60">{t.role}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Gallery preview */}
            <section className="bg-school-cream py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <SectionHeading eyebrow="Campus life" title="A glimpse of school life" />
                        <Link href="/school/gallery" className="font-public-sans text-sm font-semibold text-school-forest hover:underline">
                            View gallery →
                        </Link>
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <PlaceholderPhoto caption="Grade 3 classroom" aspect="aspect-square" />
                        <PlaceholderPhoto caption="Annual sports day" aspect="aspect-square" />
                        <PlaceholderPhoto caption="Science lab" aspect="aspect-square" />
                        <PlaceholderPhoto caption="Cultural program" aspect="aspect-square" />
                    </div>
                </div>
            </section>

            {/* Admissions CTA */}
            <section className="relative overflow-hidden bg-school-forest py-16 text-center text-white">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <h2 className="font-fraunces text-3xl font-medium sm:text-4xl">Ready to join our school family?</h2>
                    <p className="mt-3 font-public-sans text-base text-school-cream/85">
                        Admissions for the {school.current_academic_year || 'upcoming'} academic year are open.
                        Applying takes about five minutes.
                    </p>
                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                        <Button asChild size="lg" className="bg-school-marigold text-school-ink hover:bg-school-marigold-dark">
                            <Link href="/school/admissions/apply">Apply Now</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                            <Link href="/school/admissions">View Admissions Process</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
