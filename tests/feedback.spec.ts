import { test, expect } from '@playwright/test';

test('страница сервиса ведёт к публичной форме обратной связи и предупреждает о персональных данных', async ({ page }) => {
  await page.goto('/o-servise/');

  const feedbackLink = page.getByRole('link', { name: 'Сообщить о каталоге' });
  const href = await feedbackLink.getAttribute('href');
  expect(href).toBeTruthy();
  const draftUrl = new URL(href!);
  expect(draftUrl.origin).toBe('https://github.com');
  expect(draftUrl.pathname).toBe('/WHYbivatel/insurance/issues/new');
  expect(draftUrl.searchParams.get('title')).toContain('[Каталог]');
  expect(draftUrl.searchParams.get('body')).toContain('Официальный источник страховщика');
  expect(draftUrl.searchParams.get('body')).toContain('сообщение публичное');
  expect(draftUrl.searchParams.get('body')).toContain('не прикладывайте документы');
  await expect(feedbackLink).toHaveAttribute('target', '_blank');
  await expect(feedbackLink).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByText(/Для отправки нужен аккаунт GitHub/)).toBeVisible();
  await expect(page.getByText(/Не указывайте ИИН, паспортные данные/)).toBeVisible();

});
