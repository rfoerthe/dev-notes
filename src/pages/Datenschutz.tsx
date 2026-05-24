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
import { ArrowLeft, Shield } from 'lucide-react';

export const Datenschutz: React.FC = () => {
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
            <Shield size={24} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Datenschutzerklärung
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Informationen zum Schutz Ihrer persönlichen Daten (DSGVO).
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 4 }} />

        {/* Content */}
        <Stack spacing={4} sx={{ textAlign: 'left', lineHeight: 1.8 }}>
          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 2, color: 'text.primary' }}>
              1. Datenschutz auf einen Blick
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Allgemeine Hinweise
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können. Ausführliche Informationen zum Thema Datenschutz entnehmen Sie unserer unter diesem Text aufgeführten Datenschutzerklärung.
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Datenerfassung auf unserer Website
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen. Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Registrierungsformular eingeben. Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 2, color: 'text.primary' }}>
              2. Allgemeine Hinweise und Pflichtinformationen
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Widerruf Ihrer Einwilligung zur Datenverarbeitung
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Dazu reicht eine formlose Mitteilung per E-Mail an uns. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Beschwerderecht bei der zuständigen Aufsichtsbehörde
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat ihres üblichen Aufenthaltsorts, ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes zu. Das Beschwerderecht besteht unbeschadet anderweitiger verwaltungsrechtlicher oder gerichtlicher Rechtsbehelfe.
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Recht auf Auskunft, Löschung und Berichtigung
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung oder Löschung dieser Daten. Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich jederzeit unter der im Impressum angegebenen Adresse an uns wenden.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 2, color: 'text.primary' }}>
              3. Datenerfassung auf unserer Website
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Firebase Authentication und Firestore (Echtdatenmodus)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Wenn unsere Website im Firebase-Echtdatenmodus betrieben wird, werden Ihre Registrierungsdaten (Vorname, Nachname, E-Mail-Adresse, verschlüsseltes Passwort und Benutzername) in den Cloud-Datenbanken von Google Firebase gehostet. Firebase Authentication verwaltet die sichere Benutzeranmeldung und Session-Tokens unter Verwendung von zustandslosen JWT-Tokens (Cookies oder Web Storage). Firestore dient als strukturierte Datenbank zur Verwaltung von Autoren-Profilen und Blog-Artikeln. Alle Datenübertragungen sind über SSL/TLS-Verschlüsselung abgesichert. Die Serverstandorte befinden sich in der Europäischen Union (bzw. entsprechen den EU-Standardvertragsklauseln).
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Lokaler Mock-Modus (Sicherer Testbetrieb)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Standardmäßig wird diese Anwendung ohne aktive Firebase-Anbindung in einem lokalen Sandbox-Modus („Mock Mode“) betrieben. Hierbei werden alle erhobenen Profildaten (einschließlich sicherer, lokaler SHA-256-Passworthashes) und erstellten Blog-Beiträge ausschließlich in Ihrem lokalen Webbrowser-Speicher (`localStorage`) abgelegt. Es findet zu keinem Zeitpunkt eine Übertragung dieser Daten an externe Server statt. Ihre Daten verbleiben vollständig unter Ihrer Kontrolle auf Ihrem Endgerät und können durch Leeren des Browser-Caches gelöscht werden.
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Anti-Robot Honeypot Schutz
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Zum Schutz unseres Registrierungsformulars vor automatisierten Spambots verwenden wir eine unsichtbare Honeypot-Eingabemethode („middleName“). Diese Eingabe ist für menschliche Nutzer unsichtbar und barrierefrei, wird jedoch von Bots beim automatischen Auslesen und Ausfüllen des Formulars erfasst. Wird das Feld ausgefüllt, wird die Registrierungsanfrage sofort blockiert. Es erfolgt keine Erfassung, Verarbeitung oder Weitergabe von Trackingdaten über Drittanbieter (wie z. B. reCAPTCHA). Dies stellt eine datenschutzfreundliche Alternative nach dem Prinzip „Privacy by Design“ dar.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, mb: 2, color: 'text.primary' }}>
              4. Datensicherheit
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte, wie zum Beispiel Bestellungen oder Anfragen, die Sie an uns als Seitenbetreiber senden, eine SSL-bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://“ auf „https://“ wechselt und an dem Schloss-Symbol in Ihrer Browserzeile. Wenn die SSL- bzw. TLS-Verschlüsselung aktiviert ist, können die Daten, die Sie an uns übermitteln, nicht von Dritten mitgelesen werden.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
};
