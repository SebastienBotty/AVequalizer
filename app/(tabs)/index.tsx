// App.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Polyline, Stop, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Types
interface Preset {
  name: string;
  gains: number[];
}

interface CustomPresets {
  [key: string]: Preset;
}

// Fréquences de l'égaliseur (15 bandes)
const FREQUENCIES: number[] = [
  25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000
];

// Presets prédéfinis
const PRESETS: { [key: string]: Preset } = {
  flat: { name: 'Flat', gains: Array(15).fill(0) },
  rock: { name: 'Rock', gains: [8, 6, 4, 2, -2, -4, 0, 2, 4, 6, 8, 10, 10, 8, 6] },
  pop: { name: 'Pop', gains: [-2, 0, 4, 6, 6, 4, 0, -2, -4, -2, 0, 2, 4, 4, 2] },
  jazz: { name: 'Jazz', gains: [6, 4, 2, 2, 0, 0, 0, 2, 4, 4, 6, 6, 4, 2, 0] },
  classical: { name: 'Classical', gains: [8, 6, 4, 2, 0, 0, 0, 0, 0, 2, 4, 6, 8, 8, 6] },
  bass_boost: { name: 'Bass Boost', gains: [16, 14, 12, 10, 8, 4, 0, -2, -4, -4, -2, 0, 0, 0, 0] },
  treble_boost: { name: 'Treble Boost', gains: [0, 0, 0, -2, -4, -4, -2, 0, 4, 8, 10, 12, 14, 16, 14] },
  vocal: { name: 'Vocal', gains: [-4, -4, -2, 0, 2, 4, 6, 8, 8, 6, 4, 2, 0, -2, -4] }
};

export default function HomeScreen() {
  const [gains, setGains] = useState<number[]>(Array(15).fill(0));
  const [selectedPreset, setSelectedPreset] = useState<string>('flat');
  const [customPresets, setCustomPresets] = useState<CustomPresets>({});
  const [presetName, setPresetName] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);

  // Charger les presets personnalisés
  useEffect(() => {
    loadCustomPresets();
  }, []);

  const loadCustomPresets = async () => {
    try {
      const stored = await AsyncStorage.getItem('custom-presets');
      if (stored) {
        setCustomPresets(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Erreur chargement presets:', error);
    }
  };

  const handleGainChange = (index: number, value: number): void => {
    const newGains = [...gains];
    newGains[index] = Math.round(value);
    setGains(newGains);
    setSelectedPreset('custom');
    applyEqualizer(newGains);
  };

  const applyEqualizer = (gainValues: number[]): void => {
    if (!isEnabled) return;
    // TODO: Appeler le module natif Android
    // NativeModules.AudioEqualizer.setGains(gainValues);
    console.log('Applying EQ gains:', gainValues);
  };

  const loadPreset = (presetKey: string): void => {
    const preset = PRESETS[presetKey] || customPresets[presetKey];
    if (preset) {
      setGains([...preset.gains]);
      setSelectedPreset(presetKey);
      applyEqualizer(preset.gains);
    }
  };

  const saveCustomPreset = async () => {
    if (!presetName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour le preset');
      return;
    }

    const newPresets = {
      ...customPresets,
      [presetName]: { name: presetName, gains: [...gains] }
    };

    try {
      await AsyncStorage.setItem('custom-presets', JSON.stringify(newPresets));
      setCustomPresets(newPresets);
      setShowSaveDialog(false);
      setPresetName('');
      setSelectedPreset(presetName);
      Alert.alert('Succès', 'Preset sauvegardé !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder le preset');
    }
  };

  const confirmDeletePreset = (presetKey: string): void => {
    setPresetToDelete(presetKey);
    setShowDeleteDialog(true);
  };

  const deleteCustomPreset = async (): Promise<void> => {
    if (!presetToDelete) return;

    const newPresets = { ...customPresets };
    delete newPresets[presetToDelete];

    try {
      await AsyncStorage.setItem('custom-presets', JSON.stringify(newPresets));
      setCustomPresets(newPresets);
      if (selectedPreset === presetToDelete) {
        loadPreset('flat');
      }
      setShowDeleteDialog(false);
      setPresetToDelete(null);
      Alert.alert('Succès', 'Preset supprimé !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer le preset');
    }
  };

  const resetAll = (): void => {
    setGains(Array(15).fill(0));
    setSelectedPreset('flat');
    applyEqualizer(Array(15).fill(0));
  };

  const toggleEqualizer = (): void => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    if (newState) {
      applyEqualizer(gains);
    }
  };

  const formatFrequency = (freq: number): string => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}k`;
    }
    return freq.toString();
  };

  // Calculer les points pour la courbe
  const getCurvePoints = (): string => {
    const chartWidth = width - 80;
    const chartHeight = 300;
    
    return gains.map((gain, i) => {
      const x = 40 + (i / (gains.length - 1)) * chartWidth;
      const y = chartHeight / 2 - (gain / 20) * (chartHeight / 2 - 20);
      return `${x},${y}`;
    }).join(' ');
  };

  const renderFrequencyChart = ()=> {
    const chartWidth = width - 80;
    const chartHeight = 300;
    const points = getCurvePoints();

    return (
      <View style={styles.chartContainer}>
        <Svg width={width - 40} height={chartHeight + 60}>
          {/* Lignes horizontales et labels Y */}
          {[20, 10, 0, -10, -20].map((db, i) => {
            const y = 20 + (i / 4) * (chartHeight - 40);
            return (
              <React.Fragment key={db}>
                <Line
                  x1="40"
                  y1={y}
                  x2={chartWidth + 40}
                  y2={y}
                  stroke={db === 0 ? '#666' : '#333'}
                  strokeWidth={db === 0 ? 2 : 1}
                  strokeDasharray={db === 0 ? '0' : '5,5'}
                />
                <SvgText
                  x="10"
                  y={y + 5}
                  fill="#888"
                  fontSize="12"
                  textAnchor="start"
                >
                  {db > 0 ? '+' : ''}{db}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Lignes verticales pour chaque fréquence */}
          {FREQUENCIES.map((freq, i) => {
            const x = 40 + (i / (FREQUENCIES.length - 1)) * chartWidth;
            return (
              <Line
                key={freq}
                x1={x}
                y1="20"
                x2={x}
                y2={chartHeight - 20}
                stroke="#222"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            );
          })}

          {/* Courbe */}
          <Defs>
            <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#8b5cf6" />
              <Stop offset="50%" stopColor="#a855f7" />
              <Stop offset="100%" stopColor="#c084fc" />
            </LinearGradient>
          </Defs>

          <Polyline
            points={points}
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {gains.map((gain, i) => {
            const x = 40 + (i / (gains.length - 1)) * chartWidth;
            const y = chartHeight / 2 - (gain / 20) * (chartHeight / 2 - 20);
            return (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r="5"
                fill="#a855f7"
              />
            );
          })}

          {/* Labels fréquences */}
          {FREQUENCIES.map((freq, i) => {
            const x = 40 + (i / (FREQUENCIES.length - 1)) * chartWidth;
            return (
              <SvgText
                key={freq}
                x={x}
                y={chartHeight + 15}
                fill="#888"
                fontSize="10"
                textAnchor="middle"
              >
                {formatFrequency(freq)}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎵 Égaliseur Audio Global</Text>
          <Text style={styles.subtitle}>Android uniquement</Text>
        </View>

        {/* Power Button */}
        <TouchableOpacity
          style={[styles.powerButton, isEnabled && styles.powerButtonActive]}
          onPress={toggleEqualizer}
        >
          <Text style={styles.powerButtonText}>
            {isEnabled ? '✓ Activé' : 'Désactivé'}
          </Text>
        </TouchableOpacity>

        {/* Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Presets</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(PRESETS).map(key => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.presetButton,
                  selectedPreset === key && styles.presetButtonActive
                ]}
                onPress={() => loadPreset(key)}
              >
                <Text style={styles.presetButtonText}>{PRESETS[key].name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {Object.keys(customPresets).length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Presets personnalisés</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {Object.keys(customPresets).map(key => (
                  <View key={key} style={styles.customPresetContainer}>
                    <TouchableOpacity
                      style={[
                        styles.presetButton,
                        selectedPreset === key && styles.presetButtonActive
                      ]}
                      onPress={() => loadPreset(key)}
                    >
                      <Text style={styles.presetButtonText}>
                        {customPresets[key].name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => confirmDeletePreset(key)}
                    >
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* Courbe de réponse */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Courbe de réponse</Text>
          {renderFrequencyChart()}
        </View>

        {/* Sliders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bandes de fréquence</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowSaveDialog(true)}
              >
                <Text style={styles.actionButtonText}>💾 Sauvegarder</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.resetButton]}
                onPress={resetAll}
              >
                <Text style={styles.actionButtonText}>🔄 Reset</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.slidersContainer}>
              {FREQUENCIES.map((freq, index) => (
                <View key={freq} style={styles.sliderColumn}>
                  <Text style={styles.gainValue}>
                    {gains[index] > 0 ? '+' : ''}{gains[index]} dB
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={-20}
                    maximumValue={20}
                    step={1}
                    value={gains[index]}
                    onValueChange={(value) => handleGainChange(index, value)}
                    minimumTrackTintColor="#a855f7"
                    maximumTrackTintColor="#444"
                    thumbTintColor="#a855f7"
                    disabled={!isEnabled}
                  />
                  <Text style={styles.freqLabel}>{formatFrequency(freq)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Instructions */}
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>⚠️ Configuration requise</Text>
          <Text style={styles.warningText}>
            • Android uniquement{'\n'}
            • Module natif requis: android.media.audiofx.Equalizer{'\n'}
            • Permission: MODIFY_AUDIO_SETTINGS{'\n'}
            • iOS: impossible (limitations système)
          </Text>
        </View>
      </View>

      {/* Modal Sauvegarde */}
      <Modal
        visible={showSaveDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sauvegarder le preset</Text>
            <TextInput
              style={styles.input}
              value={presetName}
              onChangeText={setPresetName}
              placeholder="Nom du preset"
              placeholderTextColor="#888"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowSaveDialog(false);
                  setPresetName('');
                }}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveCustomPreset}
              >
                <Text style={styles.modalButtonText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Suppression */}
      <Modal
        visible={showDeleteDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Supprimer le preset ?</Text>
            <Text style={styles.modalMessage}>
              Voulez-vous vraiment supprimer "{presetToDelete && customPresets[presetToDelete]?.name}" ?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteDialog(false);
                  setPresetToDelete(null);
                }}
              >
                <Text style={styles.modalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={deleteCustomPreset}
              >
                <Text style={styles.modalButtonText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  powerButton: {
    backgroundColor: '#444',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignSelf: 'center',
    marginBottom: 30,
  },
  powerButtonActive: {
    backgroundColor: '#22c55e',
  },
  powerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginTop: 15,
    marginBottom: 10,
  },
  presetButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  presetButtonActive: {
    backgroundColor: '#a855f7',
  },
  presetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  customPresetContainer: {
    position: 'relative',
    marginRight: 10,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: 2,
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  chartContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 10,
    padding: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: '#a855f7',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  resetButton: {
    backgroundColor: '#555',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  slidersContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  sliderColumn: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 60,
  },
  gainValue: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  slider: {
    width: 200,
    height: 40,
    transform: [{ rotate: '-90deg' }],
    marginVertical: 80,
  },
  freqLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 10,
  },
  warning: {
    backgroundColor: '#422006',
    borderColor: '#78350f',
    borderWidth: 1,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 10,
  },
  warningText: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 25,
    width: width - 60,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: '#555',
  },
  saveButton: {
    backgroundColor: '#a855f7',
  },
  deleteConfirmButton: {
    backgroundColor: '#ef4444',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});