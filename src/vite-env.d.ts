/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** qweather（默认）| openweathermap */
  readonly VITE_WEATHER_PROVIDER?: string;
  readonly VITE_USE_MOCK?: string;
  readonly VITE_REQUEST_TIMEOUT?: string;

  /** 和风天气 */
  readonly VITE_WEATHER_API_BASE_URL?: string;
  readonly VITE_WEATHER_GEO_BASE_URL?: string;
  readonly VITE_WEATHER_API_KEY?: string;

  /** OpenWeatherMap */
  readonly VITE_OPENWEATHER_API_BASE_URL?: string;
  readonly VITE_OPENWEATHER_API_KEY?: string;
  readonly VITE_OPENWEATHER_UNITS?: string;
  readonly VITE_OPENWEATHER_LANG?: string;
  /** auto | onecall | free */
  readonly VITE_OPENWEATHER_API_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}