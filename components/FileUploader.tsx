
import React, { useRef } from 'react';
import { DocFile } from '../types';
import { FolderIcon, FileIcon } from './Icons';

interface FileUploaderProps {
  onFilesLoaded: (files: DocFile[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesLoaded }) => {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const loadedFiles: DocFile[] = [];
    // FIX: Explicitly type `file` as `File` to resolve type inference issues.
    const filePromises = Array.from(selectedFiles)
      .filter((file: File) => file.type === 'text/xml' || file.name.endsWith('.xml'))
      .map((file: File) => {
        return new Promise<DocFile>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => {
            resolve({
              name: file.name,
              content: e.target?.result as string,
            });
          };
          reader.onerror = reject;
          reader.readAsText(file);
        });
      });

    try {
      const results = await Promise.all(filePromises);
      onFilesLoaded(results);
    } catch (error) {
      console.error('Error reading files:', error);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
      />
      <input
        type="file"
        ref={filesInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept=".xml,text/xml"
      />
      <button
        onClick={() => folderInputRef.current?.click()}
        className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 transition-colors"
      >
        <FolderIcon className="w-5 h-5 mr-2" />
        Open Folder
      </button>
      <button
        onClick={() => filesInputRef.current?.click()}
        className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-800 transition-colors"
      >
        <FileIcon className="w-5 h-5 mr-2" />
        Open Files
      </button>
    </div>
  );
};

export default FileUploader;
