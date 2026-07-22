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

export interface CoreValue {
    id: string;
    title: string;
    description: string;
}

export const CORE_VALUES: CoreValue[] = [
    { id: 'v1', title: 'Every child is known', description: 'Small classes and attentive teachers mean no student is just a name on a roster.' },
    { id: 'v2', title: 'Curiosity over memorization', description: 'We teach students to ask why, not just recite what — through hands-on, inquiry-based lessons.' },
    { id: 'v3', title: 'Character alongside academics', description: 'Honesty, respect, and responsibility are taught as deliberately as math and Nepali.' },
    { id: 'v4', title: 'Open communication with families', description: 'Parents are partners — regular updates, not surprises at report-card time.' },
];

export interface Milestone {
    id: string;
    year: string;
    title: string;
    description: string;
}

export const HISTORY_MILESTONES: Milestone[] = [
    { id: 'm1', year: '2058 B.S.', title: 'Founded in Dhangadhi', description: 'Opened with a handful of classrooms and a commitment to affordable, quality primary education for the local community.' },
    { id: 'm2', year: '2065 B.S.', title: 'Expanded through Grade 8', description: 'Grew from a primary school into a full K-8 institution as founding students moved up through the grades.' },
    { id: 'm3', year: '2075 B.S.', title: 'New science lab & library', description: 'Added a dedicated science laboratory and expanded library to support hands-on, resource-rich learning.' },
    { id: 'm4', year: 'Today', title: 'A growing school family', description: 'Serving hundreds of students across Nursery to Grade 8, with a faculty that has grown alongside the community\'s trust.' },
];

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

export interface NewsArticle {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    body: string;
    category: 'Academics' | 'Events' | 'Achievements' | 'Community';
    date: string;
}

export const NEWS_ARTICLES: NewsArticle[] = [
    {
        id: 'n1', slug: 'science-fair-2026', title: 'Grade 6-8 Students Shine at Regional Science Fair',
        excerpt: 'Our students presented seven projects at the Sudurpashchim regional science fair, taking home two awards.',
        body: 'Our Grade 6-8 science students spent the past month designing and building projects for the regional science fair held in Dhangadhi. Seven projects were selected to represent the school, covering topics from water filtration to renewable energy models. Two projects placed in the top three of their categories. We are proud of the hard work our students and their science teachers put into this achievement.',
        category: 'Achievements', date: '2026-06-12',
    },
    {
        id: 'n2', slug: 'new-library-books', title: 'Library Receives New Collection of Nepali & English Storybooks',
        excerpt: 'Over 200 new titles have been added to our library shelves, thanks to a partnership with a local literacy nonprofit.',
        body: 'Thanks to a generous partnership with a local literacy nonprofit, our library has added over 200 new storybooks in both Nepali and English, spanning early readers through Grade 8 chapter books. Students can now check out books during their weekly library period, and we\'ve extended library hours after school on Tuesdays and Thursdays.',
        category: 'Academics', date: '2026-05-20',
    },
    {
        id: 'n3', slug: 'annual-sports-day-recap', title: 'Annual Sports Day: A Celebration of Teamwork',
        excerpt: 'Students, teachers, and parents came together for a full day of races, relays, and friendly competition.',
        body: 'Our Annual Sports Day brought the whole school community together for a day of track events, relay races, and tug-of-war between houses. Parents joined as spectators and volunteers, and every student took part in at least one event. Congratulations to all participants — the spirit of teamwork was the real winner of the day.',
        category: 'Events', date: '2026-04-18',
    },
];

export interface GalleryItem {
    id: string;
    caption: string;
    category: 'Campus' | 'Academics' | 'Sports' | 'Culture' | 'Events';
}

export const GALLERY_ITEMS: GalleryItem[] = [
    { id: 'g1', caption: 'Morning assembly on the school ground', category: 'Campus' },
    { id: 'g2', caption: 'Grade 2 classroom during a reading lesson', category: 'Academics' },
    { id: 'g3', caption: 'Science lab — Grade 7 chemistry demonstration', category: 'Academics' },
    { id: 'g4', caption: 'Annual Sports Day relay race', category: 'Sports' },
    { id: 'g5', caption: 'Football practice after school', category: 'Sports' },
    { id: 'g6', caption: 'Tihar cultural program performance', category: 'Culture' },
    { id: 'g7', caption: 'Founders Day celebration', category: 'Events' },
    { id: 'g8', caption: 'Art class — Grade 4 painting session', category: 'Culture' },
];

export interface Club {
    id: string;
    name: string;
    description: string;
    category: 'Clubs' | 'Sports' | 'Arts' | 'Leadership';
}

export const STUDENT_LIFE_ACTIVITIES: Club[] = [
    { id: 'c1', name: 'Science & Robotics Club', description: 'Weekly hands-on experiments and beginner robotics kits for Grades 5-8.', category: 'Clubs' },
    { id: 'c2', name: 'Reading & Debate Club', description: 'Builds confidence in reading, public speaking, and structured argument.', category: 'Clubs' },
    { id: 'c3', name: 'Football & Athletics', description: 'After-school practice and an annual inter-house sports week.', category: 'Sports' },
    { id: 'c4', name: 'Volleyball', description: 'Co-ed volleyball training for Grades 4-8, with friendly matches against nearby schools.', category: 'Sports' },
    { id: 'c5', name: 'Music & Folk Dance', description: 'Traditional Nepali folk music and dance, performed at school cultural events.', category: 'Arts' },
    { id: 'c6', name: 'Art & Craft Studio', description: 'Weekly drawing, painting, and craft sessions culminating in an annual student art exhibition.', category: 'Arts' },
    { id: 'c7', name: 'Student Council', description: 'Elected student representatives from Grades 5-8 who voice student concerns and help plan school events.', category: 'Leadership' },
    { id: 'c8', name: 'Peer Mentoring Program', description: 'Older students are paired with younger ones to support reading practice and friendship-building.', category: 'Leadership' },
];

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
