import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathFormulaProps {
  formula: string;
  display?: boolean;
  className?: string;
}

const MathFormula = ({ formula, display = false, className = '' }: MathFormulaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      katex.render(formula, containerRef.current, {
        throwOnError: false,
        displayMode: display,
      });
    }
  }, [formula, display]);

  return <div ref={containerRef} className={className} />;
};

// Function to extract LaTeX from a string with mixed text and LaTeX
// Assumes LaTeX is enclosed in $...$ for inline or $$...$$ for display
export const renderTextWithMath = (text: string) => {
  if (!text) return null;

  // Split by $$ first (display math)
  const displayParts = text.split(/(\$\$.*?\$\$)/g);
  
  return (
    <>
      {displayParts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // Display math
          const formula = part.slice(2, -2);
          return <MathFormula key={index} formula={formula} display={true} />;
        } else {
          // Now split this part by $ (inline math)
          const inlineParts = part.split(/(\$.*?\$)/g);
          
          return (
            <span key={index}>
              {inlineParts.map((inlinePart, inlineIndex) => {
                if (inlinePart.startsWith('$') && inlinePart.endsWith('$')) {
                  // Inline math
                  const formula = inlinePart.slice(1, -1);
                  return <MathFormula key={inlineIndex} formula={formula} display={false} className="inline-block" />;
                } else {
                  // Regular text
                  return <span key={inlineIndex}>{inlinePart}</span>;
                }
              })}
            </span>
          );
        }
      })}
    </>
  );
};

export default MathFormula;
