// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { User, usersAPI } from '../lib/api';
import { Colors, Shadows } from '../constants/theme';

interface ProfileScreenProps {
    user: User;
    onLogout: () => void;
    onUserUpdated?: (user: User) => void;
}

export default function ProfileScreen({ user, onLogout, onUserUpdated }: ProfileScreenProps) {
    const navigation: any = useNavigation();
    const canOpenOffline = user.role === 'student';
    const [firstName, setFirstName] = useState(user.first_name || '');
    const [lastName, setLastName] = useState(user.last_name || '');
    const [phone, setPhone] = useState(user.phone_number || '');
    const [bio, setBio] = useState(user.bio || '');

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const roleLabel = useMemo(() => user.role.replace('_', ' ').toUpperCase(), [user.role]);

    const saveProfile = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            Alert.alert('Missing Details', 'First name and last name are required.');
            return;
        }

        setSavingProfile(true);
        try {
            const updated = await usersAPI.updateMe({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone_number: phone.trim(),
                bio: bio.trim(),
            });
            onUserUpdated?.(updated);
            Alert.alert('Success', 'Profile updated.');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update profile.';
            Alert.alert('Update Failed', message);
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert('Missing Details', 'Fill all password fields.');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Weak Password', 'New password must be at least 8 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'New password and confirm password do not match.');
            return;
        }

        setSavingPassword(true);
        try {
            await usersAPI.changePassword(oldPassword, newPassword);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            Alert.alert('Success', 'Password changed successfully.');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to change password.';
            Alert.alert('Password Change Failed', message);
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <View style={styles.heroCard}>
                <Text style={styles.roleBadge}>{roleLabel}</Text>
                <Text style={styles.nameText}>{`${firstName} ${lastName}`.trim() || user.email}</Text>
                <Text style={styles.emailText}>{user.email}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Profile Settings</Text>

                <Text style={styles.label}>First Name</Text>
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" />

                <Text style={styles.label}>Last Name</Text>
                <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" />

                <Text style={styles.label}>Phone</Text>
                <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Phone number"
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>Bio</Text>
                <TextInput
                    style={[styles.input, styles.multiInput]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Short bio"
                    multiline
                />

                <TouchableOpacity style={styles.primaryBtn} onPress={saveProfile} disabled={savingProfile}>
                    {savingProfile ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.primaryBtnText}>Save Profile</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Change Password</Text>

                <Text style={styles.label}>Current Password</Text>
                <TextInput
                    style={styles.input}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholder="Current password"
                    secureTextEntry
                />

                <Text style={styles.label}>New Password</Text>
                <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="New password"
                    secureTextEntry
                />

                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry
                />

                <TouchableOpacity style={styles.primaryBtn} onPress={savePassword} disabled={savingPassword}>
                    {savingPassword ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.primaryBtnText}>Update Password</Text>
                    )}
                </TouchableOpacity>
            </View>

            {canOpenOffline && (
                <TouchableOpacity
                    style={styles.offlineBtn}
                    onPress={() => navigation.navigate('Offline')}
                >
                    <Text style={styles.offlineText}>📥  Offline Downloads</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Colors.gray50 },
    content: { padding: 16, paddingBottom: 28 },
    heroCard: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...Shadows.md,
    },
    roleBadge: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
    nameText: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
    emailText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        ...Shadows.sm,
    },
    cardTitle: { color: Colors.gray900, fontSize: 16, fontWeight: '800', marginBottom: 8 },
    label: { color: Colors.gray700, fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderColor: Colors.gray200,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 11,
        color: Colors.gray900,
        fontSize: 14,
    },
    multiInput: { minHeight: 80, textAlignVertical: 'top' },
    primaryBtn: {
        marginTop: 14,
        backgroundColor: Colors.primary,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    offlineBtn: {
        marginBottom: 8,
        backgroundColor: Colors.white,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderWidth: 1,
        borderColor: Colors.gray200,
    },
    offlineText: { color: Colors.gray700, fontWeight: '700', fontSize: 14 },
    logoutBtn: {
        marginTop: 8,
        backgroundColor: Colors.error,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
    },
    logoutText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
