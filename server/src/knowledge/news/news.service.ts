import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GNewsResponse, NewsArticle } from './news.types';

@Injectable()
export class NewsService {

  private readonly API =
    "https://gnews.io/api/v4/search?q=cryptocurrency&lang=en&max=20&apikey=2ea7decf19554e8a986b5fd622da827a";

  async fetchCryptoNews(): Promise<NewsArticle[]> {
    try {
      const res = await axios.get<GNewsResponse>(this.API, { timeout: 3000 });
      const articles = res.data.articles || [];

      // Fetch song song (parallel) kèm timeout nghiêm ngặt để tối ưu hóa tốc độ khởi động
      const promises = articles.slice(0, 10).map(async (article) => {
        const fullContent = await this.fetchFullArticle(article.url);
        return {
          ...article,
          content: fullContent ?? article.content ?? article.description ?? '',
        };
      });

      return await Promise.all(promises);
    } catch (e: any) {
      console.warn('[NEWS SERVICE] Failed to fetch news:', e.message);
      return [];
    }
  }

  async fetchFullArticle(url: string): Promise<string | null> {
    try {
      const res = await axios.get(url, { timeout: 1500 });
      const $ = cheerio.load(res.data);
      const text = $('p')
        .map((i, el) => $(el).text())
        .get()
        .join('\n');
      return text;
    } catch {
      return null;
    }
  }

}