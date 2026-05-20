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
      statusFinished: 'Zakończona',
      openConfirmTitle: 'Otworzyć kartę?',
      openConfirmDescription:
        'Czy na pewno chcesz otworzyć tę kartę (wiersz {{row}}, kolumna {{col}}, koszt {{cost}})?',
      openCancel: 'Anuluj',
      openConfirm: 'Otwórz',
      openSuccess: 'Karta została otwarta.',
      openForbidden: 'Tylko administrator może otwierać karty.',
      openNotFound: 'Wybrana karta nie została znaleziona.',
      openFailed: 'Nie udało się otworzyć karty.',
    },
    gameSetup: {
      title: 'Konfiguracja gry',
      description:
        'Szkic gry do konfiguracji nazwy, kolumn, cen i przyszłych obrazów kart.',
      loading: 'Ładowanie konfiguracji gry...',
      errorLoading: 'Nie udało się załadować konfiguracji gry.',
      empty: 'Nie ma jeszcze gry w statusie szkicu. Utwórz nową, aby rozpocząć konfigurację.',
      draftBadge: 'Szkic',
      gameNameLabel: 'Nazwa gry',
      columnLabel: 'Kolumna {{column}}',
      imagePlaceholder: 'Miejsce na przesłanie obrazu',
      cellTitleLabel: 'Nazwa karty',
      cellPriceLabel: 'Cena',
      createDialog: {
        title: 'Utwórz nową grę',
        description:
          'Obecnie nie ma gry w trakcie konfiguracji. Wpisz nazwę, aby utworzyć szkic z tabelą startową.',
        nameLabel: 'Nazwa gry',
        confirm: 'Utwórz',
        validationRequired: 'Wpisz nazwę gry.',
        alreadyExists: 'Szkic gry już istnieje. Odśwież stronę.',
        error: 'Nie udało się utworzyć szkicu gry. Spróbuj ponownie.',
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
