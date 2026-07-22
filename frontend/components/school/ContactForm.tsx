// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { apiRequest } from '@/lib/api';

const schema = z.object({
    name: z.string().min(2, 'Please enter your full name.'),
    email: z.string().email('Enter a valid email address.'),
    phone: z.string().optional(),
    department: z.enum(['general', 'admissions', 'academics', 'finance', 'transport', 'other']),
    subject: z.string().min(3, 'Please add a short subject.'),
    message: z.string().min(10, 'Please share a few more details (10+ characters).'),
    honeypot: z.string().max(0).optional(),
});

type ContactFormValues = z.infer<typeof schema>;

const DEPARTMENTS = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'admissions', label: 'Admissions' },
    { value: 'academics', label: 'Academics' },
    { value: 'finance', label: 'Finance / Fees' },
    { value: 'transport', label: 'Transportation' },
    { value: 'other', label: 'Other' },
];

export function ContactForm() {
    const [submitted, setSubmitted] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const form = useForm<ContactFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', email: '', phone: '', department: 'general', subject: '', message: '', honeypot: '' },
    });

    const onSubmit = async (values: ContactFormValues) => {
        setServerError(null);
        try {
            await apiRequest('/core/contact-messages/', {
                method: 'POST',
                body: JSON.stringify(values),
                skipAuthRedirectOn401: true,
            });
            setSubmitted(true);
            form.reset();
        } catch {
            setServerError('We could not send your message right now. Please try again in a moment, or call the school office directly.');
        }
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-school-forest/15 bg-school-cream p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-school-forest" aria-hidden="true" />
                <p className="font-fraunces text-xl text-school-ink">Message sent</p>
                <p className="font-public-sans text-sm text-school-ink/70">
                    Thank you for reaching out — our team will get back to you within 1-2 school days.
                </p>
                <Button variant="outline" className="mt-2 border-school-forest/30 text-school-forest" onClick={() => setSubmitted(false)}>
                    Send another message
                </Button>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full name</FormLabel>
                            <FormControl><Input placeholder="Your name" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone (optional)</FormLabel>
                            <FormControl><Input placeholder="98XXXXXXXX" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="department" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Department</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {DEPARTMENTS.map((d) => (
                                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl><Input placeholder="What is this about?" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl><Textarea rows={5} placeholder="Tell us how we can help…" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                {/* Honeypot — hidden from real visitors via CSS, bots fill every field */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                    <label htmlFor="contact-honeypot">Leave this field empty</label>
                    <input id="contact-honeypot" type="text" tabIndex={-1} autoComplete="off" {...form.register('honeypot')} />
                </div>

                {serverError && (
                    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 font-public-sans text-sm text-red-700">
                        {serverError}
                    </p>
                )}

                <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="bg-school-forest text-white hover:bg-school-forest-dark">
                    {form.formState.isSubmitting ? 'Sending…' : 'Send Message'}
                </Button>
            </form>
        </Form>
    );
}
