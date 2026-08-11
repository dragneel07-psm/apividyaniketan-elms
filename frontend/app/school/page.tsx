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
import { SchoolPhoto } from '@/components/school/SchoolPhoto';
import { PlaceholderPhoto } from '@/components/school/PlaceholderPhoto';
import { SectionHeading } from '@/components/school/SectionHeading';
import { GarlandDivider } from '@/components/school/GarlandDivider';
import { Reveal } from '@/components/school/Reveal';
import {
    getGalleryItems,
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
    { href: '/school/admissions/apply', label: 'Apply now', icon: ArrowRight },
    { href: '/school/news', label: 'Notices', icon: ShieldCheck },
    { href: '/school/contact', label: 'Fees', icon: ReceiptText },
    { href: '/school/contact', label: 'Contact', icon: Users },
];

const GALLERY_LAYOUT = [
    { aspect: 'aspect-[3/4]', span: 'row-span-2' },
    { aspect: 'aspect-square', span: '' },
    { aspect: 'aspect-square', span: '' },
    { aspect: 'aspect-[4/3]', span: 'col-span-2 md:col-span-1' },
];

export default async function SchoolHomePage() {
    const [school, notices, events, programs, testimonials, galleryItems] = await Promise.all([
        getSchoolInfo(),
        getPublicNotices(),
        getPublicEvents(),
        getPrograms(),
        getTestimonials(),
        getGalleryItems(),
    ]);
    const galleryPreview = galleryItems
        .filter((item) => item.image_url)
        .slice(0, GALLERY_LAYOUT.length)
        .map((item, index) => ({ ...item, ...GALLERY_LAYOUT[index] }));
    // Backfill any slots a partial gallery (1-3 photos) leaves empty, so the
    // mosaic never renders with visible gaps — only fully empty galleries
    // fall back to the single wide "coming soon" placeholder below.
    const missingGallerySlots = GALLERY_LAYOUT.slice(galleryPreview.length);
    const latestNotices = notices.slice(0, 3);
    const upcomingEvents = events.slice(0, 3);

    const currentYear = new Date().getFullYear();
    const yearsServing = school.established_year && currentYear - school.established_year > 0
        ? currentYear - school.established_year
        : null;

    const stats = [
        { label: 'Enrolled students', value: school.student_count > 0 ? `${school.student_count}+` : '—' },
        { label: 'Teachers & staff', value: school.teacher_count > 0 ? `${school.teacher_count}` : '—' },
        ...(yearsServing ? [] : [{ label: 'Years serving Dhangadhi', value: '—' }]),
        { label: 'Grade levels', value: 'Nursery – 8' },
    ];

    const [featuredProgram, ...restPrograms] = programs;

    return (
        <div className="bg-white">
            {/* Hero */}
            <section className="relative overflow-hidden bg-school-cream">
                <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-24 lg:px-8">
                    <div>
                        <div className="flex items-center gap-3 font-public-sans text-xs font-semibold uppercase tracking-[0.2em] text-school-terracotta">
                            <span className="h-px w-8 bg-school-terracotta/50" aria-hidden="true" />
                            K-8 school · Dhangadhi, Kailali
                        </div>
                        <h1 className="mt-5 max-w-xl text-balance font-fraunces text-4xl font-medium leading-[1.08] tracking-tight text-school-ink sm:text-5xl lg:text-[3.4rem]">
                            Where every child in Dhangadhi is known,{' '}
                            <span className="text-school-forest">challenged</span>, and cared for.
                        </h1>
                        <p className="mt-5 max-w-lg text-pretty font-public-sans text-lg leading-relaxed text-school-ink/75">
                            {school.name} pairs a strong academic foundation with small-class attention,
                            character development, and a safe, welcoming campus — from Nursery through Grade 8.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                            <Button
                                asChild
                                size="lg"
                                className="bg-school-forest text-white transition-transform duration-200 hover:bg-school-forest-dark active:scale-[0.98]"
                            >
                                <Link href="/school/admissions/apply">Apply now</Link>
                            </Button>
                            <Link
                                href="/school/about"
                                className="group inline-flex items-center gap-1.5 font-public-sans text-sm font-semibold text-school-ink transition-colors hover:text-school-forest"
                            >
                                Learn about us
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <div
                            className="absolute -inset-4 -z-10 hidden rounded-[2.5rem] border border-school-terracotta/25 sm:block"
                            aria-hidden="true"
                        />
                        {school.hero_image ? (
                            <SchoolPhoto
                                src={school.hero_image}
                                alt="Students and teachers in the courtyard, morning assembly"
                                aspect="aspect-[5/4]"
                                priority
                            />
                        ) : (
                            <PlaceholderPhoto
                                caption="Students and teachers in the courtyard, morning assembly"
                                aspect="aspect-[5/4]"
                            />
                        )}
                        {yearsServing && (
                            <div className="absolute -bottom-6 -left-4 flex h-24 w-24 flex-col items-center justify-center rounded-full bg-school-marigold text-center shadow-lg shadow-school-marigold/30 sm:h-28 sm:w-28">
                                <span className="font-fraunces text-2xl font-semibold text-school-ink sm:text-3xl">{yearsServing}</span>
                                <span className="font-public-sans text-[10px] font-medium uppercase tracking-wide text-school-ink/80">years strong</span>
                            </div>
                        )}
                    </div>
                </div>
                <GarlandDivider className="absolute inset-x-0 bottom-0 text-school-marigold" />
            </section>

            {/* Quick links */}
            <section aria-label="Quick links" className="border-b border-school-forest/10 bg-white py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <p className="font-public-sans text-xs font-semibold uppercase tracking-wider text-school-ink/40">
                        Jump to
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
                        {QUICK_LINKS.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="group flex flex-col items-center gap-2 rounded-2xl border border-transparent p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-school-forest/15 hover:bg-school-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-school-marigold"
                            >
                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-school-forest/10 text-school-forest transition-colors duration-200 group-hover:bg-school-forest group-hover:text-white">
                                    <link.icon className="h-5 w-5" />
                                </span>
                                <span className="font-public-sans text-xs font-medium text-school-ink">{link.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Principal's welcome */}
            <Reveal>
                <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-16">
                        {school.principal_photo ? (
                            <SchoolPhoto
                                src={school.principal_photo}
                                alt={`Principal ${school.principal_name || '(name pending)'}, welcoming families`}
                            />
                        ) : (
                            <PlaceholderPhoto caption={`Principal ${school.principal_name || '(name pending)'}, welcoming families`} />
                        )}
                        <div className="relative">
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute -left-3 -top-10 select-none font-fraunces text-[7rem] leading-none text-school-forest/10"
                            >
                                &ldquo;
                            </span>
                            <SectionHeading eyebrow="A note from our principal" title="A message from the Principal" />
                            <blockquote className="relative mt-5 max-w-xl text-pretty font-fraunces text-xl italic leading-relaxed text-school-ink/85">
                                Every child who walks through our gates deserves to feel safe, seen, and capable of
                                great things. Our teachers know each student by name and by need — that&apos;s the
                                kind of school we&apos;ve built together with Dhangadhi families.
                            </blockquote>
                            <p className="mt-4 font-public-sans text-sm font-semibold text-school-ink">
                                {school.principal_name || 'Principal name — to be confirmed'}
                            </p>
                            <p className="font-public-sans text-sm text-school-ink/60">Principal, {school.name}</p>
                        </div>
                    </div>
                </section>
            </Reveal>

            {/* Stats */}
            <section className="bg-school-grain bg-school-forest py-14 text-school-cream">
                <div
                    className={
                        yearsServing
                            ? 'mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16 lg:px-8'
                            : 'mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8'
                    }
                >
                    {yearsServing && (
                        <div className="text-center lg:text-left">
                            <p className="font-mono text-6xl font-semibold text-school-marigold sm:text-7xl">
                                {yearsServing}+
                            </p>
                            <p className="mt-2 font-public-sans text-sm text-school-cream/80">Years serving Dhangadhi</p>
                        </div>
                    )}
                    <div
                        className={
                            yearsServing
                                ? 'grid grid-cols-1 gap-8 border-t border-school-cream/15 pt-8 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-16 lg:pt-0'
                                : 'contents'
                        }
                    >
                        {stats.map((stat) => (
                            <div key={stat.label} className="text-center lg:text-left">
                                <p className="font-mono text-3xl font-semibold text-school-cream">{stat.value}</p>
                                <p className="mt-2 font-public-sans text-sm text-school-cream/80">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Programs */}
            {programs.length > 0 && (
                <Reveal>
                    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                        <SectionHeading
                            eyebrow="What we offer"
                            title="Featured programs & facilities"
                            description="A well-rounded K-8 experience built around strong fundamentals, hands-on learning, and student wellbeing."
                        />
                        <div className="mt-10 grid gap-5 lg:grid-cols-3">
                            {featuredProgram && (
                                <ProgramTile program={featuredProgram} featured />
                            )}
                            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1">
                                {restPrograms.map((program) => (
                                    <ProgramTile key={program.id} program={program} />
                                ))}
                            </div>
                        </div>
                    </section>
                </Reveal>
            )}

            {/* News + Events */}
            <Reveal>
                <section className="bg-school-cream py-16">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <SectionHeading eyebrow="Stay in the loop" title="Latest news & upcoming events" />
                            <Link href="/school/news" className="font-public-sans text-sm font-semibold text-school-forest hover:underline">
                                View all →
                            </Link>
                        </div>
                        <div className="mt-8 grid gap-10 lg:grid-cols-2">
                            <div>
                                <h3 className="font-public-sans text-sm font-semibold uppercase tracking-wide text-school-ink/50">Notices</h3>
                                <ul className="mt-3 space-y-3">
                                    {latestNotices.length === 0 && (
                                        <li className="rounded-lg border border-dashed border-school-forest/20 bg-white p-4 font-public-sans text-sm text-school-ink/60">
                                            No notices published yet — check back soon.
                                        </li>
                                    )}
                                    {latestNotices.map((notice) => (
                                        <li key={notice.id}>
                                            <Link
                                                href="/school/news"
                                                className="group block rounded-lg border-l-[3px] border-school-forest/25 bg-white py-3 pl-4 pr-4 transition-colors hover:border-school-forest hover:bg-white"
                                            >
                                                <p className="font-public-sans text-sm font-semibold text-school-ink group-hover:text-school-forest">{notice.title}</p>
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
                                        <li className="rounded-lg border border-dashed border-school-forest/20 bg-white p-4 font-public-sans text-sm text-school-ink/60">
                                            No upcoming events scheduled yet.
                                        </li>
                                    )}
                                    {upcomingEvents.map((event) => (
                                        <li key={event.event_id}>
                                            <Link
                                                href={`/school/events/${event.event_id}`}
                                                className="group flex items-center gap-4 rounded-lg border-l-[3px] border-school-marigold/40 bg-white py-3 pl-4 pr-4 transition-colors hover:border-school-marigold"
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
                                                    <p className="font-public-sans text-sm font-semibold text-school-ink group-hover:text-school-forest">{event.title}</p>
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
            </Reveal>

            {/* Testimonials */}
            {testimonials.length > 0 && (
                <Reveal>
                    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                        <SectionHeading eyebrow="From our community" title="What families & students say" />
                        <div className="mt-10 grid gap-6 md:grid-cols-3">
                            {testimonials.map((t, index) => (
                                <div
                                    key={t.id}
                                    className={index % 2 === 1 ? 'md:mt-8' : undefined}
                                >
                                    <p className="text-pretty font-fraunces text-lg italic leading-relaxed text-school-ink/85">&ldquo;{t.quote}&rdquo;</p>
                                    <div className="mt-4 flex items-center gap-3">
                                        {t.image_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={t.image_url}
                                                alt={t.name}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-school-terracotta/15 font-fraunces text-sm text-school-terracotta">
                                                {t.name.charAt(0)}
                                            </span>
                                        )}
                                        <div>
                                            <p className="font-public-sans text-sm font-semibold text-school-ink">{t.name}</p>
                                            <p className="font-public-sans text-xs text-school-ink/60">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </Reveal>
            )}

            {/* Gallery preview */}
            <section className="bg-school-cream py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <SectionHeading eyebrow="Campus life" title="A glimpse of school life" />
                        <Link href="/school/gallery" className="font-public-sans text-sm font-semibold text-school-forest hover:underline">
                            View gallery →
                        </Link>
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
                        {galleryPreview.map((item) => (
                            <SchoolPhoto
                                key={item.id}
                                src={item.image_url!}
                                alt={item.caption}
                                aspect={item.aspect}
                                className={item.span}
                            />
                        ))}
                        {galleryPreview.length === 0 ? (
                            <PlaceholderPhoto caption="Gallery photos coming soon" className="col-span-2 md:col-span-3" />
                        ) : (
                            missingGallerySlots.map((slot, index) => (
                                <PlaceholderPhoto
                                    key={`gallery-placeholder-${index}`}
                                    caption="More photos coming soon"
                                    aspect={slot.aspect}
                                    className={slot.span}
                                />
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* Admissions CTA */}
            <section className="relative overflow-hidden bg-school-grain bg-school-forest text-center text-white">
                <GarlandDivider className="text-school-marigold" flip />
                <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
                    <h2 className="text-balance font-fraunces text-3xl font-medium sm:text-4xl">Ready to join our school family?</h2>
                    <p className="mt-3 font-public-sans text-base text-school-cream/85">
                        Admissions for the {school.current_academic_year || 'upcoming'} academic year are open.
                        Applying takes about five minutes.
                    </p>
                    <div className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3">
                        <Button
                            asChild
                            size="lg"
                            className="bg-school-marigold text-school-ink transition-transform duration-200 hover:bg-school-marigold-dark active:scale-[0.98]"
                        >
                            <Link href="/school/admissions/apply">Apply now</Link>
                        </Button>
                        <Link
                            href="/school/admissions"
                            className="group inline-flex items-center gap-1.5 font-public-sans text-sm font-semibold text-white transition-colors"
                        >
                            View admissions process
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function ProgramTile({ program, featured = false }: { program: Program; featured?: boolean }) {
    const Icon = PROGRAM_ICONS[program.icon];
    return (
        <div
            className={
                featured
                    ? 'group flex flex-col justify-between rounded-3xl bg-school-cream p-8 transition-shadow duration-200 hover:shadow-[0_12px_32px_-8px_rgba(31,75,63,0.25)] lg:row-span-2'
                    : 'group flex items-start gap-4 rounded-2xl border border-school-forest/10 p-5 transition-shadow duration-200 hover:shadow-[0_8px_20px_-6px_rgba(31,75,63,0.15)]'
            }
        >
            {featured ? (
                <>
                    <div>
                        {program.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={program.image_url}
                                alt={program.title}
                                className="h-14 w-14 rounded-full object-cover"
                            />
                        ) : (
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-school-marigold/15 text-school-terracotta">
                                <Icon className="h-6 w-6" />
                            </span>
                        )}
                        <h3 className="mt-5 font-fraunces text-2xl text-school-ink">{program.title}</h3>
                        <p className="mt-3 max-w-sm font-public-sans text-sm leading-relaxed text-school-ink/70">
                            {program.description}
                        </p>
                    </div>
                    <ArrowRight className="mt-6 h-5 w-5 text-school-forest transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </>
            ) : (
                <>
                    {program.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={program.image_url}
                            alt={program.title}
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                    ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-school-marigold/15 text-school-terracotta">
                            <Icon className="h-5 w-5" />
                        </span>
                    )}
                    <div>
                        <h3 className="font-fraunces text-lg text-school-ink">{program.title}</h3>
                        <p className="mt-1 font-public-sans text-sm leading-relaxed text-school-ink/70">
                            {program.description}
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}
