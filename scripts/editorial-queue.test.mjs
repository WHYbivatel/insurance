import test from 'node:test';
import assert from 'node:assert/strict';
import queue from './editorial-queue.cjs';
const { buildEditorialQueue } = queue;

test('приоритизирует просроченную проверку, скоро наступающий срок и неизвестные поля', () => {
  const offers = [
    { id: 'due', slug: 'due', title: 'Просрочено', categoryId: 'kasko', status: 'published', checkedAt: '2026-01-01', source: { label: 'Official', url: 'https://example.kz' }, editorial: { nextReviewAt: '2026-10-01' }, conditions: { kasko: { deductible: { status: 'unknown' } } } },
    { id: 'soon', slug: 'soon', title: 'Скоро', categoryId: 'travel', status: 'published', checkedAt: '2026-10-20', source: { label: 'Official', url: 'https://example.kz' }, editorial: { nextReviewAt: '2026-11-20' } },
    { id: 'draft', slug: 'draft', title: 'Черновик', categoryId: 'kasko', status: 'draft', editorial: { nextReviewAt: '2026-10-01' } },
  ];
  const queue = buildEditorialQueue(offers, '2026-11-05');
  assert.deepEqual(queue.map(({ id }) => id), ['due', 'soon']);
  assert.equal(queue[0].daysUntilReview, -35);
  assert.deepEqual(queue[0].unknownConditions, ['kasko.deductible']);
  assert.equal(queue[1].daysUntilReview, 15);
  assert.equal(queue[0].technicalLinkStatus, 'not checked by this report');
  assert.equal(queue[0].contentStatus, 'requires manual comparison with the current official source');
});

test('не обновляет даты автоматически и включает записи с неизвестным сроком или внутренней заметкой', () => {
  const queue = buildEditorialQueue([{
    id: 'missing', slug: 'missing', title: 'Без срока', categoryId: 'other', status: 'published', checkedAt: '2026-01-01',
    editorial: { nextReviewAt: '', notes: { internal: 'Проверить первоисточник' } },
  }], '2026-11-05');
  assert.equal(queue.length, 1);
  assert.equal(queue[0].nextReviewAt, '');
  assert.ok(queue[0].reasons.some((reason) => reason.includes('Нет корректного срока')));
  assert.ok(queue[0].reasons.some((reason) => reason.includes('внутренняя редакционная заметка')));
});
