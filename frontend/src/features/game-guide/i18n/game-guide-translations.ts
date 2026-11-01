const translations = {
  ru: {
    title: 'Как играть в Dead Mans',
    intro:
      'Dead Mans - командное испытание в Hunt: Showdown, которое добавляет разнообразия в привычный геймплей и немного соревновательного азарта.',
    contents: 'В этом руководстве',
    sections: {
      start: 'Участие',
      round: 'Раунд',
      quiz: 'Викторина',
      modifiers: 'Модификаторы',
      score: 'Очки',
      faq: 'Вопросы',
    },
    start: {
      title: 'Как принять участие',
      requirementsTitle: 'Условия для участия',
      requirementsWeapons:
        'У вас должно быть открыто как можно больше различных оружейных модификаций в Hunt: Showdown.',
      requirementsBalance: 'На балансе должно быть не менее 4000 Hunt-долларов.',
      body: 'В одной игре можно состоять только в одной команде. Капитана нет: участники равноправны. Размер команды задаёт организатор.',
      ready: 'Если кто-то выйдет из команды, оставшимся игрокам нужно снова нажать «Готов».',
      description: 'От заявки до готовой команды.',
      windowTitle: 'Дождитесь открытия регистрации',
      window:
        'Когда организатор откроет регистрацию, перейдите во вкладку «Заявка». Записаться нужно до начала игры.',
      openTitle: 'Открытая команда',
      open: 'Нет напарника и готовы сыграть с кем-то новым? Создайте открытую команду или вступите в уже созданную. К открытой команде может присоединиться любой участник, пока есть свободное место.',
      closedTitle: 'Закрытая команда',
      closed:
        'Уже знаете, с кем будете играть? Создайте закрытую команду и пригласите напарника. Он должен принять приглашение, чтобы занять место. Другие игроки не смогут вступить самостоятельно.',
      confirmation:
        'После подтверждения администратором нельзя самостоятельно выйти из команды или заменить участника.',
      details: 'Как выглядит заявка: открытая и закрытая команда',
      steps: {
        joinTitle: 'Соберите команду',
        join: 'Нет напарника - выберите открытую команду. Хотите играть со знакомым - создайте закрытую и пригласите его.',
        readyTitle: 'Все нажмите «Готов»',
        ready:
          'Укажите название и соберите полный состав. Затем каждый участник должен нажать «Готов» за себя.',
        confirmTitle: 'Дождитесь подтверждения администратора',
        confirm:
          'Когда все готовы, администратор проверит и подтвердит команду. После этого следите за вкладкой «Очередь команд».',
      },
    },
    round: {
      title: 'Как проходит раунд',
      chooseTitle: 'Выбор и открытие карточки',
      choose:
        'Когда наступит ваша очередь, выберите закрытую карточку на доске. Ведущий откроет её. Перейдите в «Текущий раунд» и посмотрите, какой лодаут выпал и какие условия нужно выполнить. За само открытие очки не начисляются.',
      orderTitle: 'Заказ модификаторов',
      order:
        'Ведущий открывает заказ. Зрители и участники других команд могут потратить личные очки на модификаторы этого раунда. Ваша команда пока знакомится с заданием и новыми условиями.',
      playTitle: 'Прохождение испытания',
      play: 'После запуска играйте с выпавшим лодаутом и соблюдайте условия карточки и модификаторов. С этого момента идут таймеры модификаторов.',
      resultTitle: 'Показ итогов',
      result:
        'После проверки результат сохраняется и показывается участникам. Посмотрите, сколько очков получила команда и за что. Когда ведущий завершит показ, можно переходить к следующей карточке.',
      description: 'Текущий этап виден во вкладке «Текущий раунд». Переходы запускает ведущий.',
      prepareTitle: 'Подготовка команды',
      prepare:
        'Когда заказ закрыт, соберите нужный лодаут и проверьте все активные модификаторы. После завершения подготовки дождитесь отдельного запуска игры ведущим.',
      reviewTitle: 'Проверка результата',
      review:
        'По окончании прохождения ведущий записывает убийства, награды и выполнение модификаторов. На основе этих данных рассчитываются очки и штрафы.',
    },
    quiz: {
      title: 'Как работает викторина',
      earn: 'Откройте «Викторину», прочитайте вопрос и нажмите на выбранный вариант. Убедитесь, что ответ принят.',
      description: 'Отвечайте на вопросы и зарабатывайте очки для модификаторов.',
      earnTitle: 'Выберите ответ до конца таймера',
      exampleTitle: 'Пример личного баланса',
      earned: 'Заработано',
      spent: 'Потрачено',
      left: 'Осталось',
      essence:
        'Ведущий запускает вопрос с несколькими вариантами ответа. За правильный ответ вы получаете личные очки в текущей игре. Их можно потратить на модификаторы для раундов других команд.',
      answerRule: 'Ответить можно только один раз. После отправки изменить вариант нельзя.',
      result:
        'Когда вопрос закроется, вы увидите правильный ответ и начисленную награду. Личный баланс и результаты ответов доступны на странице викторины.',
    },
    score: {
      title: 'Очки и итог команды',
      round:
        'За каждое засчитанное убийство и каждую награду команда получает очки в размере цены карточки. Затем учитываются эффекты модификаторов: дополнительные убийства, бонусы и вычеты. Подробный расчёт виден в результате раунда.',
      example: 'Карточка стоит 200. Команда сделала 2 убийства и получила 1 награду.',
      empty:
        'Если убийства, награды и бонусные убийства в сумме дают ноль, а модификаторы не добавляют положительных очков, команда получает штраф в размере цены карточки. Например, карточка за 200 без результата даёт -200 очков. Другие вычеты от модификаторов тоже учитываются.',
      formula: 'Итог команды = лучший положительный результат - сумма штрафов.',
      caption: 'Пример нескольких раундов одной команды',
      first: 'Первый',
      second: 'Второй',
      third: 'Третий',
      total: '600 - 100 = 500 очков',
      explanation:
        'Из результатов 600 и 400 берём лучший - 600. Минус 100 из третьего раунда остаётся штрафом. Итог команды: 500 очков.',
      ties: 'При равном итоге команды делят место: например, 1, 1, 3. Технически отменённые раунды не учитываются. Результаты завершённых игр можно посмотреть в истории.',
      description: 'Как считается один раунд и что попадает в общий результат.',
      roundExample: 'Один раунд без модификаторов',
      roundFormula: '200 × (2 + 1) = 600 очков',
      penalty: 'Штраф',
      positive: 'Результат раунда',
      penaltyRule:
        'Накопленный штраф - это отрицательный итог раунда. Вычеты модификаторов уже входят в него, поэтому второй раз их не отнимают.',
      details: 'Когда начисляется штраф и как считаются равные результаты',
      team: 'Если команда играет несколько раундов, их очки не складываются. В зачёт идёт лучший положительный результат, из которого вычитаются все накопленные штрафы этой игры.',
      persistentTitle: 'Новый раунд не обнуляет штрафы',
      persistent:
        'Если раунд закончился с минусом, этот минус сохраняется за командой до конца текущей игры. Штрафы из разных раундов складываются и уменьшают общий итог, даже если позже команда улучшила свой лучший результат.',
      nextRound:
        'Если следующий раунд принесёт 800 очков без новых штрафов, итог станет 800 - 100 = 700. Старый штраф никуда не исчезает.',
      noPositive:
        'Если положительных результатов пока нет, лучший результат считается равным нулю. Тогда итог команды равен минус сумме штрафов.',
    },
    faq: {
      noGame: 'Почему нет заявки или викторины?',
      noGameAnswer:
        'Заявка доступна после открытия регистрации и до запуска игры. Викторина и модификаторы появляются во время активной игры. Некоторые игры проходят без них. Если регистрация ещё не открыта, дождитесь объявления организатора.',
      leave: 'Можно ли изменить подтверждённый состав?',
      leaveAnswer:
        'Самостоятельно выйти из подтверждённой команды или заменить участника нельзя. Во время регистрации можно отправить запрос на расформирование. Решение принимает организатор.',
      rules: 'Где смотреть условия конкретной карточки?',
      rulesAnswer:
        'В «Текущем раунде» после её открытия. Это руководство объясняет общий порядок игры. Задание карточки и описания выбранных модификаторов определяют условия конкретного прохождения.',
      description: 'Нажмите на вопрос, чтобы раскрыть ответ.',
      blocked: 'Почему не получается активировать модификатор?',
      blockedAnswer:
        'Проверьте этап заказа, личный баланс, лимит и совместимость. Участники активной команды не могут покупать модификаторы для своего раунда. Организатор также может отключить новые активации. Причина ограничения показывается рядом с действием.',
      refund: 'Можно ли вернуть очки за модификатор?',
      refundAnswer:
        'Да, свою покупку можно отменить, пока заказ открыт. Очки вернутся на личный баланс. После закрытия заказа самостоятельная отмена недоступна.',
      title: 'Частые вопросы',
    },
    images: {
      note: 'Пример интерфейса на демонстрационных данных.',
      board: 'Доска с закрытыми карточками и их ценами',
      boardCaption: 'Доска: выберите карточку, ориентируясь на колонку и цену.',
      enlarge: 'Увеличить: {{name}}',
      previewHint:
        'На узком экране прокрутите изображение по горизонтали, чтобы рассмотреть детали.',
      loading: 'Загрузка иллюстрации...',
      error: 'Не удалось загрузить иллюстрацию. Описание доступно под ней.',
      view: 'Рассмотреть скриншот',
      application: 'Страница заявки с выбором открытой или закрытой команды',
      applicationCaption:
        'Заявка: укажите название, выберите тип команды и создайте её. Справа можно найти уже открытые команды.',
    },
    close: 'Закрыть',
    overview: {
      eyebrow: 'Правила и первые шаги',
      influence:
        'Зрители и другие участники тоже влияют на раунд: с помощью модификаторов они меняют условия, в которых команда проходит испытание.',
      goal: 'Цель команды - показать лучший результат.',
      turnOrder:
        'Команды играют в порядке очереди, друг за другом. Одна команда - одна игровая сессия. Команды не запускаются вместе в одном лобби.',
      how: 'В свой ход команда выбирает карточку с лодаутом - набором оружия и снаряжения, с которым предстоит сыграть. Карточки разделены по сложности и категориям, названия которых лишь намекают на содержимое. Чем выше сложность, тем труднее реализовать лодаут: риски больше, но и возможная награда выше.',
      essenceTitle: 'Суть игры',
      roles:
        'Участвовать можно в двух ролях: играть в команде или быть зрителем. Игроки проходят испытания, а зрители отвечают на викторину и используют заработанные очки для активации модификаторов.',
    },
    modifiers: {
      title: 'Как работают модификаторы',
      description: 'Меняйте условия раунда за личные очки.',
      essence:
        'Модификатор добавляет к карточке новое условие или эффект. Он может изменить прохождение, дать бонус или привести к штрафу. Перед покупкой прочитайте описание: что должна сделать команда и как это повлияет на результат.',
      spendTitle: 'Дождитесь открытия заказа',
      spend:
        'На этапе заказа откройте «Модификаторы», выберите подходящий, проверьте цену и подтвердите активацию. Очки спишутся с личного баланса, а модификатор будет действовать в этом раунде.',
      refund:
        'Передумали? Пока заказ открыт, отмените свою активацию - очки вернутся на баланс. После закрытия заказа самостоятельно отменить её нельзя. В некоторых играх викторина и модификаторы могут быть отключены.',
      ownTeamTitle: 'Для своего раунда покупать модификаторы нельзя',
      ownTeam:
        'Если сейчас играет ваша команда, повлиять на её условия могут зрители и участники других команд.',
      checkTitle: 'Что проверить перед покупкой',
      effect:
        'Условия: кто выполняет задание и что произойдёт при успехе или неудаче. Не каждый модификатор меняет очки.',
      limits:
        'Цена, лимит покупок и совместимость. Нужны свободный лимит и достаточный баланс. Несовместимые модификаторы вместе не активируются.',
      timers:
        'Длительность действия. Таймер начинается с запуска игры ведущим, а не с момента покупки. Смотрите описание и таймеры в текущем раунде.',
    },
  },
  en: {
    title: 'How to play Dead Mans',
    intro:
      'Dead Mans is a team challenge in Hunt: Showdown that brings variety to familiar gameplay with a touch of competition.',
    contents: 'In this guide',
    sections: {
      start: 'Join',
      round: 'Round',
      quiz: 'Quiz',
      modifiers: 'Modifiers',
      score: 'Scoring',
      faq: 'FAQ',
    },
    start: {
      title: 'How to take part',
      requirementsTitle: 'Participation requirements',
      requirementsWeapons:
        'You must have as many different weapon variants unlocked in Hunt: Showdown as possible.',
      requirementsBalance: 'You must have at least 4000 Hunt Dollars on your balance.',
      body: 'You can belong to one team per game. There is no captain: all members are equal. The organizer sets the team size.',
      ready:
        'If someone leaves the team, the remaining players need to mark themselves ready again.',
      description: 'From signing up to a ready team.',
      windowTitle: 'Wait for registration to open',
      window:
        'When the organizer opens registration, open the Apply tab. Sign up before the game starts.',
      openTitle: 'Open team',
      open: 'No teammate yet and happy to play with someone new? Create an open team or join an existing one. Anyone can join an open team while a slot is available.',
      closedTitle: 'Closed team',
      closed:
        'Already know who you want to play with? Create a closed team and invite your teammate. They must accept the invitation to take a slot. Other players cannot join on their own.',
      confirmation:
        'After administrator confirmation, you cannot leave the team or replace a member yourself.',
      details: 'The application screen: open and closed teams',
      steps: {
        joinTitle: 'Form a team',
        join: 'No teammate yet? Choose an open team. Want to play with a friend? Create a closed team and invite them.',
        readyTitle: 'Everyone marks themselves ready',
        ready:
          'Give your team a name and fill every slot. Each member must then mark themselves ready.',
        confirmTitle: 'Wait for administrator confirmation',
        confirm:
          'Once everyone is ready, an administrator checks and confirms the team. Then follow the Team queue page.',
      },
    },
    round: {
      title: 'How a round works',
      chooseTitle: 'Choose and reveal a card',
      choose:
        'When your turn comes, choose a face-down card on the board. The host reveals it. Open Current round to see your loadout and its conditions. Revealing a card does not award points.',
      orderTitle: 'Order modifiers',
      order:
        'The host opens ordering. Spectators and members of other teams can spend personal points on modifiers for this round. Your team reviews the challenge and the added conditions.',
      playTitle: 'Play the challenge',
      play: 'After the start, play with your assigned loadout and follow the card and modifier conditions. Modifier timers begin at this point.',
      resultTitle: 'Show the results',
      result:
        'The reviewed result is saved and shown to participants. Check how many points your team earned and why. The next card becomes available once the host ends the presentation.',
      description: 'The current stage appears in Current round. The host advances the stages.',
      prepareTitle: 'Prepare your team',
      prepare:
        'Once ordering closes, equip the required loadout and check every active modifier. After preparation is complete, wait for the host to start gameplay separately.',
      reviewTitle: 'Review the result',
      review:
        'After the attempt, the host records kills, bounties and modifier outcomes. These determine the points and penalties.',
    },
    quiz: {
      title: 'How the quiz works',
      earn: 'Open Quiz, read the question and select your answer. Check that it has been accepted.',
      description: 'Answer questions to earn points for modifiers.',
      earnTitle: 'Choose before the timer ends',
      exampleTitle: 'Personal balance example',
      earned: 'Earned',
      spent: 'Spent',
      left: 'Remaining',
      essence:
        'The host opens a multiple-choice question. A correct answer earns personal points for the current game. Spend them on modifiers for other teams’ rounds.',
      answerRule: 'You can answer only once. You cannot change your choice after submitting it.',
      result:
        'When the question closes, you see the correct answer and awarded points. Your personal balance and answer results are on the quiz page.',
    },
    score: {
      title: 'Points and the team result',
      round:
        'Each counted kill and bounty earns the card’s value. Modifier effects then add bonus kills, points or deductions. The round result shows the detailed calculation.',
      example: 'The card is worth 200. The team gets 2 kills and 1 bounty.',
      empty:
        'If kills, bounties and bonus kills total zero and modifiers add no positive points, the penalty equals the card’s value. For example, a 200-point card with no result gives -200 points. Other modifier deductions still apply.',
      formula: 'Team result = best positive result - total penalties.',
      caption: 'Example of several rounds played by one team',
      first: 'First',
      second: 'Second',
      third: 'Third',
      total: '600 - 100 = 500 points',
      explanation:
        'Between 600 and 400, take the best result: 600. The third round’s -100 remains a penalty. The team total is 500 points.',
      ties: 'Equal totals share a place, for example 1, 1, 3. Technically cancelled rounds do not count. Completed game results are available in History.',
      description: 'How one round is scored and what counts towards the final result.',
      roundExample: 'One round without modifiers',
      roundFormula: '200 × (2 + 1) = 600 points',
      penalty: 'Penalty',
      positive: 'Round result',
      penaltyRule:
        'The accumulated penalty is the negative round result. Modifier deductions are already included, so they are not subtracted twice.',
      details: 'When penalties apply and how ties work',
      team: 'If your team plays several rounds, their scores are not added together. Your best positive result counts, minus all accumulated penalties in this game.',
      persistentTitle: 'A new round does not clear penalties',
      persistent:
        'A negative round result stays with your team until the end of the current game. Penalties from different rounds add up and reduce the total, even if your team later improves its best result.',
      nextRound:
        'If the next round earns 800 points with no new penalties, the total becomes 800 - 100 = 700. The earlier penalty still applies.',
      noPositive:
        'If there are no positive results yet, the best score is zero. The team total is then the negative sum of its penalties.',
    },
    faq: {
      noGame: 'Why can’t I see Apply or Quiz?',
      noGameAnswer:
        'The Apply tab is available from registration opening until the game starts. Quiz and Modifiers appear during an active game. Some games run without them. If registration has not opened yet, wait for the organizer’s announcement.',
      leave: 'Can a confirmed roster change?',
      leaveAnswer:
        'You cannot leave a confirmed team or replace a member yourself. During registration, you can request that the team be disbanded. An organizer decides whether to do so.',
      rules: 'Where are the rules for a specific card?',
      rulesAnswer:
        'In Current round after the card is revealed. This guide explains the overall flow. The card’s challenge and the selected modifiers define the conditions of that round.',
      description: 'Select a question to reveal the answer.',
      blocked: 'Why can’t I activate a modifier?',
      blockedAnswer:
        'Check the ordering stage, your balance, limits and compatibility. Active-team members cannot buy modifiers for their own round. An organizer may also disable new activations. The reason appears beside the action.',
      refund: 'Can I get my modifier points back?',
      refundAnswer:
        'Yes. Cancel your own purchase while ordering is open to refund your personal balance. Self-service cancellation is unavailable after ordering closes.',
      title: 'Common questions',
    },
    images: {
      note: 'Interface example using demonstration data.',
      board: 'Board with closed cards and their values',
      boardCaption: 'Board: choose a card by its column and value.',
      enlarge: 'Enlarge: {{name}}',
      previewHint: 'On a narrow screen, scroll the image horizontally to see the details.',
      loading: 'Loading illustration...',
      error: 'Could not load the illustration. Its description is available below.',
      view: 'View screenshot',
      application: 'Application page with open and closed team choices',
      applicationCaption:
        'Application: enter a name, choose the team type and create it. Existing open teams are listed on the right.',
    },
    close: 'Close',
    overview: {
      eyebrow: 'Rules and first steps',
      influence:
        'Spectators and other participants also influence the round: modifiers let them change the conditions in which the team tackles its challenge.',
      goal: 'Your team’s goal is to achieve the best result.',
      turnOrder:
        'Teams play in queue order, one after another. One team - one game session. Teams do not join the same lobby to play together.',
      how: 'On its turn, a team chooses a card with a loadout: the weapons and equipment it will play with. Cards are grouped by difficulty and categories whose names only hint at their contents. Higher difficulty means a harder loadout to put to use: greater risks, but also a higher potential reward.',
      essenceTitle: 'How the game works',
      roles:
        'You can take part as a team player or a spectator. Players tackle the challenges, while spectators answer quiz questions and spend their earned points on modifiers.',
    },
    modifiers: {
      title: 'How modifiers work',
      description: 'Spend personal points to change the round conditions.',
      essence:
        'A modifier adds a condition or effect to the card. It can change the challenge, grant a bonus or lead to a penalty. Before buying, read what the team must do and how it affects the result.',
      spendTitle: 'Wait for ordering to open',
      spend:
        'During ordering, open Modifiers, choose one, check the price and confirm activation. The cost is deducted from your personal balance and the modifier applies to this round.',
      refund:
        'Changed your mind? Cancel your own activation while ordering is open to get the points back. You cannot cancel it yourself once ordering closes. Some games may have no quiz or modifiers.',
      ownTeamTitle: 'You cannot buy modifiers for your own round',
      ownTeam:
        'While your team is playing, spectators and members of other teams can change its conditions.',
      checkTitle: 'What to check before buying',
      effect:
        'Conditions: who must complete the task and what happens on success or failure. Not every modifier changes points.',
      limits:
        'Price, purchase limit and compatibility. You need enough points and an available activation. Incompatible modifiers cannot be active together.',
      timers:
        'Duration. Timers begin when the host starts gameplay, not when you buy. Check the description and the timers in Current round.',
    },
  },
  uk: {
    title: 'Як грати в Dead Mans',
    intro:
      'Dead Mans - командне випробування в Hunt: Showdown, яке додає різноманіття у звичний геймплей і трохи змагального азарту.',
    contents: 'У цьому посібнику',
    sections: {
      start: 'Участь',
      round: 'Раунд',
      quiz: 'Вікторина',
      modifiers: 'Модифікатори',
      score: 'Бали',
      faq: 'Питання',
    },
    start: {
      title: 'Як узяти участь',
      requirementsTitle: 'Умови для участі',
      requirementsWeapons:
        'У вас має бути відкрито якомога більше різних модифікацій зброї в Hunt: Showdown.',
      requirementsBalance: 'На балансі має бути щонайменше 4000 Hunt-доларів.',
      body: 'В одній грі можна входити лише до однієї команди. Капітана немає: учасники рівноправні. Розмір команди задає організатор.',
      ready: 'Якщо хтось вийде з команди, решті гравців потрібно знову позначити себе готовими.',
      description: 'Від заявки до готової команди.',
      windowTitle: 'Дочекайтеся відкриття реєстрації',
      window:
        'Коли організатор відкриє реєстрацію, перейдіть до вкладки «Заявка». Записатися потрібно до початку гри.',
      openTitle: 'Відкрита команда',
      open: 'Немає напарника й готові зіграти з кимось новим? Створіть відкриту команду або приєднайтеся до вже створеної. До відкритої команди може вступити будь-який учасник, доки є вільне місце.',
      closedTitle: 'Закрита команда',
      closed:
        'Уже знаєте, з ким гратимете? Створіть закриту команду та запросіть напарника. Він має прийняти запрошення, щоб зайняти місце. Інші гравці не зможуть приєднатися самостійно.',
      confirmation:
        'Після підтвердження адміністратором не можна самостійно вийти з команди або замінити учасника.',
      details: 'Як виглядає заявка: відкрита й закрита команда',
      steps: {
        joinTitle: 'Зберіть команду',
        join: 'Немає напарника - оберіть відкриту команду. Хочете грати зі знайомим - створіть закриту й запросіть його.',
        readyTitle: 'Усі підтвердьте готовність',
        ready:
          'Укажіть назву та зберіть повний склад. Потім кожен учасник має позначити себе готовим.',
        confirmTitle: 'Дочекайтеся підтвердження адміністратора',
        confirm:
          'Коли всі готові, адміністратор перевірить і підтвердить команду. Після цього стежте за вкладкою «Черга команд».',
      },
    },
    round: {
      title: 'Як проходить раунд',
      chooseTitle: 'Вибір і відкриття картки',
      choose:
        'Коли настане ваша черга, оберіть закриту картку на дошці. Ведучий відкриє її. Перейдіть до «Поточного раунду» та подивіться, який лодаут випав і які умови треба виконати. За саме відкриття бали не нараховуються.',
      orderTitle: 'Замовлення модифікаторів',
      order:
        'Ведучий відкриває замовлення. Глядачі та учасники інших команд можуть витратити особисті бали на модифікатори цього раунду. Ваша команда поки знайомиться із завданням і новими умовами.',
      playTitle: 'Проходження випробування',
      play: 'Після запуску грайте з отриманим лодаутом і дотримуйтеся умов картки та модифікаторів. Із цього моменту йдуть таймери модифікаторів.',
      resultTitle: 'Показ підсумків',
      result:
        'Після перевірки результат зберігається та показується учасникам. Подивіться, скільки балів отримала команда й за що. Коли ведучий завершить показ, можна переходити до наступної картки.',
      description: 'Поточний етап видно у вкладці «Поточний раунд». Переходи запускає ведучий.',
      prepareTitle: 'Підготовка команди',
      prepare:
        'Коли замовлення закрито, зберіть потрібний лодаут і перевірте всі активні модифікатори. Після завершення підготовки дочекайтеся окремого запуску гри ведучим.',
      reviewTitle: 'Перевірка результату',
      review:
        'Після проходження ведучий записує вбивства, нагороди та виконання модифікаторів. На основі цих даних розраховуються бали й штрафи.',
    },
    quiz: {
      title: 'Як працює вікторина',
      earn: 'Відкрийте «Вікторину», прочитайте запитання та натисніть на обраний варіант. Переконайтеся, що відповідь прийнято.',
      description: 'Відповідайте на запитання та заробляйте бали для модифікаторів.',
      earnTitle: 'Оберіть відповідь до кінця таймера',
      exampleTitle: 'Приклад особистого балансу',
      earned: 'Зароблено',
      spent: 'Витрачено',
      left: 'Залишилося',
      essence:
        'Ведучий запускає запитання з кількома варіантами відповіді. За правильну відповідь ви отримуєте особисті бали в поточній грі. Їх можна витратити на модифікатори для раундів інших команд.',
      answerRule: 'Відповісти можна лише один раз. Після надсилання змінити варіант не можна.',
      result:
        'Коли запитання закриється, ви побачите правильну відповідь і нараховану нагороду. Особистий баланс і результати відповідей доступні на сторінці вікторини.',
    },
    score: {
      title: 'Бали та підсумок команди',
      round:
        'За кожне зараховане вбивство та кожну нагороду команда отримує бали в розмірі ціни картки. Потім враховуються ефекти модифікаторів: додаткові вбивства, бонуси та відрахування. Докладний розрахунок видно в результаті раунду.',
      example: 'Картка коштує 200. Команда зробила 2 вбивства та отримала 1 нагороду.',
      empty:
        'Якщо вбивства, нагороди та бонусні вбивства в сумі дають нуль, а модифікатори не додають позитивних балів, команда отримує штраф у розмірі ціни картки. Наприклад, картка за 200 без результату дає -200 балів. Інші відрахування від модифікаторів теж враховуються.',
      formula: 'Підсумок команди = найкращий позитивний результат - сума штрафів.',
      caption: 'Приклад кількох раундів однієї команди',
      first: 'Перший',
      second: 'Другий',
      third: 'Третій',
      total: '600 - 100 = 500 очок',
      explanation:
        'Із результатів 600 і 400 беремо найкращий - 600. Мінус 100 із третього раунду залишається штрафом. Підсумок команди: 500 балів.',
      ties: 'За однакового підсумку команди ділять місце: наприклад, 1, 1, 3. Технічно скасовані раунди не враховуються. Результати завершених ігор можна переглянути в історії.',
      description: 'Як рахується один раунд і що входить до загального результату.',
      roundExample: 'Один раунд без модифікаторів',
      roundFormula: '200 × (2 + 1) = 600 очок',
      penalty: 'Штраф',
      positive: 'Результат раунду',
      penaltyRule:
        'Накопичений штраф - це від’ємний підсумок раунду. Відрахування модифікаторів уже входять до нього, тому вдруге їх не віднімають.',
      details: 'Коли нараховується штраф і як рахуються однакові результати',
      team: 'Якщо команда грає кілька раундів, їхні бали не додаються. У залік іде найкращий позитивний результат, від якого віднімаються всі накопичені штрафи цієї гри.',
      persistentTitle: 'Новий раунд не обнуляє штрафи',
      persistent:
        'Якщо раунд завершився з мінусом, цей мінус зберігається за командою до кінця поточної гри. Штрафи з різних раундів додаються й зменшують загальний підсумок, навіть якщо згодом команда покращила свій найкращий результат.',
      nextRound:
        'Якщо наступний раунд принесе 800 балів без нових штрафів, підсумок стане 800 - 100 = 700. Старий штраф нікуди не зникає.',
      noPositive:
        'Якщо позитивних результатів поки немає, найкращий результат дорівнює нулю. Тоді підсумок команди дорівнює мінус сумі штрафів.',
    },
    faq: {
      noGame: 'Чому немає заявки або вікторини?',
      noGameAnswer:
        'Заявка доступна від відкриття реєстрації до початку гри. Вікторина та модифікатори з’являються під час активної гри. Деякі ігри проходять без них. Якщо реєстрацію ще не відкрито, дочекайтеся оголошення організатора.',
      leave: 'Чи можна змінити підтверджений склад?',
      leaveAnswer:
        'Самостійно вийти з підтвердженої команди або замінити учасника не можна. Під час реєстрації можна надіслати запит на розформування. Рішення приймає організатор.',
      rules: 'Де подивитися умови конкретної картки?',
      rulesAnswer:
        'У «Поточному раунді» після її відкриття. Посібник пояснює загальний порядок гри. Завдання картки й описи вибраних модифікаторів визначають умови конкретного проходження.',
      description: 'Натисніть на запитання, щоб відкрити відповідь.',
      blocked: 'Чому не вдається активувати модифікатор?',
      blockedAnswer:
        'Перевірте етап замовлення, особистий баланс, ліміт і сумісність. Учасники активної команди не можуть купувати модифікатори для свого раунду. Організатор також може вимкнути нові активації. Причину обмеження показано поруч із дією.',
      refund: 'Чи можна повернути очки за модифікатор?',
      refundAnswer:
        'Так, власну купівлю можна скасувати, поки замовлення відкрито. Очки повернуться на особистий баланс. Після закриття замовлення самостійне скасування недоступне.',
      title: 'Поширені запитання',
    },
    images: {
      note: 'Приклад інтерфейсу на демонстраційних даних.',
      board: 'Дошка із закритими картками та їхньою вартістю',
      boardCaption: 'Дошка: виберіть картку за колонкою та вартістю.',
      enlarge: 'Збільшити: {{name}}',
      previewHint:
        'На вузькому екрані прокрутіть зображення по горизонталі, щоб роздивитися деталі.',
      loading: 'Завантаження ілюстрації...',
      error: 'Не вдалося завантажити ілюстрацію. Опис доступний під нею.',
      view: 'Роздивитися скриншот',
      application: 'Сторінка заявки з вибором відкритої або закритої команди',
      applicationCaption:
        'Заявка: укажіть назву, оберіть тип команди та створіть її. Праворуч можна знайти вже відкриті команди.',
    },
    close: 'Закрити',
    overview: {
      eyebrow: 'Правила та перші кроки',
      influence:
        'Глядачі та інші учасники теж впливають на раунд: за допомогою модифікаторів вони змінюють умови, у яких команда проходить випробування.',
      goal: 'Мета команди - показати найкращий результат.',
      turnOrder:
        'Команди грають у порядку черги, одна за одною. Одна команда - одна ігрова сесія. Команди не запускаються разом в одному лобі.',
      how: 'У свій хід команда обирає картку з лодаутом - набором зброї та спорядження, з яким доведеться грати. Картки поділені за складністю та категоріями, назви яких лише натякають на вміст. Що вища складність, то важче реалізувати лодаут: ризики більші, але й можлива нагорода вища.',
      essenceTitle: 'Суть гри',
      roles:
        'Брати участь можна у двох ролях: грати в команді або бути глядачем. Гравці проходять випробування, а глядачі відповідають на вікторину та використовують зароблені бали для активації модифікаторів.',
    },
    modifiers: {
      title: 'Як працюють модифікатори',
      description: 'Змінюйте умови раунду за особисті бали.',
      essence:
        'Модифікатор додає до картки нову умову або ефект. Він може змінити проходження, дати бонус або призвести до штрафу. Перед купівлею прочитайте опис: що має зробити команда та як це вплине на результат.',
      spendTitle: 'Дочекайтеся відкриття замовлення',
      spend:
        'На етапі замовлення відкрийте «Модифікатори», оберіть потрібний, перевірте ціну та підтвердьте активацію. Бали спишуться з особистого балансу, а модифікатор діятиме в цьому раунді.',
      refund:
        'Передумали? Поки замовлення відкрите, скасуйте свою активацію - бали повернуться на баланс. Після закриття замовлення самостійно скасувати її не можна. У деяких іграх вікторина й модифікатори можуть бути вимкнені.',
      ownTeamTitle: 'Для свого раунду купувати модифікатори не можна',
      ownTeam:
        'Якщо зараз грає ваша команда, вплинути на її умови можуть глядачі та учасники інших команд.',
      checkTitle: 'Що перевірити перед купівлею',
      effect:
        'Умови: хто виконує завдання й що станеться в разі успіху або невдачі. Не кожен модифікатор змінює бали.',
      limits:
        'Ціна, ліміт купівель і сумісність. Потрібні вільний ліміт і достатній баланс. Несумісні модифікатори разом не активуються.',
      timers:
        'Тривалість дії. Таймер починається із запуску гри ведучим, а не з моменту купівлі. Дивіться опис і таймери в поточному раунді.',
    },
  },
  pl: {
    title: 'Jak grać w Dead Mans',
    intro:
      'Dead Mans to drużynowe wyzwanie w Hunt: Showdown, które urozmaica znaną rozgrywkę i dodaje odrobinę rywalizacji.',
    contents: 'W tym poradniku',
    sections: {
      start: 'Udział',
      round: 'Runda',
      quiz: 'Quiz',
      modifiers: 'Modyfikatory',
      score: 'Punkty',
      faq: 'Pytania',
    },
    start: {
      title: 'Jak wziąć udział',
      requirementsTitle: 'Warunki udziału',
      requirementsWeapons:
        'Musisz mieć odblokowanych jak najwięcej różnych wariantów broni w Hunt: Showdown.',
      requirementsBalance: 'Musisz mieć na koncie co najmniej 4000 dolarów Hunt.',
      body: 'W jednej grze możesz należeć tylko do jednej drużyny. Nie ma kapitana: wszyscy członkowie są równi. Organizator ustala wielkość drużyny.',
      ready: 'Jeśli ktoś odejdzie z drużyny, pozostali gracze muszą ponownie potwierdzić gotowość.',
      description: 'Od zgłoszenia do gotowej drużyny.',
      windowTitle: 'Poczekaj na otwarcie zapisów',
      window:
        'Gdy organizator otworzy zapisy, przejdź do zgłoszenia. Zapisz się przed rozpoczęciem gry.',
      openTitle: 'Otwarta drużyna',
      open: 'Nie masz partnera i chętnie zagrasz z kimś nowym? Stwórz otwartą drużynę lub dołącz do istniejącej. Każdy uczestnik może dołączyć do otwartej drużyny, dopóki jest wolne miejsce.',
      closedTitle: 'Zamknięta drużyna',
      closed:
        'Wiesz już, z kim zagrasz? Stwórz zamkniętą drużynę i zaproś partnera. Musi przyjąć zaproszenie, aby zająć miejsce. Inni gracze nie mogą dołączyć samodzielnie.',
      confirmation:
        'Po zatwierdzeniu przez administratora nie możesz samodzielnie opuścić drużyny ani zastąpić jej członka.',
      details: 'Ekran zgłoszenia: otwarte i zamknięte drużyny',
      steps: {
        joinTitle: 'Zbierz drużynę',
        join: 'Nie masz partnera? Wybierz otwartą drużynę. Chcesz grać ze znajomym? Stwórz zamkniętą i zaproś go.',
        readyTitle: 'Wszyscy potwierdzają gotowość',
        ready:
          'Nadajcie drużynie nazwę i zbierzcie pełny skład. Następnie każdy uczestnik musi potwierdzić własną gotowość.',
        confirmTitle: 'Poczekaj na zatwierdzenie administratora',
        confirm:
          'Gdy wszyscy są gotowi, administrator sprawdzi i zatwierdzi drużynę. Potem śledź kolejkę drużyn.',
      },
    },
    round: {
      title: 'Jak przebiega runda',
      chooseTitle: 'Wybór i odkrycie karty',
      choose:
        'Gdy nadejdzie wasza kolej, wybierzcie zakrytą kartę na planszy. Prowadzący ją odkryje. Otwórzcie bieżącą rundę i sprawdźcie zestaw oraz warunki zadania. Samo odkrycie nie daje punktów.',
      orderTitle: 'Zamawianie modyfikatorów',
      order:
        'Prowadzący otwiera zamówienia. Widzowie i członkowie innych drużyn mogą wydać osobiste punkty na modyfikatory tej rundy. Wasza drużyna zapoznaje się z zadaniem i nowymi warunkami.',
      playTitle: 'Wykonanie wyzwania',
      play: 'Po starcie grajcie otrzymanym zestawem i przestrzegajcie warunków karty oraz modyfikatorów. Wtedy ruszają liczniki modyfikatorów.',
      resultTitle: 'Prezentacja wyników',
      result:
        'Sprawdzony wynik zostaje zapisany i pokazany uczestnikom. Zobaczcie, ile punktów otrzymała drużyna i za co. Kolejna karta jest dostępna po zakończeniu prezentacji przez prowadzącego.',
      description: 'Aktualny etap widać w bieżącej rundzie. Etapy przełącza prowadzący.',
      prepareTitle: 'Przygotowanie drużyny',
      prepare:
        'Po zamknięciu zamówień przygotujcie wymagany zestaw i sprawdźcie wszystkie aktywne modyfikatory. Po zakończeniu przygotowań poczekajcie, aż prowadzący osobno uruchomi rozgrywkę.',
      reviewTitle: 'Sprawdzenie wyniku',
      review:
        'Po zakończeniu próby prowadzący zapisuje zabójstwa, nagrody i wykonanie modyfikatorów. Na tej podstawie obliczane są punkty i kary.',
    },
    quiz: {
      title: 'Jak działa quiz',
      earn: 'Otwórz quiz, przeczytaj pytanie i wybierz odpowiedź. Upewnij się, że została przyjęta.',
      description: 'Odpowiadaj na pytania i zdobywaj punkty na modyfikatory.',
      earnTitle: 'Wybierz odpowiedź przed końcem czasu',
      exampleTitle: 'Przykład osobistego salda',
      earned: 'Zdobyte',
      spent: 'Wydane',
      left: 'Pozostałe',
      essence:
        'Prowadzący uruchamia pytanie z kilkoma odpowiedziami do wyboru. Poprawna odpowiedź daje osobiste punkty w bieżącej grze. Możesz je wydać na modyfikatory rund innych drużyn.',
      answerRule: 'Możesz odpowiedzieć tylko raz. Po wysłaniu nie można zmienić odpowiedzi.',
      result:
        'Po zamknięciu pytania zobaczysz poprawną odpowiedź i przyznaną nagrodę. Osobiste saldo i wyniki odpowiedzi znajdziesz na stronie quizu.',
    },
    score: {
      title: 'Punkty i wynik drużyny',
      round:
        'Każde zaliczone zabójstwo i każda nagroda dają punkty równe wartości karty. Następnie uwzględnia się dodatkowe zabójstwa, premie i odliczenia z modyfikatorów. Szczegółowe obliczenia widać w wyniku rundy.',
      example: 'Karta jest warta 200. Drużyna zdobyła 2 zabójstwa i 1 nagrodę.',
      empty:
        'Jeśli suma zabójstw, nagród i dodatkowych zabójstw wynosi zero, a modyfikatory nie dodają punktów, kara jest równa wartości karty. Na przykład karta za 200 bez wyniku daje -200 punktów. Pozostałe odliczenia modyfikatorów też się liczą.',
      formula: 'Wynik drużyny = najlepszy dodatni wynik - suma kar.',
      caption: 'Przykład kilku rund jednej drużyny',
      first: 'Pierwsza',
      second: 'Druga',
      third: 'Trzecia',
      total: '600 - 100 = 500 punktów',
      explanation:
        'Z wyników 600 i 400 bierzemy najlepszy: 600. Minus 100 z trzeciej rundy pozostaje karą. Wynik drużyny to 500 punktów.',
      ties: 'Równe wyniki dają wspólne miejsce, np. 1, 1, 3. Rundy anulowane technicznie nie liczą się. Wyniki zakończonych gier znajdziesz w historii.',
      description: 'Jak liczymy jedną rundę i co wchodzi do wyniku końcowego.',
      roundExample: 'Jedna runda bez modyfikatorów',
      roundFormula: '200 × (2 + 1) = 600 punktów',
      penalty: 'Kara',
      positive: 'Wynik rundy',
      penaltyRule:
        'Kara to ujemny wynik rundy. Odliczenia modyfikatorów są już w nim uwzględnione, więc nie odejmuje się ich drugi raz.',
      details: 'Kiedy nalicza się karę i jak rozstrzygamy remisy',
      team: 'Jeśli drużyna gra kilka rund, ich punkty się nie sumują. Liczy się najlepszy dodatni wynik pomniejszony o wszystkie kary zgromadzone w tej grze.',
      persistentTitle: 'Nowa runda nie zeruje kar',
      persistent:
        'Ujemny wynik rundy pozostaje karą drużyny do końca bieżącej gry. Kary z różnych rund sumują się i obniżają wynik końcowy, nawet jeśli drużyna później poprawi swój najlepszy rezultat.',
      nextRound:
        'Jeśli kolejna runda da 800 punktów bez nowych kar, wynik wyniesie 800 - 100 = 700. Wcześniejsza kara nadal obowiązuje.',
      noPositive:
        'Jeśli nie ma jeszcze dodatnich wyników, najlepszy wynik wynosi zero. Wynik drużyny jest wtedy równy ujemnej sumie kar.',
    },
    faq: {
      noGame: 'Dlaczego nie widzę zgłoszenia lub quizu?',
      noGameAnswer:
        'Zgłoszenie jest dostępne od otwarcia zapisów do rozpoczęcia gry. Quiz i modyfikatory pojawiają się podczas aktywnej gry. Niektóre gry odbywają się bez nich. Jeśli zapisy nie są jeszcze otwarte, poczekaj na ogłoszenie organizatora.',
      leave: 'Czy można zmienić zatwierdzony skład?',
      leaveAnswer:
        'Nie możesz samodzielnie opuścić zatwierdzonej drużyny ani zastąpić członka. Podczas zapisów możesz poprosić o rozwiązanie drużyny. Decyzję podejmuje organizator.',
      rules: 'Gdzie znajdę warunki konkretnej karty?',
      rulesAnswer:
        'W bieżącej rundzie po odkryciu karty. Poradnik opisuje ogólny przebieg gry. Zadanie karty i opisy wybranych modyfikatorów określają warunki danej rundy.',
      description: 'Wybierz pytanie, aby rozwinąć odpowiedź.',
      blocked: 'Dlaczego nie mogę aktywować modyfikatora?',
      blockedAnswer:
        'Sprawdź etap zamawiania, saldo, limit i zgodność. Członkowie aktywnej drużyny nie mogą kupować modyfikatorów dla swojej rundy. Organizator może też wyłączyć nowe aktywacje. Powód ograniczenia jest pokazany obok akcji.',
      refund: 'Czy mogę odzyskać punkty za modyfikator?',
      refundAnswer:
        'Tak. Anuluj własny zakup, gdy zamówienia są otwarte, aby odzyskać punkty na swoje saldo. Po zamknięciu zamówień samodzielne anulowanie jest niedostępne.',
      title: 'Częste pytania',
    },
    images: {
      note: 'Przykład interfejsu z danymi demonstracyjnymi.',
      board: 'Plansza z zakrytymi kartami i ich wartościami',
      boardCaption: 'Plansza: wybierz kartę według kolumny i wartości.',
      enlarge: 'Powiększ: {{name}}',
      previewHint: 'Na wąskim ekranie przewijaj obraz poziomo, aby zobaczyć szczegóły.',
      loading: 'Ładowanie ilustracji...',
      error: 'Nie udało się wczytać ilustracji. Jej opis jest dostępny poniżej.',
      view: 'Obejrzyj zrzut ekranu',
      application: 'Strona zgłoszenia z wyborem otwartej lub zamkniętej drużyny',
      applicationCaption:
        'Zgłoszenie: wpisz nazwę, wybierz typ drużyny i utwórz ją. Po prawej znajdziesz istniejące otwarte drużyny.',
    },
    close: 'Zamknij',
    overview: {
      eyebrow: 'Zasady i pierwsze kroki',
      influence:
        'Widzowie i inni uczestnicy również wpływają na rundę: modyfikatory pozwalają im zmieniać warunki, w których drużyna wykonuje wyzwanie.',
      goal: 'Celem drużyny jest osiągnięcie najlepszego wyniku.',
      turnOrder:
        'Drużyny grają zgodnie z kolejką, jedna po drugiej. Jedna drużyna - jedna sesja gry. Drużyny nie rozpoczynają gry razem we wspólnym lobby.',
      how: 'W swojej turze drużyna wybiera kartę z zestawem broni i wyposażenia, z którym będzie grać. Karty są podzielone według trudności i kategorii, których nazwy jedynie sugerują zawartość. Im wyższa trudność, tym trudniej wykorzystać zestaw: ryzyko rośnie, ale potencjalna nagroda również.',
      essenceTitle: 'Na czym polega gra',
      roles:
        'Możesz uczestniczyć jako gracz w drużynie lub jako widz. Gracze wykonują wyzwania, a widzowie odpowiadają na pytania quizu i wydają zdobyte punkty na modyfikatory.',
    },
    modifiers: {
      title: 'Jak działają modyfikatory',
      description: 'Zmieniaj warunki rundy za osobiste punkty.',
      essence:
        'Modyfikator dodaje do karty nowy warunek lub efekt. Może zmienić wyzwanie, dać premię albo spowodować karę. Przed zakupem przeczytaj, co drużyna musi zrobić i jak wpłynie to na wynik.',
      spendTitle: 'Poczekaj na otwarcie zamówień',
      spend:
        'Podczas zamawiania otwórz modyfikatory, wybierz jeden, sprawdź cenę i potwierdź aktywację. Koszt zostanie odjęty od osobistego salda, a modyfikator zadziała w tej rundzie.',
      refund:
        'Zmiana zdania? Anuluj własną aktywację, gdy zamówienia są otwarte, aby odzyskać punkty. Po zamknięciu zamówień nie możesz już anulować jej samodzielnie. W niektórych grach quiz i modyfikatory mogą być wyłączone.',
      ownTeamTitle: 'Nie możesz kupować modyfikatorów dla własnej rundy',
      ownTeam:
        'Gdy gra twoja drużyna, na jej warunki mogą wpływać widzowie i członkowie innych drużyn.',
      checkTitle: 'Co sprawdzić przed zakupem',
      effect:
        'Warunki: kto wykonuje zadanie i co stanie się w razie sukcesu lub porażki. Nie każdy modyfikator zmienia punkty.',
      limits:
        'Cena, limit zakupów i zgodność. Potrzebujesz wolnej aktywacji i odpowiedniego salda. Niezgodne modyfikatory nie mogą działać razem.',
      timers:
        'Czas działania. Licznik rusza ze startem rozgrywki, a nie przy zakupie. Sprawdź opis i liczniki w bieżącej rundzie.',
    },
  },
}

export default translations
