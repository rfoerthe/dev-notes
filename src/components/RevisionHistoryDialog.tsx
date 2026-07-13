import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { History, RotateCcw } from 'lucide-react';
import {
  getBlogRevisions,
  restoreBlogRevision,
  type BlogPost,
  type BlogRevision
} from '../services/blogService';
import { renderInlineMarkdown, renderMarkdown } from './markdownParser';

interface RevisionHistoryDialogProps {
  blogId: string;
  open: boolean;
  savedBy: string;
  savedByName: string;
  onClose: () => void;
  onRestored: (blog: BlogPost) => void;
}

export function RevisionHistoryDialog({
  blogId,
  open,
  savedBy,
  savedByName,
  onClose,
  onRestored
}: RevisionHistoryDialogProps) {
  const [revisions, setRevisions] = useState<BlogRevision[]>([]);
  const [selected, setSelected] = useState<BlogRevision | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!open) return;

    Promise.resolve()
      .then(() => {
        if (active) {
          setLoading(true);
          setError(null);
        }
        return getBlogRevisions(blogId);
      })
      .then(items => {
        if (!active) return;
        setRevisions(items);
        setSelected(items[0] || null);
      })
      .catch(loadError => {
        console.error('Failed to load blog revisions:', loadError);
        if (active) setError('Die Versionshistorie konnte nicht geladen werden.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [blogId, open]);

  const handleRestore = async () => {
    if (!selected) return;
    setRestoring(true);
    setError(null);
    try {
      const restoredBlog = await restoreBlogRevision(blogId, selected, savedBy, savedByName);
      onRestored(restoredBlog);
    } catch (restoreError) {
      console.error('Failed to restore blog revision:', restoreError);
      setError(restoreError instanceof Error ? restoreError.message : 'Die Version konnte nicht wiederhergestellt werden.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onClose={restoring ? undefined : onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <History size={20} /> Versionshistorie
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : revisions.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>
            Es gibt noch keine frühere Version. Beim nächsten manuellen Speichern wird die aktuelle Fassung archiviert.
          </Typography>
        ) : (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Paper variant="outlined" sx={{ width: { xs: '100%', md: 310 }, flexShrink: 0, maxHeight: 520, overflow: 'auto' }}>
              <List disablePadding>
                {revisions.map((revision, index) => (
                  <ListItemButton
                    key={revision.id}
                    selected={selected?.id === revision.id}
                    onClick={() => setSelected(revision)}
                    divider={index < revisions.length - 1}
                  >
                    <ListItemText
                      primary={revision.title || 'Unbenannter Entwurf'}
                      secondary={`${new Date(revision.savedAt).toLocaleString('de-DE')} · ${revision.savedByName}`}
                      slotProps={{ primary: { noWrap: true }, secondary: { sx: { mt: 0.5 } } }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
            {selected && (
              <Paper variant="outlined" sx={{ p: 3, flexGrow: 1, minWidth: 0, maxHeight: 520, overflow: 'auto' }}>
                <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    color={selected.status === 'published' ? 'success' : 'default'}
                    label={selected.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Gesichert am {new Date(selected.savedAt).toLocaleString('de-DE')}
                  </Typography>
                </Stack>
                <Typography variant="h4" component="h2" sx={{ fontWeight: 800, mb: 1 }}>
                  {renderInlineMarkdown(selected.title || 'Unbenannter Entwurf')}
                </Typography>
                {selected.summary && (
                  <Typography color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                    {renderInlineMarkdown(selected.summary)}
                  </Typography>
                )}
                <Divider sx={{ mb: 2 }} />
                <Box className="markdown-body">{selected.content ? renderMarkdown(selected.content) : 'Kein Inhalt'}</Box>
              </Paper>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={restoring}>Schließen</Button>
        <Button
          variant="contained"
          startIcon={restoring ? <CircularProgress size={16} color="inherit" /> : <RotateCcw size={16} />}
          disabled={!selected || restoring}
          onClick={() => void handleRestore()}
        >
          Diese Version wiederherstellen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
