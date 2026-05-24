import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * A highly resilient markdown block parser that prevents breaking
 * code blocks on blank lines (double newlines).
 */
export const parseMarkdownBlocks = (text: string): string[] => {
  const blocks: string[] = [];
  const lines = text.split('\n');
  let currentBlock: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      currentBlock.push(line);
      if (!inCodeBlock) {
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
      }
    } else if (inCodeBlock) {
      currentBlock.push(line);
    } else {
      if (line.trim() === '') {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join('\n'));
          currentBlock = [];
        }
      } else {
        currentBlock.push(line);
      }
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'));
  }
  return blocks;
};

/**
 * High-fidelity lightweight client-side syntax highlighter for code blocks.
 * Supports JavaScript, TypeScript, Bash, HTML, CSS, JSON, Python, etc.
 */
export const highlightCode = (code: string, lang: string): React.ReactNode => {
  const cleanLang = lang.trim().toLowerCase();
  
  const supportedLangs = [
    'javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx', 
    'bash', 'sh', 'html', 'css', 'json', 'python', 'py', 'python3'
  ];

  if (!supportedLangs.includes(cleanLang)) {
    return <span>{code}</span>;
  }

  const isHashCommentLang = ['python', 'py', 'python3', 'bash', 'sh'].includes(cleanLang);

  const rules = [
    { type: 'string', regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/ },
    { type: 'comment', regex: isHashCommentLang ? /#.*/ : /\/\/.*|\/\*[\s\S]*?\*\// },
    { type: 'number', regex: /\b(?:0x[a-fA-F0-9]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/ },
    { type: 'keyword', regex: /\b(?:break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|elif|import|in|instanceof|new|return|super|switch|this|throw|try|except|typeof|var|void|while|with|yield|let|package|private|protected|public|static|interface|type|from|as|readonly|async|await|keyof|def|lambda|raise|assert|pass|global|nonlocal|del|is|and|or|not|pip|npm|npx|install|run|git|cd|ls|mkdir|rm|curl|wget|sudo|echo|chmod|apt|brew|yarn|node|nvm)\b/ },
    { type: 'type', regex: /\b(?:string|number|boolean|any|void|unknown|never|object|Array|Promise|Record|Map|Set|null|undefined|true|false|str|int|float|bool|list|dict|tuple|set|None|True|False|print|len|range|enumerate|zip)\b/ },
    { type: 'operator', regex: /[+\-*/%&|^!=<>:~?]+/ }
  ];

  const unionRegex = new RegExp(
    rules.map(rule => `(${rule.regex.source})`).join('|'),
    'g'
  );

  const tokens: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  unionRegex.lastIndex = 0;

  while ((match = unionRegex.exec(code)) !== null) {
    const plainText = code.slice(lastIndex, match.index);
    if (plainText) {
      tokens.push(<span key={`plain-${keyCounter++}`}>{plainText}</span>);
    }

    let matchedType = 'plain';
    let matchedText = match[0];
    
    for (let i = 0; i < rules.length; i++) {
      if (match[i + 1] !== undefined) {
        matchedType = rules[i].type;
        matchedText = match[i + 1];
        break;
      }
    }

    const colorMap: Record<string, string> = {
      comment: '#64748b', // Slate gray
      string: '#a7f3d0',  // Mint green
      number: '#fbbf24',  // Amber
      keyword: '#c084fc', // Bright purple
      type: '#60a5fa',    // Sky blue
      operator: '#f43f5e' // Rose
    };

    tokens.push(
      <span 
        key={`token-${keyCounter++}`} 
        style={{ color: colorMap[matchedType] || '#f8fafc' }}
      >
        {matchedText}
      </span>
    );

    lastIndex = unionRegex.lastIndex;
  }

  const remainingText = code.slice(lastIndex);
  if (remainingText) {
    tokens.push(<span key={`plain-${keyCounter}`}>{remainingText}</span>);
  }

  return <>{tokens}</>;
};

/**
 * A sub-parser to format italics inside other inline elements.
 */
const parseItalics = (text: string, keyPrefix: string): React.ReactNode => {
  const italicParts = text.split(/(\*[^*]+\*)/g);
  return (
    <>
      {italicParts.map((italicPart, iIdx) => {
        if (italicPart.startsWith('*') && italicPart.endsWith('*')) {
          return (
            <em key={`${keyPrefix}-em-${iIdx}`} style={{ fontStyle: 'italic' }}>
              {italicPart.slice(1, -1)}
            </em>
          );
        }
        return <React.Fragment key={`${keyPrefix}-text-${iIdx}`}>{italicPart}</React.Fragment>;
      })}
    </>
  );
};

/**
 * Parses inline markdown styles (bold, italics, inline code) inside text blocks.
 */
export const parseInlineStyles = (text: string): React.ReactNode => {
  // Step 1: Split by inline code block (`...`)
  const codeParts = text.split(/(`[^`]+`)/g);

  return (
    <>
      {codeParts.map((codePart, cIdx) => {
        if (codePart.startsWith('`') && codePart.endsWith('`')) {
          return (
            <Box 
              component="code" 
              key={`code-${cIdx}`} 
              sx={{ 
                color: (theme) => theme.palette.mode === 'dark' ? '#f472b6' : '#db2777', 
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.04)',
                px: 0.8, 
                py: 0.2, 
                borderRadius: 1.5,
                fontSize: '0.9em',
                fontFamily: 'Fira Code, monospace',
                border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(15, 23, 42, 0.04)',
                display: 'inline-block'
              }}
            >
              {codePart.slice(1, -1)}
            </Box>
          );
        }

        // Step 2: Split by bold elements (**...**) using non-greedy matching to support nested styles
        const boldParts = codePart.split(/(\*\*[\s\S]*?\*\*)/g);
        
        return (
          <React.Fragment key={`bold-container-${cIdx}`}>
            {boldParts.map((boldPart, bIdx) => {
              if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                const innerBoldText = boldPart.slice(2, -2);
                return (
                  <strong key={`bold-${bIdx}`} style={{ fontWeight: 800 }}>
                    {parseItalics(innerBoldText, `bold-italic-${bIdx}`)}
                  </strong>
                );
              }

              // Step 3: Split by italic elements (*...*)
              return (
                <React.Fragment key={`italic-container-${bIdx}`}>
                  {parseItalics(boldPart, `italic-${bIdx}`)}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
};

/**
 * Premium rich markdown renderer supporting header levels, blockquotes, 
 * lists, inline code snippets, and syntax-highlighted code blocks.
 */
export const renderMarkdown = (markdown: string): React.ReactNode[] => {
  const blocks = parseMarkdownBlocks(markdown);
  
  return blocks.map((block, idx) => {
    const cleanBlock = block.trim();
    if (!cleanBlock) return null;

    // H1 Header
    if (cleanBlock.startsWith('# ')) {
      return (
        <Typography variant="h3" component="h2" key={idx} sx={{ mt: 5, mb: 2, fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
          {parseInlineStyles(cleanBlock.replace('# ', ''))}
        </Typography>
      );
    }

    // H2 Header
    if (cleanBlock.startsWith('## ')) {
      return (
        <Typography variant="h4" component="h3" key={idx} sx={{ mt: 4, mb: 2, fontWeight: 700, fontFamily: 'Outfit, sans-serif', borderBottom: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)', pb: 1 }}>
          {parseInlineStyles(cleanBlock.replace('## ', ''))}
        </Typography>
      );
    }

    // H3 Header
    if (cleanBlock.startsWith('### ')) {
      return (
        <Typography variant="h5" component="h4" key={idx} sx={{ mt: 3.5, mb: 1.5, fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
          {parseInlineStyles(cleanBlock.replace('### ', ''))}
        </Typography>
      );
    }

    // Blockquote
    if (cleanBlock.startsWith('> ')) {
      const text = cleanBlock.replace('> ', '').replace(/^\[!NOTE\]\s*/i, '').replace(/^\[!WARNING\]\s*/i, '');
      return (
        <Box 
          component="blockquote" 
          key={idx} 
          sx={{ 
            borderLeft: '4px solid #8b5cf6', 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(139, 92, 246, 0.05)' : 'rgba(124, 58, 237, 0.04)', 
            borderRadius: '0 12px 12px 0',
            px: 3, 
            py: 2, 
            my: 3,
            fontStyle: 'italic',
            color: 'text.secondary'
          }}
        >
          <Typography variant="body1" sx={{ fontSize: 17, lineHeight: 1.7 }}>
            {parseInlineStyles(text)}
          </Typography>
        </Box>
      );
    }

    // Code Block with Syntax Highlighting
    if (cleanBlock.startsWith('```')) {
      const lines = cleanBlock.split('\n');
      const firstLine = lines[0].trim();
      const lang = firstLine.slice(3).trim();
      
      const codeLines = lines.filter((_, i) => i !== 0 && i !== lines.length - 1);
      const codeString = codeLines.join('\n');
      
      return (
        <Box 
          component="pre" 
          key={idx} 
          sx={{ 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#060913' : '#f1f5f9', 
            border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15,23,42,0.06)',
            borderRadius: 3, 
            p: 2.5, 
            overflowX: 'auto', 
            my: 3,
            boxShadow: (theme) => theme.palette.mode === 'dark' ? 'inset 0 4px 15px rgba(0,0,0,0.5)' : 'inset 0 2px 8px rgba(0,0,0,0.03)',
            position: 'relative'
          }}
        >
          {lang && (
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 8, 
                right: 12, 
                fontSize: 10, 
                fontWeight: 700, 
                color: 'text.secondary', 
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
                px: 1,
                py: 0.2,
                borderRadius: 1,
                border: (theme) => theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(15,23,42,0.05)'
              }}
            >
              {lang}
            </Box>
          )}
          <Box 
            component="code" 
            sx={{ 
              color: 'text.primary', 
              fontSize: 14, 
              fontFamily: 'Fira Code, monospace',
              lineHeight: 1.6,
              display: 'block',
              whiteSpace: 'pre'
            }}
          >
            {highlightCode(codeString, lang)}
          </Box>
        </Box>
      );
    }

    // Unordered list
    if (cleanBlock.startsWith('* ') || cleanBlock.startsWith('- ')) {
      const listItems = cleanBlock.split('\n').map(line => line.replace(/^[*-]\s*/, ''));
      return (
        <Box component="ul" key={idx} sx={{ pl: 4, mb: 3 }}>
          {listItems.map((item, lIdx) => (
            <Box component="li" key={lIdx} sx={{ mb: 1, fontSize: 17, lineHeight: 1.8, color: 'text.primary' }}>
              {parseInlineStyles(item)}
            </Box>
          ))}
        </Box>
      );
    }

    // Paragraph
    return (
      <Typography 
        key={idx} 
        variant="body1" 
        component="p" 
        sx={{ 
          mb: 3, 
          fontSize: 17.5, 
          lineHeight: 1.85, 
          color: 'text.primary',
          fontWeight: 400
        }}
      >
        {parseInlineStyles(cleanBlock)}
      </Typography>
    );
  });
};
