// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import { Clock, Mail, MapPin, Phone, ShieldAlert } from 'lucide-react';
import { SectionHeading } from '@/components/school/SectionHeading';
import { ContactForm } from '@/components/school/ContactForm';
import { getSchoolInfo } from '@/lib/school-content/school-info';

export const metadata: Metadata = {
    title: 'Contact Us',
    description: 'Get in touch — address, phone, office hours, and a contact form for admissions, academics, finance, and transportation questions.',
};

const DEPARTMENTS = [
    { label: 'Admissions Office', note: 'New enrollments, transfers, prospectus' },
    { label: 'Academics Office', note: 'Curriculum, teachers, academic calendar' },
    { label: 'Finance Office', note: 'Fees, payments, receipts' },
    { label: 'Transportation Desk', note: 'Bus routes and pickup points' },
];

export default async function ContactPage() {
    const school = await getSchoolInfo();

    return (
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <nav aria-label="Breadcrumb" className="font-public-sans text-sm text-school-ink/60">
                <ol className="flex gap-2">
                    <li><a href="/school" className="hover:text-school-forest">Home</a></li>
                    <li aria-hidden="true">/</li>
                    <li className="text-school-ink">Contact</li>
                </ol>
            </nav>

            <SectionHeading eyebrow="We'd love to hear from you" title="Contact Us" className="mt-6" />

            <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_1.3fr]">
                <div className="space-y-8">
                    <div className="space-y-4 rounded-2xl border border-school-forest/10 bg-school-cream p-6">
                        <div className="flex items-start gap-3">
                            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-school-forest" />
                            <div>
                                <p className="font-public-sans text-sm font-semibold text-school-ink">Address</p>
                                <p className="font-public-sans text-sm text-school-ink/70">{school.address || 'Dhangadhi, Kailali, Nepal'}</p>
                            </div>
                        </div>
                        {school.contact_phone && (
                            <div className="flex items-start gap-3">
                                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-school-forest" />
                                <div>
                                    <p className="font-public-sans text-sm font-semibold text-school-ink">Phone</p>
                                    <a href={`tel:${school.contact_phone}`} className="font-public-sans text-sm text-school-ink/70 hover:text-school-forest">{school.contact_phone}</a>
                                </div>
                            </div>
                        )}
                        {school.contact_email && (
                            <div className="flex items-start gap-3">
                                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-school-forest" />
                                <div>
                                    <p className="font-public-sans text-sm font-semibold text-school-ink">Email</p>
                                    <a href={`mailto:${school.contact_email}`} className="font-public-sans text-sm text-school-ink/70 hover:text-school-forest">{school.contact_email}</a>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-3">
                            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-school-forest" />
                            <div>
                                <p className="font-public-sans text-sm font-semibold text-school-ink">Office hours</p>
                                <p className="font-public-sans text-sm text-school-ink/70">Sunday – Friday, 10:00 AM – 4:00 PM (Saturday closed)</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-school-terracotta" />
                            <div>
                                <p className="font-public-sans text-sm font-semibold text-school-ink">Emergency contact</p>
                                <p className="font-public-sans text-sm text-school-ink/70">
                                    For urgent, time-sensitive matters during school hours, please call the office directly rather than using this form.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="font-public-sans text-sm font-semibold uppercase tracking-wide text-school-ink/50">Department contacts</h2>
                        <ul className="mt-3 space-y-3">
                            {DEPARTMENTS.map((d) => (
                                <li key={d.label} className="rounded-xl border border-school-forest/10 p-3">
                                    <p className="font-public-sans text-sm font-semibold text-school-ink">{d.label}</p>
                                    <p className="font-public-sans text-xs text-school-ink/60">{d.note}</p>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h2 className="font-public-sans text-sm font-semibold uppercase tracking-wide text-school-ink/50">Directions</h2>
                        <div className="mt-3 aspect-video overflow-hidden rounded-2xl border border-school-forest/10">
                            <iframe
                                title="Map to the school in Dhangadhi, Kailali"
                                src="https://www.google.com/maps?q=Dhangadhi,Kailali,Nepal&output=embed"
                                className="h-full w-full"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-school-forest/10 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="font-fraunces text-xl text-school-ink">Send us a message</h2>
                    <p className="mt-1 font-public-sans text-sm text-school-ink/60">We typically reply within 1-2 school days.</p>
                    <div className="mt-6">
                        <ContactForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
