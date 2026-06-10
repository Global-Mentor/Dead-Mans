const uk = {
  translation: {
    appTitle: 'Dead Man’s Game',
    auth: {
      title: 'Dead Man’s Game',
      subtitle: 'Увійдіть через Twitch, щоб відкрити ігрове поле.',
      description: 'Після входу панель завантажує поточне ігрове поле з бази даних.',
      button: 'Увійти через Twitch',
      processing: 'Завершуємо вхід через Twitch...',
      checkingSession: 'Перевіряємо вашу сесію...',
      callbackFailedTitle: 'Не вдалося завершити вхід',
      sessionRestoreFailed:
        'Вхід через Twitch завершився успішно, але сесію застосунку не вдалося відновити. Спробуйте ще раз.',
      backToLogin: 'Повернутися до входу',
      callbackReasons: {
        access_denied: 'Ви скасували вхід через Twitch.',
        account_inactive: 'Ваш обліковий запис деактивовано. Зверніться до адміністратора, щоб відновити доступ.',
        missing_code: 'Twitch не повернув код авторизації.',
        missing_state: 'Twitch не повернув параметр безпеки state.',
        state_cookie_missing: 'Локальна сесія входу застаріла. Почніть вхід заново.',
        state_mismatch: 'Перевірка безпеки під час входу не пройшла. Спробуйте ще раз.',
        authentication_failed: 'Сервер не зміг завершити авторизацію. Спробуйте пізніше.',
        unknown: 'Під час входу сталася невідома помилка.',
      },
    },
    navigation: {
      title: 'Навігація',
      primary: 'Основна навігація',
      profile: 'Профіль',
      administration: 'Адміністрування',
      language: 'Мова інтерфейсу',
      logout: 'Вийти',
      thumbnail: 'МЕНЮ',
      open: 'Відкрити навігацію',
      close: 'Закрити',
      availableSections: 'Доступні розділи',
      roles: {
        admin: 'Адміністратор',
        moderator: 'Модератор',
        viewer: 'Учасник',
      },
      items: {
        gameBoard: {
          label: 'Гра',
          description: 'Поточне ігрове поле та стан карток.',
        },
        gameSetup: {
          label: 'Налаштування гри',
          description: 'Чернеткова таблиця для налаштування карток гри.',
        },
        gameApplication: {
          label: 'Подати заявку',
          description: 'Реєстрація команди під час прийому заявок.',
        },
        teamRegistrations: {
          label: 'Заявки команд',
          description: 'Перегляд і підтвердження команд.',
        },
      },
    },
    gameBoard: {
      title: 'Ігрове поле',
      loading: 'Завантаження ігрового поля...',
      errorLoading: 'Не вдалося завантажити ігрове поле.',
      empty: 'У базі ще немає активної або завершеної гри.',
      cellLabel: 'Клітинка',
      closedCellLabel: 'Приховано',
      costLabel: '{{cost}} оч.',
      statusActive: 'Активна',
      statusReady: 'Прийом заявок',
      statusFinished: 'Завершена',
      applicationButton: 'Заявка на гру',
      openConfirmTitle: 'Відкрити картку?',
      openConfirmDescription:
        'Ви впевнені, що хочете відкрити цю картку (ряд {{row}}, колонка {{col}}, вартість {{cost}})?',
      openCancel: 'Скасувати',
      openConfirm: 'Відкрити',
      openSuccess: 'Картку відкрито.',
      openForbidden: 'Відкривати картки може лише адміністратор.',
      openNotFound: 'Вибрану картку не знайдено.',
      openFailed: 'Не вдалося відкрити картку.',
      modifiers: {
        title: 'Модифікатори гри',
        description: 'Активні модифікатори, увімкнені для поточної гри.',
        loading: 'Завантаження каталогу модифікаторів...',
        error: 'Не вдалося завантажити каталог модифікаторів.',
        empty: 'Для цієї гри модифікатори не увімкнені.',
        activeBadge: 'Активний',
        activate: 'Активувати',
        errors: {
          forbidden: 'Активувати модифікатори можуть лише модератори та адміністратори.',
          unknownCode: 'Вибраний модифікатор більше недоступний.',
          gameNotActive: 'Модифікатори можна активувати лише під час активної гри.',
          notEnabled: 'Цей модифікатор не увімкнений для поточної гри.',
          conflictActive: 'Цей модифікатор конфліктує з уже активним модифікатором.',
          limitReached: 'Для цього модифікатора досягнуто ліміт активацій.',
          generic: 'Не вдалося активувати модифікатор.',
        },
      },
    },
    gameSetup: {
      title: 'Налаштування гри',
      description:
        'Чернетка гри для налаштування назви, таблиці, полів карток і зображень.',
      loading: 'Завантаження налаштування гри...',
      errorLoading: 'Не вдалося завантажити налаштування гри.',
      empty: 'Наразі немає гри в статусі чернетки. Створіть нову, щоб почати налаштування.',
      draftBadge: 'Чернетка',
      gameNameLabel: 'Назва гри',
      columnLabel: 'Колонка {{column}}',
      rowLabel: 'Ряд {{row}}',
      imagePlaceholder: 'Зображення ще немає',
      cellTitleLabel: 'Назва картки',
      cellMedia: {
        upload: 'Завантажити',
        replace: 'Замінити',
        remove: 'Видалити',
        uploading: 'Завантаження...',
        removing: 'Видалення...',
        uploadPrompt: 'Натисніть або перетягніть зображення',
        dropPrompt: 'Відпустіть для завантаження',
        errors: {
          invalidType: 'Дозволені лише зображення PNG, JPEG, WebP та GIF.',
          tooLarge: 'Розмір зображення не повинен перевищувати 5 МБ.',
          saveRequired:
            'Дочекайтеся синхронізації нової картки з сервером і завантажте зображення знову.',
          invalidFile: 'Цей файл зображення не підтримується.',
          notFound: 'Картку або її зображення не знайдено. Оновіть сторінку та спробуйте знову.',
          uploadFailed: 'Не вдалося завантажити зображення. Спробуйте ще раз.',
          deleteFailed: 'Не вдалося видалити зображення. Спробуйте ще раз.',
        },
      },
      cellPriceLabel: 'Ціна',
      save: 'Зберегти зміни',
      saving: 'Збереження...',
      persistenceHint:
        'Усі адміністратори працюють з однією чернеткою в базі. Редагуйте поля локально і натисніть «Зберегти». Рядки та колонки зберігаються після підтвердження в діалозі. Зображення одразу в storage. Зміни інших адмінів надходять через SignalR.',
      modifiers: {
        title: 'Доступні модифікатори для цієї гри',
        description:
          'Оберіть, які глобальні модифікатори можна буде активувати під час гри. Список спільний для всіх адміністраторів.',
        loading: 'Завантаження каталогу модифікаторів...',
        error: 'Не вдалося завантажити каталог модифікаторів.',
        empty: 'Каталог модифікаторів порожній.',
      },
      questions: {
        title: 'Керування питаннями',
        description:
          'Тимчасова адмін-форма для вмикання/вимикання питань і категорій у спільному векторі.',
        searchLabel: 'Пошук за питанням/відповіддю',
        categoryAll: 'Усі категорії',
        enableCategory: 'Увімкнути категорію',
        disableCategory: 'Вимкнути категорію',
        loading: 'Завантаження каталогу питань...',
        error: 'Не вдалося завантажити каталог питань.',
        empty: 'За поточними фільтрами питань немає.',
        meta: 'Категорія: {{category}} · Нагорода: {{reward}} · Поставлено: {{asked}} · Вірно: {{correct}}',
      },
      reloadFromServer: 'Оновити',
      remoteChangeNotice:
        'Інший адміністратор змінив чернетку. Натисніть «Оновити», щоб скинути незбережені правки й показати версію з сервера.',
      draftRemovedNotice:
        'Інший адміністратор скинув чернетку. Ваші незбережені правки було скасовано.',
      sync: {
        pending: 'Очікує синхронізації',
        saving: 'Збереження…',
        saved: 'Збережено',
        error: 'Помилка збереження',
        conflict: 'Оновлено після конфлікту',
      },
      invalidTitle: 'Назва гри має бути довжиною від 1 до 200 символів.',
      invalidRowLabel: 'Кожна мітка рядка має бути від 1 до 100 символів.',
      invalidColumnLabel: 'Кожна мітка колонки має бути від 1 до 100 символів.',
      invalidCellTitle: 'Назва картки — не більше 200 символів.',
      saveFailed: 'Не вдалося зберегти налаштування гри. Спробуйте ще раз.',
      resetFailed: 'Не вдалося скинути налаштування гри. Спробуйте ще раз.',
      boardTitle: 'Ігрова таблиця',
      boardDescription:
        'Редагуйте підписи та поля карток, потім натисніть «Зберегти». Зміни рядків і колонок зберігаються після підтвердження в діалозі.',
      settingsSidebar: {
        overline: 'Налаштування',
        title: 'Налаштування гри',
        description:
          'Назва та розмір таблиці. Правте поля локально й натискайте «Зберегти». Зображення — одразу в storage.',
        boardSizeLabel: 'Поточний розмір',
        boardSizeValue: '{{rows}} рядків × {{columns}} колонок',
        manageLayout: 'Рядки та колонки…',
        resetDraft: 'Скинути чернетку',
      },
      resetDialog: {
        title: 'Скинути чернетку',
        description:
          'Поточну чернетку буде повністю видалено разом із назвою, таблицею, картками та всіма завантаженими зображеннями в storage. Після цього потрібно буде створити нову чернетку.',
        cancel: 'Скасувати',
        confirm: 'Скинути чернетку',
        submitting: 'Скидання...',
      },
      layoutDialog: {
        title: 'Рядки та колонки',
        description:
          'Оберіть дію, об’єкт і позицію. Після підтвердження зміни зберігаються в спільну чернетку.',
        actionLabel: 'Дія',
        actionAdd: 'Додати',
        actionRemove: 'Видалити',
        axisLabel: 'Об’єкт',
        axisRow: 'Рядок',
        axisColumn: 'Колонка',
        positionLabel: 'Позиція',
        addRowAtStart: 'На початок (перед рядком 1)',
        addRowAtEnd: 'В кінець (після останнього рядка)',
        addRowBefore: 'Перед рядком {{position}}',
        addColumnAtStart: 'Зліва (перед колонкою 1)',
        addColumnAtEnd: 'Справа (після останньої колонки)',
        addColumnBefore: 'Перед колонкою {{position}}',
        removeRowTarget: 'Рядок {{position}} ({{label}})',
        removeColumnTarget: 'Колонка {{position}} ({{label}})',
        limitReached: 'Ця дія недоступна для поточного розміру таблиці.',
        review: 'Перевірити',
        back: 'Назад',
        cancel: 'Скасувати',
        confirm: 'Підтвердити',
        confirmAddRow: 'Додати новий рядок: {{target}}?',
        confirmAddColumn: 'Додати нову колонку: {{target}}?',
        confirmRemoveRow:
          'Видалити {{target}}? Після синхронізації чернетки картки в цьому рядку та їхні зображення будуть видалені з сервера.',
        confirmRemoveColumn:
          'Видалити {{target}}? Після синхронізації чернетки картки в цій колонці та їхні зображення будуть видалені з сервера.',
      },
      emptyPanel: {
        description: 'У базі поки немає чернетки. Створіть гру через діалог.',
      },
      createDialog: {
        promptTitle: 'Чернетки поки немає',
        promptDescription:
          'Зараз немає гри в налаштуванні. Почніть створення, коли будете готові — у всіх адмінів буде одна й та сама чернетка.',
        startCreate: 'Створити гру',
        title: 'Назва нової гри',
        detailsDescription:
          'Введіть назву чернетки. Буде створено таблицю-заготовку.',
        nameLabel: 'Назва гри',
        back: 'Назад',
        confirm: 'Створити',
        validationRequired: 'Введіть назву гри.',
        alreadyExists: 'Чернетка гри вже існує. Оновіть сторінку.',
        error: 'Не вдалося створити чернетку гри. Спробуйте ще раз.',
      },
    },
    gameApplication: {
      title: 'Заявка на гру',
      loading: 'Завантаження реєстрації...',
      errorLoading: 'Не вдалося завантажити реєстрацію.',
      notOpen: 'Прийом заявок закритий.',
      description: 'Створіть команду або приєднайтесь до відкритої кімнати.',
      invitationsTitle: 'Запрошення',
      invitationSlot: 'Слот {{slot}}',
      acceptInvitation: 'Прийняти',
      declineInvitation: 'Відхилити',
      myTeamTitle: 'Ваша команда',
      leaveTeam: 'Вийти з команди',
      createTeamTitle: 'Створити команду',
      createOpenTeam: 'Відкрита кімната',
      createClosedTeam: 'Закрита кімната',
      openTeamsTitle: 'Відкриті команди',
      joinTeam: 'Приєднатися',
      teamSlot: 'Слот {{slot}} · гравців: {{count}}',
      backToBoard: 'До ігрового поля',
    },
    gameRegistration: {
      teamStatus: {
        forming: 'Формування',
        confirmed: 'Підтверджена',
        disbanded: 'Розформована',
      },
      errors: {
        notOpen: 'Прийом заявок для гри в статусі ready не відкритий.',
        noSlots: 'Немає вільних слотів для команд.',
        alreadyOnTeam: 'Ви вже в команді на цю гру.',
        teamNotFound: 'Команду не знайдено.',
        teamNotJoinable: 'До цієї команди не можна приєднатися або підтвердити її в поточному стані.',
        notTeamMember: 'Ви не в команді на цю гру.',
        invitationInvalid: 'Запрошення не знайдено або вже не активне.',
        userNotFound: 'Вибраного користувача не знайдено або його деактивовано.',
        slotNotFound: 'Слот участі не знайдено.',
        slotNotAvailable: 'Слот участі недоступний.',
        pendingInvitation: 'У цього гравця вже є очікуване запрошення на цю гру.',
        operationFailed: 'Не вдалося виконати операцію реєстрації.',
        unauthorized: 'Увійдіть в акаунт, щоб продовжити.',
        forbidden: 'Недостатньо прав для цієї дії.',
        generic: 'Щось пішло не так. Спробуйте ще раз.',
      },
    },
    teamRegistrations: {
      title: 'Заявки команд',
      loading: 'Завантаження команд...',
      errorLoading: 'Не вдалося завантажити команди.',
      notOpen: 'Прийом заявок для гри в статусі ready ще не відкритий.',
      description: 'Підтвердіть команди згідно з правилами складу.',
      empty: 'Ще немає зареєстрованих команд.',
      slot: 'Слот',
      status: 'Статус',
      players: 'Гравці',
      actions: 'Дії',
      confirm: 'Підтвердити',
      reject: 'Відхилити',
    },
    plannedFeatures: {
      roadmapTitle: 'Заплановано (ще не підключено)',
      roadmapHint:
        'Нотатки з обговорення. Частина API на backend вже є; UI та sync у setup — пізніше.',
      formShellBadge: 'Макет UI',
      gameSetup: {
        form: {
          registrationTitle: 'Налаштування реєстрації (чернетка)',
          registrationDescription:
            'Слоти команд, резерв, розмір складу та перехід draft → ready з setup.',
          teamSlotCount: 'Кількість слотів команд',
          minPlayers: 'Мін. гравців у команді',
          maxPlayers: 'Макс. гравців у команді',
          reservedSlots: 'Зарезервовані слоти',
          reservedSlotsPlaceholder:
            'напр. слот 6 — гостьова команда (без публічних заявок)',
          openRegistration: 'Відкрити реєстрацію (draft → ready)',
          startGame: 'Почати гру (ready → active)',
        },
        roadmap: {
          slots: {
            title: 'Сітка слотів у setup',
            description:
              'Кількість команд і public/reserved на слот. Синхронізація з PUT /api/game/setup.',
          },
          teamLimits: {
            title: 'Мін/макс гравців у команді',
            description: 'Зберігати ліміти 1–3 (або інші) в чернетці, не лише дефолти БД.',
          },
          lifecycle: {
            title: 'Життєвий цикл з setup',
            description:
              'Кнопки POST /api/game/lifecycle/open-registration, /start, /finish.',
          },
        },
      },
      gameBoard: {
        form: {
          lifecycleTitle: 'Життєвий цикл гри (адмін)',
          lifecycleDescription: 'Переходи draft → ready → active → finished.',
          openRegistration: 'Відкрити реєстрацію',
          startGame: 'Почати гру',
          finishGame: 'Завершити гру',
        },
        roadmap: {
          lifecycle: {
            title: 'Панель lifecycle для адміна',
            description: 'Підключити три endpoint з підтвердженням і сповіщеннями.',
          },
          applicationGate: {
            title: 'Кнопка заявки за статусом',
            description:
              'Показувати «Заявка на гру» лише в ready; ховати в draft/active/finished.',
          },
        },
      },
      gameApplication: {
        form: {
          slotsTitle: 'Огляд слотів',
          slotsDescription:
            'Карта public/reserved і зайнятості з GET /api/game/registration.',
          slotLabel: 'Слот {{slot}}',
          slotFree: 'вільний',
          memberInviteTitle: 'Інвайти в закриту команду',
          memberInviteDescription:
            'Запрошення тіммейтів; зараз інвайти лише через адміна (API).',
          inviteTeammate: 'Запросити гравця',
          submitForReview: 'Надіслати на перевірку',
        },
        roadmap: {
          slotsOverview: {
            title: 'Дошка слотів',
            description:
              'Усі слоти, резерв, pending-інвайти та підтверджені команди.',
          },
          memberInvites: {
            title: 'Інвайти від гравців',
            description:
              'Той самий accept/decline, ініціатор — учасник закритої команди.',
          },
          submitForReview: {
            title: 'Кнопка «готові до перевірки»',
            description: 'Надсилання складу адміну; фільтр у списку команд.',
          },
          statusUx: {
            title: 'Статуси команди',
            description:
              'forming vs confirmed; обмеження після підтвердження і поза ready.',
          },
          closedWhenInactive: {
            title: 'Лише читання після ready',
            description: 'У active/finished — історія без join/leave.',
          },
        },
      },
      teamRegistrations: {
        form: {
          inviteTitle: 'Запросити гравця в слот / команду',
          inviteDescription:
            'Пошук користувача, слот, ланцюжок для closed. POST .../invitations.',
          slot: 'Слот',
          player: 'Гравець',
          targetTeam: 'Команда (опційно)',
          sendInvite: 'Надіслати запрошення',
        },
        roadmap: {
          adminInvite: {
            title: 'UI інвайтів адміна',
            description:
              'Вибір гравця + слот + ланцюжок (P1 accept → інвайт P2). API вже є.',
          },
          slotBoard: {
            title: 'Вид по слотах',
            description: 'Reserved/public і pending-інвайти на слот.',
          },
          moderationPolicy: {
            title: 'Ручний режим модерації',
            description:
              'Зараз join у open room одразу; опційна черга на confirm.',
          },
          filters: {
            title: 'Фільтри',
            description: 'forming/confirmed/disbanded; сортування за слотом.',
          },
        },
      },
    },
    languageSwitcher: {
      ariaLabel: 'Мова інтерфейсу',
      languages: {
        ru: 'RU',
        en: 'EN',
        uk: 'UA',
        pl: 'PL',
      },
    },
  },
}

export default uk
