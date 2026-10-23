/**
 * Сведения о сборке.
 *
 * Значения подставляет Vite на этапе сборки (см. define в astro.config.mjs),
 * поэтому в клиентском бандле нет ни чтения файлов, ни git.
 */

// Объявления этих констант — в src/globals.d.ts.

export interface BuildInfo {
  /** Версия продукта по SemVer из package.json. */
  version: string;
  /** Уникальный идентификатор сборки. */
  buildId: string;
  /** Короткий SHA коммита или 'local'. */
  commit: string;
  /** Время сборки в UTC, ISO 8601. */
  builtAt: string;
}

export const buildInfo: BuildInfo = {
  version: __APP_VERSION__,
  buildId: __BUILD_ID__,
  commit: __BUILD_COMMIT__,
  builtAt: __BUILD_TIME__,
};
