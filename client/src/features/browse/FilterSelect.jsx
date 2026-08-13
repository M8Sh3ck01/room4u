import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FilterSelect({ label, value, options, onChange, className = '', ariaLabel }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [menuStyle, setMenuStyle] = useState(null);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options.find((o) => o.value === value);
  const current = open ? highlight : selectedIndex;

  const openMenu = () => {
    setHighlight(selectedIndex);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    const placeMenu = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const menuWidth = Math.min(Math.max(rect.width, 220), vw - 24);
      const shift = Math.min(0, vw - 12 - (rect.left + menuWidth));
      setMenuStyle({ minWidth: menuWidth, left: shift });
    };
    placeMenu();
    window.addEventListener('resize', placeMenu);
    return () => window.removeEventListener('resize', placeMenu);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children?.[highlight];
    node?.scrollIntoView?.({ block: 'nearest' });
  }, [highlight, open]);

  const onKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) openMenu();
        else setHighlight((h) => Math.min(h + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) openMenu();
        else setHighlight((h) => Math.max(h - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) {
          onChange(options[highlight].value);
          setOpen(false);
          triggerRef.current?.focus();
        } else {
          openMenu();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={wrapRef} className={cn('relative min-w-0 flex-1', className)}>
      <button
        type="button"
        ref={triggerRef}
        className="flex min-h-[var(--control-min-h)] w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-left font-sans text-base text-foreground transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-[var(--focus-ring)] focus-visible:ring-ring/40 focus-visible:outline-none"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={open ? `${uid}-opt-${current}` : undefined}
        aria-label={ariaLabel}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {selected ? selected.label : label}
        </span>
        <ChevronDown
          className={cn('shrink-0 text-muted-foreground size-6 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 top-[calc(100%+var(--space-2))] z-[var(--z-overlay)] m-0 list-none rounded-lg border border-border bg-card p-2"
          style={menuStyle}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`${uid}-opt-${i}`}
              role="option"
              aria-selected={opt.value === value}
              className={cn(
                'flex min-h-[var(--control-min-h)] cursor-pointer items-center justify-between gap-2 rounded-sm px-3 text-foreground',
                (i === current || opt.value === value) && 'bg-muted',
                opt.value === value && 'font-semibold'
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{opt.label}</span>
              {opt.value === value && <Check className="size-6 shrink-0 text-foreground" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}