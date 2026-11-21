import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import { ClarixMark } from '../common/ClarixMark';
import styles from './Sidebar.module.css';

export interface SidebarBadge {
  text: string;
  tone: 'danger' | 'success' | 'info' | 'warning';
}

export interface SidebarItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: SidebarBadge;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export interface SidebarProps {
  items?: SidebarItem[];
  sections?: SidebarSection[];
  settingsItem?: SidebarItem;
  activeKey?: string;
  onSelect?: (key: string) => void;
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const STORAGE_KEY = 'clarix.sidebar.collapsed';

function getStoredCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && window.innerWidth < 520) {
    return true;
  }
  return false;
}

function persistCollapsed(val: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  } catch {
    // ignore
  }
}

export function Sidebar({
  items,
  sections,
  settingsItem,
  activeKey,
  onSelect,
  defaultCollapsed,
  collapsed: controlledCollapsed,
  onCollapsedChange,
}: SidebarProps) {
  const location = useLocation();
  const isControlled = controlledCollapsed !== undefined;

  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    if (defaultCollapsed !== undefined) return defaultCollapsed;
    return getStoredCollapsed();
  });

  const isCollapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalCollapsed(next);
      }
      persistCollapsed(next);
      onCollapsedChange?.(next);
    },
    [isControlled, onCollapsedChange]
  );

  // Normalize sections
  const normalizedSections: SidebarSection[] = useMemo(() => {
    if (sections && sections.length > 0) return sections;
    if (items && items.length > 0) return [{ label: '', items }];
    return [];
  }, [sections, items]);

  const allItems = useMemo(
    () => [
      ...normalizedSections.flatMap((s) => s.items),
      ...(settingsItem ? [settingsItem] : []),
    ],
    [normalizedSections, settingsItem]
  );

  // Active key resolution: longest-prefix match on pathname
  const resolvedActiveKey = useMemo(() => {
    if (activeKey !== undefined) return activeKey;
    const sorted = [...allItems].sort((a, b) => b.href.length - a.href.length);
    for (const item of sorted) {
      if (item.href === '/') {
        if (location.pathname === '/') return item.key;
      } else if (
        location.pathname === item.href ||
        location.pathname.startsWith(item.href + '/')
      ) {
        return item.key;
      }
    }
    return undefined;
  }, [activeKey, allItems, location.pathname]);

  const sidebarRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});

  // Slide highlight measurement
  const measureHighlight = useCallback(() => {
    if (!sidebarRef.current || !hlRef.current) return;
    if (!resolvedActiveKey) {
      hlRef.current.style.opacity = '0';
      return;
    }
    const activeEl = itemRefs.current[resolvedActiveKey];
    if (!activeEl) {
      hlRef.current.style.opacity = '0';
      return;
    }
    const sidebarRect = sidebarRef.current.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();

    // Check if the item is scrolled out of the visible sidebar area
    if (
      itemRect.bottom < sidebarRect.top + 44 ||
      itemRect.top > sidebarRect.bottom - 44
    ) {
      hlRef.current.style.opacity = '0';
      return;
    }

    // Because .hl has top: 0, translateY is exactly itemRect.top - sidebarRect.top
    const y = itemRect.top - sidebarRect.top;
    hlRef.current.style.transform = `translateY(${y}px)`;
    hlRef.current.style.opacity = '1';
  }, [resolvedActiveKey]);

  useEffect(() => {
    measureHighlight();
  }, [measureHighlight, isCollapsed]);

  // Re-measure on window resize, list scroll, font loading, and layout changes
  useEffect(() => {
    const onResize = () => measureHighlight();
    window.addEventListener('resize', onResize);

    const listEl = listRef.current;
    if (listEl) {
      listEl.addEventListener('scroll', measureHighlight, { passive: true });
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureHighlight);
    }

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && sidebarRef.current) {
      ro = new ResizeObserver(() => measureHighlight());
      ro.observe(sidebarRef.current);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (listEl) {
        listEl.removeEventListener('scroll', measureHighlight);
      }
      if (ro) {
        ro.disconnect();
      }
    };
  }, [measureHighlight]);

  // Re-measure after collapse transition completes
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLElement>) => {
    if (e.propertyName === 'width') {
      measureHighlight();
    }
  };

  const handleTopClick = () => {
    if (isCollapsed) {
      setCollapsed(false);
    }
  };

  const handleTopKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (isCollapsed && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setCollapsed(false);
    }
  };

  const handleChevClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setCollapsed(true);
  };

  // Mount via portal to document.body so no parent opacity/filter/transform breaks backdrop-filter
  const asideContent = (
    <aside
      ref={sidebarRef}
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}
      aria-label="Console navigation"
      onTransitionEnd={handleTransitionEnd}
    >
      {/* Single sliding active highlight pill */}
      <div ref={hlRef} className={styles.hl} aria-hidden="true" />

      {/* Top Header: Logo button (expands when collapsed) + Collapse button */}
      <div className={styles.top}>
        <button
          type="button"
          className={styles.logoBtn}
          onClick={handleTopClick}
          onKeyDown={handleTopKeyDown}
          tabIndex={isCollapsed ? 0 : -1}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Clarix navigation'}
          aria-expanded={!isCollapsed}
        >
          <div className={styles.mark} aria-hidden="true">
            <ClarixMark size={22} />
          </div>
          <span className={styles.brand}>Clarix</span>
        </button>
        <button
          type="button"
          className={styles.chev}
          onClick={handleChevClick}
          aria-label="Collapse sidebar"
          tabIndex={isCollapsed ? -1 : 0}
        >
          <ChevronLeft width={14} height={14} strokeWidth={2.8} />
        </button>
      </div>

      {/* Grouped navigation list (scrollable on overflow, hidden scrollbar) */}
      <div ref={listRef} className={styles.list}>
        {normalizedSections.map((sec, secIdx) => (
          <div key={sec.label || secIdx} className={styles.section}>
            {secIdx > 0 && <div className={styles.divider} aria-hidden="true" />}
            {sec.label && <div className={styles.sectionLabel}>{sec.label}</div>}
            {sec.items.map((item) => {
              const isActive = item.key === resolvedActiveKey;
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  ref={(el) => {
                    itemRefs.current[item.key] = el;
                  }}
                  className={styles.row}
                  title={isCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelect?.(item.key)}
                >
                  <div className={styles.iconWrap}>
                    <Icon aria-hidden="true" />
                    {item.badge && (
                      <span
                        className={`${styles.statusDot} ${styles[item.badge.tone]}`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`${styles.badge} ${styles[item.badge.tone]}`}>
                      {item.badge.text}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Pinned Settings item separated by top border */}
      {settingsItem && (
        <div className={styles.foot}>
          {(() => {
            const isActive = settingsItem.key === resolvedActiveKey;
            const Icon = settingsItem.icon;
            return (
              <Link
                key={settingsItem.key}
                to={settingsItem.href}
                ref={(el) => {
                  itemRefs.current[settingsItem.key] = el;
                }}
                className={styles.row}
                title={isCollapsed ? settingsItem.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelect?.(settingsItem.key)}
              >
                <div className={styles.iconWrap}>
                  <Icon aria-hidden="true" />
                  {settingsItem.badge && (
                    <span
                      className={`${styles.statusDot} ${styles[settingsItem.badge.tone]}`}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span>{settingsItem.label}</span>
                {settingsItem.badge && (
                  <span className={`${styles.badge} ${styles[settingsItem.badge.tone]}`}>
                    {settingsItem.badge.text}
                  </span>
                )}
              </Link>
            );
          })()}
        </div>
      )}
    </aside>
  );

  if (typeof document !== 'undefined') {
    return createPortal(asideContent, document.body);
  }

  return asideContent;
}
