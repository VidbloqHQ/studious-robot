import { useEffect, useState } from "react";
import { IconName } from "../../types";
import { ICON_PATHS } from "./icon-paths";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number | { mobile: number; desktop: number };
  color?: string;
  strokeWidth?: number;
  className?: string;
  fill?: string;
}

interface IconData {
  viewBox: string;
  paths: string[];
  fill?: string;
  type?: "stroke" | "fill" | "hybrid"; // Add type to distinguish between stroke and fill icons
  strokes?: string[];
  opacity?: number[];
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = "currentColor",
  strokeWidth = 1.5,
  className = "",
  fill,
  ...props
}) => {
  const [currentSize, setCurrentSize] = useState<number>(
    typeof size === "number" ? size : size.mobile
  );

  useEffect(() => {
    const handleResize = () => {
      if (typeof size === "object") {
        setCurrentSize(window.innerWidth < 768 ? size.mobile : size.desktop);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [size]);

  const iconData = ICON_PATHS[name] as IconData;

  if (!iconData) {
    console.warn(`Icon "${name}" not found in icon set`);
    return null;
  }

  const { viewBox, paths, fill: iconFill, type = "stroke" } = iconData;
  const resolvedFill = fill || iconFill || "none";

  return (
    <svg
      width={currentSize}
      height={currentSize}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {paths.map((d, index) => {
        if (type === 'fill') {
          // For fill-type icons
          const opacity = iconData.opacity?.[index];
          return (
            <path
              key={index}
              d={d}
              fill={fill || iconFill?.[index] || color || resolvedFill}
              opacity={opacity}
            />
          );
        } else if (type === 'hybrid') {
          const pathFill = iconData.fill?.[index] || (index === 1 ? color : resolvedFill);
          const pathStroke = iconFill?.[index] ? undefined : color;
          
          return (
            <path
              key={index}
              d={d}
              fill={pathFill}
              stroke={pathStroke}
              strokeWidth={pathStroke ? strokeWidth : undefined}
              strokeLinecap={pathStroke ? "round" : undefined}
              strokeLinejoin={pathStroke ? "round" : undefined}
            />
          );
        } else {
          // Default: stroke-type icons
          return (
            <path
              key={index}
              d={d}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={resolvedFill}
            />
          );
        }
      })}
    </svg>
  );
};

export default Icon;