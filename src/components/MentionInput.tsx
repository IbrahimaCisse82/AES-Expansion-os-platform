import { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import { useAllUsersWithRoles } from '@/hooks/useUserRoles';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  id?: string;
  rows?: number;
  className?: string;
}

interface UserSuggestion {
  user_id: string;
  full_name: string;
  initials: string;
  avatar_color: string;
  role: string;
}

export default function MentionInput({ value, onChange, placeholder, maxLength, id, rows = 3, className }: MentionInputProps) {
  const { data: allUsers = [] } = useAllUsersWithRoles();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [suggestionsPos, setSuggestionsPos] = useState({ top: 0, left: 0 });

  const users: UserSuggestion[] = allUsers.map((u) => ({
    user_id: u.user_id,
    full_name: u.full_name ?? '',
    initials: u.initials ?? '',
    avatar_color: u.avatar_color ?? 'hsl(var(--navy))',
    role: u.role,
  }));

  const detectMention = useCallback((text: string, cursorPos: number) => {
    const beforeCursor = text.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf('@');
    if (atIndex === -1) return null;
    // @ must be at start or preceded by space/newline
    if (atIndex > 0 && !/\s/.test(beforeCursor[atIndex - 1])) return null;
    const query = beforeCursor.slice(atIndex + 1);
    // No spaces allowed in partial query (user hasn't finished typing)
    // Actually allow spaces since names have spaces
    if (query.includes('\n')) return null;
    return { atIndex, query };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const mention = detectMention(newValue, cursorPos);

    if (mention) {
      const { atIndex, query } = mention;
      setMentionStart(atIndex);
      const q = query.toLowerCase();
      const filtered = users.filter(u =>
        u.full_name.toLowerCase().includes(q)
      ).slice(0, 5);
      setSuggestions(filtered);
      setSelectedIndex(0);
      setShowSuggestions(filtered.length > 0);

      // Position suggestions near cursor
      if (textareaRef.current) {
        const ta = textareaRef.current;
        const rect = ta.getBoundingClientRect();
        // Simple positioning: below the textarea, aligned left
        setSuggestionsPos({
          top: rect.height + 4,
          left: 0,
        });
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = useCallback((user: UserSuggestion) => {
    if (mentionStart === -1) return;
    const ta = textareaRef.current;
    const cursorPos = ta?.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursorPos);
    const mentionText = `@${user.full_name}`;
    const newValue = `${before}${mentionText} ${after}`;
    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(-1);

    // Restore focus and cursor
    setTimeout(() => {
      if (ta) {
        ta.focus();
        const newCursor = before.length + mentionText.length + 1;
        ta.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }, [mentionStart, value, onChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && suggestions[selectedIndex]) {
      e.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    director: 'Directeur',
    country_manager: 'Country Manager',
    technical_director: 'Directeur Technique',
    commercial_director: 'Directeur Commercial',
    dhr: 'DRH',
    raf: 'RAF',
    analyst: 'Analyste',
    observer: 'Observateur',
    partner: 'Partenaire',
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        maxLength={maxLength}
        className={className}
        rows={rows}
        placeholder={placeholder}
      />
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
          style={{ top: suggestionsPos.top, left: suggestionsPos.left, minWidth: 240 }}
        >
          {suggestions.map((user, index) => (
            <button
              key={user.user_id}
              type="button"
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                index === selectedIndex ? 'bg-accent/10' : 'hover:bg-muted'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(user);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-primary-foreground text-[10px] font-bold flex-shrink-0"
                style={{ background: user.avatar_color }}
              >
                {user.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">{user.full_name}</div>
                <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[user.role] || user.role}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Extract mentioned user_ids from a comment text by matching against known users */
export function extractMentions(text: string, users: { user_id: string; full_name: string }[]): { user_id: string; full_name: string }[] {
  const mentions: { user_id: string; full_name: string }[] = [];
  // Sort by name length desc to match longest names first
  const sorted = [...users].sort((a, b) => b.full_name.length - a.full_name.length);
  for (const user of sorted) {
    const pattern = `@${user.full_name}`;
    if (text.includes(pattern) && !mentions.find(m => m.user_id === user.user_id)) {
      mentions.push({ user_id: user.user_id, full_name: user.full_name });
    }
  }
  return mentions;
}

/** Render text with highlighted mentions */
export function renderMentionedText(
  text: string,
  knownNames: string[],
  onMentionClick?: (name: string) => void
): React.ReactNode[] {
  // Build regex from known names
  const sorted = [...knownNames].sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return [text];
  
  const escaped = sorted.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(@(?:${escaped.join('|')}))`, 'g');
  
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (part.startsWith('@') && sorted.some(n => part === `@${n}`)) {
      return (
        <span
          key={i}
          className="inline-flex items-center px-1 py-0.5 rounded bg-accent/15 text-accent font-semibold text-[12.5px] cursor-pointer hover:bg-accent/25 transition-colors"
          onClick={() => onMentionClick?.(part.slice(1))}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
