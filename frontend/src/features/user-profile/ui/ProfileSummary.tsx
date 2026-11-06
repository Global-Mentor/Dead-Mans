import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { components } from '../../../shared/api/contracts/generated'
import { ImageFrame, Metric, SectionDivider } from '../../../shared/ui/index.ts'

export function ProfileSummary({ profile }: { profile: components['schemas']['UserProfileDto'] }) {
  const { t, i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language)
  return (
    <Box
      component="section"
      aria-label={t('userProfile.overview')}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, max-content) auto minmax(0, 1fr)' },
        gap: 2,
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gap: 2,
          alignItems: 'center',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Box sx={{ width: 56, height: 56, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
            {profile.profileImageUrl ? (
              <ImageFrame
                src={profile.profileImageUrl}
                fit="cover"
                sizing="fill"
                alt={t('userProfile.avatar', { name: profile.displayName })}
                loadingLabel={t('userProfile.avatarLoading')}
                errorLabel={t('userProfile.avatarUnavailable')}
                sx={{ width: 56, height: 56 }}
              />
            ) : (
              <Typography
                variant="h5"
                role="img"
                aria-label={t('userProfile.avatar', { name: profile.displayName })}
              >
                {profile.displayName
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((word) => Array.from(word)[0] ?? '')
                  .join('')
                  .toLocaleUpperCase(i18n.language)}
              </Typography>
            )}
          </Box>
          <Typography
            component="h2"
            variant="h5"
            color="primary.light"
            sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
          >
            {profile.displayName}
          </Typography>
        </Stack>
        <Metric
          appearance="summary"
          density="compact"
          label={t('userProfile.playerGames')}
          value={number.format(profile.playerGameCount)}
        />
      </Box>
      <SectionDivider
        orientation="vertical"
        flexItem
        sx={{ display: { xs: 'none', md: 'block' } }}
      />
      <SectionDivider sx={{ display: { xs: 'block', md: 'none' } }} />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        <Metric
          appearance="summary"
          density="compact"
          label={t('userProfile.quizGames')}
          value={number.format(profile.quizGameCount)}
        />
        <Metric
          appearance="summary"
          density="compact"
          label={t('userProfile.totalAnswers')}
          value={number.format(profile.answerCount)}
        />
        <Metric
          appearance="summary"
          density="compact"
          label={t('userProfile.correctAnswers')}
          value={number.format(profile.correctAnswerCount)}
        />
      </Box>
    </Box>
  )
}
