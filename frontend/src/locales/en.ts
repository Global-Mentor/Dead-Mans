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
      primary: 'Primary navigation',
      profile: 'Profile',
      administration: 'Administration',
      language: 'Interface language',
      logout: 'Log out',
      thumbnail: 'MENU',
      open: 'Open navigation',
      close: 'Close',
      availableSections: 'Available sections',
      roles: {
        admin: 'Administrator',
        moderator: 'Moderator',
        viewer: 'Participant',
      },
      items: {
        gameBoard: {
          label: 'Game',
          description: 'Current game board and card state.',
        },
        gameSetup: {
          label: 'Game setup',
          description: 'Draft table for configuring game cards.',
        },
        gameApplication: {
          label: 'Apply',
          description: 'Register a team while the game accepts applications.',
        },
        teamRegistrations: {
          label: 'Team registrations',
          description: 'Review and confirm teams for the ready game.',
        },
      },
    },
    gameBoard: {
      title: 'Game board',
      loading: 'Loading game board...',
      errorLoading: 'Failed to load game board.',
      empty: 'No current game board is available yet.',
      cellLabel: 'Cell',
      closedCellLabel: 'Hidden',
      costLabel: '{{cost}} pts',
      statusActive: 'Active',
      statusReady: 'Ready for registration',
      statusFinished: 'Finished',
      applicationButton: 'Team application',
      openConfirmTitle: 'Open card?',
      openConfirmDescription:
        'Are you sure you want to open this card (row {{row}}, column {{col}}, cost {{cost}})?',
      openCancel: 'Cancel',
      openConfirm: 'Open',
      openSuccess: 'Card opened.',
      openForbidden: 'Only administrators can open cards.',
      openNotFound: 'The selected card was not found.',
      openFailed: 'Failed to open card.',
      modifiers: {
        title: 'Game modifiers',
        description: 'Active game modifiers configured for this game.',
        loading: 'Loading modifier catalog...',
        error: 'Failed to load modifier catalog.',
        empty: 'No modifiers are enabled for this game.',
        activeBadge: 'Active',
        activate: 'Activate',
        errors: {
          forbidden: 'Only moderators and administrators can activate modifiers.',
          unknownCode: 'The selected modifier is no longer available.',
          gameNotActive: 'Modifiers can be activated only while the game is active.',
          notEnabled: 'This modifier is not enabled for the current game.',
          conflictActive: 'This modifier conflicts with another active modifier.',
          limitReached: 'Activation limit reached for this modifier.',
          generic: 'Failed to activate modifier.',
        },
      },
    },
    gameSetup: {
      title: 'Game setup',
      description:
        'Draft game for configuring the title, board layout, card fields, and images.',
      loading: 'Loading game setup...',
      errorLoading: 'Failed to load game setup.',
      empty: 'There is no draft game yet. Create a new one to start setup.',
      draftBadge: 'Draft',
      gameNameLabel: 'Game name',
      columnLabel: 'Column {{column}}',
      rowLabel: 'Row {{row}}',
      imagePlaceholder: 'No image yet',
      cellTitleLabel: 'Card name',
      cellMedia: {
        upload: 'Upload',
        replace: 'Replace',
        remove: 'Remove',
        uploading: 'Uploading...',
        removing: 'Removing...',
        uploadPrompt: 'Click or drag an image here',
        dropPrompt: 'Release to upload',
        errors: {
          invalidType: 'Only PNG, JPEG, WebP, and GIF images are allowed.',
          tooLarge: 'Image must be 5 MB or smaller.',
          saveRequired: 'Wait until the new card syncs to the server, then upload the image again.',
          invalidFile: 'This image file is not allowed.',
          notFound: 'The card or its image was not found. Refresh the page and try again.',
          uploadFailed: 'Failed to upload the image. Please try again.',
          deleteFailed: 'Failed to remove the image. Please try again.',
        },
      },
      cellPriceLabel: 'Price',
      save: 'Save changes',
      saving: 'Saving...',
      persistenceHint:
        'All admins share one draft in the database. Edit fields locally, then click Save. Row and column changes save when you confirm them in the layout dialog. Images upload to storage immediately. Other admins see updates in real time via SignalR.',
      modifiers: {
        title: 'Available modifiers for this game',
        description:
          'Choose which global modifiers can be activated during this game. The list is shared for all admins.',
        loading: 'Loading modifier catalog...',
        error: 'Failed to load modifier catalog.',
        empty: 'Modifier catalog is empty.',
      },
      questions: {
        title: 'Question management',
        description:
          'Temporary admin form to enable/disable questions and categories in the shared vector.',
        searchLabel: 'Search by question/answer',
        categoryAll: 'All categories',
        enableCategory: 'Enable category',
        disableCategory: 'Disable category',
        loading: 'Loading question catalog...',
        error: 'Failed to load question catalog.',
        empty: 'No questions match current filters.',
        meta: 'Category: {{category}} · Reward: {{reward}} · Asked: {{asked}} · Correct: {{correct}}',
      },
      reloadFromServer: 'Reload',
      remoteChangeNotice:
        'Another administrator changed this draft. Reload to discard your unsaved edits and show the server version.',
      draftRemovedNotice:
        'Another administrator reset the draft. Your unsaved edits were discarded.',
      sync: {
        pending: 'Pending sync',
        saving: 'Saving…',
        saved: 'Saved',
        error: 'Save failed',
        conflict: 'Reloaded after conflict',
      },
      invalidTitle: 'Game title must be between 1 and 200 characters.',
      invalidRowLabel: 'Each row label must be between 1 and 100 characters.',
      invalidColumnLabel: 'Each column label must be between 1 and 100 characters.',
      invalidCellTitle: 'Card titles must be at most 200 characters.',
      saveFailed: 'Failed to save game setup. Please try again.',
      resetFailed: 'Failed to reset game setup. Please try again.',
      boardTitle: 'Game board',
      boardDescription:
        'Edit row and column headers and card fields, then click Save. Layout changes save when you confirm them.',
      settingsSidebar: {
        overline: 'Setup',
        title: 'Game settings',
        description:
          'Game name and board size. Edit fields locally, then click Save. Images upload to storage immediately.',
        boardSizeLabel: 'Current size',
        boardSizeValue: '{{rows}} rows × {{columns}} columns',
        manageLayout: 'Rows and columns…',
        resetDraft: 'Reset draft',
      },
      resetDialog: {
        title: 'Reset draft',
        description:
          'This permanently deletes the current draft, including the game name, board, cards, and all uploaded images in storage. You will create a new draft afterwards.',
        cancel: 'Cancel',
        confirm: 'Reset draft',
        submitting: 'Resetting...',
      },
      layoutDialog: {
        title: 'Rows and columns',
        description:
          'Choose an action, target, and position. Changes save to the shared draft after you confirm.',
        actionLabel: 'Action',
        actionAdd: 'Add',
        actionRemove: 'Remove',
        axisLabel: 'Target',
        axisRow: 'Row',
        axisColumn: 'Column',
        positionLabel: 'Position',
        addRowAtStart: 'At the top (before row 1)',
        addRowAtEnd: 'At the bottom (after the last row)',
        addRowBefore: 'Before row {{position}}',
        addColumnAtStart: 'At the left (before column 1)',
        addColumnAtEnd: 'At the right (after the last column)',
        addColumnBefore: 'Before column {{position}}',
        removeRowTarget: 'Row {{position}} ({{label}})',
        removeColumnTarget: 'Column {{position}} ({{label}})',
        limitReached: 'This action is not available for the current board size.',
        review: 'Review',
        back: 'Back',
        cancel: 'Cancel',
        confirm: 'Confirm',
        confirmAddRow: 'Add a new row: {{target}}?',
        confirmAddColumn: 'Add a new column: {{target}}?',
        confirmRemoveRow:
          'Remove {{target}}? After the draft syncs, cards in this row and their uploaded images will be deleted from the server.',
        confirmRemoveColumn:
          'Remove {{target}}? After the draft syncs, cards in this column and their uploaded images will be deleted from the server.',
      },
      emptyPanel: {
        description: 'No draft game in the database yet. Use the dialog to create one.',
      },
      createDialog: {
        promptTitle: 'No draft game yet',
        promptDescription:
          'There is no game in setup right now. Start creation when you are ready — other admins will see the same draft.',
        startCreate: 'Create game',
        title: 'Name the new game',
        detailsDescription: 'Enter a title for the draft. It will be created with a starter board.',
        nameLabel: 'Game name',
        back: 'Back',
        confirm: 'Create',
        validationRequired: 'Enter a game title.',
        alreadyExists: 'A draft game already exists. Refresh the page.',
        error: 'Failed to create the draft game. Please try again.',
      },
    },
    gameApplication: {
      title: 'Team application',
      loading: 'Loading registration...',
      errorLoading: 'Failed to load registration.',
      notOpen: 'Registration is not open. Wait until an administrator publishes the game.',
      description: 'Create a team or join an open room while the game is in the ready state.',
      invitationsTitle: 'Pending invitations',
      invitationSlot: 'Slot {{slot}}',
      acceptInvitation: 'Accept',
      declineInvitation: 'Decline',
      myTeamTitle: 'Your team',
      leaveTeam: 'Leave team',
      createTeamTitle: 'Start a new team',
      createOpenTeam: 'Open room',
      createClosedTeam: 'Closed room (admin invites)',
      openTeamsTitle: 'Open teams',
      joinTeam: 'Join',
      teamSlot: 'Slot {{slot}} · {{count}} player(s)',
      backToBoard: 'Back to game board',
    },
    gameRegistration: {
      teamStatus: {
        forming: 'Forming',
        confirmed: 'Confirmed',
        disbanded: 'Disbanded',
      },
      errors: {
        notOpen: 'Registration is not open for a ready game.',
        noSlots: 'No team slots are available.',
        alreadyOnTeam: 'You are already on a team for this game.',
        teamNotFound: 'Team was not found.',
        teamNotJoinable: 'This team cannot be joined or confirmed in its current state.',
        notTeamMember: 'You are not on a team for this game.',
        invitationInvalid: 'Invitation was not found or is no longer pending.',
        userNotFound: 'The selected user was not found or is inactive.',
        slotNotFound: 'Participation slot was not found.',
        slotNotAvailable: 'Participation slot is not available.',
        pendingInvitation: 'This player already has a pending invitation for this game.',
        operationFailed: 'The registration operation could not be completed.',
        unauthorized: 'Sign in to continue.',
        forbidden: 'You do not have permission for this action.',
        generic: 'Something went wrong. Try again.',
      },
    },
    teamRegistrations: {
      title: 'Team registrations',
      loading: 'Loading teams...',
      errorLoading: 'Failed to load teams.',
      notOpen: 'Team registration is not open for a ready game yet.',
      description: 'Confirm teams that meet the player count rules for this game.',
      empty: 'No teams have registered yet.',
      slot: 'Slot',
      status: 'Status',
      players: 'Players',
      actions: 'Actions',
      confirm: 'Confirm',
      reject: 'Reject',
    },
    plannedFeatures: {
      roadmapTitle: 'Planned next (not wired yet)',
      roadmapHint:
        'Design notes from our discussions. Backend may already exist; UI and setup sync are still TODO.',
      formShellBadge: 'UI mockup',
      gameSetup: {
        form: {
          registrationTitle: 'Registration settings (draft)',
          registrationDescription:
            'Configure team slots, reserved seats, roster size, and open the ready phase from setup.',
          teamSlotCount: 'Number of team slots',
          minPlayers: 'Min players per team',
          maxPlayers: 'Max players per team',
          reservedSlots: 'Reserved slots',
          reservedSlotsPlaceholder: 'e.g. slot 6 — guest team (not accepting public sign-ups)',
          openRegistration: 'Open registration (draft → ready)',
          startGame: 'Start game (ready → active)',
        },
        roadmap: {
          slots: {
            title: 'Slot grid in setup',
            description:
              'Edit how many teams can join and mark each slot public or reserved. Sync with PUT /api/game/setup.',
          },
          teamLimits: {
            title: 'Min/max players per team',
            description: 'Save 1–3 (or other) limits on the draft game, not only hard-coded defaults.',
          },
          lifecycle: {
            title: 'Lifecycle from setup',
            description:
              'Buttons calling POST /api/game/lifecycle/open-registration, /start, /finish.',
          },
        },
      },
      gameBoard: {
        form: {
          lifecycleTitle: 'Game lifecycle (admin)',
          lifecycleDescription:
            'Move the current draft to ready, then start the live game, then finish.',
          openRegistration: 'Open registration',
          startGame: 'Start game',
          finishGame: 'Finish game',
        },
        roadmap: {
          lifecycle: {
            title: 'Admin lifecycle panel',
            description: 'Wire the three lifecycle endpoints with confirm dialogs and toasts.',
          },
          applicationGate: {
            title: 'Application button visibility',
            description:
              'Show “Team application” only while game status is ready (hide in draft/active/finished).',
          },
        },
      },
      gameApplication: {
        form: {
          slotsTitle: 'Slots overview',
          slotsDescription: 'Live map of public/reserved slots and occupancy from GET /api/game/registration.',
          slotLabel: 'Slot {{slot}}',
          slotFree: 'free',
          memberInviteTitle: 'Closed team invites',
          memberInviteDescription:
            'Invite teammates to a closed room; today only admin can invite via API.',
          inviteTeammate: 'Invite player',
          submitForReview: 'Submit team for review',
        },
        roadmap: {
          slotsOverview: {
            title: 'Slot board UI',
            description: 'Visual grid of all slots, reserved labels, pending invites, and confirmed teams.',
          },
          memberInvites: {
            title: 'Player-to-player invites',
            description:
              'Same accept/decline flow as admin invites, initiated by any team member for closed rooms.',
          },
          submitForReview: {
            title: 'Optional “ready for review” action',
            description:
              'Captain submits when roster is complete; admin list can filter awaiting review.',
          },
          statusUx: {
            title: 'Clearer team status',
            description:
              'Explain forming vs confirmed; block actions after admin confirm or when game leaves ready.',
          },
          closedWhenInactive: {
            title: 'Read-only when registration closed',
            description: 'After active/finished, show history only (no leave/join).',
          },
        },
      },
      teamRegistrations: {
        form: {
          inviteTitle: 'Invite player to slot / team',
          inviteDescription:
            'Search users, pick slot (public/reserved), chain invites for closed teams. Uses POST .../invitations.',
          slot: 'Slot',
          player: 'Player',
          targetTeam: 'Target team (optional)',
          sendInvite: 'Send invitation',
        },
        roadmap: {
          adminInvite: {
            title: 'Admin invite UI',
            description:
              'User picker + slot selector + invite chain (P1 accept → invite P2). API already exists.',
          },
          slotBoard: {
            title: 'Slot-centric admin view',
            description: 'See reserved vs public slots and pending invites per slot.',
          },
          moderationPolicy: {
            title: 'Manual accept mode toggle',
            description:
              'Today join-in-open-room is instant; optional queue for admin approve before confirmed.',
          },
          filters: {
            title: 'Filters and sorting',
            description: 'Filter forming/confirmed/disbanded; sort by slot or player count.',
          },
        },
      },
    },
    languageSwitcher: {
      ariaLabel: 'Interface language',
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
