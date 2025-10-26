import React, { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
  Box,
  IconButton,
  Divider,
  MenuItem,
  Select
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

export default function AdminPage() {
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState('default');
  const [namesText, setNamesText] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [saving, setSaving] = useState(false);

  const loadGroups = () => {
    fetch('/api/admin/groups').then(r => r.json()).then(d => {
      const gs = (d.groups || []).map(g => ({ ...g, _origSlug: g.slug, hidden: !!g.hidden }));
      setGroups(gs);
      if (!gs.find(g => g.slug === currentGroup)) {
        setCurrentGroup(gs[0]?.slug || 'default');
      }
    }).catch(() => setToast({ open: true, message: 'Failed to load groups', severity: 'error' }));
  };

  const loadNames = (group) => {
    fetch(`/api/admin/${encodeURIComponent(group)}/names`).then(r => r.json()).then(d => {
      const list = d.names || [];
      setNamesText(list.join('\n'));
    }).catch(() => setToast({ open: true, message: 'Failed to load names', severity: 'error' }));
  };

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { if (currentGroup) loadNames(currentGroup); }, [currentGroup]);

  const saveNames = async () => {
    const names = namesText.split(/\n|,/).map(s => s.trim()).filter(Boolean);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/${encodeURIComponent(currentGroup)}/names`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names })
      });
      if (!res.ok) throw new Error('Failed');
      setToast({ open: true, message: 'Names saved', severity: 'success' });
    } catch (e) {
      setToast({ open: true, message: 'Save failed', severity: 'error' });
    } finally { setSaving(false); }
  };

  const saveGroups = async () => {
    const payload = groups.map(g => ({
      slug: g.slug.trim(),
      title: (g.title || '').trim(),
      hidden: !!g.hidden,
      oldSlug: g._origSlug !== g.slug ? g._origSlug : undefined
    }));
    try {
      const res = await fetch('/api/admin/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groups: payload }) });
      if (!res.ok) throw new Error('Failed');
      setToast({ open: true, message: 'Groups saved', severity: 'success' });
      loadGroups();
    } catch (e) {
      setToast({ open: true, message: 'Failed to save groups', severity: 'error' });
    }
  };

  const addGroup = () => {
    setGroups(prev => ([...prev, { slug: '', title: '', hidden: false, _origSlug: '' }]));
  };

  const deleteGroup = (slug) => {
    if (!confirm(`Delete group ${slug}?`)) return;
    const gs = groups.filter(g => g.slug !== slug);
    setGroups(gs);
  };

  const updateGroupField = (index, field, value) => {
    setGroups(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: (t) => t.palette.mode === 'dark' ? '#121212' : '#f5f7fb' }}>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Wishlist Admin</Typography>
          <Button color="inherit" startIcon={<AddIcon />} onClick={addGroup}>Add group</Button>
          <Button color="inherit" variant="outlined" startIcon={<SaveIcon />} onClick={saveGroups}>
            Save Groups
          </Button>
          <Button color="inherit" variant="outlined" startIcon={<SaveIcon />} onClick={saveNames} disabled={saving} sx={{ ml: 1 }}>
            {saving ? 'Saving…' : 'Save Names'}
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 3 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Groups</Typography>
          <Stack spacing={1}>
            {groups.map((g, idx) => {
              const isDefault = g._origSlug === 'default' || g.slug === 'default';
              return (
                <Stack key={g._origSlug + ':' + idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 1 }}>
                  <TextField
                    label="Slug"
                    size="small"
                    value={g.slug}
                    onChange={(e) => updateGroupField(idx, 'slug', e.target.value)}
                    placeholder="group-slug"
                    sx={{ width: 200 }}
                    disabled={isDefault}
                  />
                  <TextField
                    label="Title"
                    size="small"
                    value={g.title || ''}
                    onChange={(e) => updateGroupField(idx, 'title', e.target.value)}
                    placeholder="Group title"
                    sx={{ minWidth: 240 }}
                  />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <input
                      id={`hidden-${idx}`}
                      type="checkbox"
                      checked={!!g.hidden}
                      onChange={(e) => updateGroupField(idx, 'hidden', e.target.checked)}
                      style={{ width: 18, height: 18 }}
                    />
                    <label htmlFor={`hidden-${idx}`}>Hidden</label>
                  </Stack>
                  <Button size="small" variant="outlined" onClick={() => setCurrentGroup(g.slug || g._origSlug || 'default')}>Edit names</Button>
                  {!isDefault && (
                    <IconButton size="small" color="error" onClick={() => deleteGroup(g.slug || g._origSlug)}><DeleteIcon fontSize="small"/></IconButton>
                  )}
                </Stack>
              );
            })}
            {groups.length === 0 && (
              <Typography variant="body2" color="text.secondary">No groups yet. Click "Add group" to create one.</Typography>
            )}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>Names in group</Typography>
            <Select size="small" value={currentGroup} onChange={e => setCurrentGroup(e.target.value)}>
              {groups.map(g => <MenuItem key={(g.slug || g._origSlug) + '-sel'} value={g.slug || g._origSlug}>{(g.title || g.slug || g._origSlug) + ' (' + (g.slug || g._origSlug) + ')'}</MenuItem>)}
            </Select>
          </Stack>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Edit the list of names for the selected group. Enter names separated by newlines or commas.
          </Typography>
          <TextField multiline minRows={10} value={namesText} onChange={(e) => setNamesText(e.target.value)} placeholder="Alice\nBob\nCharlie" fullWidth />
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={saveNames} disabled={saving}>
              {saving ? 'Saving…' : 'Save Names'}
            </Button>
          </Box>
        </Paper>
      </Container>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}