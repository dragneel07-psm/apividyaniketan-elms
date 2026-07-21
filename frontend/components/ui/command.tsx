// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
    return (
        <CommandPrimitive
            data-slot="command"
            className={cn(
                'bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md',
                className,
            )}
            {...props}
        />
    );
}

function CommandDialog({
    title = 'Command Palette',
    children,
    open,
    onOpenChange,
}: {
    title?: string;
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden p-0 shadow-2xl sm:max-w-lg top-[30%] translate-y-0">
                {/* Screen-reader title; the visual UI is the input itself. */}
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium">
                    {children}
                </Command>
            </DialogContent>
        </Dialog>
    );
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
    return (
        <div className="flex items-center gap-2 border-b px-3" cmdk-input-wrapper="">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <CommandPrimitive.Input
                data-slot="command-input"
                className={cn(
                    'placeholder:text-muted-foreground flex h-11 w-full bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50',
                    className,
                )}
                {...props}
            />
        </div>
    );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
    return (
        <CommandPrimitive.List
            data-slot="command-list"
            className={cn('max-h-80 overflow-y-auto overflow-x-hidden p-1', className)}
            {...props}
        />
    );
}

function CommandEmpty(props: React.ComponentProps<typeof CommandPrimitive.Empty>) {
    return (
        <CommandPrimitive.Empty
            data-slot="command-empty"
            className="py-6 text-center text-sm text-muted-foreground"
            {...props}
        />
    );
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
    return (
        <CommandPrimitive.Group
            data-slot="command-group"
            className={cn('text-foreground overflow-hidden p-1', className)}
            {...props}
        />
    );
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
    return (
        <CommandPrimitive.Separator
            data-slot="command-separator"
            className={cn('bg-border -mx-1 h-px', className)}
            {...props}
        />
    );
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
    return (
        <CommandPrimitive.Item
            data-slot="command-item"
            className={cn(
                "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
                className,
            )}
            {...props}
        />
    );
}

function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
    return (
        <span
            data-slot="command-shortcut"
            className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
            {...props}
        />
    );
}

export {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
};
