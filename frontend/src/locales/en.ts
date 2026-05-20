const en = {
  translation: {
    appTitle: "Dead Man's Game",
    auth: {
      title: "Dead Man's Game",
      subtitle: 'Sign in with Twitch to open the game board.',
      description: 'After sign-in the panel loads the current game board from the database.',
      button: 'Sign in with Twitch',
      processing: 'Finishing Twitch sign-in...',
      checkingSession: 'Checking your session...',
      callbackFailedTitle: 'Unable to complete sign-in',
      sessionRestoreFailed:
        'Twitch sign-in succeeded, but the app session could not be restored. Please try again.',
      backToLogin: 'Back to sign-in',
      callbackReasons: {
        access_denied: 'You cancelled the Twitch sign-in flow.',
        account_inactive: 'Your account is disabled. Contact an administrator to restore access.',
        missing_code: 'Twitch did not return an authorization code.',
        missing_state: 'Twitch did not return the security state parameter.',
        state_cookie_missing: 'The local sign-in session expired. Please start again.',
        state_mismatch: 'Security validation failed during sign-in. Please try again.',
        authentication_failed: 'The server could not complete authentication. Please try again later.',
        unknown: 'An unknown error occurred during sign-in.',
      },
    },
    navigation: {
      title: 'Navigation',
      thumbnail: 'MENU',
      open: 'Open navigation',
      close: 'Close',
      availableSections: 'Available sections',
      roles: {
        admin: 'Administrator',
        moderator: 'Moderator',
        viewer: 'Viewer',
      },
      items: {
        gameBoard: {
          label: 'Game board',
          description: 'Current game board and card state.',
        },
        gameSetup: {
          label: 'Game setup',
          description: 'Draft table for configuring game cards.',
        },
      },
    },
    gameBoard: {
      title: 'Game board',
      loading: 'Loading game board...',
      errorLoading: 'Failed to load game board.',
      empty: 'No active or finished game in the database yet.',
      cellLabel: 'Cell',
      closedCellLabel: 'Hidden',
      costLabel: '{{cost}} pts',
      statusActive: 'Active',
      statusFinished: 'Finished',
      openConfirmTitle: 'Open card?',
      openConfirmDescription:
        'Are you sure you want to open this card (row {{row}}, column {{col}}, cost {{cost}})?',
      openCancel: 'Cancel',
      openConfirm: 'Open',
      openSuccess: 'Card opened.',
      openForbidden: 'Only administrators can open cards.',
      openNotFound: 'The selected card was not found.',
      openFailed: 'Failed to open card.',
    },
    gameSetup: {
      title: 'Game setup',
      description:
        'Draft game for configuring the title, columns, prices, and future card images.',
      loading: 'Loading game setup...',
      errorLoading: 'Failed to load game setup.',
      empty: 'There is no draft game yet. Create a new one to start setup.',
      draftBadge: 'Draft',
      gameNameLabel: 'Game name',
      columnLabel: 'Column {{column}}',
      imagePlaceholder: 'Image upload placeholder',
      cellTitleLabel: 'Card name',
      cellPriceLabel: 'Price',
      createDialog: {
        title: 'Create a new game',
        description:
          'There is no game in setup right now. Enter a title to create a draft with a starter board.',
        nameLabel: 'Game name',
        confirm: 'Create',
        validationRequired: 'Enter a game title.',
        alreadyExists: 'A draft game already exists. Refresh the page.',
        error: 'Failed to create the draft game. Please try again.',
      },
    },
    languageSwitcher: {
      languages: {
        ru: 'RU',
        en: 'EN',
        uk: 'UA',
        pl: 'PL',
      },
    },
  },
}

export default en
