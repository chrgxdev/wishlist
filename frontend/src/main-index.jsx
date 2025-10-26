import React, {useState, useEffect} from 'react';
import { createRoot } from 'react-dom/client';
import EditorPage from './pages/Editor.jsx';
import GroupsIndex from './pages/GroupsIndex.jsx';

function AppRouter() {
    const [groupData, setGroupData] = useState(null);
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';

    useEffect(() => {
        if (path !== '/' && path !== '') {
            fetch('/api/groups')
                .then(r => r.json())
                .then(d => {
                    const slug = path.replace(/^\//, '').split('/')[0] || 'default';
                    const group = (d.groups || []).find(g => g.slug === slug);
                    setGroupData(group || {slug, title: slug});
                })
                .catch(console.error);
        }
    }, [path]);

    if (path === '/' || path === '') {
        return <GroupsIndex/>;
    }

    return <EditorPage groupSlug={groupData?.slug || 'default'} groupTitle={groupData?.title}/>;
}

const root = createRoot(document.getElementById('root'));
root.render(<AppRouter />);
