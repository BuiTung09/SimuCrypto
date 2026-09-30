export interface NewsArticle {

  title: string;

  description: string;

  content: string | null;

  url: string;

  image?: string;

  publishedAt: string;

  source: {
    name: string;
  };

}

export interface GNewsResponse {
  totalArticles: number;
  articles: NewsArticle[];
}