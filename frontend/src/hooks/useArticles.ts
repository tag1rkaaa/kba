import { useInfiniteQuery } from '@tanstack/react-query';
import { articlesApi } from '../api/articles';

interface UseArticlesParams {
  source?: string;
  limit?: number; // Оставляем для проверки пагинации на фронте
}

export const useArticles = ({ source, limit = 20 }: UseArticlesParams = {}) => {
  return useInfiniteQuery({
    queryKey: ['articles', { source, limit }],
    queryFn: async ({ pageParam = 1 }) => {
      // Убрали limit из вызова, так как твой API его не принимает
      const response = await articlesApi.list({
        source: source || undefined,
        page: pageParam as number,
      });
      // Возвращаем сам response, так как это уже массив Article[]
      return response; 
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Поскольку lastPage — это массив, проверяем его длину. 
      // Если пришло столько же элементов, сколько мы ожидали (limit), значит есть следующая страница.
      if (Array.isArray(lastPage) && lastPage.length === limit) {
        return allPages.length + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000, // Кэшируем на 5 минут
  });
};