import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

const WELCOME = "Hi! I'm an AI assistant with full context about this site. Ask me about Sanket's books, races, treks, projects, or anything else!";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (isStreaming) {
      abortRef.current?.abort();
    }
    setIsOpen(false);
  }, [isStreaming]);

  const sendMessage = useCallback(async (userText) => {
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInputValue('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // Recursive stream reader — avoids no-await-in-loop and for...of lint rules
    async function processChunk(reader, decoder, buffer) {
      const { done, value } = await reader.read();
      if (done) return;

      const newBuffer = buffer + decoder.decode(value, { stream: true });
      const lines = newBuffer.split('\n');
      const remaining = lines.pop();

      lines
        .filter((line) => line.startsWith('data: '))
        .forEach((line) => {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            // Only content_block_delta with text_delta carries visible text
            if (
              parsed.type === 'content_block_delta'
              && parsed.delta?.type === 'text_delta'
              && typeof parsed.delta.text === 'string'
            ) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.delta.text,
                  };
                }
                return updated;
              });
            }
          } catch (e) {
            // skip malformed JSON lines
          }
        });

      await processChunk(reader, decoder, remaining);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await processChunk(response.body.getReader(), new TextDecoder(), '');
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant' && !last.content) {
            updated[updated.length - 1] = {
              role: 'assistant',
              content: 'Sorry, something went wrong. Please try again.',
            };
          }
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [messages]);

  const handleSubmit = useCallback(() => {
    const text = inputValue.trim();
    if (text && !isStreaming) sendMessage(text);
  }, [inputValue, isStreaming, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const chatUI = (
    <>
      {/* Chat panel */}
      <div
        className={[
          'fixed bottom-44 right-6 z-[151]',
          'w-[380px] max-w-[calc(100vw-3rem)] h-[480px]',
          'flex flex-col',
          'bg-white dark:bg-stone-900',
          'border border-stone-200 dark:border-stone-700',
          'shadow-2xl rounded-xl overflow-hidden',
          'transition-all duration-300 origin-bottom-right',
          isOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-95 opacity-0 pointer-events-none',
        ].join(' ')}
        role="dialog"
        aria-label="AI chat assistant"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-label text-xs font-bold uppercase tracking-widest text-stone-700 dark:text-stone-200">
              Ask about Sanket
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            aria-label="Close chat"
            type="button"
          >
            <span className="material-symbols-outlined text-xl leading-none">close</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-stone-500 dark:text-stone-400 text-sm font-body leading-relaxed">
              {WELCOME}
            </p>
          )}

          {messages.map((msg, i) => (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={[
                  'max-w-[85%] px-3 py-2 text-sm font-body leading-relaxed whitespace-pre-wrap rounded-lg',
                  msg.role === 'user'
                    ? 'bg-secondary text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100',
                ].join(' ')}
              >
                {msg.content}
                {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse align-middle" />
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input row */}
        <div className="shrink-0 px-3 py-3 border-t border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 resize-none rounded-lg px-3 py-2 text-sm font-body bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-secondary placeholder:text-stone-400 max-h-24 overflow-y-auto"
            placeholder="Ask a question…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            aria-label="Chat input"
          />
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isStreaming}
            className="p-2 rounded-lg bg-secondary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            aria-label="Send message"
            type="button"
          >
            <span className="material-symbols-outlined text-xl leading-none">send</span>
          </button>
        </div>
      </div>

      {/* Floating chat button */}
      <button
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className="fixed bottom-24 right-6 z-[150] w-14 h-14 rounded-full bg-secondary text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center border border-white/10"
        aria-label={isOpen ? 'Close chat' : 'Open AI chat'}
        aria-expanded={isOpen}
        type="button"
      >
        <span
          className="material-symbols-outlined text-2xl transition-transform duration-300"
          style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}
        >
          {isOpen ? 'close' : 'chat'}
        </span>
      </button>
    </>
  );

  return ReactDOM.createPortal(chatUI, document.body);
};

export default ChatWidget;
