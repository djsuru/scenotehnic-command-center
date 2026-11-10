'use client';

import { useChat } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ulid } from 'ulidx';

import {
  AIAssistantPanel,
  type AIAssistantLabels,
} from '@/components/blocks/ai-assistant/AIAssistantPanel';
import { Button } from '@/components/ui/button';
import {
  createAgentChat,
  createConversation,
  getAgentProfile,
  resolveAgentChatDefaults,
  resolveChatErrorMessage,
  type AgentChatSuggestion,
  type AgentPublicProfile,
} from '@/lib/agent-chat/v2';
import { cn } from '@/lib/utils';

/** Literal accent classes so the Tailwind JIT scan (.tsx only) emits them. */
const ACCENT_BG = {
  1: 'bg-chart-1',
  2: 'bg-chart-2',
  3: 'bg-chart-3',
  4: 'bg-chart-4',
  5: 'bg-chart-5',
} as const;

/** Literal corner classes (launcher, desktop panel), for the same reason. */
const CORNER_CLASSES = {
  'bottom-right': { launcher: 'right-6', panel: 'sm:right-6' },
  'bottom-left': { launcher: 'left-6', panel: 'sm:left-6' },
} as const;

type AgentChat = ReturnType<typeof createAgentChat>;

export interface FloatingAgentChatProps {
  /**
   * SpaceAgent id from the manage_agent CreateAgent result (the value after
   * "The new agent id is"). Drives the in-app SDK. NOT the id from the /a/...
   * public URL - that one 404s against the SDK.
   */
  agentId?: string;
  /**
   * Trailing segment of the /a/{publicAgentId} public URL. Drives the hosted
   * iframe fallback (and the "Open hosted chat" escape hatch on SDK errors).
   */
  publicAgentId?: string;
  /**
   * Header + launcher label. Defaults to the agent's custom header title or
   * its name (from the agent's public profile).
   */
  title?: string;
  /** Chart-token index for the launcher color; wins over the agent's accent. */
  accent?: 1 | 2 | 3 | 4 | 5;
  /**
   * Hex accent for the launcher. Defaults to the agent's Customize color; a
   * chart-token `accent` wins over both.
   */
  accentColor?: string;
  /**
   * Starter prompt chips. Defaults to the agent's own conversation starters;
   * hidden when the owner turned "Show suggestions" off.
   */
  suggestions?: readonly AgentChatSuggestion[];
  /** Composer placeholder. Defaults to the agent's input placeholder. */
  placeholder?: string;
  /** Empty-state copy. Defaults to the agent's welcome message. */
  emptyDescription?: string;
  /** Small line under the composer. Defaults to the agent's footer text. */
  footerText?: string;
  /** Dismissable banner above the chat. Defaults to the agent's notice. */
  notice?: string;
  /**
   * Machinery strings for the panel and this shell (close, retry, connecting).
   * Partial; every key falls back to English. Pass it from the app's own
   * dictionary on a multilingual app - it is the only way these strings change,
   * because blocks are never forked.
   */
  labels?: Partial<FloatingAgentChatLabels>;
  /**
   * Corner for the launcher and the desktop panel. On a phone the open panel
   * fills the screen in both cases. Use `bottom-left` when the app's own
   * control or sticky call to action sits in the bottom-right corner.
   */
  position?: 'bottom-right' | 'bottom-left';
  /**
   * `floating` (default): a launcher in a corner opens the panel. `inline`: no
   * launcher and no close button; the chat fills its parent, so the app places
   * it in a page section, a dedicated tab, a full-page route or its own
   * `<aside>` / `Sheet`. Give the parent a height (`h-[560px]`, `h-full`).
   * It creates the conversation on the first send, never on mount.
   */
  variant?: 'floating' | 'inline';
  /**
   * Avatar slot: replaces the agent's emoji or image in the header chip and
   * the default launcher icon (a lucide icon or an emoji in a span).
   */
  icon?: ReactNode;
  /**
   * One short word after the launcher icon, in the app's language ("Chat",
   * "Coach"). From `sm` up the launcher becomes a pill that fits the text,
   * and the text truncates only past `max-w-xs`. On a phone the launcher
   * shows the icon only, so it never covers the content.
   */
  launcherText?: string;
  /**
   * Classes merged into the launcher button (shape, size, gradient, shadow).
   * A background set here wins over `accent` and the agent's accent color.
   */
  launcherClassName?: string;
  /**
   * Classes merged into the chat card (surface, border, radius, shadow,
   * font), so the panel matches the app's own cards.
   */
  panelClassName?: string;
  defaultOpen?: boolean;
  /** Classes for the outer wrapper (placement of the floating panel). */
  className?: string;
}

export interface FloatingAgentChatLabels extends AIAssistantLabels {
  /**
   * aria-label of the closed launcher. The only key with no static default:
   * absent, it reads "Open <title>" so screen readers still hear the agent's
   * name, and a localized app passes its own complete phrase.
   */
  openChat?: string;
  /** aria-label of the header close button. */
  closeChat: string;
  /** Copy above the retry button when the SDK chat failed to start. */
  warmingUp: string;
  /** Retry button. */
  tryAgain: string;
  /** Escape-hatch link to the hosted /a/ page. */
  openHostedChat: string;
  /** Shown while the SDK chat is starting. */
  connecting: string;
}

/**
 * A base background color or gradient utility (`bg-primary`, `bg-gradient-to-r`,
 * `!bg-card`). Not a variant one, and not a utility that sets no color
 * (`bg-clip-text`, `bg-no-repeat`, `bg-cover`).
 */
const LAUNCHER_BACKGROUND_RE =
  /(^|\s)!?bg-(?!(fixed|local|scroll|clip-|origin-|repeat|no-repeat|blend-|auto|cover|contain|bottom|center|left|right|top|none|\[length:|\[position:))/;

/** Any radius utility, with or without a variant (`rounded-md`, `sm:rounded-2xl`). */
const PANEL_RADIUS_RE = /(^|\s)([\w-]+:)*rounded(-[^\s]+)?(?=\s|$)/;

const DEFAULT_SHELL_LABELS: Omit<FloatingAgentChatLabels, keyof AIAssistantLabels | 'openChat'> = {
  closeChat: 'Close chat',
  warmingUp: 'The assistant is warming up - try again.',
  tryAgain: 'Try again',
  openHostedChat: 'Open hosted chat',
  connecting: 'Connecting...',
};

/**
 * FloatingAgentChat - the complete floating agent chat: launcher button,
 * mobile-responsive panel, Agent Chat SDK v2 wiring (lazy conversation
 * creation, two-component useChat split), a friendly error/retry state, and
 * a hosted-chat iframe fallback when only a publicAgentId is available.
 *
 * Appearance comes from the agent itself: the block reads the agent's public
 * profile (name / header title, starters, placeholder, welcome message, accent)
 * so it matches the hosted /a/ page and the website widget without any props.
 * Every prop is an override and always wins.
 *
 * The look follows the app: the surfaces use the `src/index.css` tokens, and
 * `variant`, `icon`, `launcherText`, `launcherClassName` and `panelClassName`
 * let each app give its chat its own place and shape. The block keeps the
 * hard parts (SDK wiring, streaming, retry, hosted fallback) in every variant.
 *
 * Sanctioned exception to the blocks "no network" rule: it delegates ALL
 * network to @/lib/agent-chat/v2 and never hand-rolls a fetch.
 */
export function FloatingAgentChat({
  agentId,
  publicAgentId,
  title,
  accent,
  accentColor,
  suggestions,
  placeholder,
  emptyDescription,
  footerText,
  notice,
  labels,
  position = 'bottom-right',
  variant = 'floating',
  icon,
  launcherText,
  launcherClassName,
  panelClassName,
  defaultOpen = false,
  className,
}: FloatingAgentChatProps) {
  const shellLabels = { ...DEFAULT_SHELL_LABELS, ...labels };
  const inline = variant === 'inline';
  // A radius in panelClassName replaces the default one. `cn` keeps classes
  // with different breakpoints, so a default `sm:rounded-xl` would otherwise
  // win over the app's `rounded-md` on desktop.
  const panelHasRadius = panelClassName != null && PANEL_RADIUS_RE.test(panelClassName);
  const [openState, setOpen] = useState(defaultOpen);
  // An inline chat is always open: it has no launcher to open it.
  const open = inline || openState;
  const [chat, setChat] = useState<AgentChat | null>(null);
  const [chatError, setChatError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [profile, setProfile] = useState<AgentPublicProfile | null>(null);
  // An inline chat creates its conversation on the first send, not on mount,
  // so a page view alone never creates one. The first text waits here.
  const [pendingText, setPendingText] = useState<string | null>(null);

  const sdkMode = agentId != null && agentId !== '';
  // The profile route accepts the internal or the public id, so a hosted
  // fallback (publicAgentId only) also gets the owner's appearance.
  const profileAgentId = sdkMode ? agentId : publicAgentId;

  // One read per mount. A failure (unpublished agent, offline) just keeps the
  // prop/default appearance - the chat itself is unaffected.
  useEffect(() => {
    if (profileAgentId == null || profileAgentId === '') {
      return;
    }
    let cancelled = false;
    getAgentProfile(profileAgentId)
      .then((loaded) => {
        if (!cancelled) {
          setProfile(loaded);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profileAgentId]);

  const appearance = resolveAgentChatDefaults(profile, {
    title,
    suggestions,
    placeholder,
    emptyDescription,
    accentColor,
    footerText,
    notice,
  });
  const resolvedTitle = appearance.title;
  const hostedUrl =
    publicAgentId != null && publicAgentId !== ''
      ? `https://www.taskade.com/a/${encodeURIComponent(publicAgentId)}`
      : null;

  const startChat = useCallback(async () => {
    if (!sdkMode || chat != null || starting) {
      return;
    }
    setStarting(true);
    try {
      const { conversationId } = await createConversation(agentId);
      setChat(createAgentChat(agentId, conversationId));
      setChatError(false);
    } catch {
      // Never let a 404/503 white-screen the app - keep the panel rendered
      // with a visible retry state (and a hosted-chat escape hatch).
      setChatError(true);
    } finally {
      setStarting(false);
    }
  }, [sdkMode, chat, starting, agentId]);

  // defaultOpen renders the panel without a launcher click, so handleOpen never
  // fires and the panel would sit on "Connecting..." forever. Start the
  // conversation from here too. startChat's own guards prevent double-starts;
  // skipping on chatError keeps failures on the manual "Try again" button
  // instead of an auto-retry loop.
  useEffect(() => {
    if (!inline && open && sdkMode && chat == null && !chatError && !starting) {
      void startChat();
    }
  }, [inline, open, sdkMode, chat, chatError, starting, startChat]);

  // Nothing to chat with: render nothing rather than a dead launcher.
  if (!sdkMode && hostedUrl == null) {
    return null;
  }

  const corner = CORNER_CLASSES[position] ?? CORNER_CLASSES['bottom-right'];
  const hasLauncherText = launcherText != null && launcherText !== '';

  const handleOpen = () => {
    setOpen(true);
    void startChat();
  };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            {/* Tap-to-dismiss backdrop, mobile only. */}
            {inline ? null : (
              <div
                className="bg-foreground/20 fixed inset-0 z-40 sm:hidden"
                onClick={() => setOpen(false)}
                aria-hidden
              />
            )}
            <motion.div
              data-genesis-block="floating-agent-chat"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              data-genesis-chat-variant={variant}
              className={cn(
                inline
                  ? 'flex h-full min-h-0 w-full flex-col'
                  : cn(
                      'fixed inset-0 z-50 h-full w-full sm:inset-auto sm:bottom-6 sm:h-[600px] sm:w-[400px]',
                      corner.panel,
                    ),
                className,
              )}
            >
              <div
                className={cn(
                  'bg-card text-card-foreground flex h-full min-h-0 flex-col overflow-hidden border',
                  inline
                    ? !panelHasRadius && 'rounded-xl'
                    : // The full-screen mobile panel keeps square corners.
                      cn('shadow-lg max-sm:rounded-none', !panelHasRadius && 'sm:rounded-xl'),
                  panelClassName,
                )}
              >
                {/* The ONE header of the chat. The panel below gets
                    `hideHeader`, so the title never shows twice. */}
                <div className="flex items-center gap-2 border-b py-2 pl-4 pr-2">
                  {icon != null ? (
                    <span
                      className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full"
                      data-genesis-chat-avatar="custom"
                      aria-hidden
                    >
                      {icon}
                    </span>
                  ) : (
                    <AgentAvatarChip avatar={appearance.avatar} />
                  )}
                  <span className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold">
                    {resolvedTitle}
                  </span>
                  {inline ? null : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setOpen(false)}
                      aria-label={shellLabels.closeChat}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  )}
                </div>

                {sdkMode && chat != null ? (
                  <ActiveChat
                    chat={chat}
                    title={resolvedTitle}
                    suggestions={appearance.suggestions}
                    placeholder={appearance.placeholder}
                    emptyDescription={appearance.emptyDescription}
                    footerText={appearance.footerText}
                    notice={appearance.notice}
                    labels={labels}
                    initialText={pendingText}
                    onInitialSent={() => setPendingText(null)}
                  />
                ) : sdkMode && chatError ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                    <p className="text-muted-foreground text-sm">{shellLabels.warmingUp}</p>
                    <Button onClick={() => void startChat()} disabled={starting}>
                      {shellLabels.tryAgain}
                    </Button>
                    {hostedUrl != null ? (
                      <a
                        href={hostedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground text-xs underline"
                      >
                        {shellLabels.openHostedChat}
                      </a>
                    ) : null}
                  </div>
                ) : sdkMode && inline ? (
                  <AIAssistantPanel
                    messages={[]}
                    onSend={(text) => {
                      setPendingText(text);
                      void startChat();
                    }}
                    busy={starting}
                    title={resolvedTitle}
                    suggestions={appearance.suggestions}
                    placeholder={appearance.placeholder}
                    emptyDescription={appearance.emptyDescription}
                    footerText={appearance.footerText}
                    notice={appearance.notice}
                    labels={labels}
                    hideHeader
                    emptyStateAlign="end"
                    className="rounded-none border-0 bg-transparent text-inherit shadow-none"
                  />
                ) : sdkMode ? (
                  <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
                    {shellLabels.connecting}
                  </div>
                ) : hostedUrl != null ? (
                  <iframe
                    src={hostedUrl}
                    title={resolvedTitle}
                    allow="clipboard-read; clipboard-write"
                    className="h-full w-full flex-1 border-0"
                  />
                ) : null}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      {!open ? (
        <Button
          onClick={handleOpen}
          data-genesis-block="floating-agent-chat"
          data-genesis-chat
          // A visible launcher text is the accessible name too (WCAG 2.5.3).
          aria-label={
            labels?.openChat ?? (hasLauncherText ? launcherText : `Open ${resolvedTitle}`)
          }
          className={cn(
            'fixed bottom-6 z-50 rounded-full shadow-lg',
            // With text the launcher is a pill that fits it from `sm` up, not
            // a 56px square. A phone keeps the square with the icon only.
            hasLauncherText
              ? 'size-14 sm:h-14 sm:w-auto sm:max-w-xs sm:px-5 sm:has-[>svg]:px-5'
              : 'size-14',
            corner.launcher,
            accent != null ? ACCENT_BG[accent] : 'bg-primary text-primary-foreground',
            launcherClassName,
          )}
          // A chart-token accent keeps its class; otherwise the agent's (or the
          // accentColor prop's) hex tints the launcher inline, with a
          // luminance-picked icon color so it stays readable on light brands.
          // A background in launcherClassName wins, so the hex does not cover
          // it. A launcherClassName with only shape classes keeps the hex.
          style={
            accent == null &&
            !(launcherClassName != null && LAUNCHER_BACKGROUND_RE.test(launcherClassName)) &&
            appearance.accentColor != null
              ? { backgroundColor: appearance.accentColor, color: appearance.accentForeground }
              : undefined
          }
        >
          {icon != null ? (
            <span className="flex items-center leading-none" aria-hidden>
              {icon}
            </span>
          ) : appearance.launcherIcon != null ? (
            <span className="text-2xl leading-none" aria-hidden>
              {appearance.launcherIcon}
            </span>
          ) : (
            <MessageCircle className="size-6" aria-hidden />
          )}
          {hasLauncherText ? (
            <span className="hidden min-w-0 truncate text-sm font-medium sm:inline">
              {launcherText}
            </span>
          ) : null}
        </Button>
      ) : null}
    </>
  );
}

/**
 * The agent's avatar in the chat header: the owner's emoji or image from the
 * public profile, else a sparkles glyph. All three sit in the same small round
 * chip, so the header keeps one height. A broken image URL falls back to the
 * glyph.
 */
function AgentAvatarChip({ avatar }: { avatar: AgentPublicProfile['avatar'] | undefined }) {
  const imageUrl = avatar?.type === 'image' ? avatar.url : null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const chipClass =
    'bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full';
  if (imageUrl != null && imageUrl !== failedUrl) {
    return (
      <span className={chipClass} data-genesis-chat-avatar="image">
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setFailedUrl(imageUrl)}
        />
      </span>
    );
  }
  if (avatar?.type === 'emoji') {
    return (
      <span
        className={cn(chipClass, 'text-base leading-none')}
        data-genesis-chat-avatar="emoji"
        aria-hidden
      >
        {avatar.value}
      </span>
    );
  }
  return (
    <span className={chipClass} data-genesis-chat-avatar="glyph" aria-hidden>
      <Sparkles className="size-3.5" aria-hidden />
    </span>
  );
}

/**
 * Inner component so useChat only ever mounts with a REAL Chat instance
 * (useChat crashes if passed undefined - the mandatory two-component split).
 */
function ActiveChat({
  chat,
  title,
  suggestions,
  placeholder,
  emptyDescription,
  footerText,
  notice,
  labels,
  initialText,
  onInitialSent,
}: {
  chat: AgentChat;
  title: string;
  suggestions?: readonly AgentChatSuggestion[];
  placeholder?: string;
  emptyDescription?: string;
  footerText?: string;
  notice?: string;
  labels?: Partial<AIAssistantLabels>;
  /** First message typed before the conversation existed (inline variant). */
  initialText?: string | null;
  onInitialSent?: () => void;
}) {
  const { messages, status, stop, error, clearError, regenerate, addToolApprovalResponse } =
    useChat({
      chat,
      id: chat.id,
      // Matches useAiSdkChat.ts: coalesce stream-part re-renders to ~frame rate.
      experimental_throttle: 16,
    });
  const busy = status === 'submitted' || status === 'streaming';

  // Shows the SERVER's message (already end-user-safe and specific about the
  // recovery) instead of a generic line of our own. See resolveChatErrorMessage.
  const errorMessage = resolveChatErrorMessage(error);

  const handleRetry = useCallback(() => {
    clearError();
    // Re-runs the failed turn: a trailing user message is resent as-is, a
    // half-written assistant message is dropped first. Rejections land back in
    // `error` and re-render the same line, so nothing is swallowed.
    void regenerate().catch(() => {});
  }, [clearError, regenerate]);

  const handleSend = useCallback(
    async (text: string) => {
      try {
        await chat.sendMessage({
          id: ulid(),
          role: 'user',
          parts: [{ type: 'text', text }],
        });
      } catch {
        // NOT swallowed: send/stream failures land in useChat's `error`, which is
        // rendered via errorMessage below. This catch only keeps the rejection
        // out of the submit handler.
      }
    },
    [chat],
  );

  // Sends the text the visitor typed while the conversation was starting,
  // once. The ref keeps a StrictMode double effect from sending it twice.
  const sentInitial = useRef(false);
  useEffect(() => {
    if (initialText == null || initialText === '' || sentInitial.current) {
      return;
    }
    sentInitial.current = true;
    onInitialSent?.();
    void handleSend(initialText);
  }, [initialText, onInitialSent, handleSend]);

  return (
    <AIAssistantPanel
      messages={messages}
      onSend={handleSend}
      busy={busy}
      status={status}
      onStop={stop}
      errorMessage={errorMessage}
      onRetry={handleRetry}
      onApprove={(id, approved) => addToolApprovalResponse({ id, approved })}
      title={title}
      suggestions={suggestions}
      placeholder={placeholder}
      emptyDescription={emptyDescription}
      footerText={footerText}
      notice={notice}
      labels={labels}
      // The shell above draws the header. The panel draws none, and its empty
      // greeting sits at the bottom, next to the chips and the composer.
      hideHeader
      emptyStateAlign="end"
      // Transparent, so the shell card (and its panelClassName) sets the surface.
      className="rounded-none border-0 bg-transparent text-inherit shadow-none"
    />
  );
}
