// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
//
// Staff/leadership profiles are the one piece of marketing-site content that
// stays static (out of CMS scope) — everything else (news, gallery,
// testimonials, programs, core values, history, student life, FAQs) is now
// admin-managed; see lib/school-content/school-info.ts and /admin/school-site/*.

export interface StaffMember {
    id: string;
    name: string;
    role: string;
    bio: string;
}

export const LEADERSHIP: StaffMember[] = [
    { id: 's1', name: 'Kamala Bhattarai', role: 'Principal', bio: 'Over 15 years in primary education, leading the school\'s academic vision and day-to-day operations.' },
    { id: 's2', name: 'Rajendra Joshi', role: 'Vice Principal / Academic Coordinator', bio: 'Oversees curriculum planning and teacher mentorship across all grade levels.' },
    { id: 's3', name: 'Sarita Chand', role: 'Head of Early Years (Nursery–Grade 2)', bio: 'Specializes in play-based foundational learning and early literacy.' },
    { id: 's4', name: 'Deepak Bohara', role: 'Head of Senior Primary (Grade 6–8)', bio: 'Coordinates STEM programs and student leadership initiatives.' },
];
