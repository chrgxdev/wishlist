import React, { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Button,
  Box,
  MenuItem,
  Select,
  Stack,
  Snackbar,
  Alert,
  TextField,
  CircularProgress
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

// Inject DM Sans font once
const dmSansLinkId = 'dm-sans-font-link';
if (typeof document !== 'undefined' && !document.getElementById(dmSansLinkId)) {
  const link = document.createElement('link');
  link.id = dmSansLinkId;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(link);
}

function isImageUrl(url) {
  return /(\.png|\.jpe?g|\.gif|\.webp|\.svg)(\?.*)?$/i.test(url);
}

function LinkPreview({ href }) {
  const [error, setError] = React.useState(false);
  if (isImageUrl(href)) {
    return (
      <Box sx={{ my: 1 }}>
        <img src={href} alt="Embedded" style={{ maxWidth: '100%', borderRadius: 8 }} />
      </Box>
    );
  }
  if (error) {
    return (
      <Typography variant="body2" color="text.secondary">
        Preview not available. <a href={href} target="_blank" rel="noreferrer">Open link</a>
      </Typography>
    );
  }
  return (
    <Box sx={{ my: 1 }}>
      <iframe
        src={href}
        title={href}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        style={{ width: '100%', height: 300, border: '1px solid #ddd', borderRadius: 8 }}
        onError={() => setError(true)}
      />
    </Box>
  );
}

// Inline embed used inside the text flow: tries iframe for non-image URLs with graceful fallback
function InlineEmbed({ url }) {
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    const id = setTimeout(() => {
      if (!loaded) setFailed(true);
    }, 1500);
    return () => clearTimeout(id);
  }, [loaded]);

  // Images inline without scrollbars, max 600x600
  if (isImageUrl(url)) {
    return (
      <Box
        component="img"
        src={url}
        alt=""
        sx={{
          display: 'inline-block',
          maxWidth: 600,
          maxHeight: 600,
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          borderRadius: 1,
          verticalAlign: 'middle',
          mx: 0.5,
          my: 0.5
        }}
      />
    );
  }

  if (failed) {
    return (
      <a href={url} target="_blank" rel="noreferrer" style={{ margin: '0 4px' }}>{url}</a>
    );
  }

  // Iframe full width with max height 400px, show original URL below
  return (
    <Box
      component="span"
      sx={{ display: 'inline-block', verticalAlign: 'middle', mx: 0.5, my: 0.5, width: '100%' }}
    >
      <Box sx={{ display: 'block', width: '100%' }}>
        <iframe
          src={url}
          title={url}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          style={{ width: '100%', height: 400, maxHeight: 400, border: '1px solid #ddd', borderRadius: 8 }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
        <Box sx={{ mt: 0.5 }}>
          <a href={url} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{url}</a>
        </Box>
      </Box>
    </Box>
  );
}

function extractLinks(content) {
  if (!content) return [];
  const set = new Set();
  // Try to parse as HTML first
  const div = document.createElement('div');
  div.innerHTML = content;
  div.querySelectorAll('a').forEach(a => { const h = a.getAttribute('href'); if (h) set.add(h); });
  div.querySelectorAll('img').forEach(img => { const s = img.getAttribute('src'); if (s) set.add(s); });
  // Also scan plain text for URLs
  const text = div.textContent || content;
  const urlRegex = /https?:\/\/[^\s"'<>\)]+/g;
  const matches = text.match(urlRegex) || [];
  matches.forEach(u => set.add(u));
  return Array.from(set);
}

export default function EditorPage({ groupSlug = 'default', groupTitle = 'Default' }) {
  const [names, setNames] = useState([]);
  const [selected, setSelected] = useState('');
  const [content, setContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Vibrant Christmas theme + DM Sans
  const theme = createTheme({
    typography: {
      fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 600 }
    },
    palette: {
      mode: 'light',
      primary: { main: '#0B8F2F' },
      secondary: { main: '#E32636' },
      success: { main: '#1FBF55' },
      error: { main: '#FF3B30' },
      warning: { main: '#FFB020' },
      info: { main: '#1E88E5' },
      background: { default: '#FBFFF7', paper: '#FFFFFF' }
    },
    components: {
      MuiLink: {
        styleOverrides: {
          root: {
            color: '#0B8F2F',
            textDecorationColor: '#0B8F2F',
            fontWeight: 600,
            transition: 'color .2s ease, text-decoration-color .2s ease',
            '&:hover': { color: '#E32636', textDecorationColor: '#E32636' },
            '&:visited': { color: '#8E24AA' }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12
          }
        }
      }
    }
  });

  // Load names for the current group
  useEffect(() => {
    fetch(`/api/${encodeURIComponent(groupSlug)}/names`)
      .then(r => r.json())
      .then(data => {
        const list = data.names || [];
        setNames(list);
      })
      .catch(() => setToast({ open: true, message: 'Failed to load names', severity: 'error' }));
    // reset selection when group changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSlug]);

  // Load content when selected changes
  useEffect(() => {
    if (!selected) return;
    setLoadingContent(true);
    fetch(`/api/${encodeURIComponent(groupSlug)}/content?name=${encodeURIComponent(selected)}`)
      .then(r => r.json())
      .then(data => {
        setContent(data.content || '');
        setEditing(false);
      })
      .catch(() => setToast({ open: true, message: 'Failed to load content', severity: 'error' }))
      .finally(() => setLoadingContent(false));
  }, [selected, groupSlug]);

  const links = useMemo(() => extractLinks(content), [content]);

  // Derive display text: convert HTML to text while inlining href/src and preserving line breaks
  const plainText = useMemo(() => {
    if (!content) return '';
    try {
      const div = document.createElement('div');
      div.innerHTML = content;

      const blocks = new Set(['P','DIV','SECTION','ARTICLE','UL','OL','LI','H1','H2','H3','H4','H5','H6','PRE','BLOCKQUOTE']);
      let out = '';

      const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          out += node.nodeValue || '';
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node;
        const tag = el.tagName;

        if (tag === 'BR') { out += '\n'; return; }
        if (tag === 'A') {
          const href = el.getAttribute('href') || '';
          // Prefer showing href directly to ensure preview detection
          out += href ? href : (el.textContent || '');
          return;
        }
        if (tag === 'IMG') {
          const src = el.getAttribute('src') || '';
          if (src) out += src;
          return;
        }

        const isBlock = blocks.has(tag);
        if (isBlock && out && !out.endsWith('\n')) out += '\n';
        for (const child of el.childNodes) walk(child);
        if (isBlock && !out.endsWith('\n')) out += '\n';
      };

      for (const child of div.childNodes) walk(child);
      return out;
    } catch {
      return content;
    }
  }, [content]);

  // Render text with URLs turned into clickable anchors (kept for reference/use)
  const renderLinkified = (text) => {
    const nodes = [];
    const urlRegex = /https?:\/\/[^\s"'<>\)]+/g;
    let last = 0;
    let m;
    while ((m = urlRegex.exec(text)) !== null) {
      const start = m.index;
      const url = m[0];
      if (start > last) nodes.push(text.slice(last, start));
      nodes.push(<a key={`${start}-${url}`} href={url} target="_blank" rel="noreferrer">{url}</a>);
      last = start + url.length;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
  };

  // Render text and inline embeds: image URLs become <img>, other URLs try an inline iframe with fallback to <a>
  const renderInlineWithEmbeds = (text) => {
    const nodes = [];
    const urlRegex = /https?:\/\/[^\s"'<>\)]+/g;
    let last = 0;
    let m;

    const pushText = (t, keyBase) => {
      if (!t) return;
      const parts = t.split('\n');
      parts.forEach((p, idx) => {
        if (p) nodes.push(<span key={`t-${keyBase}-${idx}`}>{p}</span>);
        if (idx < parts.length - 1) nodes.push(<br key={`br-${keyBase}-${idx}`} />);
      });
    };

    while ((m = urlRegex.exec(text)) !== null) {
      const start = m.index;
      const url = m[0];
      if (start > last) pushText(text.slice(last, start), `${last}`);
      nodes.push(
        <InlineEmbed key={`emb-${start}`} url={url} />
      );
      last = start + url.length;
    }
    if (last < text.length) pushText(text.slice(last), `${last}`);
    return (
      <Box sx={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        '& img': { display: 'inline-block' },
        '& a': {
          color: 'primary.main',
          textDecorationColor: 'primary.main',
          fontWeight: 600,
        },
        '& a:hover': {
          color: 'secondary.main',
          textDecorationColor: 'secondary.main',
        }
      }}>
        {nodes}
      </Box>
    );
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/${encodeURIComponent(groupSlug)}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selected, content })
      });
      if (!res.ok) throw new Error('Failed');
      setToast({ open: true, message: 'Saved!', severity: 'success' });
      setEditing(false);
    } catch (e) {
      setToast({ open: true, message: 'Save failed', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #E9FFEF 0%, #FFF 60%)', pb: 6, fontFamily: '"DM Sans", sans-serif' }}>
        <AppBar position="sticky" color="primary">
          <Toolbar sx={{ gap: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>{groupTitle}</Typography>
            <Button color="inherit" href="/">Back</Button>
          </Toolbar>
        </AppBar>

          
        <Container sx={{ py: 4 }}>
          {/* Names list on group front page */}

            {(!selected) ? (
                <Paper elevation={0} sx={{p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2}}>
                    {!selected && (
                        <Typography variant="h6" align="center" color="text.secondary" gutterBottom>
                            Select a  name
                        </Typography>
                    )}
                    <Stack direction="row" justifyContent='center' spacing={1.4} useFlexGap flexWrap="wrap" sx={{
                        maxWidth: 'sm',
                        mx: 'auto',
                    }}>
                        {names.map(n => (
                            <Button key={n} variant={n === selected ? 'contained' : 'outlined'}
                                    color={n === selected ? 'primary' : 'inherit'} onClick={() => setSelected(n)} sx={{
                                fontSize: '1.2rem',
                                textTransform: 'uppercase',
                            }}>
                                {n}
                            </Button>
                        ))}
                    </Stack>
                </Paper>
            ) : (
                <Stack direction="row" justifyContent="center" alignItems="center" sx={{ mb: 2 }}>
                <Button
                    variant="text"
                    color="primary"
                    onClick={() => setSelected('')}
                    sx={{
                        py: 2,
                        px: 5,
                        textAlign: 'center',
                        fontSize: '1.2rem',
                        border: 2,
                    }}
                >
                    Choose another name
                </Button>
                </Stack>
            )}

            {/* Preview card */}
          {selected && !editing && (
            <Paper elevation={1} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', position: 'relative', fontFamily: '"DM Sans", sans-serif' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                <Typography variant="h3" sx={{ color: 'primary.main', textTransform: 'uppercase' }}>{selected}</Typography>
                <Box>
                  <Button variant="contained" color="secondary" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                </Box>
              </Stack>

              <Box sx={{ mt: 2 }}>
                {loadingContent && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">Loading content…</Typography>
                  </Box>
                )}
                {!loadingContent && (
                  plainText.trim().length > 0 ? (
                    <Box sx={{ p: 1.5 }}>
                      {renderInlineWithEmbeds(plainText)}
                    </Box>
                  ) : null
                )}
                {!loadingContent && plainText.trim().length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Wala pang laman :)
                  </Typography>
                )}
              </Box>
            </Paper>
          )}

          {/* Editor appears alone when editing */}
          {selected && editing && (
            <Paper elevation={1} sx={{ p: 2, borderRadius: 3, border: '2px dashed', borderColor: 'secondary.main', background: 'linear-gradient(180deg,#fff,#FFE9EC)', fontFamily: '"DM Sans", sans-serif' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                <Typography variant="h6" sx={{ color: 'secondary.main' }}>{selected}</Typography>
                <Box>
                  <Button variant="contained" color="primary" startIcon={saving ? null : <SaveIcon />} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </Box>
              </Stack>

              <Typography variant="subtitle1" sx={{ mt: 1, mb: 1, color: 'secondary.main' }}>
                Edit content
              </Typography>
              <TextField
                multiline
                minRows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={'Ilagay ang gustong wishlist dito!'}
                fullWidth
                sx={{
                  '& .MuiInputBase-root': { fontFamily: '"DM Sans", sans-serif' }
                }}
              />
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <Button variant="outlined" color="secondary" startIcon={<CloseIcon />} onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
              </Stack>
            </Paper>
          )}
        </Container>

        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast({ ...toast, open: false })}
        >
          <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} sx={{ fontFamily: '"DM Sans", sans-serif' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
