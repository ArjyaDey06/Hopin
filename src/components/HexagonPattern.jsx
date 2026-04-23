import React from 'react';

/**
 * Custom HexagonPattern component designed to replicate Magic UI functionality
 * using standard SVG and React.
 */
const HexagonPattern = ({ 
  hexagons = [], 
  className = '', 
  strokeColor = 'rgba(0, 98, 155, 0.15)',
  highlightStroke = 'rgba(0, 98, 155, 0.4)',
  highlightFill = 'rgba(0, 98, 155, 0.1)',
  size = 40 
}) => {
  const hexWidth = Math.sqrt(3) * size;
  const hexHeight = 2 * size;

  // Calculate center of hexagon at grid position (q, r)
  const getHexCenter = (q, r) => {
    const x = hexWidth * (q + (r % 2 === 0 ? 0 : 0.5));
    const y = hexHeight * r * 0.75;
    return { x, y };
  };

  const getPath = (x, y) => {
    return `M ${x + hexWidth / 2} ${y} 
            L ${x + hexWidth} ${y + hexHeight / 4} 
            L ${x + hexWidth} ${y + (3 * hexHeight) / 4} 
            L ${x + hexWidth / 2} ${y + hexHeight} 
            L ${x} ${y + (3 * hexHeight) / 4} 
            L ${x} ${y + hexHeight / 4} Z`;
  };

  return (
    <div 
      className={`hexagon-pattern ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        maskImage: 'radial-gradient(circle, white 70%, transparent 98%)',
        WebkitMaskImage: 'radial-gradient(circle, white 70%, transparent 98%)',
        transform: className.includes('skew-y-6') ? 'skewY(-6deg)' : 'none',
      }}
    >
      <svg 
        width="100%" 
        height="100%" 
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: 'scale(1.5)',
          transformOrigin: 'center',
        }}
      >
        {/* Grid Lines */}
        <g stroke={strokeColor} fill="none" strokeWidth="1">
          {Array.from({ length: 30 }).map((_, r) => (
            Array.from({ length: 30 }).map((_, q) => {
              const { x, y } = getHexCenter(q, r);
              return <path key={`${q}-${r}`} d={getPath(x, y)} />;
            })
          ))}
        </g>

        {/* Highlighted Hexagons */}
        <g fill={highlightFill} stroke={highlightStroke} strokeWidth="2">
          {hexagons.map(([q, r], i) => {
            const { x, y } = getHexCenter(q, r);
            return <path key={`highlight-${i}`} d={getPath(x, y)} />;
          })}
        </g>
      </svg>
    </div>
  );
};

export default HexagonPattern;
