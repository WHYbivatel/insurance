/**
 * Глобальные объявления для клиентских модулей.
 *
 * __APP_VERSION__ и соседние значения подставляет Vite (define в astro.config.mjs),
 * они попадают в сборку как строковые литералы.
 */
declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;
declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;

interface Window {
  /** true после успешной инициализации клиентских модулей. */
  __polisReady?: boolean;
  /** buildId, который считает активным открытая вкладка. */
  __polisBuild?: string;
  /** buildId новой сборки, если она уже обнаружена. */
  __polisPendingBuild?: () => string;
}
