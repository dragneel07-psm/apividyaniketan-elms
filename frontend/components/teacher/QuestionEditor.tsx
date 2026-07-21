// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, X, CheckCircle2 } from 'lucide-react';
import { Question } from '@/lib/api';
import { toast } from 'sonner';

interface QuestionEditorProps {
    initialData?: Partial<Question>;
    onSave: (data: Partial<Question>) => Promise<void>;
    onCancel: () => void;
}

export default function QuestionEditor({ initialData, onSave, onCancel }: QuestionEditorProps) {
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'mcq' | 'short_answer' | 'long_answer' | 'code'>(
        initialData?.type || 'mcq'
    );
    const [text, setText] = useState(initialData?.text || '');
    const [points, setPoints] = useState(initialData?.points || 1);

    // MCQ Options
    const [options, setOptions] = useState<string[]>(
        initialData?.options || ['', '', '', '']
    );
    const [correctAnswer, setCorrectAnswer] = useState(initialData?.correct_answer || '');

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
        // Reset correct answer if it was the removed one (simplified logic)
        if (correctAnswer === options[index]) {
            setCorrectAnswer('');
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);

        // If this was the selected correct answer, update it too
        if (correctAnswer === options[index]) {
            setCorrectAnswer(value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (type === 'mcq' && !correctAnswer) {
            toast.error('Please select a correct answer for MCQ.');
            return;
        }

        setLoading(true);
        try {
            await onSave({
                text,
                type,
                points,
                options: type === 'mcq' ? options : [],
                correct_answer: type === 'mcq' ? correctAnswer : undefined
            });
            toast.success(initialData ? 'Question updated' : 'Question added');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save question');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-indigo-100 shadow-sm">
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <Label>Question Type</Label>
                            <Select
                                value={type}
                                onValueChange={(val: any) => setType(val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mcq">Multiple Choice</SelectItem>
                                    <SelectItem value="short_answer">Short Answer</SelectItem>
                                    <SelectItem value="long_answer">Long Answer / Essay</SelectItem>
                                    <SelectItem value="code">Code Snippet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-24 space-y-2">
                            <Label>Points</Label>
                            <Input
                                type="number"
                                min="1"
                                value={points}
                                onChange={(e) => setPoints(parseInt(e.target.value))}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Textarea
                            placeholder="Enter your question here..."
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            required
                            className="min-h-[100px]"
                        />
                    </div>

                    {type === 'mcq' && (
                        <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <Label className="text-slate-600 font-semibold mb-2 block">Answer Options</Label>
                            <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer}>
                                {options.map((option, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="flex items-center h-10 w-10 justify-center">
                                            <RadioGroupItem
                                                value={option || `opt-${index}`}
                                                id={`opt-${index}`}
                                                disabled={!option}
                                                className="border-slate-400 text-indigo-600"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Input
                                                placeholder={`Option ${index + 1}`}
                                                value={option}
                                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                                className={correctAnswer === option && option ? "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/20" : ""}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-red-500"
                                            onClick={() => handleRemoveOption(index)}
                                            disabled={options.length <= 2}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </RadioGroup>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddOption}
                                className="mt-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            >
                                <Plus className="h-3 w-3 mr-2" /> Add Option
                            </Button>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                            {initialData ? 'Update Question' : 'Add Question'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
