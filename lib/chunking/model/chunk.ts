interface BaseChunkMetadata {
  qualifiedName?: string;
  parentQualifiedName?: string;
}

interface Chunk<TMetadata extends BaseChunkMetadata = BaseChunkMetadata> {
  id: string; // Unique identifier for the chunk , may be useful for debugging or tracking purposes
  text: string;
  repoId: string;
  repoName: string;
  fileRelativePath: string;
  fileName: string;
  language: string;
  ownerNodeId: string;
  ownerKind: string;
  startLine: number;
  endLine: number;
}

export type { Chunk };
