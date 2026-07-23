// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Download, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { SectionHeading } from '@/components/school/SectionHeading';
import { getAdmissionFaqs } from '@/lib/school-content/school-info';

export const metadata: Metadata = {
    title: 'Admissions',
    description: 'How to apply, eligibility requirements, required documents, and fee information for our K-8 school in Dhangadhi, Kailali.',
};

const STEPS = [
    { title: 'Submit an inquiry or application', body: 'Fill out the online application, or visit the admissions office in person during school hours.' },
    { title: 'Document verification', body: 'Bring the required documents (see checklist below) for our admissions team to verify.' },
    { title: 'Placement conversation', body: 'A short, friendly conversation with the class teacher to understand the student\'s current level.' },
    { title: 'Confirm your seat', body: 'Complete enrollment formalities and fee payment to confirm your child\'s seat.' },
];

const ELIGIBILITY = [
    'Nursery: minimum age 3 years by the start of the academic year.',
    'Grades 1-8: age-appropriate for the grade, or based on a placement conversation for transfers.',
    'Transfer students: a transfer/character certificate from the previous school.',
];

const DOCUMENTS = [
    'Filled application form',
    "Student's birth certificate (original + copy)",
    "2 passport-size photos of the student",
    'Immunization record (for Nursery–Grade 2)',
    'Transfer/character certificate (for transfer students)',
    "Parent/guardian citizenship copy",
];

export default async function AdmissionsPage() {
    const faqs = await getAdmissionFaqs();

    return (
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><Link href="/school" className="hover:text-school-forest">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">Admissions</li>
                </ol>
            </nav>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                <SectionHeading eyebrow="Join our school family" title="Admissions" />
                <div className="flex gap-3">
                    <Button variant="outline" className="border-school-forest/30 text-school-forest">
                        <Download className="mr-2 h-4 w-4" /> Download Prospectus
                    </Button>
                    <Button asChild className="bg-school-marigold text-school-ink hover:bg-school-marigold-dark">
                        <Link href="/school/admissions/apply">Apply Now</Link>
                    </Button>
                </div>
            </div>

            {/* Process — a real sequence, numbering is meaningful here */}
            <section className="mt-14">
                <h2 className="font-fraunces text-2xl text-school-ink">Admission Process</h2>
                <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map((step, i) => (
                        <li key={step.title} className="rounded-2xl border border-school-forest/10 p-5">
                            <span className="font-mono text-sm font-semibold text-school-terracotta">Step {i + 1}</span>
                            <h3 className="mt-2 font-fraunces text-lg text-school-ink">{step.title}</h3>
                            <p className="mt-2 font-public-sans text-sm leading-relaxed text-school-ink/70">{step.body}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <div className="mt-14 grid gap-10 lg:grid-cols-2">
                <section>
                    <h2 className="font-fraunces text-2xl text-school-ink">Eligibility</h2>
                    <ul className="mt-4 space-y-3">
                        {ELIGIBILITY.map((item) => (
                            <li key={item} className="flex items-start gap-2 font-public-sans text-sm text-school-ink/75">
                                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-school-forest" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>
                <section>
                    <h2 className="font-fraunces text-2xl text-school-ink">Required Documents</h2>
                    <ul className="mt-4 space-y-3">
                        {DOCUMENTS.map((item) => (
                            <li key={item} className="flex items-start gap-2 font-public-sans text-sm text-school-ink/75">
                                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-school-forest" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            <section className="mt-14 rounded-2xl bg-school-cream p-6 sm:p-8">
                <h2 className="font-fraunces text-2xl text-school-ink">Fee Information</h2>
                <p className="mt-3 max-w-2xl font-public-sans text-sm leading-relaxed text-school-ink/75">
                    Fee structures vary by grade and are reviewed each academic year. Please contact the{' '}
                    <Link href="/school/contact" className="font-semibold text-school-forest hover:underline">Finance Office</Link>{' '}
                    or download the prospectus for the current fee schedule, payment plans, and any applicable scholarships.
                </p>
            </section>

            <section className="mt-14">
                <h2 className="font-fraunces text-2xl text-school-ink">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="mt-6">
                    {faqs.map((faq) => (
                        <AccordionItem key={faq.id} value={String(faq.id)}>
                            <AccordionTrigger className="font-public-sans text-left text-base font-medium text-school-ink">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="font-public-sans text-sm leading-relaxed text-school-ink/70">
                                {faq.image_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={faq.image_url}
                                        alt={faq.question}
                                        className="mb-3 aspect-video w-full max-w-sm rounded-lg object-cover"
                                    />
                                )}
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>
        </div>
    );
}
