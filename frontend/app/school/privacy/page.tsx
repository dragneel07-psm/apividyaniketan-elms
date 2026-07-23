// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { SectionHeading } from '@/components/school/SectionHeading';
import { getSchoolInfo } from '@/lib/school-content/school-info';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How we collect, use, and protect information submitted through this website.',
};

const SECTIONS = [
    {
        title: 'Information we collect',
        body: 'Through this website, we collect information you choose to submit — such as your name, email, phone number, and message — via the admissions application form, the contact form, and the newsletter signup. We do not knowingly collect information from these forms about children without a parent or guardian submitting it.',
    },
    {
        title: 'How we use it',
        body: 'Submitted information is used only to respond to inquiries, process admission applications, and send newsletter updates to those who opt in. We do not sell or rent visitor information to third parties.',
    },
    {
        title: 'Cookies',
        body: 'This website may use minimal, essential cookies to keep the site functioning correctly (for example, remembering that you dismissed a notice). We do not use cookies for third-party advertising tracking.',
    },
    {
        title: 'Data retention & security',
        body: 'Admission applications and contact messages are retained only as long as needed for admissions and correspondence purposes, and are accessible only to authorized school staff.',
    },
    {
        title: 'Your rights',
        body: 'You may request to review, correct, or delete personal information you have submitted through this website by contacting the school office.',
    },
];

export default async function PrivacyPolicyPage() {
    const school = await getSchoolInfo();

    return (
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">Privacy Policy</li>
                </ol>
            </nav>

            <SectionHeading eyebrow="Legal" title="Privacy Policy" className="mt-6" />
            <p className="mt-3 font-public-sans text-sm text-school-ink/50">Last updated: to be confirmed by the school administration.</p>

            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-school-marigold/30 bg-school-marigold/10 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-school-terracotta" />
                <p className="font-public-sans text-sm leading-relaxed text-school-ink/75">
                    Sample policy text — replace with content reviewed by the school&apos;s legal advisor before publishing,
                    to ensure it accurately reflects {school.name}&apos;s actual data practices.
                </p>
            </div>

            <div className="mt-10 space-y-8">
                {SECTIONS.map((section) => (
                    <section key={section.title}>
                        <h2 className="font-fraunces text-xl text-school-ink">{section.title}</h2>
                        <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/75">{section.body}</p>
                    </section>
                ))}
                <section>
                    <h2 className="font-fraunces text-xl text-school-ink">Contact us</h2>
                    <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/75">
                        Questions about this policy can be directed to the school office via our{' '}
                        <Link href="/school/contact" className="font-semibold text-school-forest hover:underline">Contact page</Link>.
                    </p>
                </section>
            </div>
        </div>
    );
}
