import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Divider
} from '@mui/material';
import { ArrowLeft, Info } from 'lucide-react';

export const Impressum: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 6, flexGrow: 1 }} className="animate-fade-in">
      {/* Back Button */}
      <Button
        variant="text"
        color="inherit"
        startIcon={<ArrowLeft size={16} />}
        onClick={() => navigate('/')}
        sx={{
          mb: 3,
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 600,
          opacity: 0.8,
          '&:hover': {
            opacity: 1,
            color: 'primary.main',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'
          }
        }}
      >
        Zurück zur Startseite
      </Button>

      {/* Main Glass Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, md: 6 },
          borderRadius: 5,
          background: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(16px)',
          border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 20px 40px -15px rgba(0,0,0,0.5)' : '0 20px 40px -15px rgba(15, 23, 42, 0.05)',
        }}
      >
        {/* Title */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 4 }}>
          <Box
            sx={{
              p: 1.2,
              borderRadius: 3,
              bgcolor: 'rgba(20, 184, 166, 0.1)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              color: 'secondary.main',
              display: 'flex'
            }}
          >
            <Info size={24} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Impressum
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Angaben gemäß § 5 TMG.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 4 }} />

        {/* Content */}
        <Stack spacing={4} sx={{ textAlign: 'left', lineHeight: 1.8 }}>
          <Box>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
              Angaben gemäß § 5 TMG
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Roland Förther<br />
              Königswarterstr. 64<br />
              90762 Fürth<br />
              Deutschland
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
              Kontakt
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Telefon: +49 911 81222493<br />
              E-Mail: dev@foerther.de<br />
              Webseite: ???
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Roland Förther<br />
              Königswarterstr. 64<br />
              90762 Fürth
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
              Haftungsausschluss (Disclaimer)
            </Typography>
            
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Haftung für Inhalte
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Haftung für Links
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Urheberrecht
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
};
