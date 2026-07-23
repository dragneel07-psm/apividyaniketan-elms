// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { SectionHeading } from '@/components/school/SectionHeading';
import { getSchoolInfo } from '@/lib/school-content/school-info';

export const metadata: Metadata = {
    title: 'Terms of Use',
    description: 'Terms governing the use of this website.',
};

const SECTIONS = [
    {
        title: 'Acceptance of terms',
        body: 'By using this website, you agree to these terms of use. If you do not agree, please discontinue use of the site.',
    },
    {
        title: 'Purpose of this website',
        body: 'This website provides general information about our school, its programs, admissions process, and community, and offers forms for inquiries and applications. It is not a substitute for official enrollment records or communication issued directly by the school office.',
    },
    {
        title: 'Accuracy of information',
        body: 'We aim to keep information on this site current and accurate, but school policies, fees, and schedules may change. Always confirm time-sensitive details (such as fees or admission deadlines) directly with the school office.',
    },
    {
        title: 'Portal access',
        body: 'Student, parent, teacher, and administrator portal accounts are issued directly by the school and are for the exclusive use of the named account holder. Do not share login credentials.',
    },
    {
        title: 'Intellectual property',
        body: 'Photos, text, and other content on this site belong to the school or are used with permission, and may not be reproduced without consent.',
    },
];

export default async function TermsOfUsePage() {
    const school = await getSchoolInfo();

    return (
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">Terms of Use</li>
                </ol>
            </nav>

            <SectionHeading eyebrow="Legal" title="Terms of Use" className="mt-6" />
            <p className="mt-3 font-public-sans text-sm text-school-ink/50">Last updated: to be confirmed by the school administration.</p>

            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-school-marigold/30 bg-school-marigold/10 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-school-terracotta" />
                <p className="font-public-sans text-sm leading-relaxed text-school-ink/75">
                    Sample terms — replace with content reviewed by the school&apos;s legal advisor before publishing,
                    to ensure it accurately reflects {school.name}&apos;s actual policies.
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
                        Questions about these terms can be directed to the school office via our{' '}
                        <Link href="/school/contact" className="font-semibold text-school-forest hover:underline">Contact page</Link>.
                    </p>
                </section>
            </div>
        </div>
    );
}
