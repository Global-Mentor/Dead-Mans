export const queryKeys = {
  gameBoard: {
    all: ['gameBoard'] as const,
    currentSnapshot: () => ['gameBoard', 'currentSnapshot'] as const,
  },
  gameSetup: {
    all: ['gameSetup'] as const,
    draftSnapshot: () => ['gameSetup', 'draftSnapshot'] as const,
  },
}
