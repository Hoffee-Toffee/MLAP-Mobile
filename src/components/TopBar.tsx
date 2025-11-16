import React from 'react';
import { Appbar, Modal, Portal, useTheme, Button } from 'react-native-paper';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useMultiQueue } from '../context/MultiQueueContext';

const QUEUE_LABELS = {
  queue1: 'Queue 1',
  queue2: 'Queue 2',
  queue3: 'Queue 3',
};

type TopBarProps = { showMenu?: boolean; onMenuPress?: () => void; iconColor?: string };
const TopBar: React.FC<TopBarProps> = ({ showMenu = true, onMenuPress, iconColor }) => {
  const { selectedQueue, setSelectedQueue } = useMultiQueue();
  const [modalVisible, setModalVisible] = React.useState(false);
  const theme = useTheme();

  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
      {showMenu && <Appbar.Action icon="menu" color={iconColor ?? theme.colors.onPrimary} onPress={onMenuPress} />}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.anchorTouchable}
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.anchorRow}>
            <Text style={[styles.anchorText, { color: theme.colors.onPrimary }]}>{QUEUE_LABELS[selectedQueue]}</Text>
            <Appbar.Action icon={modalVisible ? 'chevron-up' : 'chevron-down'} color={iconColor ?? theme.colors.onPrimary} onPress={() => setModalVisible(true)} />
          </View>
        </TouchableOpacity>
        <Portal>
          <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.onPrimary }]}>Select Queue</Text>
            {Object.entries(QUEUE_LABELS).map(([id, label]) => (
              <Button
                key={id}
                mode={selectedQueue === id ? 'contained' : 'outlined'}
                onPress={() => {
                  setSelectedQueue(id as any);
                  setModalVisible(false);
                }}
                style={[styles.modalButton, { borderColor: theme.colors.onPrimary }]}
                labelStyle={{ color: theme.colors.onPrimary }}
                disabled={selectedQueue === id}
                buttonColor={selectedQueue === id ? theme.colors.onPrimary : undefined}
                textColor={theme.colors.primary}
              >
                {label}
              </Button>
            ))}
            <Button onPress={() => setModalVisible(false)} style={styles.modalButton} labelStyle={{ color: theme.colors.onPrimary }}>
              Cancel
            </Button>
          </Modal>
        </Portal>
      </View>
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  anchorTouchable: {
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
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    margin: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
  },
  modalButton: {
    marginVertical: 6,
    minWidth: 180,
  },
});

export default TopBar;
