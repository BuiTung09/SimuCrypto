export interface ChatStrategy {
  execute(message: string): Promise<string>;
}