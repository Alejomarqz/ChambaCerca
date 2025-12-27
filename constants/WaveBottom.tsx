// components/WaveBottom.tsx
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { COLORS } from './theme';

const { width } = Dimensions.get('window');

export default function WaveBottom() {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={styles.wave} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -90,
    height: 220,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    left: -width * 0.15,
    right: -width * 0.15,
    bottom: 0,
    height: 220,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 320,
    borderTopRightRadius: 320,
  },
});
