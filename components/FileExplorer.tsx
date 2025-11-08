
import React from 'react';
import { DocFile } from '../types';
import { FileCodeIcon } from './Icons';

interface FileExplorerProps {
  files: DocFile[];
  selectedFile: string | null;
  onSelectFile: (fileName: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ files, selectedFile, onSelectFile }) => {
  return (
    <nav className="p-2 space-y-1">
      {files.map(file => (
        <a
          key={file.name}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectFile(file.name);
          }}
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            selectedFile === file.name
              ? 'bg-indigo-500 text-white'
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <FileCodeIcon className="w-5 h-5 mr-3" />
          <span className="truncate">{file.name}</span>
        </a>
      ))}
    </nav>
  );
};

export default FileExplorer;
