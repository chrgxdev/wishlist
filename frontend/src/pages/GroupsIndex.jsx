import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, List, ListItemButton, ListItemText, Box, AppBar, Toolbar } from '@mui/material';

export default function GroupsIndex() {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/groups')
      .then(r => r.json())
      .then(d => setGroups(d.groups || []))
      .catch(() => setError('Failed to load groups'));
  }, []);

  return (
      <Box sx={{minHeight: '100vh', background: 'linear-gradient(180deg, #E9F5FF 0%, #FFF 60%)'}}>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Wishlist</Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>Piliin ang wishlist na gustong puntahan:</Typography>
          {error && <Typography color="error" variant="body2">{error}</Typography>}
          <List>
            {groups.map(g => (

                <ListItemButton
                    key={g.slug}
                    component="a"
                    href={`/${g.slug}`}
                    sx={{
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        }
                    }}>

                    <ListItemText
                        primary={
                            <Typography
                                variant="body1"
                                sx={{
                                    fontSize: '1.5rem',
                                    fontWeight: 500,
                                    borderRadius: 3,
                                    textAlign: 'center',
                                    py: 2,
                                    background: 'linear-gradient(90deg, #E3F2FD 0%, #90CAF9 100%)',
                                }}
                            >
                                {g.title || g.slug}
                            </Typography>
                        }
                    />
                </ListItemButton>
            ))}

          </List>
        </Paper>
      </Container>
    </Box>
  );
}
