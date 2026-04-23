import { useRef, useEffect } from 'react';

/**
 * BorderBeam
 * Renders an animated glowing beam that travels around a card border.
 *
 * Props:
 *  - size      {number}  Width/height of the beam highlight (px). Default 120.
 *  - duration  {number}  Animation cycle duration in seconds.  Default 8.
 *  - colorFrom {string}  Beam start color.
 *  - colorTo   {string}  Beam end color.
 */
const BorderBeam = ({
  size = 120,
  duration = 8,
  colorFrom = 'var(--ieee-blue)',
  colorTo = 'var(--ieee-green)',
  borderWidth = 2,
}) => {
  useEffect(() => {
    const id = 'border-beam-keyframes';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        @keyframes border-beam-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const wrapperStyle = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    zIndex: 0,
  };

  const beamStyle = {
    position: 'absolute',
    // Make the gradient larger than the card so when it rotates, it covers the corners
    inset: '-100%', 
    aspectRatio: '1',
    borderRadius: '50%',
    background: `conic-gradient(
      from 0deg,
      transparent 0deg,
      transparent 300deg,
      ${colorFrom} 330deg,
      ${colorTo} 360deg
    )`,
    animation: `border-beam-spin ${duration}s linear infinite`,
  };

  // This second wrapper applies the mask to the rotating beam
  const maskStyle = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    padding: `${borderWidth}px`,
    overflow: 'hidden',
    // Mask keeps only the border area
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  return (
    <div style={wrapperStyle} aria-hidden="true">
      <div style={maskStyle}>
        <div style={beamStyle} />
      </div>
    </div>
  );
};

export default BorderBeam;
