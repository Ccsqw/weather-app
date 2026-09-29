import type { WeatherData } from '../types/weather';

/**
 * 未接入真实接口时的本地数据，结构与 WeatherData 完全一致。
 * .env.local 中 VITE_USE_MOCK=true 时启用。
 */
export const MOCK_WEATHER: WeatherData = {
  location: { city: '上海市', cityId: '101020100' },
  current: {
    temp: 24,
    condition: '多云',
    icon: 'cloudy',
    tempMax: 28,
    tempMin: 20,
    aqi: 45,
    aqiLevel: '优',
    aqiAdvice: '适宜户外运动',
    humidity: 65,
    dewPoint: 18,
    feelsLike: 26,
    windScale: 3,
    windDir: '东北风',
    windSpeed: 18,
    uvIndex: 5,
    visibility: 12,
    sunrise: '05:20',
    sunset: '18:42',
    obsTime: '2026-05-28T14:00:00+08:00',
  },
  rain: { summary: '未来 2 小时内无降水。', hasRain: false },
  hourly: [
    { time: '2026-05-28T14:00:00+08:00', label: '现在', temp: 24, icon: 'cloudy', precip: 0, pop: 0 },
    { time: '2026-05-28T15:00:00+08:00', label: '15时', temp: 25, icon: 'cloudy', precip: 0, pop: 0 },
    { time: '2026-05-28T16:00:00+08:00', label: '16时', temp: 26, icon: 'sunny', precip: 0, pop: 0 },
    { time: '2026-05-28T17:00:00+08:00', label: '17时', temp: 25, icon: 'sunny', precip: 0, pop: 0 },
    { time: '2026-05-28T18:00:00+08:00', label: '18时', temp: 23, icon: 'sunset', precip: 0, pop: 0 },
    { time: '2026-05-28T19:00:00+08:00', label: '19时', temp: 22, icon: 'cloudy', precip: 0, pop: 0 },
    { time: '2026-05-28T20:00:00+08:00', label: '20时', temp: 21, icon: 'cloudy', precip: 0, pop: 0 },
    { time: '2026-05-28T21:00:00+08:00', label: '21时', temp: 21, icon: 'rain', precip: 0.4, pop: 0.6 },
  ],
  daily: [
    { day: '今天', date: '2026-05-28', icon: 'cloudy', tempMin: 20, tempMax: 28, sunrise: '05:20', sunset: '18:42' },
    { day: '明天', date: '2026-05-29', icon: 'cloudy', tempMin: 19, tempMax: 24, sunrise: '05:20', sunset: '18:43' },
    { day: '周三', date: '2026-05-30', icon: 'sunny', tempMin: 21, tempMax: 30, sunrise: '05:19', sunset: '18:43' },
    { day: '周四', date: '2026-05-31', icon: 'rain', tempMin: 22, tempMax: 27, sunrise: '05:19', sunset: '18:44' },
    { day: '周五', date: '2026-06-01', icon: 'rain', tempMin: 21, tempMax: 25, sunrise: '05:18', sunset: '18:44' },
    { day: '周六', date: '2026-06-02', icon: 'overcast', tempMin: 20, tempMax: 26, sunrise: '05:18', sunset: '18:45' },
    { day: '周日', date: '2026-06-03', icon: 'sunny', tempMin: 22, tempMax: 29, sunrise: '05:17', sunset: '18:45' },
  ],
};