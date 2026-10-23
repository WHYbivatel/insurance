import { defineConfig } from 'astro/config';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * Идентификатор сборки.
 *
 * Версия продукта берётся из package.json и меняется вручную при релизе.
 * buildId считается из версии, коммита и времени сборки в UTC, поэтому
 * автоматически различает сборки и не требует правок руками.
 */
function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function readCommit() {
  // В CI коммит приходит переменной окружения, локально — из git.
  const fromEnv = process.env.GITHUB_SHA ?? process.env.CI_COMMIT_SHA ?? '';
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'local';
  }
}

const version = readVersion();
const commit = readCommit();
const builtAt = new Date().toISOString();
const buildId = createHash('sha256')
  .update(`${version}|${commit}|${builtAt}`)
  .digest('hex')
  .slice(0, 12);

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://polis.kz',
  output: 'static',
  compressHTML: true,
  build: {
    // Хешированные имена ресурсов: неизменяемые файлы можно кешировать надолго.
    assets: '_astro',
    inlineStylesheets: 'auto',
  },
  devToolbar: {
    enabled: false,
  },
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __BUILD_ID__: JSON.stringify(buildId),
      __BUILD_COMMIT__: JSON.stringify(commit),
      __BUILD_TIME__: JSON.stringify(builtAt),
    },
  },
});
