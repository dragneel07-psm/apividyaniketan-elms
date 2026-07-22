// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
//
// SAMPLE CONTENT — replace with the school's real copy/photos. Shaped like
// a future CMS/API response (id, title, body, image slot) so swapping this
// file for a real fetch later is a drop-in, not a rewrite.

export interface Program {
    id: string;
    title: string;
    description: string;
    icon: 'book' | 'flask' | 'palette' | 'trophy';
}

export const PROGRAMS: Program[] = [
    {
        id: 'foundational-literacy',
        title: 'Foundational Literacy & Numeracy',
        description: 'A play-based, phonics-first approach in Grades 1-3 that builds strong reading and number-sense foundations before formal exams begin.',
        icon: 'book',
    },
    {
        id: 'stem-lab',
        title: 'Science & STEM Lab',
        description: 'Hands-on experiments and a school computer lab give Grades 4-8 students real practice with the scientific method, not just textbook theory.',
        icon: 'flask',
    },
    {
        id: 'arts-culture',
        title: 'Arts, Music & Culture',
        description: 'Weekly art, music, and Nepali folk-dance sessions keep creativity and local culture part of every student\'s week, not an occasional event.',
        icon: 'palette',
    },
    {
        id: 'sports-wellbeing',
        title: 'Sports & Wellbeing',
        description: 'Daily physical education, an annual sports week, and a school counselor support every child\'s physical and emotional growth.',
        icon: 'trophy',
    },
];

export interface Testimonial {
    id: string;
    quote: string;
    name: string;
    role: string;
}

export const TESTIMONIALS: Testimonial[] = [
    {
        id: 't1',
        quote: 'My daughter used to be shy about speaking up in class. Two years in, she leads her class assembly. The teachers here genuinely know every child.',
        name: 'Sunita R.',
        role: 'Parent, Grade 4',
    },
    {
        id: 't2',
        quote: 'What I appreciate most is how quickly the school communicates — homework, events, even small concerns. We never feel out of the loop.',
        name: 'Bikash T.',
        role: 'Parent, Grade 6',
    },
    {
        id: 't3',
        quote: 'The science lab is my favorite part of the week. We get to actually do the experiments, not just read about them.',
        name: 'Aarav K.',
        role: 'Student, Grade 7',
    },
];

export interface FaqItem {
    id: string;
    question: string;
    answer: string;
}

export const ADMISSIONS_FAQS: FaqItem[] = [
    {
        id: 'faq-age',
        question: 'What is the minimum age for admission to Nursery?',
        answer: 'Children must be at least 3 years old by the start of the academic year (Baishakh) to be considered for Nursery. Exact cut-off dates are confirmed each admission cycle — please confirm with the school office.',
    },
    {
        id: 'faq-transfer',
        question: 'Do you accept transfer students mid-year?',
        answer: 'Yes, subject to seat availability in the requested grade and a brief placement conversation with the class teacher to understand the student\'s current level.',
    },
    {
        id: 'faq-sibling',
        question: 'Is there a sibling discount on fees?',
        answer: 'Please contact the admissions office directly — fee policies (including any sibling considerations) are confirmed at the time of application and may change each academic year.',
    },
    {
        id: 'faq-uniform',
        question: 'When and where can we buy the school uniform?',
        answer: 'Uniform details and vendor information are shared with accepted families during the enrollment step, along with the required documents checklist.',
    },
];
