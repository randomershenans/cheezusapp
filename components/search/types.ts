export type SearchResult = {
  id: string;
  type: 'cheese' | 'pairing' | 'article' | 'recipe';
  title: string;
  description?: string;
  pairingType?: 'food' | 'drink';
  score: number;
  similarity?: number;
};

export type SearchMode = 'all' | 'cheese' | 'pairing';

export interface SearchBarProps {
  placeholder?: string;
  initialValue?: string;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
}
