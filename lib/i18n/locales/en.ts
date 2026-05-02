export const en = {
  nav: {
    projects: 'Projects',
    community: 'Community',
    settings: 'Settings',
    reportBug: 'Report a problem',
  },

  settings: {
    title: 'Settings',
    subtitle: 'Planner preferences',

    appearance: {
      title: 'Appearance',
      description: 'Visual theme of the planner',
      dark: 'Dark',
      light: 'Light',
      active: 'Active',
      comingSoon: 'Coming soon',
    },

    shortcuts: {
      title: 'Keyboard shortcuts',
      description: 'Quick commands in the factory editor',
      show: 'Show all shortcuts',
      hide: 'Hide shortcuts',
      actions: {
        addRecipe: 'Add recipe to canvas',
        undo: 'Undo',
        redo: 'Redo',
        copy: 'Copy selected node',
        paste: 'Paste',
        delete: 'Delete selected',
        escape: 'Back to selection',
        text: 'Text tool',
        frame: 'Frame tool',
      },
    },

    data: {
      title: 'Data',
      description: 'Export your projects as JSON',
      cloudProjects: 'Cloud projects',
      cloudProjectsDescription: 'All your projects saved in your account',
      export: 'Export',
      exporting: 'Exporting...',
      loginToExport: 'Log in to export cloud projects.',
    },

    language: {
      title: 'Language',
      description: 'Interface display language',
    },

    about: {
      title: 'About',
      description: 'Satisfactory Factory Planner',
      version: 'Version',
      game: 'Game',
      license: 'License',
    },
  },
} as const
