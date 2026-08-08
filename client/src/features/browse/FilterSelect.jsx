import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function FilterSelect({ label, value, options, onChange, className = '', ariaLabel }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
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
    <div ref={wrapRef} className={`filter-select ${className}`.trim()}>
      <button
        type="button"
        ref={triggerRef}
        className="filter-select-trigger"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-activedescendant={open ? `${uid}-opt-${current}` : undefined}
        aria-label={ariaLabel}
      >
        <span className="filter-select-value">{selected ? selected.label : label}</span>
        <ChevronDown
          className={`filter-select-chevron${open ? ' filter-select-chevron--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul ref={listRef} className="filter-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={`${uid}-opt-${i}`}
              role="option"
              aria-selected={opt.value === value}
              className={`filter-select-option${i === current ? ' filter-select-option--active' : ''}${opt.value === value ? ' filter-select-option--selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <span className="filter-select-option-label">{opt.label}</span>
              {opt.value === value && <Check className="filter-select-option-check" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
