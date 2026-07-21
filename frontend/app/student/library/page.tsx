// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Search, Book, Filter, BookOpen,
    Calendar, CheckCircle2, Clock,
    AlertCircle, ChevronRight
} from 'lucide-react';
import { libraryAPI, academicAPI, Book as BookType, BookIssue } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from '@/lib/localization';
import { formatDate } from '@/lib/i18n/format';

export default function StudentLibraryPage() {
    const [loading, setLoading] = useState(true);
    const [books, setBooks] = useState<BookType[]>([]);
    const [myIssues, setMyIssues] = useState<BookIssue[]>([]);
    const [studentId, setStudentId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [issuing, setIssuing] = useState<string | null>(null);
    const { t, locale } = useTranslation();

    useEffect(() => {
        async function loadLibrary() {
            try {
                const student = await academicAPI.getMyStudent();
                setStudentId(student.id);

                const [booksData, issuesData] = await Promise.all([
                    libraryAPI.getBooks(),
                    libraryAPI.getBookIssues() // This should return issues for the current user/student ideally, or we filter
                ]);

                setBooks(booksData);
                // Filter issues for current student if API returns all (API security should ideally handle this)
                // Assuming API returns all for now based on typical implementation, verifying security later
                const myBookIssues = issuesData.filter(issue => issue.student === student.id);
                setMyIssues(myBookIssues);
            } catch (error) {
                console.error('Failed to load library', error);
                toast.error('Failed to load library catalog');
            } finally {
                setLoading(false);
            }
        }
        loadLibrary();
    }, []);

    const handleIssueBook = async (bookId: string) => {
        if (!studentId) return;
        setIssuing(bookId);
        try {
            await libraryAPI.issueBook({ book: bookId, student: studentId });
            toast.success("Book issued successfully! Please pick it up from the library.");

            // Refresh data
            const [booksData, issuesData] = await Promise.all([
                libraryAPI.getBooks(),
                libraryAPI.getBookIssues()
            ]);
            setBooks(booksData);
            setMyIssues(issuesData.filter(issue => issue.student === studentId));
        } catch (error: any) {
            console.error('Failed to issue book', error);
            toast.error(error.message || "Failed to issue book. You may have reached your limit.");
        } finally {
            setIssuing(null);
        }
    };

    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory ? book.category === selectedCategory : true;
        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(books.map(b => b.category)));

    if (loading) return <div className="p-8 text-center text-slate-400">{t('student.library.loading')}</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <BookOpen className="h-8 w-8 text-indigo-600" /> {t('student.library.pageTitle')}
                </h1>
                <p className="text-slate-500">{t('student.library.subtitle')}</p>
            </div>

            {/* My Books Section */}
            {myIssues.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Book className="h-5 w-5 text-indigo-500" /> {t('student.library.myCurrentBooks')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myIssues.map(issue => (
                            <Card key={issue.issue_id} className="border-slate-200 shadow-sm bg-indigo-50/30">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-900">{issue.book_title}</h3>
                                            <p className="text-xs text-slate-500">{issue.book_author}</p>
                                        </div>
                                        <Badge variant={
                                            issue.status === 'issued' ? 'default' :
                                                issue.status === 'overdue' ? 'destructive' : 'secondary'
                                        } className="capitalize">
                                            {issue.status}
                                        </Badge>
                                    </div>
                                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-600">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {t('student.library.due', { date: formatDate(new Date(issue.due_date), locale) })}
                                        </div>
                                        {issue.status === 'overdue' && (
                                            <div className="flex items-center gap-1 text-red-600 font-bold">
                                                <AlertCircle className="h-3 w-3" />
                                                {t('student.library.late')}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Catalog Section */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder={t('student.library.searchPlaceholder')}
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        <Badge
                            variant={selectedCategory === null ? 'default' : 'outline'}
                            className="cursor-pointer whitespace-nowrap"
                            onClick={() => setSelectedCategory(null)}
                        >
                            {t('student.library.allCategories')}
                        </Badge>
                        {categories.map(cat => (
                            <Badge
                                key={cat}
                                variant={selectedCategory === cat ? 'default' : 'outline'}
                                className="cursor-pointer capitalize whitespace-nowrap"
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat.replace('_', ' ')}
                            </Badge>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredBooks.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            {t('student.library.noBooksFound')}
                        </div>
                    ) : (
                        filteredBooks.map(book => (
                            <Card key={book.book_id} className="border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
                                <div className="h-48 bg-slate-100 relative overflow-hidden rounded-t-xl">
                                    {/* Placeholder Cover */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-200 text-slate-400">
                                        <Book className="h-12 w-12 opacity-20" />
                                    </div>
                                    {book.available_copies === 0 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                            <Badge variant="destructive" className="text-xs">{t('student.library.outOfStock')}</Badge>
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2">
                                        <Badge variant="secondary" className="bg-white/80 backdrop-blur-sm text-[10px] capitalize">
                                            {book.category}
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-4 flex-1 space-y-2">
                                    <h3 className="font-bold text-slate-900 line-clamp-1" title={book.title}>{book.title}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-1">{book.author}</p>
                                    <p className="text-xs text-slate-400 line-clamp-2 mt-2">{book.description}</p>
                                </CardContent>
                                <CardFooter className="p-4 border-t border-slate-50 flex items-center justify-between">
                                    <div className="text-xs font-medium text-slate-500">
                                        {t('student.library.available', { available: String(book.available_copies), total: String(book.total_copies) })}
                                    </div>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="sm" variant="outline">{t('student.library.detailsButton')}</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{book.title}</DialogTitle>
                                                <DialogDescription>{book.author} • {book.published_year}</DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <p className="text-sm text-slate-600">{book.description || t('student.library.noDescription')}</p>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-slate-500">{t('student.library.labelPublisher')}</span>
                                                        <p className="font-medium">{book.publisher}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('student.library.labelIsbn')}</span>
                                                        <p className="font-medium font-mono text-xs">{book.isbn}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('student.library.labelCategory')}</span>
                                                        <p className="font-medium capitalize">{book.category}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-500">{t('student.library.labelAvailability')}</span>
                                                        <p className={`font-medium ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {t('student.library.copies', { count: String(book.available_copies) })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                                                    disabled={book.available_copies === 0 || issuing === book.book_id}
                                                    onClick={() => handleIssueBook(book.book_id)}
                                                >
                                                    {issuing === book.book_id ? t('student.library.processing') : book.available_copies === 0 ? t('student.library.notAvailable') : t('student.library.issueBook')}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardFooter>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
