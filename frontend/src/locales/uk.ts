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
      thumbnail: 'МЕНЮ',
      open: 'Відкрити навігацію',
      close: 'Закрити',
      availableSections: 'Доступні розділи',
      roles: {
        admin: 'Адміністратор',
        moderator: 'Модератор',
        viewer: 'Глядач',
      },
      items: {
        gameBoard: {
          label: 'Ігрова дошка',
          description: 'Поточне ігрове поле та стан карток.',
        },
        gameSetup: {
          label: 'Налаштування гри',
          description: 'Чернеткова таблиця для налаштування карток гри.',
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
      statusFinished: 'Завершена',
      openConfirmTitle: 'Відкрити картку?',
      openConfirmDescription:
        'Ви впевнені, що хочете відкрити цю картку (ряд {{row}}, колонка {{col}}, вартість {{cost}})?',
      openCancel: 'Скасувати',
      openConfirm: 'Відкрити',
      openSuccess: 'Картку відкрито.',
      openForbidden: 'Відкривати картки може лише адміністратор.',
      openNotFound: 'Вибрану картку не знайдено.',
      openFailed: 'Не вдалося відкрити картку.',
    },
    gameSetup: {
      title: 'Налаштування гри',
      description:
        'Чернетка гри для налаштування назви, колонок, цін і майбутніх зображень карток.',
      loading: 'Завантаження налаштування гри...',
      errorLoading: 'Не вдалося завантажити налаштування гри.',
      empty: 'Наразі немає гри в статусі чернетки. Створіть нову, щоб почати налаштування.',
      draftBadge: 'Чернетка',
      gameNameLabel: 'Назва гри',
      columnLabel: 'Колонка {{column}}',
      imagePlaceholder: 'Місце для завантаження картинки',
      cellTitleLabel: 'Назва картки',
      cellPriceLabel: 'Ціна',
      createDialog: {
        title: 'Створити нову гру',
        description:
          'Зараз немає гри в процесі налаштування. Введіть назву, щоб створити чернетку з таблицею-заготовкою.',
        nameLabel: 'Назва гри',
        confirm: 'Створити',
        validationRequired: 'Введіть назву гри.',
        alreadyExists: 'Чернетка гри вже існує. Оновіть сторінку.',
        error: 'Не вдалося створити чернетку гри. Спробуйте ще раз.',
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

export default uk
