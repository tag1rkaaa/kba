import { useState, useEffect } from 'react';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export const useTableOfContents = (contentDependency: any) => {
  const [toc, setToc] = useState<TocItem[]>([]);

  useEffect(() => {
    // Небольшая задержка, чтобы Tiptap успел отрендерить HTML
    const timer = setTimeout(() => {
      // Ищем контейнер с текстом статьи (у тебя он имеет класс prose)
      const editorElement = document.querySelector('.prose');
      if (!editorElement) return;

      // Ищем все заголовки 2 и 3 уровня
      const headings = Array.from(editorElement.querySelectorAll('h2, h3'));
      
      const tocItems = headings.map((heading, index) => {
        // Если у заголовка нет id (а Tiptap по умолчанию их не ставит), генерируем свой
        if (!heading.id) {
          heading.id = `heading-${index}`;
        }
        return {
          id: heading.id,
          text: heading.textContent || '',
          level: parseInt(heading.tagName.replace('H', ''), 10),
        };
      });

      setToc(tocItems);
    }, 150);

    return () => clearTimeout(timer);
  }, [contentDependency]);

  return toc;
};