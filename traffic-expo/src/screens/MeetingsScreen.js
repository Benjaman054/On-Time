// Home screen: the list of upcoming meetings with leave-by time, drive-time
// range, and an "Open in Maps" button. Silently re-syncs every 60 seconds while
// the screen is visible (cheap unless the calendar actually changed).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMeetings } from '../api';
import { formatTime } from '../time';
import { PrimaryButton } from '../components/Button';
import { useTheme } from '../theme-context';

export function MeetingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async ({ silent = false, sync = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(false);
    }
    try {
      const res = await getMeetings({ sync });
      // Keep a meeting until its END time passes. (Older stored plans may not
      // include endTime yet, so fall back to the start time for those.)
      const now = Date.now();
      const upcoming = (res?.plans ?? []).filter((p) => {
        const endsAt = p.endTime || p.meetingTime;
        return !endsAt || Date.parse(endsAt) >= now;
      });
      setPlans(upcoming);
      setLoading(false);
      setError(false);
    } catch {
      if (!silent) {
        setLoading(false);
        setError(true);
      }
    }
  }, []);

  // Load every time the screen comes into focus: on first open it shows the
  // spinner; when returning from Add Meeting or Settings it re-syncs silently.
  const hasLoaded = useRef(false);
  useFocusEffect(
    useCallback(() => {
      load({ silent: hasLoaded.current, sync: true });
      hasLoaded.current = true;
    }, [load])
  );

  // Silent sync every 60s.
  useEffect(() => {
    const id = setInterval(() => load({ silent: true, sync: true }), 60_000);
    return () => clearInterval(id);
  }, [load]);

  async function onPullRefresh() {
    setRefreshing(true);
    await load({ silent: true, sync: true });
    setRefreshing(false);
  }

  function openMaps(location) {
    const url =
      'https://www.google.com/maps/dir/?api=1&destination=' +
      encodeURIComponent(location) +
      '&travelmode=driving';
    Linking.openURL(url);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, marginBottom: 16 }}>
          Couldn't reach the server.
        </Text>
        <PrimaryButton title="Try again" onPress={() => load()} colors={colors} />
      </View>
    );
  }

  if (plans.length === 0) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.center}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.brand} />
        }
      >
        <Text style={{ color: colors.textMuted }}>No upcoming meetings.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.brand} />
      }
    >
      {plans.map((plan, i) => (
        <PlanCard key={i} plan={plan} colors={colors} onOpenMaps={openMaps} />
      ))}
    </ScrollView>
  );
}

function PlanCard({ plan, colors, onOpenMaps }) {
  const drive = plan.driveMinutes;
  const hasRange = drive && drive.withoutTraffic != null && drive.withTraffic != null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>
        {plan.title || '(no title)'}
      </Text>
      <Text style={[styles.cardLine, { color: colors.text }]}>📍 {plan.location || ''}</Text>

      {plan.error ? (
        <Text style={[styles.cardLine, { color: colors.textMuted }]}>⚠️ {plan.error}</Text>
      ) : (
        <>
          <Text style={[styles.cardLine, { color: colors.textMuted }]}>
            Meeting: {formatTime(plan.meetingTime)}
          </Text>
          <Text style={[styles.cardLine, { color: colors.textMuted }]}>
            Leave by {formatTime(plan.leaveBy)}
            {hasRange ? `   •   ${drive.withoutTraffic}–${drive.withTraffic} min drive` : ''}
          </Text>
          {plan.location ? (
            <TouchableOpacity
              onPress={() => onOpenMaps(plan.location)}
              style={[styles.mapsBtn, { backgroundColor: colors.brand }]}
            >
              <Text style={{ color: colors.onBrand, fontWeight: '600' }}>Open in Maps</Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardLine: { fontSize: 14 },
  mapsBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
