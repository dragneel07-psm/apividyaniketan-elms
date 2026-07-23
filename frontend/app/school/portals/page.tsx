// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, GraduationCap, LockKeyhole, ShieldCheck, UserCog, Users } from 'lucide-react';
import { SectionHeading } from '@/components/school/SectionHeading';

export const metadata: Metadata = {
    title: 'Portal Login',
    description: 'Secure sign-in links for students, parents, teachers, and administrators.',
};

const PORTALS = [
    {
        id: 'student',
        title: 'Student Portal',
        description: 'View assignments, grades, learning materials, and class schedules.',
        href: '/login/student',
        icon: GraduationCap,
    },
    {
        id: 'parent',
        title: 'Parent Portal',
        description: "Track your child's attendance, grades, notices, and fee status.",
        href: '/login',
        icon: Users,
    },
    {
        id: 'teacher',
        title: 'Teacher Portal',
        description: 'Manage classes, attendance, grading, and communication with families.',
        href: '/login/teacher',
        icon: UserCog,
    },
    {
        id: 'admin',
        title: 'Administrator Portal',
        description: 'School-wide management — enrollment, staff, finance, and reporting.',
        href: '/login/admin',
        icon: ShieldCheck,
    },
];

export default function PortalsPage() {
    return (
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">Portal Login</li>
                </ol>
            </nav>

            <SectionHeading
                eyebrow="Members of our school community"
                title="Portal Login"
                description="Sign in to the portal for your role. Credentials are issued by the school office — we never publish or store real login details on this page."
                className="mt-6"
            />

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
                {PORTALS.map((portal) => (
                    <Link
                        key={portal.id}
                        href={portal.href}
                        className="group flex items-start gap-4 rounded-2xl border border-school-forest/10 bg-white p-6 transition-colors hover:border-school-forest/30 hover:bg-school-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-school-marigold"
                    >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-school-forest/10 text-school-forest group-hover:bg-school-forest group-hover:text-white">
                            <portal.icon className="h-6 w-6" />
                        </span>
                        <div>
                            <h2 className="font-fraunces text-lg text-school-ink">{portal.title}</h2>
                            <p className="mt-1 font-public-sans text-sm leading-relaxed text-school-ink/70">{portal.description}</p>
                            <span className="mt-3 inline-flex items-center gap-1 font-public-sans text-sm font-semibold text-school-forest">
                                Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </span>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="mt-10 flex items-start gap-3 rounded-2xl bg-school-cream p-6">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-school-forest" />
                <p className="font-public-sans text-sm leading-relaxed text-school-ink/75">
                    New family, or lost your login details? Please{' '}
                    <Link href="/school/contact" className="font-semibold text-school-forest hover:underline">contact the school office</Link>{' '}
                    — for your security, portal access is issued in person or through a verified request, never shared over this website.
                </p>
            </div>
        </div>
    );
}
