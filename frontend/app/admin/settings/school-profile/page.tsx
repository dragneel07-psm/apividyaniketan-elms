// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api, SchoolProfile } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Upload, Building2, FileText, Receipt as ReceiptIcon, Users } from 'lucide-react';

const empty: SchoolProfile = {
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    established_year: null,
    current_academic_year: '',
    pan_number: '',
    vat_number: '',
    fiscal_year_bs: '',
    currency_code: 'NPR',
    currency_symbol: 'Rs.',
    principal_name: '',
    accountant_name: '',
    bill_prefix: 'BL',
    logo: '',
};

export default function SchoolProfilePage() {
    const [profile, setProfile] = useState<SchoolProfile>(empty);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        api.schoolProfile.get()
            .then((data) => setProfile({ ...empty, ...data }))
            .catch(() => toast.error('Failed to load school profile'))
            .finally(() => setLoading(false));
    }, []);

    const update = <K extends keyof SchoolProfile>(key: K, value: SchoolProfile[K]) =>
        setProfile((p) => ({ ...p, [key]: value }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await api.schoolProfile.update({
                name: profile.name,
                address: profile.address,
                contact_email: profile.contact_email,
                contact_phone: profile.contact_phone,
                website: profile.website,
                established_year: profile.established_year,
                current_academic_year: profile.current_academic_year,
                pan_number: profile.pan_number,
                vat_number: profile.vat_number,
                fiscal_year_bs: profile.fiscal_year_bs,
                currency_code: profile.currency_code,
                currency_symbol: profile.currency_symbol,
                principal_name: profile.principal_name,
                accountant_name: profile.accountant_name,
                bill_prefix: profile.bill_prefix,
            });
            setProfile({ ...empty, ...updated });
            toast.success('School profile saved');
        } catch {
            toast.error('Failed to save school profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        try {
            const updated = await api.schoolProfile.uploadLogo(file);
            setProfile({ ...empty, ...updated });
            toast.success('Logo uploaded');
        } catch {
            toast.error('Failed to upload logo');
        } finally {
            setLogoUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">School Profile</h1>
                    <p className="text-sm text-slate-500">
                        These details print on every receipt, invoice and tax document.
                    </p>
                </div>
            </div>

            {/* Identity */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4 text-indigo-600" /> School Identity
                    </CardTitle>
                    <CardDescription>Name, contact, and logo shown at the top of every bill.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="h-20 w-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                            {profile.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={profile.logo} alt="logo" className="h-full w-full object-contain" />
                            ) : (
                                <span className="text-xs text-slate-400">No logo</span>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-slate-500">School Logo</Label>
                            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleLogoUpload} />
                            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={logoUploading}>
                                {logoUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                Upload
                            </Button>
                            <p className="text-xs text-slate-400">Recommended 200×200 PNG / JPG.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="School Name" value={profile.name} onChange={(v) => update('name', v)} required />
                        <Field label="Established Year"
                            type="number"
                            value={profile.established_year?.toString() ?? ''}
                            onChange={(v) => update('established_year', v ? Number(v) : null)} />
                    </div>

                    <Textarea
                        rows={2}
                        placeholder="Full school address printed on receipts"
                        value={profile.address}
                        onChange={(e) => update('address', e.target.value)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Phone" value={profile.contact_phone} onChange={(v) => update('contact_phone', v)} />
                        <Field label="Email" type="email" value={profile.contact_email} onChange={(v) => update('contact_email', v)} />
                        <Field label="Website" type="url" value={profile.website} onChange={(v) => update('website', v)} />
                    </div>
                </CardContent>
            </Card>

            {/* Tax & PAN */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-4 w-4 text-indigo-600" /> Tax & Registration
                    </CardTitle>
                    <CardDescription>
                        IRD-required fields. PAN appears on every receipt; VAT only if your school is VAT-registered.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="PAN Number" value={profile.pan_number} onChange={(v) => update('pan_number', v)} placeholder="e.g. 601234567" />
                    <Field label="VAT Number (optional)" value={profile.vat_number} onChange={(v) => update('vat_number', v)} placeholder="Leave blank if not registered" />
                </CardContent>
            </Card>

            {/* Bill book */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ReceiptIcon className="h-4 w-4 text-indigo-600" /> Bill Book
                    </CardTitle>
                    <CardDescription>
                        Sequential bill numbering: <span className="font-mono">{profile.bill_prefix || 'BL'}-{profile.fiscal_year_bs || '2082/83'}-00001</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Bill Prefix" value={profile.bill_prefix} onChange={(v) => update('bill_prefix', v)} placeholder="BL" />
                    <Field label="Fiscal Year (BS)" value={profile.fiscal_year_bs} onChange={(v) => update('fiscal_year_bs', v)} placeholder="2082/83" />
                    <Field label="Academic Year (AD)" value={profile.current_academic_year} onChange={(v) => update('current_academic_year', v)} placeholder="2025-2026" />
                    <Field label="Currency Code" value={profile.currency_code} onChange={(v) => update('currency_code', v)} placeholder="NPR" />
                    <Field label="Currency Symbol" value={profile.currency_symbol} onChange={(v) => update('currency_symbol', v)} placeholder="Rs." />
                </CardContent>
            </Card>

            {/* Signatories */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4 text-indigo-600" /> Authorised Signatories
                    </CardTitle>
                    <CardDescription>Names appear under the signature lines on every receipt.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Principal Name" value={profile.principal_name} onChange={(v) => update('principal_name', v)} />
                    <Field label="Accountant / Cashier Name" value={profile.accountant_name} onChange={(v) => update('accountant_name', v)} />
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button onClick={handleSave} disabled={saving} className="min-w-32">
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving</> : 'Save Profile'}
                </Button>
            </div>
        </div>
    );
}

function Field({
    label, value, onChange, type = 'text', placeholder, required,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-slate-500">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
            />
        </div>
    );
}
