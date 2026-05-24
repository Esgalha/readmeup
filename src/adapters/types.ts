export interface PlatformAdapter {
  isRepoPage(): boolean;
  onNavigate(callback: () => void): () => void;
  reorganize(): (() => void) | null;
}
