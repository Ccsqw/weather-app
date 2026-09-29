import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { inspectConfig, providerLabel, ACTIVE_PROVIDER, USE_MOCK } from './api/config';
import { getOpenWeatherMode } from './api/providers/openweather';
import './index.css';

// 启动自检：配置写错时立刻在控制台指出具体是哪个变量
for (const issue of inspectConfig()) {
  const log = issue.level === 'error' ? console.error : console.warn;
  log(`[配置] ${issue.message}`);
}

const modeSuffix =
  ACTIVE_PROVIDER === 'openweathermap' && !USE_MOCK ? `，接口版本：${getOpenWeatherMode()}` : '';
console.info(
  `[配置] 数据源：${providerLabel(ACTIVE_PROVIDER)}，数据模式：${USE_MOCK ? '本地 mock' : '在线接口'}${modeSuffix}`,
);

const container = document.getElementById('root');
if (!container) throw new Error('找不到 #root 容器');

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);