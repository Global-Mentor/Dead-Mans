export const queryKeys = {
  gameBoard: {
    all: ['gameBoard'] as const,
    currentSnapshot: () => ['gameBoard', 'currentSnapshot'] as const,
  },
  gameSetup: {
    all: ['gameSetup'] as const,
    draftSnapshot: () => ['gameSetup', 'draftSnapshot'] as const,
  },
  gameRegistration: {
    all: ['gameRegistration'] as const,
    snapshot: () => ['gameRegistration', 'snapshot'] as const,
    adminTeams: () => ['gameRegistration', 'adminTeams'] as const,
  },
  gameModifiers: {
    all: ['gameModifiers'] as const,
    catalog: () => ['gameModifiers', 'catalog'] as const,
  },
  gameQuestions: {
    all: ['gameQuestions'] as const,
    catalog: (filters?: { vectorCode?: string; category?: string; search?: string }) =>
      ['gameQuestions', 'catalog', filters ?? {}] as const,
  },
}
