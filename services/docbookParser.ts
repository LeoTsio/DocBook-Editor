import React from 'react';
import { ParsedNode, ParsedChild } from '../types';

const TAG_MAP: { [key: string]: React.ElementType } = {
  article: 'div',
  title: 'h1', // This is now a fallback, context will override
  para: 'p',
  itemizedlist: 'ul',
  listitem: 'li',
  emphasis: 'em',
  phrase: 'span',
  superscript: 'sup',
  subscript: 'sub',
  strong: 'strong', // For <emphasis role="bold">
  sect1: 'section',
  sect2: 'section',
  ulink: 'a',
  link: 'a',
};

const PROPS_MAP: { [key:string]: object } = {
  h1: { className: 'text-3xl font-bold mb-4 border-b border-gray-300 pb-2 text-gray-900' },
  h2: { className: 'text-2xl font-bold mb-3 mt-6 text-gray-900' },
  h3: { className: 'text-xl font-bold mb-2 mt-4 text-gray-900' },
  section: { className: 'py-2' },
  p: { className: 'mb-4' },
  ul: { className: 'list-disc pl-8 mb-4' },
  li: { className: 'mb-2' },
  em: { className: 'italic text-indigo-600' },
  strong: { className: 'font-bold text-teal-600' },
  sup: { className: 'align-super text-sm' },
  sub: { className: 'align-sub text-sm' },
  a: { className: 'text-blue-600 underline hover:text-blue-800' }
};

// --- Tokenizer ---
interface Token {
  type: 'open' | 'close' | 'text' | 'comment' | 'self-closing';
  tag?: string;
  attributes?: { [key: string]: string };
  content?: string;
  startIndex: number;
  endIndex: number;
}

const tokenRegex = /(<!--(?:.|\s)*?-->)|(<\/[a-zA-Z0-9_:]+>)|(<[a-zA-Z0-9_:]+(?:\s+[a-zA-Z0-9_:-]+=(?:"[^"]*"|'[^']*'))*\s*\/?>)|([^<]+)/g;
const attributeRegex = /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function tokenize(xmlString: string): Token[] {
    const tokens: Token[] = [];
    let match;
    tokenRegex.lastIndex = 0; // Reset regex state
    attributeRegex.lastIndex = 0;

    while ((match = tokenRegex.exec(xmlString)) !== null) {
        const startIndex = match.index;
        const [fullMatch, comment, closeTag, openTag, text] = match;
        const endIndex = startIndex + fullMatch.length;

        if (comment) {
            tokens.push({ type: 'comment', content: comment, startIndex, endIndex });
        } else if (closeTag) {
            const tag = closeTag.slice(2, -1).toLowerCase();
            tokens.push({ type: 'close', tag, startIndex, endIndex });
        } else if (openTag) {
            const isSelfClosing = openTag.endsWith('/>');
            const tagMatch = openTag.match(/<([a-zA-Z0-9_:]+)/);
            if (!tagMatch) continue;
            const tag = tagMatch[1].toLowerCase();

            const attributes: { [key: string]: string } = {};
            let attrMatch;
            while((attrMatch = attributeRegex.exec(openTag)) !== null) {
                const [, key, val1, val2] = attrMatch;
                attributes[key] = val1 ?? val2;
            }

            if (isSelfClosing) {
                tokens.push({ type: 'self-closing', tag, attributes, startIndex, endIndex });
            } else {
                tokens.push({ type: 'open', tag, attributes, startIndex, endIndex });
            }
        } else if (text && text.trim().length > 0) {
            // Find the real start index ignoring leading whitespace
            const trimStart = text.match(/^\s*/)?.[0].length || 0;
            tokens.push({ type: 'text', content: text.trim(), startIndex: startIndex + trimStart, endIndex });
        } else if (text) { // Preserve whitespace between tags if it's significant
            tokens.push({ type: 'text', content: text, startIndex, endIndex });
        }
    }
    return tokens;
}

// --- Parser ---

let nodeIdCounter = 0;
function parse(tokens: Token[], index: number, parentTagName?: string): { node: ParsedNode, nextIndex: number } | null {
    const token = tokens[index];
    if (!token || (token.type !== 'open' && token.type !== 'self-closing')) {
        return null;
    }
    
    const tagName = token.tag!;
    let component: React.ElementType = TAG_MAP[tagName] || 'div';
    let dynamicProps: { [key: string]: any } = { ...(PROPS_MAP[tagName] || {}) };

    if (tagName === 'title') {
        switch (parentTagName) {
          case 'article': component = 'h1'; dynamicProps = { ...(PROPS_MAP['h1'] || {}) }; break;
          case 'sect1': component = 'h2'; dynamicProps = { ...(PROPS_MAP['h2'] || {}) }; break;
          case 'sect2': component = 'h3'; dynamicProps = { ...(PROPS_MAP['h3'] || {}) }; break;
          default: component = 'strong'; dynamicProps = { className: 'font-bold text-lg block text-gray-800' }; break;
        }
    } else if (tagName === 'emphasis') {
        const role = token.attributes?.role;
        switch (role) {
            case 'bold': component = 'strong'; dynamicProps = { ...dynamicProps, ...(PROPS_MAP['strong'] || {}) }; break;
            case 'underline': component = 'span'; dynamicProps.className = `${dynamicProps.className || ''} underline decoration-yellow-500 text-yellow-700`.trim(); break;
        }
    } else if (component === 'a') {
        const url = token.attributes?.url || token.attributes?.['xlink:href'];
        if (url) {
            dynamicProps.href = url;
            dynamicProps.target = '_blank';
            dynamicProps.rel = 'noopener noreferrer';
        }
    }
    
    const children: ParsedChild[] = [];
    let contentStartIndex = token.endIndex;
    let contentEndIndex = token.endIndex;
    let nextIndex = index + 1;
    let finalEndIndex = token.endIndex;

    if (token.type === 'open') {
        while (nextIndex < tokens.length) {
            const nextToken = tokens[nextIndex];
            if (nextToken.type === 'close' && nextToken.tag === tagName) {
                contentEndIndex = nextToken.startIndex;
                finalEndIndex = nextToken.endIndex;
                nextIndex++;
                break;
            }

            if (nextToken.type === 'text') {
                if (nextToken.content) { // Push even empty strings to maintain structure
                     children.push({
                        id: `text-${nodeIdCounter++}`,
                        type: 'text',
                        content: nextToken.content,
                        startIndex: nextToken.startIndex,
                        endIndex: nextToken.endIndex,
                    });
                }
                nextIndex++;
            } else if (nextToken.type === 'open' || nextToken.type === 'self-closing') {
                const result = parse(tokens, nextIndex, tagName);
                if (result) {
                    children.push(result.node);
                    nextIndex = result.nextIndex;
                } else {
                    nextIndex++;
                }
            } else {
                nextIndex++;
            }
        }
    }

    const nodeId = (nodeIdCounter++).toString();

    return {
        node: {
            id: nodeId,
            component,
            props: { ...dynamicProps, 'data-id': nodeId },
            children,
            startIndex: token.startIndex,
            endIndex: finalEndIndex,
            contentStartIndex,
            contentEndIndex,
        },
        nextIndex
    };
}

export function parseDocBook(xmlString: string): { tree: ParsedNode | null } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      console.error('XML Parse Error:', parseError.textContent);
      return { tree: null };
    }

    const tokens = tokenize(xmlString);
    if (tokens.length === 0) return { tree: null };
    
    nodeIdCounter = 0;
    // Find first opening tag to start parsing
    const firstTagIndex = tokens.findIndex(t => t.type === 'open');
    if (firstTagIndex === -1) return { tree: null };

    const result = parse(tokens, firstTagIndex);
    return { tree: result ? result.node : null };

  } catch (error) {
    console.error('Error parsing DocBook XML:', error);
    return { tree: null };
  }
}