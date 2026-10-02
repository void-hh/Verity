import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

const TASKS_KEY = 'verity_tasks';
const FAVS_KEY = 'verity_weather_favorites';

const defaultTasks = [
  { id: '1', title: 'Revisar tarefas do dia', done: false },
  { id: '2', title: 'Ver previsão do tempo', done: true },
  { id: '3', title: 'Organizar planejamento semanal', done: false },
];

const weatherCodeMap = {
  0: { label: 'Céu limpo', icon: '☀️' },
  1: { label: 'Principalmente limpo', icon: '🌤️' },
  2: { label: 'Parcialmente nublado', icon: '⛅' },
  3: { label: 'Nublado', icon: '☁️' },
  45: { label: 'Névoa', icon: '🌫️' },
  48: { label: 'Névoa', icon: '🌫️' },
  51: { label: 'Chuva leve', icon: '����️' },
  53: { label: 'Chuva moderada', icon: '🌦️' },
  55: { label: 'Chuva forte', icon: '🌧️' },
  61: { label: 'Chuva leve', icon: '🌧️' },
  63: { label: 'Chuva moderada', icon: '🌧️' },
  65: { label: 'Chuva forte', icon: '⛈️' },
  71: { label: 'Neve leve', icon: '❄️' },
  73: { label: 'Neve moderada', icon: '❄️' },
  75: { label: 'Neve forte', icon: '❄️' },
  80: { label: 'Chuva leve', icon: '🌦️' },
  81: { label: 'Chuva moderada', icon: '🌧️' },
  82: { label: 'Chuva forte', icon: '⛈️' },
  95: { label: 'Tempestade', icon: '⛈️' },
  96: { label: 'Tempestade com granizo', icon: '⛈️' },
  99: { label: 'Tempestade forte', icon: '⛈️' },
};

const getWeatherDescription = (code) => weatherCodeMap[code] || { label: 'Indefinido', icon: '🌡️' };

export default function App() {
  const [tasks, setTasks] = useState(defaultTasks);
  const [newTask, setNewTask] = useState('');
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [cityInput, setCityInput] = useState('São Paulo');
  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    loadTasks();
    loadFavorites();
    searchWeatherByCity('São Paulo');
  }, []);

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.done).length,
    [tasks]
  );

  const progress = tasks.length ? (completedTasks / tasks.length) * 100 : 0;

  const loadTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem(TASKS_KEY);
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Erro ao carregar tarefas:', error);
    }
  };

  const saveTasks = async (nextTasks) => {
    try {
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(nextTasks));
    } catch (error) {
      console.log('Erro ao salvar tarefas:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVS_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Erro ao carregar favoritos:', error);
    }
  };

  const saveFavorites = async (nextFavorites) => {
    try {
      await AsyncStorage.setItem(FAVS_KEY, JSON.stringify(nextFavorites));
    } catch (error) {
      console.log('Erro ao salvar favoritos:', error);
    }
  };

  const addTask = () => {
    const title = newTask.trim();
    if (!title) return;

    const nextTasks = [{ id: Date.now().toString(), title, done: false }, ...tasks];
    setTasks(nextTasks);
    saveTasks(nextTasks);
    setNewTask('');
  };

  const toggleTask = (id) => {
    const nextTasks = tasks.map((task) =>
      task.id === id ? { ...task, done: !task.done } : task
    );
    setTasks(nextTasks);
    saveTasks(nextTasks);
  };

  const deleteTask = (id) => {
    const nextTasks = tasks.filter((task) => task.id !== id);
    setTasks(nextTasks);
    saveTasks(nextTasks);
  };

  const searchWeatherByCity = async (city) => {
    const value = city?.trim();
    if (!value) return;

    setWeatherLoading(true);
    setWeatherError('');

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=1&language=pt&format=json`
      );
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('Cidade não encontrada');
      }

      const loc = geoData.results[0];
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature,pressure_msl&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&language=pt`
      );
      const weatherData = await weatherRes.json();

      setWeather({ name: `${loc.name}, ${loc.country}`, data: weatherData });
      setCityInput('');
    } catch (error) {
      setWeatherError(error.message || 'Erro ao buscar clima');
    } finally {
      setWeatherLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Permita o acesso à localização para usar o clima local.');
        return;
      }

      setWeatherLoading(true);
      setWeatherError('');

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
      const { latitude, longitude } = position.coords;

      const geo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=pt&format=json`
      );
      const geoData = await geo.json();

      const locationName = geoData.results && geoData.results[0]
        ? `${geoData.results[0].name}, ${geoData.results[0].country}`
        : 'Sua localização';

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature,pressure_msl&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&language=pt`
      );
      const weatherData = await weatherRes.json();

      setWeather({ name: locationName, data: weatherData });
    } catch (error) {
      setWeatherError('Não foi possível obter a localização atual.');
    } finally {
      setWeatherLoading(false);
    }
  };

  const addFavorite = () => {
    if (!weather || !weather.name) return;

    setFavorites((prev) => {
      if (prev.some((item) => item.name === weather.name)) {
        Alert.alert('Favorito já existe');
        return prev;
      }

      const next = [...prev, { name: weather.name }];
      saveFavorites(next);
      return next;
    });
  };

  const removeFavorite = (name) => {
    const next = favorites.filter((item) => item.name !== name);
    setFavorites(next);
    saveFavorites(next);
  };

  const currentTemp = weather?.data?.current?.temperature_2m;
  const currentCode = weather?.data?.current?.weather_code;
  const currentWeatherInfo = getWeatherDescription(currentCode ?? 0);
  const hourly = weather?.data?.hourly ?? { time: [], temperature_2m: [], weather_code: [] };
  const daily = weather?.data?.daily ?? { time: [], temperature_2m_max: [], temperature_2m_min: [], weather_code: [] };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1020" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>🌤️ Verity</Text>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'tasks' && styles.activeTab]}
              onPress={() => setActiveTab('tasks')}
            >
              <Text style={styles.tabText}>Tarefas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'weather' && styles.activeTab]}
              onPress={() => setActiveTab('weather')}
            >
              <Text style={styles.tabText}>Clima</Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'tasks' ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Resumo do dia</Text>
              <Text style={styles.progressText}>{completedTasks} de {tasks.length} concluídas</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBar, { width: `${Math.round(progress)}%` }]} />
              </View>
            </View>

            <View style={styles.taskInputRow}>
              <TextInput
                style={styles.taskInput}
                placeholder="Adicionar nova tarefa"
                placeholderTextColor="#8fa5c8"
                value={newTask}
                onChangeText={setNewTask}
              />
              <TouchableOpacity style={styles.addButton} onPress={addTask}>
                <Text style={styles.addButtonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.taskList}>
              {tasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <TouchableOpacity onPress={() => toggleTask(task.id)} style={styles.taskCheckBox}>
                    <Text style={styles.taskCheckText}>{task.done ? '✓' : ''}</Text>
                  </TouchableOpacity>

                  <Text style={[styles.taskTitle, task.done && styles.taskDone]}>{task.title}</Text>

                  <TouchableOpacity onPress={() => deleteTask(task.id)}>
                    <Text style={styles.deleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.weatherCard}>
              <Text style={styles.sectionTitle}>Previsão do tempo</Text>

              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar cidade"
                  placeholderTextColor="#8fa5c8"
                  value={cityInput}
                  onChangeText={setCityInput}
                  onSubmitEditing={() => searchWeatherByCity(cityInput)}
                />
                <TouchableOpacity style={styles.searchButton} onPress={() => searchWeatherByCity(cityInput)}>
                  <Text style={styles.searchButtonText}>Buscar</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation}>
                <Text style={styles.locationButtonText}>📍 Usar minha localização</Text>
              </TouchableOpacity>

              {weatherLoading && (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color="#8b5cf6" />
                  <Text style={styles.loadingText}>Carregando clima...</Text>
                </View>
              )}

              {weatherError ? <Text style={styles.errorText}>{weatherError}</Text> : null}

              {weather && !weatherLoading ? (
                <>
                  <View style={styles.weatherTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cityText}>{weather.name}</Text>
                      <Text style={styles.tempText}>{Math.round(currentTemp ?? 0)}°C</Text>
                      <Text style={styles.weatherDescText}>
                        {currentWeatherInfo.icon} {currentWeatherInfo.label}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.favoriteButton} onPress={addFavorite}>
                      <Text style={styles.favoriteButtonText}>⭐ Favoritar</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Umidade</Text>
                      <Text style={styles.statValue}>{weather.data.current.relative_humidity_2m}%</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Vento</Text>
                      <Text style={styles.statValue}>{weather.data.current.wind_speed_10m} km/h</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Sensação</Text>
                      <Text style={styles.statValue}>{Math.round(weather.data.current.apparent_temperature)}°C</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Pressão</Text>
                      <Text style={styles.statValue}>{weather.data.current.pressure_msl} hPa</Text>
                    </View>
                  </View>

                  <Text style={styles.sectionTitle}>Próximas horas</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {(hourly.time || []).slice(0, 12).map((time, index) => {
                      const forecastCode = hourly.weather_code[index];
                      const info = getWeatherDescription(forecastCode);
                      const hour = new Date(time).getHours();
                      return (
                        <View key={`${time}-${index}`} style={styles.hourCard}>
                          <Text style={styles.hourText}>{hour}:00</Text>
                          <Text style={styles.hourIcon}>{info.icon}</Text>
                          <Text style={styles.hourTemp}>{Math.round(hourly.temperature_2m[index])}°</Text>
                        </View>
                      );
                    })}
                  </ScrollView>

                  <Text style={styles.sectionTitle}>7 dias</Text>
                  <View style={styles.dailyGrid}>
                    {(daily.time || []).slice(0, 7).map((day, index) => {
                      const value = new Date(day);
                      const info = getWeatherDescription(daily.weather_code[index]);
                      return (
                        <View key={`${day}-${index}`} style={styles.dayCard}>
                          <Text style={styles.dayText}>{value.toLocaleDateString('pt-BR', { weekday: 'short' })}</Text>
                          <Text style={styles.dayIcon}>{info.icon}</Text>
                          <Text style={styles.dayTemp}>
                            <Text style={{ fontWeight: 'bold' }}>{Math.round(daily.temperature_2m_max[index])}° </Text>
                            <Text style={{ color: '#a5b4cf' }}>{Math.round(daily.temperature_2m_min[index])}°</Text>
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <Text style={styles.sectionTitle}>Favoritos</Text>
                  <View style={styles.favoriteList}>
                    {favorites.length === 0 ? (
                      <Text style={styles.emptyText}>Nenhuma cidade favorita ainda.</Text>
                    ) : (
                      favorites.map((item, index) => (
                        <View key={`${item.name}-${index}`} style={styles.favoriteItem}>
                          <TouchableOpacity onPress={() => searchWeatherByCity(item.name)}>
                            <Text style={styles.favoriteName}>{item.name}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeFavorite(item.name)}>
                            <Text style={styles.removeFavorite}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b1020',
  },
  container: {
    flex: 1,
    backgroundColor: '#0b1020',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2a3d',
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f3f8ff',
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1d2537',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#7c3aed',
  },
  tabText: {
    color: '#eef2ff',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27314a',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f3f8ff',
    marginBottom: 8,
  },
  progressText: {
    color: '#b2c3e3',
    marginBottom: 8,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#1c2540',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 999,
  },
  taskInputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  taskInput: {
    flex: 1,
    backgroundColor: '#111827',
    borderColor: '#2d3a56',
    borderWidth: 1,
    color: '#f3f8ff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  taskList: {
    marginBottom: 20,
  },
  taskItem: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d3a56',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
  },
  taskCheckBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#1b1232',
  },
  taskCheckText: {
    color: '#fff',
    fontWeight: '700',
  },
  taskTitle: {
    flex: 1,
    color: '#edf4ff',
    fontSize: 15,
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: '#9aa9bf',
  },
  deleteBtn: {
    color: '#ff6b6b',
    fontSize: 18,
    marginLeft: 8,
  },
  weatherCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#28344d',
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#edf3ff',
    marginTop: 8,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    color: '#edf3ff',
    borderWidth: 1,
    borderColor: '#2d3a56',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  locationButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  locationButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  loadingText: {
    color: '#cbd8ef',
    marginTop: 8,
  },
  errorText: {
    color: '#fca5a5',
    backgroundColor: '#3f1d1d',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  weatherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cityText: {
    color: '#b7c9e8',
    fontSize: 16,
    marginBottom: 4,
  },
  tempText: {
    color: '#f5f9ff',
    fontSize: 46,
    fontWeight: '800',
    lineHeight: 52,
  },
  weatherDescText: {
    color: '#dfeaff',
    marginTop: 4,
    fontSize: 15,
  },
  favoriteButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  favoriteButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1b2337',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a3a57',
  },
  statLabel: {
    color: '#a9bbd8',
    fontSize: 12,
    marginBottom: 6,
  },
  statValue: {
    color: '#f4f8ff',
    fontSize: 18,
    fontWeight: '700',
  },
  horizontalScroll: {
    marginBottom: 12,
  },
  hourCard: {
    width: 84,
    backgroundColor: '#1a2234',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  hourText: {
    color: '#aebedb',
    fontSize: 12,
  },
  hourIcon: {
    fontSize: 24,
    marginVertical: 8,
  },
  hourTemp: {
    color: '#f3f8ff',
    fontWeight: '700',
  },
  dailyGrid: {
    marginBottom: 14,
  },
  dayCard: {
    backgroundColor: '#1a2234',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3a57',
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  dayText: {
    color: '#c5d5f2',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  dayIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  dayTemp: {
    color: '#eaf3ff',
  },
  favoriteList: {
    marginTop: 8,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a2234',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  favoriteName: {
    color: '#edf4ff',
    fontWeight: '600',
  },
  removeFavorite: {
    color: '#ff8b8b',
    fontSize: 18,
    marginLeft: 10,
  },
  emptyText: {
    color: '#aebedb',
  },
});
