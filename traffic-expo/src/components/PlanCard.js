// One meeting card on the Home screen: title, location, meeting time, the bold
// "Leave by" time with drive range, and an "Open in Maps" button. If the plan
// couldn't be computed (no route), it shows the error line instead.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatTime } from '../time';
import { openMaps } from '../maps';

export function PlanCard({ plan, colors }) {
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
              onPress={() => openMaps(plan.location)}
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
