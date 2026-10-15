const translations = {
  en: {
    notificationTeamName: '“{{name}}”',
    notificationTeamSlot: 'No. {{slot}}',
    teamMemberAssignedTitle: 'You were added to a team',
    teamMemberAssignedDescription: 'An organizer added you to team {{team}}.',
    teamMemberTransferredTitle: 'You were moved to another team',
    teamMemberTransferredDescription:
      'An organizer moved you from team {{previousTeam}} to team {{team}}.',
    teamMemberRemovedTitle: 'You were removed from a team',
    teamMemberRemovedDescription: 'An organizer removed you from team {{team}}.',
    teamDisbandedTitle: 'Your team was disbanded',
    teamDisbandedDescription: 'An organizer disbanded team {{team}}. You are no longer a member.',
    teamFallback: 'Your team',
    teamRejectedItemDescription:
      'An organizer declined your team’s participation. You are no longer a member of this team.',
    teamRejectedItemTitle: 'Team “{{team}}” was not admitted to the game',
    brandMark: 'DM',
    menu: 'Menu',
    openNavigation: 'Open navigation',
    history: 'History',
    manage: 'Manage',
    primary: 'Primary navigation',
    adminNavigation: 'Administration navigation',
    adminSections: {
      currentGame: 'Current game',
      catalog: 'Catalogs',
      system: 'System',
    },
    profile: 'Profile',
    accessRole: 'Access role',
    uiStateGallery: {
      title: 'Interface components',
      description: 'Development preview of shared interface states.',
    },
    notifications: 'Notifications',
    openNotifications: 'Open notifications',
    notificationCount: '{{count}} important notification(s)',
    notificationsEmpty: 'No important notifications right now.',
    invitations: 'Invitations',
    openInvitations: 'Open game invitations',
    openApplicationPage: 'Go to game application page',
    openInvitationsPage: 'Go to game application page',
    invitationCount: '{{count}} pending',
    invitationsEmpty: 'No new invitations right now.',
    invitationItemTitle: '{{player}} invited you to a team',
    invitationItemDescription: 'Open the application page to respond. Slot {{slot}}.',
    disbandRequestItemTitle: '{{player}} requested team disband',
    disbandRequestItemDescription: 'Open team management to resolve it. Queue position {{slot}}.',
    modifierCancelledItemTitle: 'Modifier "{{modifier}}" was cancelled',
    modifierCancelledItemDescription:
      '{{player}} refunded {{points}} quiz points. Open modifiers to review the change.',
    genericNotificationTitle: 'New notification',
    genericNotificationDescription: 'Open the relevant page for details.',
    modifierFallback: 'Unknown modifier',
    someone: 'Someone',
    administration: 'Administration',
    language: 'Language',
    logout: 'Log out',
    roles: {
      superadmin: 'Super administrator',
      admin: 'Administrator',
      moderator: 'Moderator',
      viewer: 'Participant',
    },
    items: {
      gameOverlay: { label: 'OBS' },
      gameHistory: {
        label: 'Game history',
      },
      modifierHistory: {
        label: 'Modifier history',
      },
      gameBoard: {
        label: 'Board',
      },
      gameRound: {
        label: 'Current round',
      },
      gameTeamQueue: {
        label: 'Team queue',
      },
      gameLeaderboard: {
        label: 'Leaderboard',
      },
      gameApplication: {
        label: 'Apply',
      },
      gameQuiz: {
        label: 'Quiz',
      },
      gameSetup: {
        label: 'Board setup',
      },
      adminModifiers: {
        label: 'Modifiers for the game',
      },
      adminQuestions: {
        label: 'Questions for the game',
      },
      catalogModifiers: {
        label: 'Modifier catalog',
      },
      catalogQuestions: {
        label: 'Question catalog',
      },
      roleAdministration: {
        label: 'User roles',
      },
    },
  },
  ru: {
    notificationTeamName: '«{{name}}»',
    notificationTeamSlot: '№ {{slot}}',
    teamMemberAssignedTitle: 'Вы добавлены в команду',
    teamMemberAssignedDescription: 'Организатор добавил вас в команду {{team}}.',
    teamMemberTransferredTitle: 'Вы переведены в другую команду',
    teamMemberTransferredDescription:
      'Организатор перевёл вас из команды {{previousTeam}} в команду {{team}}.',
    teamMemberRemovedTitle: 'Вы исключены из команды',
    teamMemberRemovedDescription: 'Организатор исключил вас из команды {{team}}.',
    teamDisbandedTitle: 'Команда расформирована',
    teamDisbandedDescription:
      'Организатор расформировал команду {{team}}. Вы больше не состоите в ней.',
    teamFallback: 'Ваша команда',
    teamRejectedItemDescription:
      'Организатор отказал команде в участии. Вы больше не состоите в этой команде.',
    teamRejectedItemTitle: 'Команда «{{team}}» не допущена к игре',
    brandMark: 'DM',
    menu: 'Меню',
    openNavigation: 'Открыть навигацию',
    history: 'История',
    manage: 'Управление',
    primary: 'Основная навигация',
    adminNavigation: 'Навигация администратора',
    adminSections: {
      currentGame: 'Текущая игра',
      catalog: 'Каталоги',
      system: 'Система',
    },
    profile: 'Профиль',
    accessRole: 'Роль доступа',
    uiStateGallery: {
      title: 'Компоненты интерфейса',
      description: 'Служебный просмотр общих состояний интерфейса.',
    },
    notifications: 'Уведомления',
    openNotifications: 'Открыть уведомления',
    notificationCount: 'Важных уведомлений: {{count}}',
    notificationsEmpty: 'Сейчас важных уведомлений нет.',
    invitations: 'Приглашения',
    openInvitations: 'Открыть приглашения в игру',
    openApplicationPage: 'Перейти на страницу заявок',
    openInvitationsPage: 'Перейти на страницу заявок',
    invitationCount: 'В ожидании: {{count}}',
    invitationsEmpty: 'Сейчас новых приглашений нет.',
    invitationItemTitle: '{{player}} пригласил вас в команду',
    invitationItemDescription: 'Откройте страницу заявок, чтобы ответить. Слот {{slot}}.',
    disbandRequestItemTitle: '{{player}} просит распустить команду',
    disbandRequestItemDescription:
      'Откройте управление командами, чтобы решить запрос. Очередь {{slot}}.',
    modifierCancelledItemTitle: 'Модификатор «{{modifier}}» отменён',
    modifierCancelledItemDescription:
      '{{player}} вернул вам {{points}} очк. Откройте модификаторы, чтобы проверить изменения.',
    genericNotificationTitle: 'Новое уведомление',
    genericNotificationDescription: 'Откройте нужную страницу, чтобы посмотреть детали.',
    modifierFallback: 'Неизвестный модификатор',
    someone: 'Кто-то',
    administration: 'Администрирование',
    language: 'Язык',
    logout: 'Выйти',
    roles: {
      superadmin: 'Суперадминистратор',
      admin: 'Администратор',
      moderator: 'Модератор',
      viewer: 'Участник',
    },
    items: {
      gameOverlay: { label: 'OBS' },
      gameHistory: {
        label: 'История игр',
      },
      modifierHistory: {
        label: 'История модификаторов',
      },
      gameBoard: {
        label: 'Доска',
      },
      gameRound: {
        label: 'Текущий раунд',
      },
      gameTeamQueue: {
        label: 'Очередь команд',
      },
      gameLeaderboard: {
        label: 'Лидерборд',
      },
      gameApplication: {
        label: 'Подать заявку',
      },
      gameQuiz: {
        label: 'Викторина',
      },
      gameSetup: {
        label: 'Настройка доски',
      },
      adminModifiers: {
        label: 'Модификаторы для игры',
      },
      adminQuestions: {
        label: 'Вопросы для игры',
      },
      catalogModifiers: {
        label: 'Каталог модификаторов',
      },
      catalogQuestions: {
        label: 'Каталог вопросов',
      },
      roleAdministration: {
        label: 'Роли пользователей',
      },
    },
  },
  uk: {
    notificationTeamName: '«{{name}}»',
    notificationTeamSlot: '№ {{slot}}',
    teamMemberAssignedTitle: 'Вас додано до команди',
    teamMemberAssignedDescription: 'Організатор додав вас до команди {{team}}.',
    teamMemberTransferredTitle: 'Вас переведено до іншої команди',
    teamMemberTransferredDescription:
      'Організатор перевів вас із команди {{previousTeam}} до команди {{team}}.',
    teamMemberRemovedTitle: 'Вас виключено з команди',
    teamMemberRemovedDescription: 'Організатор виключив вас із команди {{team}}.',
    teamDisbandedTitle: 'Команду розформовано',
    teamDisbandedDescription:
      'Організатор розформував команду {{team}}. Ви більше не входите до її складу.',
    teamFallback: 'Ваша команда',
    teamRejectedItemDescription:
      'Організатор відмовив команді в участі. Ви більше не входите до її складу.',
    teamRejectedItemTitle: 'Команду «{{team}}» не допущено до гри',
    brandMark: 'DM',
    menu: 'Меню',
    openNavigation: 'Відкрити навігацію',
    history: 'Історія',
    manage: 'Керування',
    primary: 'Основна навігація',
    adminNavigation: 'Навігація адміністратора',
    adminSections: {
      currentGame: 'Поточна гра',
      catalog: 'Каталоги',
      system: 'Система',
    },
    profile: 'Профіль',
    accessRole: 'Роль доступу',
    uiStateGallery: {
      title: 'Компоненти інтерфейсу',
      description: 'Службовий перегляд спільних станів інтерфейсу.',
    },
    notifications: 'Сповіщення',
    openNotifications: 'Відкрити сповіщення',
    notificationCount: 'Важливих сповіщень: {{count}}',
    notificationsEmpty: 'Зараз важливих сповіщень немає.',
    invitations: 'Запрошення',
    openInvitations: 'Відкрити запрошення до гри',
    openApplicationPage: 'Перейти на сторінку заявок',
    openInvitationsPage: 'Перейти на сторінку заявок',
    invitationCount: 'Очікує: {{count}}',
    invitationsEmpty: 'Нових запрошень зараз немає.',
    invitationItemTitle: '{{player}} запросив вас до команди',
    invitationItemDescription: 'Відкрийте сторінку заявок, щоб відповісти. Слот {{slot}}.',
    disbandRequestItemTitle: '{{player}} просить розформувати команду',
    disbandRequestItemDescription:
      'Відкрийте керування командами, щоб вирішити запит. Черга {{slot}}.',
    modifierCancelledItemTitle: 'Модифікатор «{{modifier}}» скасовано',
    modifierCancelledItemDescription:
      '{{player}} повернув вам {{points}} очк. Відкрийте модифікатори, щоб перевірити зміни.',
    genericNotificationTitle: 'Нове сповіщення',
    genericNotificationDescription: 'Відкрийте потрібну сторінку, щоб побачити деталі.',
    modifierFallback: 'Невідомий модифікатор',
    someone: 'Хтось',
    administration: 'Адміністрування',
    language: 'Мова',
    logout: 'Вийти',
    roles: {
      superadmin: 'Суперадміністратор',
      admin: 'Адміністратор',
      moderator: 'Модератор',
      viewer: 'Учасник',
    },
    items: {
      gameOverlay: { label: 'OBS' },
      gameHistory: {
        label: 'Історія ігор',
      },
      modifierHistory: {
        label: 'Історія модифікаторів',
      },
      gameBoard: {
        label: 'Дошка',
      },
      gameRound: {
        label: 'Поточний раунд',
      },
      gameTeamQueue: {
        label: 'Черга команд',
      },
      gameLeaderboard: {
        label: 'Лідерборд',
      },
      gameApplication: {
        label: 'Подати заявку',
      },
      gameQuiz: {
        label: 'Вікторина',
      },
      gameSetup: {
        label: 'Налаштування дошки',
      },
      adminModifiers: {
        label: 'Модифікатори для гри',
      },
      adminQuestions: {
        label: 'Питання для гри',
      },
      catalogModifiers: {
        label: 'Каталог модифікаторів',
      },
      catalogQuestions: {
        label: 'Каталог питань',
      },
      roleAdministration: {
        label: 'Ролі користувачів',
      },
    },
  },
  pl: {
    notificationTeamName: '„{{name}}”',
    notificationTeamSlot: 'nr {{slot}}',
    teamMemberAssignedTitle: 'Dodano Cię do drużyny',
    teamMemberAssignedDescription: 'Organizator dodał Cię do drużyny {{team}}.',
    teamMemberTransferredTitle: 'Przeniesiono Cię do innej drużyny',
    teamMemberTransferredDescription:
      'Organizator przeniósł Cię z drużyny {{previousTeam}} do drużyny {{team}}.',
    teamMemberRemovedTitle: 'Usunięto Cię z drużyny',
    teamMemberRemovedDescription: 'Organizator usunął Cię z drużyny {{team}}.',
    teamDisbandedTitle: 'Drużyna została rozwiązana',
    teamDisbandedDescription:
      'Organizator rozwiązał drużynę {{team}}. Nie należysz już do tej drużyny.',
    teamFallback: 'Twoja drużyna',
    teamRejectedItemDescription:
      'Organizator odmówił drużynie udziału. Nie należysz już do tej drużyny.',
    teamRejectedItemTitle: 'Drużyna „{{team}}” nie została dopuszczona do gry',
    brandMark: 'DM',
    menu: 'Menu',
    openNavigation: 'Otwórz nawigację',
    history: 'Historia',
    manage: 'Zarządzanie',
    primary: 'Główna nawigacja',
    adminNavigation: 'Nawigacja administratora',
    adminSections: {
      currentGame: 'Bieżąca gra',
      catalog: 'Katalogi',
      system: 'System',
    },
    profile: 'Profil',
    accessRole: 'Rola dostępu',
    uiStateGallery: {
      title: 'Komponenty interfejsu',
      description: 'Deweloperski podgląd wspólnych stanów interfejsu.',
    },
    notifications: 'Powiadomienia',
    openNotifications: 'Otwórz powiadomienia',
    notificationCount: 'Ważne powiadomienia: {{count}}',
    notificationsEmpty: 'Brak ważnych powiadomień.',
    invitations: 'Zaproszenia',
    openInvitations: 'Otwórz zaproszenia do gry',
    openApplicationPage: 'Przejdź do strony zgłoszeń',
    openInvitationsPage: 'Przejdź do strony zgłoszeń',
    invitationCount: 'Oczekujące: {{count}}',
    invitationsEmpty: 'Brak nowych zaproszeń.',
    invitationItemTitle: '{{player}} zaprosił Cię do drużyny',
    invitationItemDescription: 'Otwórz stronę zgłoszeń, aby odpowiedzieć. Slot {{slot}}.',
    disbandRequestItemTitle: '{{player}} prosi o rozwiązanie drużyny',
    disbandRequestItemDescription:
      'Otwórz zarządzanie drużynami, aby rozwiązać zgłoszenie. Kolejka {{slot}}.',
    modifierCancelledItemTitle: 'Anulowano modyfikator „{{modifier}}”',
    modifierCancelledItemDescription:
      '{{player}} zwrócił {{points}} pkt quizowych. Otwórz modyfikatory, aby sprawdzić zmianę.',
    genericNotificationTitle: 'Nowe powiadomienie',
    genericNotificationDescription: 'Otwórz odpowiednią stronę, aby zobaczyć szczegóły.',
    modifierFallback: 'Nieznany modyfikator',
    someone: 'Ktoś',
    administration: 'Administracja',
    language: 'Język',
    logout: 'Wyloguj się',
    roles: {
      superadmin: 'Superadministrator',
      admin: 'Administrator',
      moderator: 'Moderator',
      viewer: 'Uczestnik',
    },
    items: {
      gameOverlay: { label: 'OBS' },
      gameHistory: {
        label: 'Historia gier',
      },
      modifierHistory: {
        label: 'Historia modyfikatorów',
      },
      gameBoard: {
        label: 'Plansza',
      },
      gameRound: {
        label: 'Bieżąca runda',
      },
      gameTeamQueue: {
        label: 'Kolejka drużyn',
      },
      gameLeaderboard: {
        label: 'Ranking',
      },
      gameApplication: {
        label: 'Zgłoś się',
      },
      gameQuiz: {
        label: 'Quiz',
      },
      gameSetup: {
        label: 'Konfiguracja planszy',
      },
      adminModifiers: {
        label: 'Modyfikatory do gry',
      },
      adminQuestions: {
        label: 'Pytania do gry',
      },
      catalogModifiers: {
        label: 'Katalog modyfikatorów',
      },
      catalogQuestions: {
        label: 'Katalog pytań',
      },
      roleAdministration: {
        label: 'Role użytkowników',
      },
    },
  },
}

export default translations
