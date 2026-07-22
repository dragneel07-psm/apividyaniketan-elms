// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Calendar, FlaskConical, Library } from 'lucide-react';
import { SectionHeading } from '@/components/school/SectionHeading';
import { PlaceholderPhoto } from '@/components/school/PlaceholderPhoto';

export const metadata: Metadata = {
    title: 'Academics',
    description: 'Curriculum overview, grade levels, teaching methodology, academic calendar, and learning resources.',
};

const GRADE_BANDS = [
    { name: 'Early Years', grades: 'Nursery – UKG', focus: 'Play-based learning, early literacy and numeracy, social skills, and motor development.' },
    { name: 'Primary', grades: 'Grade 1 – 3', focus: 'Foundational literacy, numeracy, and a phonics-first reading approach across core subjects.' },
    { name: 'Middle Primary', grades: 'Grade 4 – 5', focus: 'Broader subject exposure — science, social studies, and computer literacy alongside strong fundamentals.' },
    { name: 'Senior Primary', grades: 'Grade 6 – 8', focus: 'Subject-specialist teaching, lab-based science, and exam-readiness for secondary school transition.' },
];

const METHODOLOGY = [
    { title: 'Activity-based learning', body: 'Lessons favor hands-on activities and real examples over rote memorization, especially in Grades 1-5.' },
    { title: 'Continuous assessment', body: 'Regular formative quizzes and classwork — not just end-of-term exams — help teachers catch gaps early.' },
    { title: 'Small class sizes', body: 'Keeps teacher attention high and lets lessons adapt to how a specific class is progressing.' },
    { title: 'Bilingual instruction', body: 'Core subjects are taught in both Nepali and English so students build strong literacy in each.' },
];

export default function AcademicsPage() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">Academics</li>
                </ol>
            </nav>

            <SectionHeading
                eyebrow="How we teach"
                title="Academics"
                description="A structured, grade-appropriate curriculum built on strong fundamentals, hands-on learning, and continuous feedback to families."
                className="mt-6"
            />

            {/* Grade levels */}
            <section className="mt-12">
                <h2 className="font-fraunces text-2xl text-school-ink">Grade Levels</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {GRADE_BANDS.map((band) => (
                        <div key={band.name} className="rounded-2xl border border-school-forest/10 p-5">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-school-forest/10 text-school-forest">
                                <BookOpen className="h-5 w-5" />
                            </span>
                            <h3 className="mt-3 font-fraunces text-lg text-school-ink">{band.name}</h3>
                            <p className="font-public-sans text-xs font-semibold uppercase tracking-wide text-school-terracotta">{band.grades}</p>
                            <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/70">{band.focus}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Curriculum overview */}
            <section className="mt-16 grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                    <h2 className="font-fraunces text-2xl text-school-ink">Curriculum Overview</h2>
                    <p className="mt-3 font-public-sans text-sm leading-relaxed text-school-ink/75">
                        Our curriculum follows the national framework for Basic Level education, covering Nepali,
                        English, Mathematics, Science, Social Studies, Health &amp; Physical Education, and
                        Computer Science from Grade 4 onward. Early Years classes focus on foundational literacy,
                        numeracy, and social-emotional development through guided play.
                    </p>
                    <p className="mt-3 font-public-sans text-sm leading-relaxed text-school-ink/75">
                        Alongside academics, every grade has weekly time for art, music, and physical education —
                        we don&apos;t treat these as optional extras.
                    </p>
                </div>
                <PlaceholderPhoto caption="Teacher leading a Grade 5 mathematics lesson" />
            </section>

            {/* Teaching methodology */}
            <section className="mt-16 bg-school-cream rounded-2xl p-6 sm:p-10">
                <h2 className="font-fraunces text-2xl text-school-ink">Teaching Methodology</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    {METHODOLOGY.map((m) => (
                        <div key={m.title}>
                            <h3 className="font-public-sans text-sm font-semibold text-school-ink">{m.title}</h3>
                            <p className="mt-1 font-public-sans text-sm leading-relaxed text-school-ink/70">{m.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Calendar + resources */}
            <section className="mt-16 grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-school-forest/10 p-6">
                    <Calendar className="h-7 w-7 text-school-forest" />
                    <h2 className="mt-3 font-fraunces text-xl text-school-ink">Academic Calendar</h2>
                    <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/70">
                        Terms, exam dates, and holidays are published each academic year. See{' '}
                        <Link href="/school/news" className="font-semibold text-school-forest hover:underline">News &amp; Events</Link>{' '}
                        for the current term&apos;s calendar and upcoming exam schedules.
                    </p>
                </div>
                <div className="rounded-2xl border border-school-forest/10 p-6">
                    <div className="flex gap-3">
                        <FlaskConical className="h-7 w-7 text-school-forest" />
                        <Library className="h-7 w-7 text-school-forest" />
                    </div>
                    <h2 className="mt-3 font-fraunces text-xl text-school-ink">Library &amp; Labs</h2>
                    <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/70">
                        A dedicated science laboratory supports hands-on experiments for Grade 4 and up, and our
                        library — stocked with Nepali and English titles — is open daily with a weekly class
                        library period for every grade.
                    </p>
                </div>
            </section>
        </div>
    );
}
