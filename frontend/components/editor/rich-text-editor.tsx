// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import {
    Bold, Italic, Strikethrough, Code, Heading1, Heading2,
    List, ListOrdered, Quote, Undo, Redo, Link as LinkIcon
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null;
    }

    return (
        <div className="border-b border-slate-200 p-2 flex flex-wrap gap-1 sticky top-0 bg-white z-10 rounded-t-lg">
            <Toggle
                size="sm"
                pressed={editor.isActive('bold')}
                onPressedChange={() => editor.chain().focus().toggleBold().run()}
            >
                <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle
                size="sm"
                pressed={editor.isActive('italic')}
                onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            >
                <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle
                size="sm"
                pressed={editor.isActive('strike')}
                onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            >
                <Strikethrough className="h-4 w-4" />
            </Toggle>
            <Toggle
                size="sm"
                pressed={editor.isActive('heading', { level: 1 })}
                onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
                <Heading1 className="h-4 w-4" />
            </Toggle>
            <Toggle
                size="sm"
                pressed={editor.isActive('heading', { level: 2 })}
                onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
                <Heading2 className="h-4 w-4" />
            </Toggle>

            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />

            <Toggle
                size="sm"
                pressed={editor.isActive('bulletList')}
                onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            >
                <List className="h-4 w-4" />
            </Toggle>
            <Toggle
                size="sm"
                pressed={editor.isActive('orderedList')}
                onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            >
                <ListOrdered className="h-4 w-4" />
            </Toggle>

            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />

            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    const previousUrl = editor.getAttributes('link').href
                    const url = window.prompt('URL', previousUrl)

                    // cancelled
                    if (url === null) {
                        return
                    }

                    // empty
                    if (url === '') {
                        editor.chain().focus().extendMarkRange('link').unsetLink().run()
                        return
                    }

                    // update link
                    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
                }}
                className={editor.isActive('link') ? 'bg-slate-100' : ''}
            >
                <LinkIcon className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-slate-200 mx-1 self-center" />

            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run()}
            >
                <Undo className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run()}
            >
                <Redo className="h-4 w-4" />
            </Button>
        </div>
    )
}

export function RichTextEditor({ content, onChange, editable = true }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-indigo-600 underline cursor-pointer hover:text-indigo-800',
                },
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full h-auto',
                },
            }),
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[300px]',
            },
        },
    });

    // Handle content updates from parent properly
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Only update if content is different to avoid cursor jumping
            // This is a naive check. For robust sync, we need json diffs or similar.
            // For now, only set content on mount or if drastically changed (like mode switch)
            // But if user types in editor, onUpdate calls onChange.
            // If parent updates content (e.g. from API load), we need to set it.
            // The initial load check is:
            if (editor.isEmpty && content) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    return (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
            {editable && <MenuBar editor={editor} />}
            <EditorContent editor={editor} className="min-h-[300px]" />
        </div>
    );
}
