export const pt = {
  nav: {
    projects: 'Projetos',
    community: 'Comunidade',
    settings: 'Configurações',
    reportBug: 'Reportar problema',
  },

  settings: {
    title: 'Configurações',
    subtitle: 'Preferências do planejador',

    appearance: {
      title: 'Aparência',
      description: 'Tema visual do planejador',
      dark: 'Escuro',
      light: 'Claro',
      active: 'Ativo',
      comingSoon: 'Em breve',
    },

    shortcuts: {
      title: 'Atalhos de teclado',
      description: 'Comandos rápidos no editor de fábricas',
      show: 'Ver todos os atalhos',
      hide: 'Ocultar atalhos',
      actions: {
        addRecipe: 'Adicionar receita no canvas',
        undo: 'Desfazer',
        redo: 'Refazer',
        copy: 'Copiar nó selecionado',
        paste: 'Colar',
        delete: 'Deletar selecionado',
        escape: 'Voltar para seleção',
        text: 'Ferramenta texto',
        frame: 'Ferramenta frame',
      },
    },

    data: {
      title: 'Dados',
      description: 'Exporte seus projetos em formato JSON',
      cloudProjects: 'Projetos na nuvem',
      cloudProjectsDescription: 'Todos os seus projetos salvos na conta',
      export: 'Exportar',
      exporting: 'Exportando...',
      loginToExport: 'Faça login para exportar projetos da nuvem.',
    },

    language: {
      title: 'Idioma',
      description: 'Idioma de exibição da interface',
    },

    about: {
      title: 'Sobre',
      description: 'Satisfactory Factory Planner',
      version: 'Versão',
      game: 'Jogo',
      license: 'Licença',
    },
  },
} as const
