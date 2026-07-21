// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
    BookOpen, Users, AlertCircle, Search,
    Plus, RotateCcw, CheckCircle2, Edit2,
    Trash2, Book, Package
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue
} from "@/components/ui/select";
import { libraryAPI, academicAPI, Book as BookType, BookIssue, Student } from '@/lib/api';
import { toast } from 'sonner';

const BOOK_CATEGORIES = [
    { value: 'fiction', label: 'Fiction' },
    { value: 'non_fiction', label: 'Non-Fiction' },
    { value: 'science', label: 'Science' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'history', label: 'History' },
    { value: 'literature', label: 'Literature' },
    { value: 'technology', label: 'Technology' },
    { value: 'biography', label: 'Biography' },
    { value: 'reference', label: 'Reference' },
    { value: 'other', label: 'Other' },
];

const EMPTY_BOOK = {
    title: '',
    author: '',
    isbn: '',
    category: 'other',
    publisher: '',
    published_year: new Date().getFullYear(),
    total_copies: 1,
    description: '',
};

export default function LibrarianDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalBooks: 0, uniqueTitles: 0, issuedBooks: 0, overdueBooks: 0 });
    const [books, setBooks] = useState<BookType[]>([]);
    const [issues, setIssues] = useState<BookIssue[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [bookSearch, setBookSearch] = useState('');
    const [issueTab, setIssueTab] = useState('issued');

    // Issue Dialog
    const [showIssueDialog, setShowIssueDialog] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedBook, setSelectedBook] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Book CRUD Dialog
    const [bookDialog, setBookDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; book: BookType | null }>({
        open: false, mode: 'add', book: null
    });
    const [bookForm, setBookForm] = useState(EMPTY_BOOK);
    const [savingBook, setSavingBook] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [booksData, issuesData, studentsData] = await Promise.all([
                libraryAPI.getBooks(),
                libraryAPI.getBookIssues(),
                academicAPI.getStudents(),
            ]);

            setBooks(booksData);
            setIssues(issuesData);
            setStudents(studentsData);

            const issued = issuesData.filter(i => i.status === 'issued' || i.status === 'overdue').length;
            const overdue = issuesData.filter(i => i.status === 'overdue').length;
            setStats({
                totalBooks: booksData.reduce((acc, b) => acc + b.total_copies, 0),
                uniqueTitles: booksData.length,
                issuedBooks: issued,
                overdueBooks: overdue,
            });
        } catch (error) {
            console.error('Failed to load library data', error);
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    // ── Issue / Return ──────────────────────────────────────────────────────────

    const handleIssueBook = async () => {
        if (!selectedStudent || !selectedBook) {
            toast.error('Please select a student and a book');
            return;
        }
        setSubmitting(true);
        try {
            await libraryAPI.issueBook({ student: selectedStudent, book: selectedBook });
            toast.success('Book issued successfully');
            setShowIssueDialog(false);
            setSelectedStudent('');
            setSelectedBook('');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to issue book');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReturnBook = async (issueId: string) => {
        if (!confirm('Mark this book as returned?')) return;
        try {
            await libraryAPI.returnBook(issueId);
            toast.success('Book returned successfully');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to return book');
        }
    };

    // ── Book CRUD ───────────────────────────────────────────────────────────────

    const openAddBook = () => {
        setBookForm(EMPTY_BOOK);
        setBookDialog({ open: true, mode: 'add', book: null });
    };

    const openEditBook = (book: BookType) => {
        setBookForm({
            title: book.title,
            author: book.author,
            isbn: book.isbn || '',
            category: book.category,
            publisher: book.publisher || '',
            published_year: book.published_year || new Date().getFullYear(),
            total_copies: book.total_copies,
            description: book.description || '',
        });
        setBookDialog({ open: true, mode: 'edit', book });
    };

    const handleSaveBook = async () => {
        if (!bookForm.title || !bookForm.author) {
            toast.error('Title and Author are required');
            return;
        }
        setSavingBook(true);
        try {
            if (bookDialog.mode === 'add') {
                await libraryAPI.createBook(bookForm);
                toast.success('Book added to catalog');
            } else if (bookDialog.book) {
                await libraryAPI.updateBook(bookDialog.book.book_id, bookForm);
                toast.success('Book updated');
            }
            setBookDialog({ open: false, mode: 'add', book: null });
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save book');
        } finally {
            setSavingBook(false);
        }
    };

    const handleDeleteBook = async (bookId: string, title: string) => {
        if (!confirm(`Delete "${title}" from the catalog? This cannot be undone.`)) return;
        try {
            await libraryAPI.deleteBook(bookId);
            toast.success('Book removed from catalog');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete book');
        }
    };

    // ── Filtered views ──────────────────────────────────────────────────────────

    const filteredIssues = issues.filter(issue => {
        const matchSearch = (issue.book_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (issue.student_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (issueTab === 'issued') return matchSearch && (issue.status === 'issued' || issue.status === 'overdue');
        if (issueTab === 'overdue') return matchSearch && issue.status === 'overdue';
        if (issueTab === 'history') return matchSearch && issue.status === 'returned';
        return matchSearch;
    });

    const filteredBooks = books.filter(b =>
        b.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.author.toLowerCase().includes(bookSearch.toLowerCase()) ||
        (b.isbn || '').includes(bookSearch)
    );

    if (loading) return <div className="p-8 text-center text-slate-400">Loading dashboard...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-indigo-600" /> Library Management
                    </h1>
                    <p className="text-slate-500">Manage books, issues, and returns</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowIssueDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Issue Book
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Copies', value: stats.totalBooks, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Unique Titles', value: stats.uniqueTitles, icon: Book, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Issues', value: stats.issuedBooks, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Overdue', value: stats.overdueBooks, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                ].map((stat, i) => (
                    <Card key={i} className="border-slate-200 shadow-sm">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={`${stat.bg} p-3 rounded-xl`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="issues">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="issues" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Users className="h-4 w-4 mr-2" /> Issues & Returns
                    </TabsTrigger>
                    <TabsTrigger value="catalog" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <BookOpen className="h-4 w-4 mr-2" /> Book Catalog
                    </TabsTrigger>
                </TabsList>

                {/* ─── Issues Tab ─── */}
                <TabsContent value="issues" className="mt-6">
                    <Card className="border-slate-200 shadow-sm">
                        <Tabs defaultValue="issued" value={issueTab} onValueChange={setIssueTab}>
                            <CardHeader className="border-b border-slate-100 pb-0">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <TabsList>
                                        <TabsTrigger value="issued">Current Issues</TabsTrigger>
                                        <TabsTrigger value="overdue" className="data-[state=active]:text-rose-700">Overdue</TabsTrigger>
                                        <TabsTrigger value="history">History</TabsTrigger>
                                    </TabsList>
                                    <div className="relative w-full md:w-64">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Search student or book..."
                                            className="pl-9 h-9"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-3">
                                    {filteredIssues.length === 0 ? (
                                        <div className="text-center py-12 text-slate-400">No records found.</div>
                                    ) : filteredIssues.map(issue => (
                                        <div key={issue.issue_id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={
                                                        issue.status === 'issued' ? 'secondary' :
                                                            issue.status === 'overdue' ? 'destructive' : 'outline'
                                                    } className="capitalize text-[10px]">
                                                        {issue.status}
                                                    </Badge>
                                                    <span className="text-xs text-slate-400 font-mono">#{issue.issue_id.slice(0, 8)}</span>
                                                </div>
                                                <h4 className="font-bold text-slate-800">{issue.book_title}</h4>
                                                <p className="text-sm text-slate-500">
                                                    Issued to <span className="font-medium text-indigo-600">{issue.student_name}</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-6 mt-4 md:mt-0">
                                                <div className="text-right space-y-1">
                                                    <p className="text-xs text-slate-400">Due Date</p>
                                                    <p className={`text-sm font-medium ${new Date(issue.due_date) < new Date() && issue.status !== 'returned' ? 'text-rose-600' : 'text-slate-700'}`}>
                                                        {new Date(issue.due_date).toLocaleDateString()}
                                                    </p>
                                                    {issue.fine_amount > 0 && (
                                                        <p className="text-xs text-rose-600 font-bold">Fine: ${issue.fine_amount}</p>
                                                    )}
                                                </div>
                                                {issue.status !== 'returned' ? (
                                                    <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() => handleReturnBook(issue.issue_id)}>
                                                        <RotateCcw className="mr-2 h-3.5 w-3.5" /> Return
                                                    </Button>
                                                ) : (
                                                    <div className="flex items-center text-emerald-600 text-sm font-medium">
                                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                                        {issue.return_date ? new Date(issue.return_date).toLocaleDateString() : 'Returned'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Tabs>
                    </Card>
                </TabsContent>

                {/* ─── Catalog Tab ─── */}
                <TabsContent value="catalog" className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search title, author, ISBN..."
                                className="pl-10"
                                value={bookSearch}
                                onChange={(e) => setBookSearch(e.target.value)}
                            />
                        </div>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 ml-4" onClick={openAddBook}>
                            <Plus className="mr-2 h-4 w-4" /> Add Book
                        </Button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Book</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Category</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">ISBN</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Copies</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredBooks.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                            {bookSearch ? 'No books match your search.' : 'No books in the catalog yet.'}
                                        </td>
                                    </tr>
                                ) : filteredBooks.map(book => (
                                    <tr key={book.book_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900">{book.title}</div>
                                            <div className="text-xs text-slate-500">{book.author} {book.published_year ? `• ${book.published_year}` : ''}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="capitalize text-[10px]">
                                                {book.category.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                            {book.isbn || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {book.available_copies} / {book.total_copies}
                                        </td>
                                        <td className="px-6 py-4">
                                            {book.available_copies > 0 ? (
                                                <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Available
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-rose-600 text-xs font-medium">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                                    All Issued
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                                    onClick={() => openEditBook(book)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600"
                                                    onClick={() => handleDeleteBook(book.book_id, book.title)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ─── Issue Book Dialog ─── */}
            <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Issue Book</DialogTitle>
                        <DialogDescription>Assign a book to a student. Due date: 14 days from today.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Student</Label>
                            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select student..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.first_name} {s.last_name} ({s.student_id || 'No ID'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Book</Label>
                            <Select value={selectedBook} onValueChange={setSelectedBook}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select book..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {books.filter(b => b.available_copies > 0).map(b => (
                                        <SelectItem key={b.book_id} value={b.book_id}>
                                            {b.title} (Available: {b.available_copies})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowIssueDialog(false)}>Cancel</Button>
                        <Button onClick={handleIssueBook} disabled={submitting}>
                            {submitting ? 'Issuing...' : 'Issue Book'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Add / Edit Book Dialog ─── */}
            <Dialog open={bookDialog.open} onOpenChange={(open) => setBookDialog(d => ({ ...d, open }))}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{bookDialog.mode === 'add' ? 'Add Book to Catalog' : 'Edit Book'}</DialogTitle>
                        <DialogDescription>
                            {bookDialog.mode === 'add' ? 'Register a new book in the library catalog.' : 'Update book details.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2 col-span-2">
                            <Label>Title <span className="text-rose-500">*</span></Label>
                            <Input
                                value={bookForm.title}
                                onChange={e => setBookForm({ ...bookForm, title: e.target.value })}
                                placeholder="Book title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Author <span className="text-rose-500">*</span></Label>
                            <Input
                                value={bookForm.author}
                                onChange={e => setBookForm({ ...bookForm, author: e.target.value })}
                                placeholder="Author name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ISBN</Label>
                            <Input
                                value={bookForm.isbn}
                                onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })}
                                placeholder="13-digit ISBN"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={bookForm.category} onValueChange={v => setBookForm({ ...bookForm, category: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BOOK_CATEGORIES.map(c => (
                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Publisher</Label>
                            <Input
                                value={bookForm.publisher}
                                onChange={e => setBookForm({ ...bookForm, publisher: e.target.value })}
                                placeholder="Publisher"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Published Year</Label>
                            <Input
                                type="number"
                                value={bookForm.published_year}
                                onChange={e => setBookForm({ ...bookForm, published_year: parseInt(e.target.value) || new Date().getFullYear() })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Total Copies</Label>
                            <Input
                                type="number"
                                min={1}
                                value={bookForm.total_copies}
                                onChange={e => setBookForm({ ...bookForm, total_copies: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label>Description</Label>
                            <textarea
                                rows={3}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                value={bookForm.description}
                                onChange={e => setBookForm({ ...bookForm, description: e.target.value })}
                                placeholder="Brief description..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBookDialog(d => ({ ...d, open: false }))}>Cancel</Button>
                        <Button onClick={handleSaveBook} disabled={savingBook} className="bg-indigo-600 hover:bg-indigo-700">
                            {savingBook ? 'Saving...' : bookDialog.mode === 'add' ? 'Add Book' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
