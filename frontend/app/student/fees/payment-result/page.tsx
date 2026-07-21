// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/localization';

function PaymentResultContent() {
    const { t } = useTranslation();
    const params = useSearchParams();
    const status = params.get('status');
    const gateway = params.get('gateway');

    const success = status === 'success';

    return (
        <div className="flex justify-center items-center min-h-[60vh]">
            <Card className="max-w-md w-full border-0 shadow-xl">
                <CardContent className="p-10 text-center space-y-6">
                    <div className={`mx-auto h-20 w-20 rounded-full flex items-center justify-center ${success ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {success
                            ? <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                            : <XCircle className="h-10 w-10 text-red-600" />
                        }
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">
                            {success ? t('student.paymentResult.successTitle') : t('student.paymentResult.failedTitle')}
                        </h1>
                        <p className="text-slate-500 mt-2">
                            {success
                                ? t('student.paymentResult.successDesc', {
                                    gateway: gateway ? gateway.charAt(0).toUpperCase() + gateway.slice(1) : 'gateway'
                                  })
                                : t('student.paymentResult.failedDesc')}
                        </p>
                    </div>
                    <Link href="/student/fees">
                        <Button className="gap-2 w-full bg-indigo-600 hover:bg-indigo-700">
                            <ArrowLeft className="h-4 w-4" />
                            {t('student.paymentResult.backToFees')}
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
            <PaymentResultContent />
        </Suspense>
    );
}
