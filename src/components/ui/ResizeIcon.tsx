import { memo } from "react";

/**
 * Renders a resize icon as an SVG element.
 * This icon is used in SimpleNode, MarkdownNode, 
 * and SimpleOutputNode components inside NodeResizeControl.
 * @param isSmaller - determines whether to render a smaller version of the icon.
 */

function ResizeIcon(
    // add a boolean as a param
    { isSmaller }: { isSmaller?: boolean }
) {
    return (
      <svg
        width={isSmaller ? "8" : "16"}
        height={isSmaller ? "8" : "16"}
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="white"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: 'absolute', right: isSmaller ? 3 : 6, bottom: isSmaller ? 3 : 6 }}
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <polyline points="14 20 20 20 20 14" />
        <line x1="14" y1="14" x2="20" y2="20" />
        <polyline points="10 4 4 4 4 10" />
        <line x1="4" y1="4" x2="10" y2="10" />
      </svg>
    );
}

  export default memo(ResizeIcon);