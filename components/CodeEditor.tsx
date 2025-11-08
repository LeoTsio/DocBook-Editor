import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import Editor from 'react-simple-code-editor';

// Prism is loaded via <script> tags in index.html, so it's available globally.
declare const Prism: {
  highlight: (text: string, grammar: any, language: string) => string;
  languages: {
    [key: string]: any;
    markup: any;
  };
};

export interface CodeEditorRef {
  getPositionForCharIndex: (index: number) => { top: number; left: number; height: number };
  container: HTMLDivElement | null;
}

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  syncPos: number | null;
  syncSource: 'editor' | 'preview' | null;
  syncRelativePos: number | null;
  onCursorChange: (pos: number | null, source: 'editor', meta: { relativePos: number }) => void;
}

const escapeHtml = (text: string) => {
    return text.replace(/[&<>"']/g, (match) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[match]!));
};

const CodeEditor: React.ForwardRefRenderFunction<CodeEditorRef, CodeEditorProps> = 
  ({ code, onCodeChange, syncPos, syncSource, syncRelativePos, onCursorChange }, ref) => {
  const [cursorPos, setCursorPos] = useState({ top: 0, left: 0, height: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  // Create a persistent measurement div for performance.
  useEffect(() => {
    if (containerRef.current && !measureRef.current) {
      const measure = document.createElement('div');
      measure.style.position = 'absolute';
      measure.style.visibility = 'hidden';
      measure.style.height = 'auto';
      measure.style.top = '0';
      measure.style.left = '0';
      measure.style.whiteSpace = 'pre-wrap';
      measure.style.wordBreak = 'break-word';
      measure.style.font = "14px 'Fira Code', 'Dank Mono', 'Operator Mono', monospace";
      measure.style.lineHeight = '1.5';
      measure.style.padding = '1rem';
      containerRef.current.appendChild(measure);
      measureRef.current = measure;
    }
  }, []);
  
  const calculatePositionForCharIndex = (charIndex: number): { top: number; left: number; height: number } => {
    const measure = measureRef.current;
    if (!preRef.current || !measure) return { top: 0, left: 0, height: 0 };
    
    measure.style.width = `${preRef.current.clientWidth}px`;
    
    const textBefore = code.substring(0, charIndex);
    const char = code.substring(charIndex, charIndex + 1) || '|';
    
    measure.innerHTML = escapeHtml(textBefore) + '<span>' + escapeHtml(char) + '</span>';
    
    const span = measure.querySelector('span');
    if (!span) return { top: 0, left: 0, height: 0 };

    return { top: span.offsetTop, left: span.offsetLeft, height: span.offsetHeight };
  };

  useImperativeHandle(ref, () => ({
    container: containerRef.current,
    getPositionForCharIndex: calculatePositionForCharIndex,
  }));

  useEffect(() => {
    // Only show the synchronized cursor highlight if the change originated from the preview pane.
    if (syncSource !== 'preview' || syncPos === null || !containerRef.current) {
        setCursorPos({ top: -9999, left: 0, height: 0 }); // Hide cursor
        return;
    }
    
    const container = containerRef.current;
    const { top: absoluteTop, left, height } = calculatePositionForCharIndex(syncPos);
    
    if (syncRelativePos !== null) {
      const newScrollTop = absoluteTop - (container.clientHeight * syncRelativePos);
      container.scrollTo({ 
        top: newScrollTop, 
        // behavior: 'smooth' // Removed for predictability
      });
    }
    
    setCursorPos({ top: absoluteTop, left, height });

  }, [syncPos, code, syncSource, syncRelativePos]);

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const pos = e.currentTarget.selectionStart;
    if (!containerRef.current) return;

    const { top: absoluteTop } = calculatePositionForCharIndex(pos);
    const { scrollTop, clientHeight } = containerRef.current;

    const relativePos = (absoluteTop - scrollTop) / clientHeight;
    const clampedRelativePos = Math.max(0, Math.min(1, relativePos));

    onCursorChange(pos, 'editor', { relativePos: clampedRelativePos });
  };
  
  const handleScroll = () => {
    // Re-calculate visible cursor position during scroll
    if (syncPos !== null) {
      const { top, left, height } = calculatePositionForCharIndex(syncPos);
      const scrollTop = containerRef.current?.scrollTop || 0;
      setCursorPos({ top: top, left, height });
    }
  };

  return (
    <div ref={containerRef} className="code-editor flex-1 relative" onScroll={handleScroll}>
      {syncPos !== null && (
        <div
          className="absolute bg-red-500 opacity-75"
          style={{ 
            top: `${cursorPos.top}px`, 
            left: `${cursorPos.left}px`, 
            width: '2px', 
            height: `${cursorPos.height}px`,
            transform: `translateY(-${containerRef.current?.scrollTop || 0}px)`,
            transition: 'top 0.05s ease-out, left 0.05s ease-out',
            pointerEvents: 'none'
          }}
        />
      )}
      <Editor
        value={code}
        onValueChange={onCodeChange}
        highlight={code => Prism.highlight(code, Prism.languages.markup, 'markup')}
        padding={16}
        onSelect={handleSelect}
        onClick={handleSelect}
        preRef={preRef}
      />
    </div>
  );
};

export default React.forwardRef(CodeEditor);