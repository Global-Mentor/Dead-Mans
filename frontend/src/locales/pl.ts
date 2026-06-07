const pl = {
  translation: {
    appTitle: 'Dead Man’s Game',
    auth: {
      title: 'Dead Man’s Game',
      subtitle: 'Zaloguj się przez Twitch, aby otworzyć planszę gry.',
      description: 'Po zalogowaniu panel ładuje aktualną planszę gry z bazy danych.',
      button: 'Zaloguj się przez Twitch',
      processing: 'Kończenie logowania przez Twitch...',
      checkingSession: 'Sprawdzanie sesji...',
      callbackFailedTitle: 'Nie udało się zakończyć logowania',
      sessionRestoreFailed:
        'Logowanie przez Twitch się powiodło, ale nie udało się przywrócić sesji aplikacji. Spróbuj ponownie.',
      backToLogin: 'Wróć do logowania',
      callbackReasons: {
        access_denied: 'Anulowano logowanie przez Twitch.',
        account_inactive: 'Twoje konto jest wyłączone. Skontaktuj się z administratorem, aby przywrócić dostęp.',
        missing_code: 'Twitch nie zwrócił kodu autoryzacyjnego.',
        missing_state: 'Twitch nie zwrócił parametru bezpieczeństwa state.',
        state_cookie_missing: 'Lokalna sesja logowania wygasła. Rozpocznij ponownie.',
        state_mismatch: 'Weryfikacja bezpieczeństwa logowania nie powiodła się. Spróbuj ponownie.',
        authentication_failed:
          'Serwer nie mógł dokończyć uwierzytelnienia. Spróbuj ponownie później.',
        unknown: 'Wystąpił nieznany błąd podczas logowania.',
      },
    },
    navigation: {
      title: 'Nawigacja',
      thumbnail: 'MENU',
      open: 'Otwórz nawigację',
      close: 'Zamknij',
      availableSections: 'Dostępne sekcje',
      roles: {
        admin: 'Administrator',
        moderator: 'Moderator',
        viewer: 'Widz',
      },
      items: {
        gameBoard: {
          label: 'Plansza gry',
          description: 'Aktualna plansza gry i stan kart.',
        },
        gameSetup: {
          label: 'Konfiguracja gry',
          description: 'Robocza tabela do konfiguracji kart gry.',
        },
        gameApplication: {
          label: 'Zgłoszenie do gry',
          description: 'Rejestracja drużyny podczas przyjmowania zgłoszeń.',
        },
        teamRegistrations: {
          label: 'Zgłoszenia drużyn',
          description: 'Przegląd i zatwierdzanie drużyn.',
        },
      },
    },
    gameBoard: {
      title: 'Plansza gry',
      loading: 'Ładowanie planszy gry...',
      errorLoading: 'Nie udało się załadować planszy gry.',
      empty: 'W bazie nie ma jeszcze aktywnej ani zakończonej gry.',
      cellLabel: 'Pole',
      closedCellLabel: 'Ukryte',
      costLabel: '{{cost}} pkt',
      statusActive: 'Aktywna',
      statusReady: 'Przyjmowanie zgłoszeń',
      statusFinished: 'Zakończona',
      applicationButton: 'Zgłoszenie do gry',
      openConfirmTitle: 'Otworzyć kartę?',
      openConfirmDescription:
        'Czy na pewno chcesz otworzyć tę kartę (wiersz {{row}}, kolumna {{col}}, koszt {{cost}})?',
      openCancel: 'Anuluj',
      openConfirm: 'Otwórz',
      openSuccess: 'Karta została otwarta.',
      openForbidden: 'Tylko administrator może otwierać karty.',
      openNotFound: 'Wybrana karta nie została znaleziona.',
      openFailed: 'Nie udało się otworzyć karty.',
      modifiers: {
        title: 'Modyfikatory gry',
        description: 'Aktywne modyfikatory włączone dla bieżącej gry.',
        loading: 'Ładowanie katalogu modyfikatorów...',
        error: 'Nie udało się załadować katalogu modyfikatorów.',
        empty: 'Dla tej gry nie włączono modyfikatorów.',
        activeBadge: 'Aktywny',
        activate: 'Aktywuj',
        errors: {
          forbidden: 'Modyfikatory mogą aktywować tylko moderatorzy i administratorzy.',
          unknownCode: 'Wybrany modyfikator nie jest już dostępny.',
          gameNotActive: 'Modyfikatory można aktywować tylko podczas aktywnej gry.',
          notEnabled: 'Ten modyfikator nie jest włączony dla bieżącej gry.',
          conflictActive: 'Ten modyfikator koliduje z już aktywnym modyfikatorem.',
          limitReached: 'Osiągnięto limit aktywacji dla tego modyfikatora.',
          generic: 'Nie udało się aktywować modyfikatora.',
        },
      },
    },
    gameSetup: {
      title: 'Konfiguracja gry',
      description:
        'Szkic gry do konfiguracji nazwy, układu planszy, pól kart i obrazów.',
      loading: 'Ładowanie konfiguracji gry...',
      errorLoading: 'Nie udało się załadować konfiguracji gry.',
      empty: 'Nie ma jeszcze gry w statusie szkicu. Utwórz nową, aby rozpocząć konfigurację.',
      draftBadge: 'Szkic',
      gameNameLabel: 'Nazwa gry',
      columnLabel: 'Kolumna {{column}}',
      rowLabel: 'Wiersz {{row}}',
      imagePlaceholder: 'Brak obrazu',
      cellTitleLabel: 'Nazwa karty',
      cellMedia: {
        upload: 'Prześlij',
        replace: 'Zamień',
        remove: 'Usuń',
        uploading: 'Przesyłanie...',
        removing: 'Usuwanie...',
        uploadPrompt: 'Kliknij lub przeciągnij obraz',
        dropPrompt: 'Puść, aby przesłać',
        errors: {
          invalidType: 'Dozwolone są tylko obrazy PNG, JPEG, WebP i GIF.',
          tooLarge: 'Obraz nie może być większy niż 5 MB.',
          saveRequired:
            'Poczekaj, aż nowa karta zsynchronizuje się z serwerem, i prześlij obraz ponownie.',
          invalidFile: 'Ten plik obrazu nie jest obsługiwany.',
          notFound: 'Nie znaleziono karty lub jej obrazu. Odśwież stronę i spróbuj ponownie.',
          uploadFailed: 'Nie udało się przesłać obrazu. Spróbuj ponownie.',
          deleteFailed: 'Nie udało się usunąć obrazu. Spróbuj ponownie.',
        },
      },
      cellPriceLabel: 'Cena',
      save: 'Zapisz zmiany',
      saving: 'Zapisywanie...',
      persistenceHint:
        'Wszyscy administratorzy korzystają z jednego szkicu w bazie. Edytuj pola lokalnie i kliknij Zapisz. Wiersze i kolumny zapisują się po potwierdzeniu w oknie układu. Obrazy trafiają od razu do storage. Zmiany innych adminów przychodzą na żywo przez SignalR.',
      modifiers: {
        title: 'Dostępne modyfikatory dla tej gry',
        description:
          'Wybierz, które globalne modyfikatory będzie można aktywować podczas tej gry. Lista jest wspólna dla wszystkich administratorów.',
        loading: 'Ładowanie katalogu modyfikatorów...',
        error: 'Nie udało się załadować katalogu modyfikatorów.',
        empty: 'Katalog modyfikatorów jest pusty.',
      },
      reloadFromServer: 'Odśwież',
      remoteChangeNotice:
        'Inny administrator zmienił szkic. Kliknij Odśwież, aby odrzucić niezapisane zmiany i pokazać wersję z serwera.',
      draftRemovedNotice:
        'Inny administrator zresetował szkic. Twoje niezapisane zmiany zostały odrzucone.',
      sync: {
        pending: 'Oczekuje synchronizacji',
        saving: 'Zapisywanie…',
        saved: 'Zapisano',
        error: 'Błąd zapisu',
        conflict: 'Odświeżono po konflikcie',
      },
      invalidTitle: 'Nazwa gry musi mieć od 1 do 200 znaków.',
      invalidRowLabel: 'Każda etykieta wiersza musi mieć od 1 do 100 znaków.',
      invalidColumnLabel: 'Każda etykieta kolumny musi mieć od 1 do 100 znaków.',
      invalidCellTitle: 'Nazwa karty może mieć maksymalnie 200 znaków.',
      saveFailed: 'Nie udało się zapisać konfiguracji gry. Spróbuj ponownie.',
      resetFailed: 'Nie udało się zresetować konfiguracji gry. Spróbuj ponownie.',
      boardTitle: 'Plansza gry',
      boardDescription:
        'Edytuj etykiety i pola kart, potem kliknij Zapisz. Zmiany układu zapisują się po potwierdzeniu w oknie dialogowym.',
      settingsSidebar: {
        overline: 'Konfiguracja',
        title: 'Ustawienia gry',
        description:
          'Nazwa i rozmiar planszy. Edytuj pola lokalnie, potem kliknij Zapisz. Obrazy — od razu w storage.',
        boardSizeLabel: 'Aktualny rozmiar',
        boardSizeValue: '{{rows}} wierszy × {{columns}} kolumn',
        manageLayout: 'Wiersze i kolumny…',
        resetDraft: 'Zresetuj szkic',
      },
      resetDialog: {
        title: 'Zresetuj szkic',
        description:
          'To trwale usuwa bieżący szkic, w tym nazwę, planszę, karty i wszystkie przesłane obrazy w storage. Następnie trzeba będzie utworzyć nowy szkic.',
        cancel: 'Anuluj',
        confirm: 'Zresetuj szkic',
        submitting: 'Resetowanie...',
      },
      layoutDialog: {
        title: 'Wiersze i kolumny',
        description:
          'Wybierz czynność, obiekt i pozycję. Po potwierdzeniu zmiany zapisują się do wspólnego szkicu.',
        actionLabel: 'Czynność',
        actionAdd: 'Dodaj',
        actionRemove: 'Usuń',
        axisLabel: 'Obiekt',
        axisRow: 'Wiersz',
        axisColumn: 'Kolumna',
        positionLabel: 'Pozycja',
        addRowAtStart: 'Na początku (przed wierszem 1)',
        addRowAtEnd: 'Na końcu (po ostatnim wierszu)',
        addRowBefore: 'Przed wierszem {{position}}',
        addColumnAtStart: 'Z lewej (przed kolumną 1)',
        addColumnAtEnd: 'Z prawej (po ostatniej kolumnie)',
        addColumnBefore: 'Przed kolumną {{position}}',
        removeRowTarget: 'Wiersz {{position}} ({{label}})',
        removeColumnTarget: 'Kolumna {{position}} ({{label}})',
        limitReached: 'Ta czynność jest niedostępna dla bieżącego rozmiaru planszy.',
        review: 'Sprawdź',
        back: 'Wstecz',
        cancel: 'Anuluj',
        confirm: 'Potwierdź',
        confirmAddRow: 'Dodać nowy wiersz: {{target}}?',
        confirmAddColumn: 'Dodać nową kolumnę: {{target}}?',
        confirmRemoveRow:
          'Usunąć {{target}}? Po synchronizacji szkicu karty w tym wierszu i ich obrazy zostaną usunięte z serwera.',
        confirmRemoveColumn:
          'Usunąć {{target}}? Po synchronizacji szkicu karty w tej kolumnie i ich obrazy zostaną usunięte z serwera.',
      },
      emptyPanel: {
        description: 'W bazie nie ma jeszcze szkicu. Utwórz grę w oknie dialogowym.',
      },
      createDialog: {
        promptTitle: 'Brak szkicu gry',
        promptDescription:
          'Obecnie nie ma gry w konfiguracji. Rozpocznij tworzenie, gdy będziesz gotowy — wszyscy administratorzy zobaczą ten sam szkic.',
        startCreate: 'Utwórz grę',
        title: 'Nazwa nowej gry',
        detailsDescription:
          'Wpisz nazwę szkicu. Zostanie utworzona tabela startowa.',
        nameLabel: 'Nazwa gry',
        back: 'Wstecz',
        confirm: 'Utwórz',
        validationRequired: 'Wpisz nazwę gry.',
        alreadyExists: 'Szkic gry już istnieje. Odśwież stronę.',
        error: 'Nie udało się utworzyć szkicu gry. Spróbuj ponownie.',
      },
    },
    gameApplication: {
      title: 'Zgłoszenie do gry',
      loading: 'Ładowanie rejestracji...',
      errorLoading: 'Nie udało się załadować rejestracji.',
      notOpen: 'Rejestracja jest zamknięta.',
      description: 'Utwórz drużynę lub dołącz do otwartego pokoju.',
      invitationsTitle: 'Zaproszenia',
      invitationSlot: 'Slot {{slot}}',
      acceptInvitation: 'Akceptuj',
      declineInvitation: 'Odrzuć',
      myTeamTitle: 'Twoja drużyna',
      leaveTeam: 'Opuść drużynę',
      createTeamTitle: 'Utwórz drużynę',
      createOpenTeam: 'Otwarty pokój',
      createClosedTeam: 'Zamknięty pokój',
      openTeamsTitle: 'Otwarte drużyny',
      joinTeam: 'Dołącz',
      teamSlot: 'Slot {{slot}} · graczy: {{count}}',
      backToBoard: 'Wróć do planszy',
    },
    gameRegistration: {
      teamStatus: {
        forming: 'Formowanie',
        confirmed: 'Potwierdzona',
        disbanded: 'Rozwiązana',
      },
      errors: {
        notOpen: 'Rejestracja dla gry w statusie ready nie jest otwarta.',
        noSlots: 'Brak wolnych slotów drużynowych.',
        alreadyOnTeam: 'Już jesteś w drużynie w tej grze.',
        teamNotFound: 'Nie znaleziono drużyny.',
        teamNotJoinable: 'Do tej drużyny nie można dołączyć ani jej potwierdzić w tym stanie.',
        notTeamMember: 'Nie jesteś w drużynie w tej grze.',
        invitationInvalid: 'Zaproszenie nie zostało znalezione lub nie jest już aktywne.',
        userNotFound: 'Wybrany użytkownik nie został znaleziony lub jest nieaktywny.',
        slotNotFound: 'Nie znaleziono slotu uczestnictwa.',
        slotNotAvailable: 'Slot uczestnictwa jest niedostępny.',
        pendingInvitation: 'Ten gracz ma już oczekujące zaproszenie w tej grze.',
        operationFailed: 'Nie udało się wykonać operacji rejestracji.',
        unauthorized: 'Zaloguj się, aby kontynuować.',
        forbidden: 'Brak uprawnień do tej operacji.',
        generic: 'Coś poszło nie tak. Spróbuj ponownie.',
      },
    },
    teamRegistrations: {
      title: 'Zgłoszenia drużyn',
      loading: 'Ładowanie drużyn...',
      errorLoading: 'Nie udało się załadować drużyn.',
      notOpen: 'Rejestracja drużyn dla gry w statusie ready nie jest jeszcze otwarta.',
      description: 'Zatwierdź drużyny zgodnie z zasadami składu.',
      empty: 'Brak zarejestrowanych drużyn.',
      slot: 'Slot',
      status: 'Status',
      players: 'Gracze',
      actions: 'Akcje',
      confirm: 'Zatwierdź',
      reject: 'Odrzuć',
    },
    plannedFeatures: {
      roadmapTitle: 'Zaplanowane (jeszcze nie podłączone)',
      roadmapHint:
        'Notatki projektowe. Część API na backendzie już istnieje; UI i synchronizacja w setup — później.',
      formShellBadge: 'Makieta UI',
      gameSetup: {
        form: {
          registrationTitle: 'Ustawienia rejestracji (szkic)',
          registrationDescription:
            'Sloty drużyn, miejsca zarezerwowane, rozmiar składu i przejście draft → ready z setup.',
          teamSlotCount: 'Liczba slotów drużynowych',
          minPlayers: 'Min. graczy w drużynie',
          maxPlayers: 'Maks. graczy w drużynie',
          reservedSlots: 'Zarezerwowane sloty',
          reservedSlotsPlaceholder: 'np. slot 6 — drużyna gościnna (bez publicznych zgłoszeń)',
          openRegistration: 'Otwórz rejestrację (draft → ready)',
          startGame: 'Rozpocznij grę (ready → active)',
        },
        roadmap: {
          slots: {
            title: 'Siatka slotów w setup',
            description: 'Liczba drużyn i public/reserved na slot. Sync z PUT /api/game/setup.',
          },
          teamLimits: {
            title: 'Min/maks graczy w drużynie',
            description: 'Zapis limitów 1–3 (lub innych) w szkicu, nie tylko domyślne wartości.',
          },
          lifecycle: {
            title: 'Cykl życia z setup',
            description:
              'Przyciski POST /api/game/lifecycle/open-registration, /start, /finish.',
          },
        },
      },
      gameBoard: {
        form: {
          lifecycleTitle: 'Cykl życia gry (admin)',
          lifecycleDescription: 'Przejścia draft → ready → active → finished.',
          openRegistration: 'Otwórz rejestrację',
          startGame: 'Rozpocznij grę',
          finishGame: 'Zakończ grę',
        },
        roadmap: {
          lifecycle: {
            title: 'Panel lifecycle dla admina',
            description: 'Podłączyć trzy endpointy z potwierdzeniem i powiadomieniami.',
          },
          applicationGate: {
            title: 'Widoczność przycisku zgłoszenia',
            description:
              'Pokazywać „Zgłoszenie do gry” tylko w ready; ukrywać w draft/active/finished.',
          },
        },
      },
      gameApplication: {
        form: {
          slotsTitle: 'Przegląd slotów',
          slotsDescription:
            'Mapa public/reserved i zajętości z GET /api/game/registration.',
          slotLabel: 'Slot {{slot}}',
          slotFree: 'wolny',
          memberInviteTitle: 'Zaproszenia do zamkniętej drużyny',
          memberInviteDescription:
            'Zapraszanie drużyny; dziś tylko admin przez API.',
          inviteTeammate: 'Zaproś gracza',
          submitForReview: 'Wyślij do weryfikacji',
        },
        roadmap: {
          slotsOverview: {
            title: 'UI tablicy slotów',
            description:
              'Siatka slotów, etykiety reserved, pending zaproszenia i potwierdzone drużyny.',
          },
          memberInvites: {
            title: 'Zaproszenia gracz–gracz',
            description:
              'Ten sam flow accept/decline, inicjowany przez członka zamkniętej drużyny.',
          },
          submitForReview: {
            title: 'Opcjonalne „gotowi do weryfikacji”',
            description: 'Wysyłka składu do admina; filtr na liście drużyn.',
          },
          statusUx: {
            title: 'Jaśniejszy status drużyny',
            description:
              'forming vs confirmed; blokada akcji po potwierdzeniu lub poza ready.',
          },
          closedWhenInactive: {
            title: 'Tylko odczyt po zamknięciu rejestracji',
            description: 'Po active/finished — historia bez join/leave.',
          },
        },
      },
      teamRegistrations: {
        form: {
          inviteTitle: 'Zaproś gracza do slotu / drużyny',
          inviteDescription:
            'Wyszukiwanie użytkownika, slot, łańcuch dla closed. POST .../invitations.',
          slot: 'Slot',
          player: 'Gracz',
          targetTeam: 'Drużyna (opcjonalnie)',
          sendInvite: 'Wyślij zaproszenie',
        },
        roadmap: {
          adminInvite: {
            title: 'UI zaproszeń admina',
            description:
              'Wybór gracza + slot + łańcuch (P1 accept → zaproszenie P2). API już jest.',
          },
          slotBoard: {
            title: 'Widok admina po slotach',
            description: 'Reserved vs public i pending zaproszenia na slot.',
          },
          moderationPolicy: {
            title: 'Tryb ręcznej akceptacji',
            description:
              'Dziś join w otwartym pokoju jest natychmiastowy; opcjonalna kolejka do confirm.',
          },
          filters: {
            title: 'Filtry i sortowanie',
            description: 'forming/confirmed/disbanded; sortowanie po slocie lub liczbie graczy.',
          },
        },
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

export default pl
