// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Trophy, Star } from "lucide-react";
import ReactConfetti from "react-confetti";
import { useEffect, useState } from "react";

interface LevelUpModalProps {
    level: number;
    isOpen: boolean;
    onClose: () => void;
}

export function LevelUpModal({ level, isOpen, onClose }: LevelUpModalProps) {
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 border-indigo-500/30 text-white p-0 overflow-hidden">
                {showConfetti && <ReactConfetti width={450} height={400} recycle={false} numberOfPieces={200} />}

                <div className="flex flex-col items-center justify-center p-8 text-center relative z-10">
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-32 h-32 mb-6 relative"
                    >
                        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-50 animate-pulse" />
                        <div className="relative w-full h-full bg-gradient-to-br from-yellow-300 to-amber-600 rounded-full flex items-center justify-center border-4 border-yellow-200 shadow-xl">
                            <Trophy className="w-16 h-16 text-white drop-shadow-md" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-indigo-600 rounded-full p-2 border-2 border-white shadow-lg">
                            <Star className="w-6 h-6 text-white fill-white" />
                        </div>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-amber-400 mb-2"
                    >
                        LEVEL UP!
                    </motion.h2>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <p className="text-indigo-200 mb-6 text-lg">
                            Congratulations! You've reached <span className="font-bold text-white">Level {level}</span>
                        </p>

                        <div className="bg-white/10 rounded-lg p-4 mb-6 w-full backdrop-blur-sm border border-white/10">
                            <p className="text-sm text-indigo-200 mb-1">New features unlocked:</p>
                            <ul className="text-sm font-medium text-white space-y-1">
                                <li className="flex items-center gap-2 justify-center">
                                    <Star className="w-4 h-4 text-yellow-400" />
                                    <span>Advanced Analytics</span>
                                </li>
                                <li className="flex items-center gap-2 justify-center">
                                    <Star className="w-4 h-4 text-yellow-400" />
                                    <span>New Avatar Framework</span>
                                </li>
                            </ul>
                        </div>

                        <Button
                            onClick={onClose}
                            className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 hover:from-yellow-500 hover:to-amber-700 text-white font-bold py-6 text-lg shadow-lg shadow-amber-500/20"
                        >
                            Awesome!
                        </Button>
                    </motion.div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
