import React, { useRef, useEffect } from 'react';
import { Box, useColorMode, useColorModeValue } from '@chakra-ui/react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string | number;
  placeholder?: string;
  readOnly?: boolean;
  fontSize?: number;
  minimap?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval';
  wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  theme?: 'light' | 'dark' | 'auto';
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'python',
  height = '300px',
  placeholder = '# Nhập code của bạn ở đây...',
  readOnly = false,
  fontSize = 14,
  minimap = false,
  lineNumbers = 'on',
  wordWrap = 'on',
  theme = 'auto',
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { colorMode } = useColorMode();
  
  // Determine theme based on color mode
  const editorTheme = theme === 'auto' 
    ? (colorMode === 'dark' ? 'vs-dark' : 'light')
    : theme === 'dark' ? 'vs-dark' : 'light';

  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const bg = useColorModeValue('white', 'gray.800');

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Set placeholder if value is empty
    if (!value && placeholder) {
      editor.setValue(placeholder);
      // Set selection to start of document
      editor.setPosition({ lineNumber: 1, column: 1 });
    }

    // Focus editor
    editor.focus();
  };

  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  // Editor options
  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    fontSize,
    fontFamily: '"Fira Code", "Consolas", "Monaco", "Courier New", monospace',
    fontLigatures: true,
    lineNumbers,
    minimap: { enabled: minimap },
    wordWrap,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    readOnly,
    contextmenu: true,
    selectOnLineNumbers: true,
    roundedSelection: false,
    cursorStyle: 'line',
    cursorBlinking: 'blink',
    renderWhitespace: 'selection',
    renderControlCharacters: false,
    renderLineHighlight: 'line',
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    bracketPairColorization: {
      enabled: true,
    },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showFunctions: true,
      showVariables: true,
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: false,
    },
    parameterHints: {
      enabled: true,
    },
    hover: {
      enabled: true,
    },
    tabSize: 4,
    insertSpaces: true,
    detectIndentation: false,
  };

  // Configure Monaco Editor for Python
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('monaco-editor').then((monaco) => {
        // Configure Python language features
        monaco.languages.setLanguageConfiguration('python', {
          comments: {
            lineComment: '#',
            blockComment: ['"""', '"""'],
          },
          brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
          ],
          autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"', notIn: ['string'] },
            { open: "'", close: "'", notIn: ['string', 'comment'] },
            { open: '"""', close: '"""' },
            { open: "'''", close: "'''" },
          ],
          surroundingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
          ],
          indentationRules: {
            increaseIndentPattern: /^\s*(def|class|if|elif|else|for|while|with|try|except|finally|async def).*:\s*$/,
            decreaseIndentPattern: /^\s*(elif|else|except|finally)\b.*$/,
          },
        });

        // Add Python snippets
        monaco.languages.registerCompletionItemProvider('python', {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn
            };

            const suggestions = [
              {
                label: 'def',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'def ${1:function_name}(${2:parameters}):\n    ${3:pass}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Define a function',
                range: range,
              },
              {
                label: 'class',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, parameters}):\n        ${3:pass}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Define a class',
                range: range,
              },
              {
                label: 'if',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'if ${1:condition}:\n    ${2:pass}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'If statement',
                range: range,
              },
              {
                label: 'for',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'For loop',
                range: range,
              },
              {
                label: 'while',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'while ${1:condition}:\n    ${2:pass}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'While loop',
                range: range,
              },
              {
                label: 'try',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: 'Try-except block',
                range: range,
              },
            ];
            return { suggestions };
          },
        });
      });
    }
  }, []);

  return (
    <Box
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      overflow="hidden"
      bg={bg}
      position="relative"
    >
      <Editor
        height={height}
        language={language}
        theme={editorTheme}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={editorOptions}
        loading={
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height={height}
            bg={bg}
          >
            Đang tải editor...
          </Box>
        }
      />
    </Box>
  );
};

export default CodeEditor;