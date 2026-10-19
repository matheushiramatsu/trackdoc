import { useEffect, useState } from 'react';
import {
  Clipboard,
  ClipboardPaste,
  Copy,
  Image as ImageIcon,
  Layers,
  Plus,
  Presentation,
} from 'lucide-react';
import { Dock, DockIcon, DockItem, DockLabel } from '@/components/ui/dock';

const actions = [
  { id: 'btn-add-scene', Icon: Layers },
  { id: 'btn-add-step', Icon: Plus },
  { id: 'btn-add-slide', Icon: Presentation },
  { id: 'btn-add-images', Icon: ImageIcon },
  { id: 'btn-dup-step', Icon: Copy },
  { id: 'btn-copy-step', Icon: Clipboard },
  { id: 'btn-paste-step', Icon: ClipboardPaste },
] as const;

function readLabel(id: string) {
  return document.getElementById(id)?.getAttribute('title') || id;
}

function isDisabled(id: string) {
  const control = document.getElementById(id);
  return control instanceof HTMLButtonElement && control.disabled;
}

export function EditorActionDock() {
  const [labels, setLabels] = useState(() =>
    Object.fromEntries(actions.map(({ id }) => [id, readLabel(id)])),
  );
  const [disabledActions, setDisabledActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const syncLabels = () => {
      setLabels(Object.fromEntries(actions.map(({ id }) => [id, readLabel(id)])));
      setDisabledActions(Object.fromEntries(actions.map(({ id }) => [id, isDisabled(id)])));
    };
    const controls = actions
      .map(({ id }) => document.getElementById(id))
      .filter((control): control is HTMLElement => control instanceof HTMLElement);
    const observer = new MutationObserver(() => {
      syncLabels();
    });
    controls.forEach((control) =>
      observer.observe(control, { attributes: true, attributeFilter: ['title', 'disabled'] }),
    );
    syncLabels();
    window.addEventListener('ns-locale-change', syncLabels);
    return () => {
      observer.disconnect();
      window.removeEventListener('ns-locale-change', syncLabels);
    };
  }, []);

  return (
    <Dock
      className="trackdoc-action-dock items-end"
      magnification={48}
      distance={112}
      panelHeight={48}
    >
      {actions.map(({ id, Icon }) => (
        <DockItem
          key={id}
          label={labels[id]}
          disabled={disabledActions[id]}
          onClick={() => document.getElementById(id)?.click()}
          className="trackdoc-action-dock-item"
        >
          <DockLabel className="trackdoc-action-dock-label">{labels[id]}</DockLabel>
          <DockIcon>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </DockIcon>
        </DockItem>
      ))}
    </Dock>
  );
}
