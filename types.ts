import React from 'react';

export interface DocFile {
  name: string;
  content: string;
}

export interface ParsedTextNode {
  id: string;
  type: 'text';
  content: string;
  startIndex: number;
  endIndex: number;
}

export type ParsedChild = ParsedNode | ParsedTextNode;

export interface ParsedNode {
  id: string;
  component: React.ElementType;
  props: { [key: string]: any; 'data-id': string; };
  children: ParsedChild[];
  startIndex: number; // Index in the original string of the opening tag
  endIndex: number; // Index in the original string of the closing tag's >
  contentStartIndex: number; // Index where the inner content (text or children) begins
  contentEndIndex: number; // Index where the inner content ends
}