import { createRoot } from 'react-dom/client';
import { EditorActionDock } from '@/components/editor-action-dock';
import './dock.css';

const mount = document.getElementById('canvas-toolbar-root');
if (mount) createRoot(mount).render(<EditorActionDock />);
