import React, { useState, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { DocFile } from '../types';
import CodeEditor, { CodeEditorRef } from './CodeEditor';
import RenderedView from './RenderedView';
import { parseDocBook } from '../services/docbookParser';

interface EditorViewProps {
  file: DocFile;
  onContentChange: (fileName: string, newContent: string) => void;
}

const EditorView: React.FC<EditorViewProps> = ({ file, onContentChange }) => {
  const [code, setCode] = useState<string>(file.content);
  const [syncPos, setSyncPos] = useState<number | null>(null);
  const [syncSource, setSyncSource] = useState<'editor' | 'preview' | null>(null);
  const [syncRelativePos, setSyncRelativePos] = useState<number | null>(null);

  const editorRef = useRef<CodeEditorRef>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const highlightedElementRef = useRef<HTMLElement>(null);

  const { tree } = useMemo(() => parseDocBook(code), [code]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onContentChange(file.name, newCode);
  };
  
  const handleSyncPosChange = useCallback((
    pos: number | null, 
    source: 'editor' | 'preview', 
    meta: { relativePos?: number; clickY?: number } = {}
  ) => {
    setSyncPos(pos);
    setSyncSource(source);

    if (source === 'editor' && meta.relativePos !== undefined) {
      setSyncRelativePos(meta.relativePos);
    } else if (source === 'preview' && meta.clickY !== undefined && previewRef.current) {
      const containerRect = previewRef.current.getBoundingClientRect();
      const relativePos = (meta.clickY - containerRect.top) / containerRect.height;
      const clampedRelativePos = Math.max(0, Math.min(1, relativePos));
      setSyncRelativePos(clampedRelativePos);
    }
  }, []);
  
  useLayoutEffect(() => {
    if (syncSource === 'editor' && syncPos !== null && syncRelativePos !== null && highlightedElementRef.current && previewRef.current) {
      const container = previewRef.current;
      const element = highlightedElementRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Calculate the element's top position relative to the start of the scrollable content.
      // This is more robust than `offsetTop` as it's not affected by intermediate positioned elements.
      const elementAbsoluteTop = (elementRect.top - containerRect.top) + container.scrollTop;
      
      // Calculate the new scroll position to align the element vertically
      // based on the relative cursor position from the code editor.
      const newScrollTop = elementAbsoluteTop - (container.clientHeight * syncRelativePos);

      container.scrollTo({
        top: newScrollTop,
      });
    }
  }, [syncPos, syncSource, syncRelativePos]);

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-hidden">
      <div className="flex flex-col min-h-0">
        <h2 className="text-lg font-semibold mb-2 px-1 text-gray-400">XML Code</h2>
        <CodeEditor
          ref={editorRef}
          code={code}
          onCodeChange={handleCodeChange}
          syncPos={syncPos}
          syncSource={syncSource}
          syncRelativePos={syncRelativePos}
          onCursorChange={handleSyncPosChange}
        />
      </div>
      <div className="flex flex-col min-h-0">
        <h2 className="text-lg font-semibold mb-2 px-1 text-gray-400">Rendered Preview</h2>
        <div 
          ref={previewRef}
          className="flex-1 overflow-y-auto bg-white rounded-md p-6 border border-gray-300 relative"
        >
          <RenderedView
            ref={highlightedElementRef}
            code={code}
            tree={tree}
            syncPos={syncPos}
            syncSource={syncSource}
            onCursorChange={handleSyncPosChange}
            onCodeChange={handleCodeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorView;