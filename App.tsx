
import React, { useState, useMemo } from 'react';
import { DocFile } from './types';
import FileUploader from './components/FileUploader';
import FileExplorer from './components/FileExplorer';
import EditorView from './components/EditorView';
import { WelcomeIcon } from './components/Icons';

const initialDocbookContent = `
<article>
  <title>Welcome to the DocBook Editor</title>
  <para>
    This editor provides a live preview of DocBook XML. It understands document structure, rendering titles for articles, sections, and more with appropriate heading levels.
  </para>

  <sect1>
    <title>Text Formatting</title>
    <para>
      The preview supports various inline formatting tags:
    </para>
    <itemizedlist>
      <listitem>
        <para>Standard <emphasis>emphasis</emphasis> is rendered as italics.</para>
      </listitem>
      <listitem>
        <para>Use <emphasis role="bold">role="bold"</emphasis> for bold text.</para>
      </listitem>
      <listitem>
        <para>Use <emphasis role="underline">role="underline"</emphasis> for underlined text.</para>
      </listitem>
      <listitem>
        <para>The editor also supports <subscript>subscript</subscript> and <superscript>superscript</superscript> tags.</para>
      </listitem>
    </itemizedlist>
  </sect1>
  
  <sect1>
    <title>Interactivity and Links</title>
    <para>
      Clicking on formatted text will highlight the corresponding code, and vice-versa. Links are also rendered. For more information, you can visit the official <ulink url="https://docbook.org/">DocBook website</ulink>.
    </para>
  </sect1>
</article>`.trim();


const App: React.FC = () => {
  const [files, setFiles] = useState<DocFile[]>([
    { name: 'example.xml', content: initialDocbookContent },
  ]);
  const [selectedFileName, setSelectedFileName] = useState<string | null>('example.xml');

  const handleFilesLoaded = (loadedFiles: DocFile[]) => {
    setFiles(loadedFiles);
    if (loadedFiles.length > 0) {
      setSelectedFileName(loadedFiles[0].name);
    } else {
      setSelectedFileName(null);
    }
  };

  const selectedFile = useMemo(() => {
    return files.find(f => f.name === selectedFileName) || null;
  }, [files, selectedFileName]);

  const handleFileContentChange = (fileName: string, newContent: string) => {
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.name === fileName ? { ...file, content: newContent } : file
      )
    );
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">DocBook Editor</h1>
        </div>
        <div className="p-4">
          <FileUploader onFilesLoaded={handleFilesLoaded} />
        </div>
        <div className="flex-grow overflow-y-auto">
          <FileExplorer
            files={files}
            selectedFile={selectedFileName}
            onSelectFile={setSelectedFileName}
          />
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-0">
        {selectedFile ? (
          <EditorView 
            key={selectedFile.name} 
            file={selectedFile} 
            onContentChange={handleFileContentChange}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <WelcomeIcon className="w-24 h-24 mb-4" />
            <h2 className="text-2xl">No file selected</h2>
            <p>Please load a file or folder to begin editing.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
