import React from 'react';
import { Appbar, Menu, useTheme } from 'react-native-paper';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMultiQueue } from '../context/MultiQueueContext';

const QUEUE_LABELS = {
  queue1: 'Queue 1',
  queue2: 'Queue 2',
  queue3: 'Queue 3',
};

const TopBar: React.FC<{ onMenuPress: () => void }> = ({ onMenuPress }) => {
  const { selectedQueue, setSelectedQueue } = useMultiQueue();
  const [menuVisible, setMenuVisible] = React.useState(false);
  const theme = useTheme();

  return (
    <Appbar.Header>
      <Appbar.Action icon="menu" onPress={onMenuPress} />
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.anchorTouchable}
              activeOpacity={0.7}
              onPress={() => setMenuVisible(true)}
            >
              <View style={styles.anchorRow}>
                <Text style={[styles.anchorText, { color: theme.colors.onPrimary }]}>{QUEUE_LABELS[selectedQueue]}</Text>
                <Appbar.Action icon={menuVisible ? 'chevron-up' : 'chevron-down'} color={theme.colors.onPrimary} onPress={() => setMenuVisible(true)} />
              </View>
            </TouchableOpacity>
          }
        >
          {Object.entries(QUEUE_LABELS).map(([id, label]) => (
            <Menu.Item
              key={id}
              title={label}
              onPress={() => {
                setSelectedQueue(id as any);
                setMenuVisible(false);
              }}
              disabled={selectedQueue === id}
            />
          ))}
        </Menu>
      </View>
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  anchorTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anchorText: {
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1,
    marginRight: 4,
  },
});

export default TopBar;
