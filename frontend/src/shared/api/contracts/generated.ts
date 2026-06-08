

export interface paths {
    "/game": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getCurrentGameBoard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/modifiers/catalog": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getGameModifierCatalog"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/modifiers/{modifierCode}/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["activateGameModifier"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/questions/catalog": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getGameQuestionCatalog"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/questions/{questionId}/enabled": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["setGameQuestionEnabled"];
        trace?: never;
    };
    "/game/questions/{questionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["deleteGameQuestion"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/questions/categories/{category}/enabled": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["setGameQuestionCategoryEnabled"];
        trace?: never;
    };
    "/game/questions/ask-next": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["askNextGameQuestion"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/questions/rounds/{roundId}/answer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["answerGameQuestionRound"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/questions/games/{gameId}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getGameQuestionHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/history/users/{userId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getUserGameHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/setup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getDraftGameSetup"];
        put: operations["updateDraftGameSetup"];
        post: operations["createDraftGameSetup"];
        delete: operations["deleteDraftGameSetup"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/setup/cells/{cellId}/media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["uploadDraftGameSetupCellMedia"];
        delete: operations["deleteDraftGameSetupCellMedia"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/cells/{cellId}/open": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["openGameCell"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/lifecycle/open-registration": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["openGameRegistration"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/lifecycle/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["startGame"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/lifecycle/finish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["finishGame"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/lifecycle/games/{gameId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["archiveGame"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/registration": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getGameRegistrationSnapshot"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/registration/teams": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listRegistrationTeams"];
        put?: never;
        post: operations["createRegistrationTeam"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/registration/teams/leave": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["leaveRegistrationTeam"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/registration/teams/{teamId}/join": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["joinRegistrationTeam"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/registration/teams/{teamId}/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["confirmRegistrationTeam"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/registration/teams/{teamId}/reject": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["rejectRegistrationTeam"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/registration/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["createAdminRegistrationInvitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/registration/invitations/{invitationId}/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["acceptRegistrationInvitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/game/registration/invitations/{invitationId}/decline": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["declineRegistrationInvitation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getAuthSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["logoutAuthSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/twitch/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["startTwitchLogin"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/twitch/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["handleTwitchCallback"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        GameBoardCellMediaDto: {
            url: string;
        };
        GameBoardCellDto: {
            id: string;
            row: number;
            col: number;
            cellType: string;
            title?: string | null;
            description?: string | null;
            cost: number;
            
            state: "closed" | "open";
            media: components["schemas"]["GameBoardCellMediaDto"][];
        };
        CreateGameSetupRequestDto: {
            title: string;
        };
        UpdateGameSetupCellDto: {
            
            id?: string | null;
            row: number;
            col: number;
            title?: string | null;
            cost: number;
        };
        UpdateGameSetupRequestDto: {
            
            expectedVersion: number;
            title: string;
            rowLabels: string[];
            colLabels: string[];
            cells: components["schemas"]["UpdateGameSetupCellDto"][];
            enabledModifierCodes: string[];
        };
        GameSetupSnapshotDto: {
            gameId: string;
            title: string;
            description?: string | null;
            
            status: "draft";
            version: number;
            rows: number;
            cols: number;
            rowLabels: string[];
            colLabels: string[];
            cells: components["schemas"]["GameBoardCellDto"][];
            enabledModifierCodes: string[];
        };
        GameLifecycleStateDto: {
            
            gameId: string;
            
            status: "ready" | "active" | "finished";
        };
        RegistrationPlayerDto: {
            
            userId: string;
            login: string;
            displayName: string;
        };
        RegistrationTeamMemberDto: {
            player: components["schemas"]["RegistrationPlayerDto"];
            
            joinedAtUtc: string;
        };
        RegistrationTeamDto: {
            
            teamId: string;
            slotIndex: number;
            slotAvailability: string;
            reservedLabel?: string | null;
            recruitmentOpen: boolean;
            status: string;
            members: components["schemas"]["RegistrationTeamMemberDto"][];
        };
        RegistrationSlotDto: {
            
            slotId: string;
            slotIndex: number;
            availability: string;
            reservedLabel?: string | null;
            isAvailableForNewTeam: boolean;
            
            teamId?: string | null;
            teamStatus?: string | null;
        };
        RegistrationInvitationDto: {
            
            invitationId: string;
            
            slotId: string;
            slotIndex: number;
            
            teamId?: string | null;
            status: string;
            
            createdAtUtc: string;
        };
        GameRegistrationSnapshotDto: {
            
            gameId: string;
            gameStatus: string;
            minPlayersPerTeam: number;
            maxPlayersPerTeam: number;
            slots: components["schemas"]["RegistrationSlotDto"][];
            teams: components["schemas"]["RegistrationTeamDto"][];
            myTeam?: components["schemas"]["RegistrationTeamDto"] | null;
            myPendingInvitations: components["schemas"]["RegistrationInvitationDto"][];
        };
        CreateRegistrationTeamRequestDto: {
            recruitmentOpen: boolean;
        };
        CreateAdminInvitationRequestDto: {
            
            slotId: string;
            
            invitedUserId: string;
            
            teamId?: string | null;
        };
        GameBoardSnapshotDto: {
            gameId: string;
            title: string;
            description?: string | null;
            
            status: "ready" | "active" | "finished";
            version: number;
            rows: number;
            cols: number;
            rowLabels: string[];
            colLabels: string[];
            cells: components["schemas"]["GameBoardCellDto"][];
            enabledModifierCodes: string[];
            activeModifiers: components["schemas"]["GameModifierActivationDto"][];
        };
        GameModifierDefinitionDto: {
            code: string;
            
            kind: "active" | "passive";
            category: string;
            scoringType: string;
            
            tier: "low" | "mid" | "high";
            name: string;
            description: string;
            activationCost: number;
            defaultLimitPerGame?: number | null;
            iconEmoji?: string | null;
            activationCommand?: string | null;
        };
        GameModifierActivationDto: {
            modifierCode: string;
            
            activatedByUserId: string;
            
            activatedAtUtc: string;
        };
        GameQuestionCatalogItemDto: {
            
            questionId: string;
            vectorCode: string;
            questionCode: string;
            category: string;
            text: string;
            answer: string;
            reward: number;
            isEnabled: boolean;
            askedTotalCount: number;
            correctTotalCount: number;
            
            lastAskedAtUtc?: string | null;
        };
        SetGameQuestionEnabledRequestDto: {
            isEnabled: boolean;
        };
        SetGameQuestionCategoryEnabledRequestDto: {
            isEnabled: boolean;
        };
        AskedGameQuestionDto: {
            
            roundId: string;
            
            gameId: string;
            askOrder: number;
            
            questionId: string;
            vectorCode: string;
            questionCode: string;
            category: string;
            text: string;
            reward: number;
            
            askedAtUtc: string;
        };
        AnswerGameQuestionRequestDto: {
            answer: string;
            answeredByDisplayName?: string | null;
            
            answeredForUserId?: string | null;
        };
        GameQuestionRoundSummaryDto: {
            
            roundId: string;
            
            gameId: string;
            askOrder: number;
            
            questionId: string;
            questionText: string;
            category: string;
            reward: number;
            
            status: "asked" | "answered_correct" | "answered_wrong" | "timeout" | "skipped";
            
            askedAtUtc: string;
            
            answeredAtUtc?: string | null;
            answeredByDisplayName?: string | null;
            
            answeredByUserId?: string | null;
            
            answeredForUserId?: string | null;
            submittedAnswer?: string | null;
            isCorrect?: boolean | null;
            awardedPoints?: number | null;
        };
        UserGameModifierActivationHistoryItemDto: {
            modifierCode: string;
            
            activatedAtUtc: string;
        };
        UserGameQuestionAnswerHistoryItemDto: {
            
            roundId: string;
            
            questionId: string;
            questionText: string;
            category: string;
            
            answeredAtUtc: string;
            isCorrect: boolean;
            awardedPoints: number;
            submittedAnswer?: string | null;
            
            answeredByUserId?: string | null;
        };
        UserGameHistoryItemDto: {
            
            gameId: string;
            gameTitle: string;
            gameStatus: string;
            
            createdAtUtc: string;
            
            startedAtUtc?: string | null;
            
            finishedAtUtc?: string | null;
            modifierActivations: components["schemas"]["UserGameModifierActivationHistoryItemDto"][];
            questionAnswers: components["schemas"]["UserGameQuestionAnswerHistoryItemDto"][];
        };
        
        AuthRole: "admin" | "moderator" | "viewer";
        AuthSessionDto: {
            
            userId: string;
            displayName: string;
            roles: components["schemas"]["AuthRole"][];
        };
        ErrorResponse: {
            error: string;
            
            code?: "game_board.not_found" | "game_board.cell_not_found" | "game_setup.no_draft" | "game_setup.draft_exists" | "game_setup.invalid_title" | "game_setup.invalid_save_request" | "game_setup.cell_not_found" | "game_setup.cell_media_not_found" | "game_setup.invalid_cell_media_upload" | "game_setup.stale_version" | "game_lifecycle.draft_not_found" | "game_lifecycle.ready_already_exists" | "game_lifecycle.active_already_exists" | "game_lifecycle.game_not_ready" | "game_lifecycle.game_not_active" | "game_lifecycle.registration_slots_required" | "game_lifecycle.invalid_team_size_limits" | "game_lifecycle.operation_failed" | "game_lifecycle.draft_delete_not_allowed" | "game_lifecycle.game_not_found" | "game_common.unexpected_server_error" | "game_registration.not_open" | "game_registration.no_slots" | "game_registration.already_on_team" | "game_registration.team_not_found" | "game_registration.team_not_joinable" | "game_registration.not_team_member" | "game_registration.invitation_invalid" | "game_registration.slot_not_found" | "game_registration.slot_not_available" | "game_registration.user_not_found" | "game_registration.pending_invitation" | "game_registration.operation_failed" | "game_modifier.unknown_code" | "game_modifier.game_not_active" | "game_modifier.not_enabled" | "game_modifier.conflict_active" | "game_modifier.limit_reached" | "game_modifier.user_not_resolved" | "game_question.invalid_request" | "game_question.not_found" | "game_question.no_active_game" | "game_question.no_available_questions" | "game_question.round_not_found" | "game_question.round_not_pending" | null;
            
            requestId?: string | null;
        };
        
        GameCellOpenedEventDto: {
            gameId: string;
            version: number;
            cell: components["schemas"]["GameBoardCellDto"];
        };
        
        GameModifierActivatedEventDto: {
            gameId: string;
            version: number;
            activation: components["schemas"]["GameModifierActivationDto"];
        };
        
        GameSetupDraftChangedEventDto: Record<string, never>;
    };
    responses: {
        
        InternalServerError: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ErrorResponse"];
            };
        };
    };
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getCurrentGameBoard: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameBoardSnapshotDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    getGameModifierCatalog: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameModifierDefinitionDto"][];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    activateGameModifier: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                modifierCode: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    getGameQuestionCatalog: {
        parameters: {
            query?: {
                vectorCode?: string;
                category?: string;
                search?: string;
                includeDisabled?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameQuestionCatalogItemDto"][];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    setGameQuestionEnabled: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                questionId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetGameQuestionEnabledRequestDto"];
            };
        };
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    deleteGameQuestion: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                questionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    setGameQuestionCategoryEnabled: {
        parameters: {
            query?: {
                vectorCode?: string;
            };
            header?: never;
            path: {
                category: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SetGameQuestionCategoryEnabledRequestDto"];
            };
        };
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    askNextGameQuestion: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AskedGameQuestionDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    answerGameQuestionRound: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                roundId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AnswerGameQuestionRequestDto"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameQuestionRoundSummaryDto"];
                };
            };
            
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getGameQuestionHistory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                gameId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameQuestionRoundSummaryDto"][];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getUserGameHistory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                userId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserGameHistoryItemDto"][];
                };
            };
            
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    getDraftGameSetup: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameSetupSnapshotDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    updateDraftGameSetup: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateGameSetupRequestDto"];
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameSetupSnapshotDto"];
                };
            };
            
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    createDraftGameSetup: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateGameSetupRequestDto"];
            };
        };
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameSetupSnapshotDto"];
                };
            };
            
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    deleteDraftGameSetup: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    uploadDraftGameSetupCellMedia: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                cellId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    
                    file: string;
                };
            };
        };
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameBoardCellMediaDto"];
                };
            };
            
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    deleteDraftGameSetupCellMedia: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                cellId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    openGameCell: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                cellId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    openGameRegistration: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameLifecycleStateDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    startGame: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameLifecycleStateDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    finishGame: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameLifecycleStateDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    archiveGame: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                gameId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    getGameRegistrationSnapshot: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GameRegistrationSnapshotDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    listRegistrationTeams: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegistrationTeamDto"][];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    createRegistrationTeam: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateRegistrationTeamRequestDto"];
            };
        };
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegistrationTeamDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    leaveRegistrationTeam: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    joinRegistrationTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                teamId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegistrationTeamDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    confirmRegistrationTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                teamId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegistrationTeamDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    rejectRegistrationTeam: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                teamId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    createAdminRegistrationInvitation: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateAdminInvitationRequestDto"];
            };
        };
        responses: {
            
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegistrationInvitationDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    acceptRegistrationInvitation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invitationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RegistrationTeamDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    declineRegistrationInvitation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invitationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            500: components["responses"]["InternalServerError"];
        };
    };
    getAuthSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AuthSessionDto"];
                };
            };
            
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    logoutAuthSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    startTwitchLogin: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            302: {
                headers: {
                    
                    Location?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    handleTwitchCallback: {
        parameters: {
            query?: {
                code?: string;
                state?: string;
                error?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            
            302: {
                headers: {
                    
                    Location?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
