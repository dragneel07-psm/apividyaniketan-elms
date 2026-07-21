// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useOffline } from '../hooks/use-offline';
import { Colors } from '../constants/theme';

export default function OfflineBanner() {
    const { isOnline, connectionQuality } = useOffline();

    if (isOnline && connectionQuality !== 'slow') return null;

    const isOffline = !isOnline;
    const isSlow = isOnline && connectionQuality === 'slow';

    return (
        <View style={[styles.banner, isOffline ? styles.bannerOffline : styles.bannerSlow]}>
            <Text style={styles.icon}>{isOffline ? '📴' : '🐢'}</Text>
            <View style={styles.text}>
                <Text style={styles.title}>
                    {isOffline ? 'You\'re offline' : 'Slow connection detected'}
                </Text>
                <Text style={styles.sub}>
                    {isOffline
                        ? 'Showing downloaded content. Progress syncs when reconnected.'
                        : 'Low data mode active. Download content on Wi-Fi.'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 10,
    },
    bannerOffline: { backgroundColor: '#1f2937' },
    bannerSlow: { backgroundColor: '#d97706' },
    icon: { fontSize: 18 },
    text: { flex: 1 },
    title: { color: '#fff', fontSize: 12, fontWeight: '700' },
    sub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
});
