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

const GRADES = ['Nursery', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

const schema = z.object({
    first_name: z.string().min(2, "Please enter the student's first name."),
    last_name: z.string().optional(),
    guardian_name: z.string().min(2, "Please enter a parent/guardian's name."),
    email: z.string().email('Enter a valid email address.').optional().or(z.literal('')),
    phone_number: z.string().min(7, 'Please enter a reachable phone number.'),
    grade: z.string().min(1, 'Please select a desired grade.'),
    notes: z.string().optional(),
    honeypot: z.string().max(0).optional(),
});

type AdmissionFormValues = z.infer<typeof schema>;

export function AdmissionForm() {
    const [reference, setReference] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const form = useForm<AdmissionFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { first_name: '', last_name: '', guardian_name: '', email: '', phone_number: '', grade: '', notes: '', honeypot: '' },
    });

    const onSubmit = async (values: AdmissionFormValues) => {
        setServerError(null);
        try {
            const { grade, ...rest } = values;
            const notes = `Desired grade: ${grade}.${rest.notes ? ` ${rest.notes}` : ''}`;
            const result = await apiRequest<{ reference: string }>('/academic/public-admissions/', {
                method: 'POST',
                body: JSON.stringify({ ...rest, notes, desired_section_name: '' }),
                skipAuthRedirectOn401: true,
            });
            setReference(result.reference);
            form.reset();
        } catch {
            setServerError('We could not submit your application right now. Please try again shortly, or call the admissions office directly.');
        }
    };

    if (reference) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-school-forest/15 bg-school-cream p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-school-forest" aria-hidden="true" />
                <p className="font-fraunces text-xl text-school-ink">Application received</p>
                <p className="font-public-sans text-sm text-school-ink/70">
                    Your reference number is <span className="font-mono font-semibold text-school-forest">{reference}</span>.
                    Our admissions team will contact you within 2-3 school days.
                </p>
            </div>
        );
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                    <FormField control={form.control} name="first_name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Student&apos;s first name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="last_name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Student&apos;s last name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="grade" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Desired grade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Select a grade" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <div className="grid gap-5 sm:grid-cols-2">
                    <FormField control={form.control} name="guardian_name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Parent / guardian name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="phone_number" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone number</FormLabel>
                            <FormControl><Input placeholder="98XXXXXXXX" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email (optional)</FormLabel>
                        <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Anything else we should know? (optional)</FormLabel>
                        <FormControl><Textarea rows={4} placeholder="Previous school, special needs, questions…" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <div className="absolute -left-[9999px]" aria-hidden="true">
                    <label htmlFor="admission-honeypot">Leave this field empty</label>
                    <input id="admission-honeypot" type="text" tabIndex={-1} autoComplete="off" {...form.register('honeypot')} />
                </div>

                {serverError && (
                    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 font-public-sans text-sm text-red-700">
                        {serverError}
                    </p>
                )}

                <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="w-full bg-school-marigold text-school-ink hover:bg-school-marigold-dark sm:w-auto">
                    {form.formState.isSubmitting ? 'Submitting…' : 'Submit Application'}
                </Button>
            </form>
        </Form>
    );
}
