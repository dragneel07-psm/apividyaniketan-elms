// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import type { Question } from '../lib/api';
import { Colors, Radius, Shadows, Spacing } from '../constants/theme';

export interface QuestionPlayerProps {
    question: Question;
    answer: unknown;
    onAnswer: (value: unknown) => void;
    disabled?: boolean;
}

export default function QuestionPlayer({ question, answer, onAnswer, disabled }: QuestionPlayerProps) {
    const isText = question.type !== 'mcq';
    const isCode = question.type === 'code';

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.meta}>
                <Text style={styles.points}>{question.points} pts</Text>
                <Text style={styles.type}>{question.type.replace('_', ' ').toUpperCase()}</Text>
            </View>

            <Text style={styles.text}>{question.text}</Text>

            {question.type === 'mcq' && (
                <View style={styles.options}>
                    {question.options.map((option, idx) => {
                        const selected = answer === option;
                        return (
                            <TouchableOpacity
                                key={`${question.question_id}-${idx}`}
                                style={[styles.option, selected && styles.optionSelected]}
                                onPress={() => !disabled && onAnswer(option)}
                                activeOpacity={0.7}
                                disabled={disabled}
                            >
                                <View style={[styles.radio, selected && styles.radioSelected]}>
                                    {selected ? <View style={styles.radioDot} /> : null}
                                </View>
                                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                                    {option}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {isText && (
                <View style={styles.textAnswer}>
                    <Text style={styles.label}>Your Answer</Text>
                    <TextInput
                        style={[styles.input, isCode && styles.inputCode]}
                        multiline
                        placeholder={isCode ? 'Write your code…' : 'Type your answer…'}
                        placeholderTextColor={isCode ? Colors.gray400 : Colors.gray400}
                        value={typeof answer === 'string' ? answer : ''}
                        onChangeText={(t) => onAnswer(t)}
                        editable={!disabled}
                        autoCapitalize={isCode ? 'none' : 'sentences'}
                        autoCorrect={!isCode}
                    />
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    points: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary,
        backgroundColor: Colors.primarySurface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.full,
    },
    type: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.gray500,
        letterSpacing: 1,
    },
    text: {
        fontSize: 17,
        lineHeight: 26,
        color: Colors.gray900,
        fontWeight: '600',
        marginBottom: Spacing.xl,
    },
    options: { gap: Spacing.md },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1.5,
        borderColor: Colors.gray200,
        backgroundColor: Colors.white,
        gap: Spacing.md,
        ...Shadows.sm,
    },
    optionSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primarySurface,
    },
    optionText: { flex: 1, color: Colors.gray700, fontSize: 15 },
    optionTextSelected: { color: Colors.primaryDark, fontWeight: '600' },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: Colors.gray300,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: { borderColor: Colors.primary },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.primary,
    },
    textAnswer: { gap: Spacing.sm },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.gray500,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: Colors.white,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: Colors.gray200,
        padding: Spacing.lg,
        minHeight: 160,
        textAlignVertical: 'top',
        color: Colors.gray900,
        fontSize: 15,
        lineHeight: 22,
    },
    inputCode: {
        fontFamily: 'Menlo',
        backgroundColor: Colors.gray900,
        color: Colors.gray100,
        borderColor: Colors.gray800,
    },
});
