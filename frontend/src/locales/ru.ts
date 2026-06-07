const ru = {
  translation: {
    appTitle: 'Dead Man’s Game',
    auth: {
      title: 'Dead Man’s Game',
      subtitle: 'Войдите через Twitch, чтобы открыть игровое поле.',
      description: 'После входа панель загружает текущее игровое поле из базы данных.',
      button: 'Войти через Twitch',
      processing: 'Завершаем вход через Twitch...',
      checkingSession: 'Проверяем вашу сессию...',
      callbackFailedTitle: 'Не удалось завершить вход',
      sessionRestoreFailed:
        'Twitch подтвердил вход, но сессию приложения восстановить не удалось. Попробуйте войти снова.',
      backToLogin: 'Вернуться ко входу',
      callbackReasons: {
        access_denied: 'Вы отменили вход через Twitch.',
        account_inactive: 'Ваша учетная запись деактивирована. Обратитесь к администратору для восстановления доступа.',
        missing_code: 'Twitch не вернул код авторизации.',
        missing_state: 'Twitch не вернул параметр безопасности state.',
        state_cookie_missing: 'Локальная сессия входа устарела. Начните вход заново.',
        state_mismatch: 'Проверка безопасности входа не прошла. Начните вход заново.',
        authentication_failed: 'Не удалось завершить авторизацию на сервере. Попробуйте позже.',
        unknown: 'Во время входа произошла неизвестная ошибка.',
      },
    },
    navigation: {
      title: 'Навигация',
      thumbnail: 'МЕНЮ',
      open: 'Открыть навигацию',
      close: 'Закрыть',
      availableSections: 'Доступные разделы',
      roles: {
        admin: 'Администратор',
        moderator: 'Модератор',
        viewer: 'Зритель',
      },
      items: {
        gameBoard: {
          label: 'Игровая доска',
          description: 'Текущее игровое поле и состояние карточек.',
        },
        gameSetup: {
          label: 'Настройка игры',
          description: 'Черновая таблица для настройки карточек игры.',
        },
        gameApplication: {
          label: 'Заявка на игру',
          description: 'Регистрация команды, пока игра принимает заявки.',
        },
        teamRegistrations: {
          label: 'Заявки команд',
          description: 'Просмотр и подтверждение команд.',
        },
      },
    },
    gameBoard: {
      title: 'Игровое поле',
      loading: 'Загрузка игрового поля...',
      errorLoading: 'Не удалось загрузить игровое поле.',
      empty: 'Игровое поле сейчас недоступно.',
      cellLabel: 'Ячейка',
      closedCellLabel: 'Скрыто',
      costLabel: '{{cost}} очк.',
      statusActive: 'Активна',
      statusReady: 'Приём заявок',
      statusFinished: 'Завершена',
      applicationButton: 'Заявка на игру',
      openConfirmTitle: 'Открыть карточку?',
      openConfirmDescription:
        'Вы уверены, что хотите открыть эту карточку (ряд {{row}}, колонка {{col}}, стоимость {{cost}})?',
      openCancel: 'Отмена',
      openConfirm: 'Открыть',
      openSuccess: 'Карточка открыта.',
      openForbidden: 'Открывать карточки может только администратор.',
      openNotFound: 'Выбранная карточка не найдена.',
      openFailed: 'Не удалось открыть карточку.',
      modifiers: {
        title: 'Модификаторы игры',
        description: 'Активные модификаторы, включенные для текущей игры.',
        loading: 'Загрузка каталога модификаторов...',
        error: 'Не удалось загрузить каталог модификаторов.',
        empty: 'Для этой игры модификаторы не включены.',
        activeBadge: 'Активен',
        activate: 'Активировать',
        errors: {
          forbidden: 'Активировать модификаторы могут только модераторы и администраторы.',
          unknownCode: 'Выбранный модификатор больше недоступен.',
          gameNotActive: 'Модификаторы можно активировать только в активной игре.',
          notEnabled: 'Этот модификатор не включен для текущей игры.',
          conflictActive: 'Этот модификатор конфликтует с уже активным модификатором.',
          limitReached: 'Для этого модификатора достигнут лимит активаций.',
          generic: 'Не удалось активировать модификатор.',
        },
      },
    },
    gameSetup: {
      title: 'Настройка игры',
      description:
        'Черновик игры для настройки названия, таблицы, полей карточек и изображений.',
      loading: 'Загрузка настройки игры...',
      errorLoading: 'Не удалось загрузить настройку игры.',
      empty: 'Сейчас нет игры в статусе черновика. Создайте новую, чтобы начать настройку.',
      draftBadge: 'Черновик',
      gameNameLabel: 'Название игры',
      columnLabel: 'Колонка {{column}}',
      rowLabel: 'Строка {{row}}',
      imagePlaceholder: 'Изображения пока нет',
      cellTitleLabel: 'Название карточки',
      cellMedia: {
        upload: 'Загрузить',
        replace: 'Заменить',
        remove: 'Удалить',
        uploading: 'Загрузка...',
        removing: 'Удаление...',
        uploadPrompt: 'Нажмите или перетащите изображение',
        dropPrompt: 'Отпустите для загрузки',
        errors: {
          invalidType: 'Допустимы только изображения PNG, JPEG, WebP и GIF.',
          tooLarge: 'Размер изображения не должен превышать 5 МБ.',
          saveRequired: 'Дождитесь синхронизации новой карточки с сервером и загрузите изображение снова.',
          invalidFile: 'Этот файл изображения не поддерживается.',
          notFound: 'Карточка или её изображение не найдены. Обновите страницу и попробуйте снова.',
          uploadFailed: 'Не удалось загрузить изображение. Попробуйте ещё раз.',
          deleteFailed: 'Не удалось удалить изображение. Попробуйте ещё раз.',
        },
      },
      cellPriceLabel: 'Цена',
      save: 'Сохранить изменения',
      saving: 'Сохранение...',
      persistenceHint:
        'Все администраторы работают с одним черновиком в базе. Правьте поля локально и нажимайте «Сохранить». Строки и колонки сохраняются после подтверждения в диалоге. Изображения сразу уходят в storage. Изменения других админов приходят по SignalR в реальном времени.',
      modifiers: {
        title: 'Доступные модификаторы для этой игры',
        description:
          'Выберите, какие глобальные модификаторы можно будет активировать во время игры. Список общий для всех администраторов.',
        loading: 'Загрузка каталога модификаторов...',
        error: 'Не удалось загрузить каталог модификаторов.',
        empty: 'Каталог модификаторов пуст.',
      },
      questions: {
        title: 'Управление вопросами',
        description:
          'Временная админ-форма для включения/отключения вопросов и категорий общего вектора.',
        searchLabel: 'Поиск по вопросу/ответу',
        categoryAll: 'Все категории',
        enableCategory: 'Включить категорию',
        disableCategory: 'Отключить категорию',
        loading: 'Загрузка каталога вопросов...',
        error: 'Не удалось загрузить каталог вопросов.',
        empty: 'По выбранным фильтрам вопросов нет.',
        meta: 'Категория: {{category}} · Награда: {{reward}} · Задано: {{asked}} · Верно: {{correct}}',
      },
      reloadFromServer: 'Обновить',
      remoteChangeNotice:
        'Другой администратор изменил черновик. Нажмите «Обновить», чтобы сбросить несохранённые правки и показать версию с сервера.',
      draftRemovedNotice:
        'Другой администратор сбросил черновик. Ваши несохранённые правки были отменены.',
      sync: {
        pending: 'Ожидает синхронизации',
        saving: 'Сохранение…',
        saved: 'Сохранено',
        error: 'Ошибка сохранения',
        conflict: 'Обновлено после конфликта',
      },
      invalidTitle: 'Название игры должно быть длиной от 1 до 200 символов.',
      invalidRowLabel: 'Каждая метка строки должна быть от 1 до 100 символов.',
      invalidColumnLabel: 'Каждая метка колонки должна быть от 1 до 100 символов.',
      invalidCellTitle: 'Название карточки — не более 200 символов.',
      saveFailed: 'Не удалось сохранить настройку игры. Попробуйте ещё раз.',
      resetFailed: 'Не удалось сбросить настройку игры. Попробуйте ещё раз.',
      boardTitle: 'Игровая таблица',
      boardDescription:
        'Редактируйте подписи и поля карточек, затем нажмите «Сохранить». Изменения строк и колонок сохраняются после подтверждения в диалоге.',
      settingsSidebar: {
        overline: 'Настройка',
        title: 'Настройки игры',
        description:
          'Название и размер таблицы. Правьте поля локально и нажимайте «Сохранить». Изображения — сразу в storage.',
        boardSizeLabel: 'Текущий размер',
        boardSizeValue: '{{rows}} строк × {{columns}} колонок',
        manageLayout: 'Строки и колонки…',
        resetDraft: 'Сбросить черновик',
      },
      resetDialog: {
        title: 'Сбросить черновик',
        description:
          'Текущий черновик будет полностью удалён вместе с названием, таблицей, карточками и всеми загруженными изображениями в storage. После этого нужно будет создать новый черновик.',
        cancel: 'Отмена',
        confirm: 'Сбросить черновик',
        submitting: 'Сброс...',
      },
      layoutDialog: {
        title: 'Строки и колонки',
        description:
          'Выберите действие, объект и позицию. После подтверждения изменения сохраняются в общий черновик.',
        actionLabel: 'Действие',
        actionAdd: 'Добавить',
        actionRemove: 'Удалить',
        axisLabel: 'Объект',
        axisRow: 'Строка',
        axisColumn: 'Колонка',
        positionLabel: 'Позиция',
        addRowAtStart: 'В начало (перед строкой 1)',
        addRowAtEnd: 'В конец (после последней строки)',
        addRowBefore: 'Перед строкой {{position}}',
        addColumnAtStart: 'Слева (перед колонкой 1)',
        addColumnAtEnd: 'Справа (после последней колонки)',
        addColumnBefore: 'Перед колонкой {{position}}',
        removeRowTarget: 'Строка {{position}} ({{label}})',
        removeColumnTarget: 'Колонка {{position}} ({{label}})',
        limitReached: 'Это действие недоступно для текущего размера таблицы.',
        review: 'Проверить',
        back: 'Назад',
        cancel: 'Отмена',
        confirm: 'Подтвердить',
        confirmAddRow: 'Добавить новую строку: {{target}}?',
        confirmAddColumn: 'Добавить новую колонку: {{target}}?',
        confirmRemoveRow:
          'Удалить {{target}}? После синхронизации черновика карточки в этой строке и их изображения будут удалены с сервера.',
        confirmRemoveColumn:
          'Удалить {{target}}? После синхронизации черновика карточки в этой колонке и их изображения будут удалены с сервера.',
      },
      emptyPanel: {
        description: 'В базе пока нет черновика. Создайте игру через диалог.',
      },
      createDialog: {
        promptTitle: 'Черновика пока нет',
        promptDescription:
          'Сейчас нет игры в настройке. Начните создание, когда будете готовы — у всех админов будет один и тот же черновик.',
        startCreate: 'Создать игру',
        title: 'Название новой игры',
        detailsDescription:
          'Введите название черновика. Будет создана таблица-заготовка.',
        nameLabel: 'Название игры',
        back: 'Назад',
        confirm: 'Создать',
        validationRequired: 'Введите название игры.',
        alreadyExists: 'Черновик игры уже существует. Обновите страницу.',
        error: 'Не удалось создать черновик игры. Попробуйте ещё раз.',
      },
    },
    gameApplication: {
      title: 'Заявка на игру',
      loading: 'Загрузка регистрации...',
      errorLoading: 'Не удалось загрузить регистрацию.',
      notOpen: 'Приём заявок закрыт. Дождитесь публикации игры администратором.',
      description:
        'Создайте команду или вступите в открытую комнату, пока игра в статусе ready.',
      invitationsTitle: 'Приглашения',
      invitationSlot: 'Слот {{slot}}',
      acceptInvitation: 'Принять',
      declineInvitation: 'Отклонить',
      myTeamTitle: 'Ваша команда',
      leaveTeam: 'Выйти из команды',
      createTeamTitle: 'Создать команду',
      createOpenTeam: 'Открытая комната',
      createClosedTeam: 'Закрытая (инвайты от админа)',
      openTeamsTitle: 'Открытые команды',
      joinTeam: 'Вступить',
      teamSlot: 'Слот {{slot}} · игроков: {{count}}',
      backToBoard: 'К игровому полю',
    },
    gameRegistration: {
      teamStatus: {
        forming: 'Формирование',
        confirmed: 'Подтверждена',
        disbanded: 'Расформирована',
      },
      errors: {
        notOpen: 'Приём заявок для игры в статусе ready не открыт.',
        noSlots: 'Нет свободных слотов для команд.',
        alreadyOnTeam: 'Вы уже состоите в команде на эту игру.',
        teamNotFound: 'Команда не найдена.',
        teamNotJoinable: 'К этой команде нельзя присоединиться или подтвердить её в текущем состоянии.',
        notTeamMember: 'Вы не состоите в команде на эту игру.',
        invitationInvalid: 'Приглашение не найдено или уже не активно.',
        userNotFound: 'Выбранный пользователь не найден или деактивирован.',
        slotNotFound: 'Слот участия не найден.',
        slotNotAvailable: 'Слот участия недоступен.',
        pendingInvitation: 'У этого игрока уже есть ожидающее приглашение на эту игру.',
        operationFailed: 'Не удалось выполнить операцию регистрации.',
        unauthorized: 'Войдите в аккаунт, чтобы продолжить.',
        forbidden: 'Недостаточно прав для этого действия.',
        generic: 'Что-то пошло не так. Попробуйте ещё раз.',
      },
    },
    teamRegistrations: {
      title: 'Заявки команд',
      loading: 'Загрузка команд...',
      errorLoading: 'Не удалось загрузить команды.',
      notOpen: 'Приём заявок для игры в статусе ready пока не открыт.',
      description: 'Подтвердите команды, которые соответствуют правилам состава.',
      empty: 'Пока нет зарегистрированных команд.',
      slot: 'Слот',
      status: 'Статус',
      players: 'Игроки',
      actions: 'Действия',
      confirm: 'Подтвердить',
      reject: 'Отклонить',
    },
    plannedFeatures: {
      roadmapTitle: 'Запланировано (ещё не подключено)',
      roadmapHint:
        'Заметки по нашему обсуждению. Часть API на backend уже есть; UI и сохранение в setup — позже.',
      formShellBadge: 'Макет UI',
      gameSetup: {
        form: {
          registrationTitle: 'Настройки регистрации (черновик)',
          registrationDescription:
            'Слоты команд, резерв, размер состава и переход draft → ready из setup.',
          teamSlotCount: 'Количество слотов команд',
          minPlayers: 'Мин. игроков в команде',
          maxPlayers: 'Макс. игроков в команде',
          reservedSlots: 'Зарезервированные слоты',
          reservedSlotsPlaceholder:
            'напр. слот 6 — гостевая команда (без публичных заявок)',
          openRegistration: 'Открыть регистрацию (draft → ready)',
          startGame: 'Начать игру (ready → active)',
        },
        roadmap: {
          slots: {
            title: 'Сетка слотов в setup',
            description:
              'Число команд и public/reserved на слот. Синхронизация с PUT /api/game/setup.',
          },
          teamLimits: {
            title: 'Мин/макс игроков',
            description: 'Сохранять лимиты 1–3 (или другие) в черновике, не только дефолты в БД.',
          },
          lifecycle: {
            title: 'Жизненный цикл из setup',
            description:
              'Кнопки POST /api/game/lifecycle/open-registration, /start, /finish.',
          },
        },
      },
      gameBoard: {
        form: {
          lifecycleTitle: 'Жизненный цикл игры (админ)',
          lifecycleDescription: 'Переводы draft → ready → active → finished.',
          openRegistration: 'Открыть регистрацию',
          startGame: 'Начать игру',
          finishGame: 'Завершить игру',
        },
        roadmap: {
          lifecycle: {
            title: 'Панель lifecycle для админа',
            description: 'Подключить три endpoint с подтверждением и уведомлениями.',
          },
          applicationGate: {
            title: 'Кнопка заявки по статусу',
            description:
              'Показывать «Заявка на игру» только в ready; скрывать в draft/active/finished.',
          },
        },
      },
      gameApplication: {
        form: {
          slotsTitle: 'Обзор слотов',
          slotsDescription:
            'Карта public/reserved и занятости из GET /api/game/registration.',
          slotLabel: 'Слот {{slot}}',
          slotFree: 'свободен',
          memberInviteTitle: 'Инвайты в закрытую команду',
          memberInviteDescription:
            'Приглашение тиммейтов; сейчас инвайты только через админа (API).',
          inviteTeammate: 'Пригласить игрока',
          submitForReview: 'Отправить на проверку',
        },
        roadmap: {
          slotsOverview: {
            title: 'Доска слотов',
            description:
              'Все слоты, резерв, pending-инвайты и подтверждённые команды.',
          },
          memberInvites: {
            title: 'Инвайты от игроков',
            description:
              'Тот же accept/decline, инициатор — участник закрытой команды.',
          },
          submitForReview: {
            title: 'Кнопка «готовы к проверке»',
            description:
              'Отправка состава админу; фильтр в списке команд.',
          },
          statusUx: {
            title: 'Статусы команды',
            description:
              'forming vs confirmed; ограничения после подтверждения и вне ready.',
          },
          closedWhenInactive: {
            title: 'Только чтение после ready',
            description: 'В active/finished — история, без join/leave.',
          },
        },
      },
      teamRegistrations: {
        form: {
          inviteTitle: 'Пригласить игрока в слот / команду',
          inviteDescription:
            'Поиск пользователя, слот, цепочка для closed. POST .../invitations.',
          slot: 'Слот',
          player: 'Игрок',
          targetTeam: 'Команда (опционально)',
          sendInvite: 'Отправить приглашение',
        },
        roadmap: {
          adminInvite: {
            title: 'UI инвайтов админа',
            description:
              'Выбор игрока + слот + цепочка (P1 accept → инвайт P2). API уже есть.',
          },
          slotBoard: {
            title: 'Вид по слотам',
            description: 'Reserved/public и pending-инвайты на слот.',
          },
          moderationPolicy: {
            title: 'Ручной режим модерации',
            description:
              'Сейчас join в open room сразу; опционально очередь на confirm.',
          },
          filters: {
            title: 'Фильтры',
            description: 'forming/confirmed/disbanded; сортировка по слоту.',
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

export default ru
