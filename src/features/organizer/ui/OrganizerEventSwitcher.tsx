import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/shared/lib/i18n';
import consoleStyles from '@/shared/styles/console.module.css';
import { formatIsoDateForDisplay } from '../lib/organizerRunnerUtils';
import type { OrganizerEvent } from '../model/types';

interface OrganizerEventSwitcherProps {
  events: OrganizerEvent[];
  currentEvent: OrganizerEvent;
  onAddEvent: () => void;
}

export function OrganizerEventSwitcher({
  events,
  currentEvent,
  onAddEvent
}: OrganizerEventSwitcherProps): React.JSX.Element {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const meta = `${formatIsoDateForDisplay(currentEvent.eventDate)} · ${currentEvent.eventCode}`;

  return (
    <div className={consoleStyles.eventSwitcher} ref={rootRef}>
      <button
        className={consoleStyles.eventSelector}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <div>
          <div className={consoleStyles.eventSelectorLabel}>
            {t('organizer.portal.currentEvent')}
          </div>
          <div className={consoleStyles.eventSelectorName}>{currentEvent.name}</div>
          <div className={consoleStyles.eventSelectorMeta}>{meta}</div>
        </div>
        <span className={consoleStyles.eventChevron} aria-hidden="true">
          ⌄
        </span>
      </button>
      <div
        className={
          isOpen
            ? `${consoleStyles.eventMenu} ${consoleStyles.eventMenuOpen}`
            : consoleStyles.eventMenu
        }
      >
        {events.map((item) => {
          const isActive = item.id === currentEvent.id;
          return (
            <button
              key={item.id}
              className={
                isActive
                  ? `${consoleStyles.eventOption} ${consoleStyles.eventOptionActive}`
                  : consoleStyles.eventOption
              }
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (!isActive) {
                  void navigate(`/organizer/events/${item.id}/dashboard`);
                }
              }}
            >
              <div>
                <div className={consoleStyles.eventOptionName}>
                  {item.name}
                  {isActive ? (
                    <span className={consoleStyles.eventBadge}>
                      {t('organizer.portal.eventBadgeCurrent')}
                    </span>
                  ) : null}
                </div>
                <div className={consoleStyles.eventOptionMeta}>
                  {formatIsoDateForDisplay(item.eventDate)}
                  {' · '}
                  {item.eventCode}
                </div>
              </div>
              <div className={consoleStyles.eventOptionCode}>{item.eventCode}</div>
            </button>
          );
        })}
        <div className={consoleStyles.eventMenuDivider} />
        <button
          className={`${consoleStyles.eventOption} ${consoleStyles.eventOptionAdd}`}
          type="button"
          onClick={() => {
            setIsOpen(false);
            onAddEvent();
          }}
        >
          {t('organizer.portal.addEvent')}
        </button>
      </div>
    </div>
  );
}
