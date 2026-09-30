import { Injectable } from '@nestjs/common';

@Injectable()
export class IntentService {

  detectIntent(message: string): string {

    const lower = message.toLowerCase();

    // PRICE INTENT
    if (lower.includes('giá') || lower.includes('price')) {
      return 'price';
    }

    // KNOWLEDGE INTENT
    if (
      lower.includes('blockchain') ||
      lower.includes('crypto') ||
      lower.includes('defi') ||
      lower.includes('là gì') ||
      lower.includes('hoạt động')
    ) {
      return 'finance';
    }

    return 'out_of_scope';
  }
}