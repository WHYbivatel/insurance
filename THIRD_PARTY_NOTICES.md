# Сторонние материалы

## Иконки Lucide

- Сайт: https://lucide.dev
- Репозиторий: https://github.com/lucide-icons/lucide
- Лицензия: ISC — https://lucide.dev/license
- Как используется: пакет `@lucide/astro`, иконки рендерятся в SVG на этапе сборки,
  на клиент не уходит JavaScript библиотеки иконок. Карта имён — `src/lib/icons.ts`.

Текст лицензии ISC:

```
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## Шрифт Manrope

- Сайт: https://www.gstatic.com  (пакет `@fontsource-variable/manrope`)
- Лицензия: SIL Open Font License 1.1 — https://openfontlicense.org
- Как используется: вариативный шрифт подключается локально из npm-пакета,
  внешние CDN не используются.

## Логотипы страховых компаний

Логотипы принадлежат соответствующим страховым компаниям и используются для обозначения
продуктов этих компаний в каталоге. Источники, даты получения и ограничения перечислены
в `docs/logos.md`.

## Данные о продуктах

Сведения о продуктах, покрытии и способах оформления взяты с официальных сайтов
страховщиков; у каждого предложения в `src/data/products.*.ts` указаны `source.url`
и дата проверки `checkedAt`.
