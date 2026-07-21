// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Search, Book, BookOpen, Plus,
    Calendar, AlertCircle, History,
    Package, ArrowUpRight, CheckCircle2,
    Filter, Trash2, Edit2, RotateCcw
} from 'lucide-react';
import { libraryAPI, usersAPI, Book as BookType, BookIssue } from '@/lib/api';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';

export default function TeacherLibraryPage() {
    const [loading, setLoading] = useState(true);
    const [books, setBooks] = useState<BookType[]>([]);
    const [allIssues, setAllIssues] = useState<BookIssue[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newBook, setNewBook] = useState({
        title: '',
        author: '',
        isbn: '',
        category: 'other',
        publisher: '',
        published_year: new Date().getFullYear(),
        total_copies: 1,
        description: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [booksData, issuesData] = await Promise.all([
                libraryAPI.getBooks(),
                libraryAPI.getBookIssues()
            ]);
            setBooks(booksData);
            setAllIssues(issuesData);
        } catch (error) {
            console.error('Failed to load library data', error);
            toast.error('Failed to load library data');
        } finally {
            setLoading(false);
        }
    };

    const handleAddBook = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await libraryAPI.createBook(newBook);
            toast.success("Book added to collection!");
            setIsAddDialogOpen(false);
            setNewBook({
                title: '',
                author: '',
                isbn: '',
                category: 'other',
                publisher: '',
                published_year: new Date().getFullYear(),
                total_copies: 1,
                description: ''
            });
            await loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to add book");
        }
    };

    const handleReturnBook = async (issueId: string) => {
        try {
            await libraryAPI.returnBook(issueId);
            toast.success("Book marked as returned");
            await loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to return book");
        }
    };

    const handleDeleteBook = async (bookId: string) => {
        if (!confirm("Are you sure you want to delete this book?")) return;
        try {
            await libraryAPI.deleteBook(bookId);
            toast.success("Book removed from collection");
            await loadData();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete book");
        }
    };

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.isbn?.includes(searchTerm)
    );

    const activeIssues = allIssues.filter(i => i.status !== 'returned');

    const stats = [
        { label: 'Total Books', value: books.reduce((acc, b) => acc + b.total_copies, 0), icon: Book, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active Loans', value: activeIssues.length, icon: History, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Overdue', value: allIssues.filter(i => i.status === 'overdue').length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'Available', value: books.reduce((acc, b) => acc + b.available_copies, 0), icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    if (loading) return <div className="p-8 text-center text-slate-400">Loading management console...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Package className="h-8 w-8 text-indigo-600" /> Library Management
                    </h1>
                    <p className="text-slate-500">Inventory control and lending system dashboard</p>
                </div>

                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
                            <Plus className="h-4 w-4 mr-2" /> Add New Book
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Book to Collection</DialogTitle>
                            <DialogDescription>Enter the book details to add it to the library inventory.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddBook} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label>Title</Label>
                                    <Input
                                        required
                                        value={newBook.title}
                                        onChange={e => setNewBook({ ...newBook, title: e.target.value })}
                                        placeholder="Book title"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Author</Label>
                                    <Input
                                        required
                                        value={newBook.author}
                                        onChange={e => setNewBook({ ...newBook, author: e.target.value })}
                                        placeholder="Author name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>ISBN</Label>
                                    <Input
                                        value={newBook.isbn}
                                        onChange={e => setNewBook({ ...newBook, isbn: e.target.value })}
                                        placeholder="13-digit ISBN"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <select
                                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={newBook.category}
                                        onChange={e => setNewBook({ ...newBook, category: e.target.value })}
                                    >
                                        <option value="technology">Technology</option>
                                        <option value="science">Science</option>
                                        <option value="mathematics">Mathematics</option>
                                        <option value="literature">Literature</option>
                                        <option value="history">History</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Total Copies</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={newBook.total_copies}
                                        onChange={e => setNewBook({ ...newBook, total_copies: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" className="w-full">Register Book</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="border-slate-200 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className={`${stat.bg} p-3 rounded-2xl`}>
                                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                                    <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="inventory" className="w-full">
                <TabsList className="bg-slate-100 p-1 mb-6">
                    <TabsTrigger value="inventory" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <BookOpen className="h-4 w-4 mr-2" /> Book Inventory
                    </TabsTrigger>
                    <TabsTrigger value="lending" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <ArrowUpRight className="h-4 w-4 mr-2" /> Lending Tracking
                    </TabsTrigger>
                </TabsList>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="space-y-6">
                    <div className="flex items-center gap-4 max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search inventory..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Book Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Category</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Copies</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredBooks.map(book => (
                                    <tr key={book.book_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{book.title}</div>
                                            <div className="text-xs text-slate-500">{book.author} • ISBN: {book.isbn || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="capitalize text-[10px]">{book.category}</Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            {book.available_copies > 0 ? (
                                                <div className="flex items-center gap-1.5 text-emerald-600">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                                    <span className="text-xs font-medium">Available</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-rose-600">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
                                                    <span className="text-xs font-medium">Reserved</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {book.available_copies} / {book.total_copies}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-slate-400 hover:text-rose-600"
                                                    onClick={() => handleDeleteBook(book.book_id)}
                                                >
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

                {/* Lending Tab */}
                <TabsContent value="lending">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Student</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Book</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allIssues.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No lending history found.</td>
                                    </tr>
                                ) : (
                                    allIssues.map(issue => (
                                        <tr key={issue.issue_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900">{issue.student_name}</div>
                                                <div className="text-[10px] text-slate-500 uppercase">Issued: {new Date(issue.issued_date).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                                {issue.book_title}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className={issue.status === 'overdue' ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                                                    {new Date(issue.due_date).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={
                                                    issue.status === 'issued' ? 'default' :
                                                        issue.status === 'overdue' ? 'destructive' : 'secondary'
                                                } className="capitalize text-[10px]">
                                                    {issue.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {issue.status !== 'returned' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                        onClick={() => handleReturnBook(issue.issue_id)}
                                                    >
                                                        <RotateCcw className="h-3 w-3 mr-1.5" /> Mark Returned
                                                    </Button>
                                                )}
                                                {issue.status === 'returned' && (
                                                    <span className="text-xs text-slate-400 flex items-center justify-end gap-1">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                        {new Date(issue.return_date!).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
