// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authAPI, saveCurrentUser, saveTokens, saveTenantId, User } from '../lib/api';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

interface LoginScreenProps {
    onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [subdomain, setSubdomain] = useState('demo');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            setError('Please enter username and password.');
            return;
        }
        if (!subdomain.trim()) {
            setError('Please enter your school code.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await authAPI.login(username.trim(), password.trim(), subdomain.trim());
            const role = response.user?.role;
            if (role === 'admin' || role === 'staff' || role === 'saas_admin') {
                setError('Admin access is available on the web portal only. Please sign in at your school website.');
                return;
            }
            await saveTokens(response.access, response.refresh);
            await saveTenantId(subdomain.trim());
            await saveCurrentUser(response.user);
            onLoginSuccess(response.user);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#4f46e5', '#7c3aed', '#6d28d9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo / Hero */}
                    <View style={styles.hero}>
                        <View style={styles.logoContainer}>
                            <Text style={styles.logoIcon}>🎓</Text>
                        </View>
                        <Text style={styles.title}>E-Learning Portal</Text>
                        <Text style={styles.subtitle}>AI-Powered School Platform</Text>
                        <Text style={styles.tag}>Works Offline • Rural Friendly</Text>
                    </View>

                    {/* Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Sign In</Text>
                        <Text style={styles.cardSubtitle}>Access your learning dashboard</Text>

                        {/* Error */}
                        {error ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>⚠️ {error}</Text>
                            </View>
                        ) : null}

                        {/* School Code */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>School Code</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputIcon}>🏫</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. demo"
                                    placeholderTextColor={Colors.gray400}
                                    value={subdomain}
                                    onChangeText={setSubdomain}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {/* Username */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Username / Email</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputIcon}>👤</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your username"
                                    placeholderTextColor={Colors.gray400}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        {/* Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor={Colors.gray400}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Text style={styles.showHide}>{showPassword ? 'Hide' : 'Show'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.loginBtnText}>Sign In →</Text>
                            )}
                        </TouchableOpacity>

                        {/* Offline hint */}
                        <View style={styles.offlineHint}>
                            <Text style={styles.offlineHintText}>
                                📱 Downloaded content available offline even without internet
                            </Text>
                        </View>
                    </View>

                    {/* Footer */}
                    <Text style={styles.footer}>
                        © 2026 E-Learning Portal • Designed for Rural Schools
                    </Text>
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    gradient: { flex: 1 },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 32,
    },
    hero: { alignItems: 'center', marginBottom: 32 },
    logoContainer: {
        width: 80, height: 80,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    logoIcon: { fontSize: 40 },
    title: {
        fontSize: 28, fontWeight: '800',
        color: '#fff', textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15, color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    tag: {
        marginTop: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 14, paddingVertical: 5,
        borderRadius: 100,
        fontSize: 12, color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
        elevation: 20,
    },
    cardTitle: {
        fontSize: 24, fontWeight: '800',
        color: Colors.gray900, marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14, color: Colors.gray500, marginBottom: 24,
    },
    errorBox: {
        backgroundColor: Colors.errorLight,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    errorText: { color: Colors.error, fontSize: 13, fontWeight: '500' },
    inputGroup: { marginBottom: 16 },
    inputLabel: {
        fontSize: 13, fontWeight: '600',
        color: Colors.gray700, marginBottom: 6,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.gray200,
        borderRadius: 14,
        paddingHorizontal: 14,
        backgroundColor: Colors.gray50,
    },
    inputIcon: { fontSize: 16, marginRight: 8 },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: Colors.gray900,
    },
    showHide: {
        fontSize: 13, fontWeight: '600',
        color: Colors.primary, paddingLeft: 8,
    },
    loginBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    loginBtnDisabled: { opacity: 0.7 },
    loginBtnText: {
        color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3,
    },
    offlineHint: {
        marginTop: 20,
        backgroundColor: Colors.primarySurface,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    offlineHintText: {
        fontSize: 12, color: Colors.primary,
        textAlign: 'center', fontWeight: '500',
    },
    footer: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        marginTop: 24,
    },
});
