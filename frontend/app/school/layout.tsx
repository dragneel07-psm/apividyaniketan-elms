// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import type { Metadata } from 'next';
import { Fraunces, Public_Sans } from 'next/font/google';
import { SchoolNav } from '@/components/school/SchoolNav';
import { AnnouncementBar } from '@/components/school/AnnouncementBar';
import { SchoolFooter } from '@/components/school/SchoolFooter';
import { getSchoolInfo } from '@/lib/school-content/school-info';

const fraunces = Fraunces({
    variable: '--font-fraunces',
    subsets: ['latin'],
    axes: ['opsz', 'SOFT', 'WONK'],
});

const publicSans = Public_Sans({
    variable: '--font-public-sans',
    subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
    const school = await getSchoolInfo();
    const title = `${school.name} — K-8 School in Dhangadhi, Kailali`;
    const description = `${school.name} is a K-8 school in Dhangadhi, Kailali, Nepal, dedicated to academic excellence, student wellbeing, and character development in a safe, inclusive community.`;
    return {
        title: { default: title, template: `%s | ${school.name}` },
        description,
        openGraph: { title, description, type: 'website' },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
    const school = await getSchoolInfo();

    return (
        <div className={`${fraunces.variable} ${publicSans.variable} font-public-sans bg-white text-school-ink antialiased`}>
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-school-forest focus:px-4 focus:py-2 focus:text-white"
            >
                Skip to main content
            </a>
            <AnnouncementBar />
            <SchoolNav schoolName={school.name} />
            <main id="main-content">{children}</main>
            <SchoolFooter school={school} />
        </div>
    );
}
