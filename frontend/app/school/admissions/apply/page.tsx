// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import { SectionHeading } from '@/components/school/SectionHeading';
import { AdmissionForm } from '@/components/school/AdmissionForm';

export const metadata: Metadata = {
    title: 'Apply Now',
    description: 'Submit an online application to join our K-8 school in Dhangadhi, Kailali. Takes about five minutes.',
};

export default function ApplyPage() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><a href="/school" className="hover:text-school-forest">Home</a></li>
                    <li aria-hidden="true">/</li>
                    <li><a href="/school/admissions" className="hover:text-school-forest">Admissions</a></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">Apply</li>
                </ol>
            </nav>
            <SectionHeading
                eyebrow="Online application"
                title="Apply for Admission"
                description="Fill in the form below and our admissions team will reach out to schedule the next steps, including document verification and a placement conversation."
                className="mt-6"
            />
            <div className="mt-10 rounded-3xl border border-school-forest/10 bg-white p-6 shadow-sm sm:p-8">
                <AdmissionForm />
            </div>
        </div>
    );
}
