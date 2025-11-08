import React, { useLayoutEffect, useRef, useState } from 'react';
import { ParsedNode, ParsedChild, ParsedTextNode } from '../types';

interface RenderedViewProps {
  code: string;
  tree: ParsedNode | null;
  syncPos: number | null;
  syncSource: 'editor' | 'preview' | null;
  onCursorChange: (pos: number, source: 'preview', meta: { clickY: number }) => void;
  onCodeChange: (newCode: string) => void;
}

type RenderedViewRef = React.ForwardedRef<HTMLElement>;

const isParsedNode = (c: ParsedChild): c is ParsedNode => 'component' in c;

interface RenderNodeProps {
  node: ParsedChild;
  syncPos: number | null;
  syncSource: 'editor' | 'preview' | null;
  onCursorChange: (pos: number, source: 'preview', meta: { clickY: number }) => void;
  syncPosRef: React.RefObject<HTMLSpanElement>;
  onTextChange: (node: ParsedTextNode, newContent: string, cursorPosition: number) => void;
}

const RenderedTextNode: React.FC<{
  node: ParsedTextNode;
  syncPos: number | null;
  syncSource: 'editor' | 'preview' | null;
  syncPosRef: React.RefObject<HTMLSpanElement>;
  onTextChange: (node: ParsedTextNode, newContent: string, cursorPosition: number) => void;
}> = ({ node, syncPos, syncSource, syncPosRef, onTextChange }) => {
    
    const handleTextInput = (e: React.FormEvent<HTMLSpanElement>) => {
      const selection = window.getSelection();
      let cursorPosition = 0;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        cursorPosition = range.startOffset;
      }
      const newText = e.currentTarget.textContent || '';
      onTextChange(node, newText, cursorPosition);
    };

    // Only show the synchronized highlight if the change originated from the code editor.
    const isHighlighted = syncSource === 'editor' && syncPos !== null && syncPos >= node.startIndex && syncPos < node.endIndex;

    const props = {
      onInput: handleTextInput,
      contentEditable: true,
      suppressContentEditableWarning: true,
      'data-start-index': node.startIndex,
      'data-id': node.id,
    };

    if (isHighlighted) {
      const relativePos = syncPos - node.startIndex;
      
      // Find word boundaries
      let wordStart = relativePos;
      while (wordStart > 0 && !/\s|[.,;?!]/.test(node.content[wordStart - 1])) {
        wordStart--;
      }
      
      let wordEnd = relativePos;
      while (wordEnd < node.content.length - 1 && !/\s|[.,;?!]/.test(node.content[wordEnd + 1])) {
        wordEnd++;
      }

      const before = node.content.substring(0, wordStart);
      const word = node.content.substring(wordStart, wordEnd + 1);
      const after = node.content.substring(wordEnd + 1);
      
      return (
        <span {...props}>
          {before}
          <span ref={syncPosRef} className="bg-red-200 border border-red-400 rounded-sm px-0.5 -mx-0.5" contentEditable={false}>{word}</span>
          {after}
        </span>
      );
    }
    return <span {...props}>{node.content}</span>;
}


const RenderNode: React.FC<RenderNodeProps> = ({ node, syncPos, syncSource, onCursorChange, syncPosRef, onTextChange }) => {
  if (!isParsedNode(node)) {
    return <RenderedTextNode node={node} syncPos={syncPos} syncSource={syncSource} syncPosRef={syncPosRef} onTextChange={onTextChange} />;
  }
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Don't sync position if we are editing text.
    // The browser gives focus to the contentEditable span automatically.
    const target = e.target as HTMLElement;
    if (target.isContentEditable) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Use caretRangeFromPoint for precision click detection
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    if (!range) return;

    const textNode = range.startContainer;
    
    if (textNode.nodeType !== Node.TEXT_NODE) {
      onCursorChange(node.contentStartIndex, 'preview', { clickY: e.clientY }); // Fallback
      return;
    }

    const span = textNode.parentElement?.closest('[data-start-index]');
    if (span) {
      const startIndex = parseInt(span.getAttribute('data-start-index') || '0', 10);
      const clickOffset = range.startOffset;
      onCursorChange(startIndex + clickOffset, 'preview', { clickY: e.clientY });
    } else {
      onCursorChange(node.contentStartIndex, 'preview', { clickY: e.clientY }); // Fallback
    }
  };

  const Component = node.component;
  const props: { [key: string]: any } = {
    ...node.props,
    onClick: handleClick,
    className: `${node.props.className || ''} cursor-pointer`,
  };

  return (
    <Component {...props}>
      {node.children.map((child) => (
        <RenderNode key={child.id} node={child} syncPos={syncPos} syncSource={syncSource} onCursorChange={onCursorChange} syncPosRef={syncPosRef} onTextChange={onTextChange} />
      ))}
    </Component>
  );
};

const RenderedView: React.ForwardRefRenderFunction<HTMLElement, RenderedViewProps> = ({ code, tree, syncPos, syncSource, onCursorChange, onCodeChange }, ref) => {
  const viewRef = useRef<HTMLDivElement>(null);
  const syncPosRef = ref as React.RefObject<HTMLSpanElement> | null;
  const [editingState, setEditingState] = useState<{ nodeId: string; cursor: number } | null>(null);

  useLayoutEffect(() => {
    if (editingState && viewRef.current) {
        const { nodeId, cursor } = editingState;
        const el = viewRef.current.querySelector<HTMLElement>(`[data-id="${nodeId}"]`);
        
        if (el && el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
            const textNode = el.firstChild as Text;
            const range = document.createRange();
            const sel = window.getSelection();
            
            // Clamp cursor position to be within the text node's length
            const finalCursor = Math.min(cursor, textNode.length);

            try {
              range.setStart(textNode, finalCursor);
              range.collapse(true);
              
              sel?.removeAllRanges();
              sel?.addRange(range);
            } catch(e) {
              console.error("Failed to set cursor position:", e);
            }
        }
        setEditingState(null);
    }
  }, [editingState]);
  
  const handleTextChange = (node: ParsedTextNode, newContent: string, cursorPosition: number) => {
      // Escape HTML special characters for XML safety
      const escapedText = newContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      const newCode = 
          code.substring(0, node.startIndex) +
          escapedText +
          code.substring(node.endIndex);

      setEditingState({ nodeId: node.id, cursor: cursorPosition });
      onCodeChange(newCode);
  };

  if (!tree) {
    return <div className="text-red-400">Error parsing XML. Please check the document structure.</div>;
  }

  return (
    <div 
      ref={viewRef}
      className="prose prose-lg max-w-none text-gray-900"
    >
      <RenderNode node={tree} syncPos={syncPos} syncSource={syncSource} onCursorChange={onCursorChange} syncPosRef={syncPosRef!} onTextChange={handleTextChange} />
    </div>
  );
};

export default React.forwardRef(RenderedView);