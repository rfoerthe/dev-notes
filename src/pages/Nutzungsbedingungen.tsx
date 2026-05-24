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
import { ArrowLeft, FileText } from 'lucide-react';

export const Nutzungsbedingungen: React.FC = () => {
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
            <FileText size={24} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Nutzungsbedingungen
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Regeln zur Nutzung unserer Entwickler-Plattform.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 4 }} />

        {/* Content */}
        <Stack spacing={4} sx={{ textAlign: 'left', lineHeight: 1.8 }}>
          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 2, color: 'text.primary' }}>
              1. Geltungsbereich und allgemeine Hinweise
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Diese Nutzungsbedingungen regeln die Nutzung der Plattform „DevNotes“ (im Folgenden „Plattform“ genannt). Die Plattform ist ein kollaborativer Entwickler-Blog, auf dem registrierte und von Administratoren freigegebene Benutzer eigene technische Artikel veröffentlichen können. Mit dem Zugriff auf die Plattform oder der Registrierung eines Benutzerkontos erklären Sie sich mit diesen Nutzungsbedingungen einverstanden.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 2, color: 'text.primary' }}>
              2. Registrierung und Account-Freigabe
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Registrierungsprozess
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Die aktive Teilnahme an der Plattform (Erstellen und Bearbeiten von Blogartikeln) erfordert die Registrierung eines Benutzerkontos. Bei der Registrierung sind korrekte und vollständige Angaben zu machen. Ein Anspruch auf Registrierung besteht nicht.
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Freigabe und Ablehnung
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Neu registrierte Benutzerkonten werden zunächst im Status „ausstehend“ (pending) angelegt und besitzen keine Schreibrechte. Ein Administrator prüft die Anfrage im Admin-Dashboard und entscheidet über die Freigabe (approved) oder Ablehnung (rejected). Abgelehnte Benutzerregistrierungen können von Administratoren jederzeit endgültig aus der Datenbank gelöscht werden, wodurch der gewählte Benutzername und die E-Mail-Adresse für Neuregistrierungen wieder frei werden.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 2, color: 'text.primary' }}>
              3. Erstellung von Inhalten und Verhaltensregeln
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Verantwortlichkeit für Inhalte
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Als Autor sind Sie für die von Ihnen veröffentlichten Inhalte (Texte, Code-Snippets, Bilder, Links) in vollem Umfang selbst verantwortlich. Sie sichern zu, dass Sie über alle erforderlichen Rechte an den von Ihnen veröffentlichten Inhalten verfügen und keine Rechte Dritter (insbesondere Urheberrechte, Markenrechte oder Persönlichkeitsrechte) verletzen.
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Verhaltenscodex (Code of Conduct)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Die Plattform dient dem fachlichen Austausch. Es ist untersagt, beleidigende, diskriminierende, rassistische, verleumderische, pornografische, Gewalt verherrlichende oder sonstige rechtswidrige Inhalte zu veröffentlichen. SPAM-Verbreitung sowie das unerlaubte Bewerben von kommerziellen Produkten oder Dienstleistungen führen zur sofortigen Sperrung des Accounts.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 2, color: 'text.primary' }}>
              4. Nutzungsrechte und Urheberrechte
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Die Urheberrechte an Ihren Artikeln verbleiben bei Ihnen. Sie räumen der Plattform jedoch ein einfaches, zeitlich und räumlich unbeschränktes Recht ein, die Inhalte auf der Website öffentlich zugänglich zu machen, zu vervielfältigen und zu Darstellungszwecken anzupassen (z. B. Formatierung für die Leseansicht, Berechnung der Lesezeit, Erstellung von Vorschau-Teasern).
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 2, color: 'text.primary' }}>
              5. Beendigung der Nutzung und Löschung
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sie können Ihr Benutzerkonto jederzeit kündigen oder löschen lassen. Bitte wenden Sie sich hierfür an den Support unter der im Impressum angegebenen E-Mail-Adresse. Die Administratoren behalten sich das Recht vor, Benutzerkonten bei Verstößen gegen diese Nutzungsbedingungen vorübergehend oder dauerhaft zu sperren oder zu löschen. Bereits veröffentlichte Blogartikel können im Zuge der Account-Löschung entweder entfernt oder anonymisiert auf der Plattform belassen werden.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
};
