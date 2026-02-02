"use client";

type Skills = {
  driving: number;
  negotiation: number;
  stealth: number;
  combat: number;
};

type SkillRadarProps = {
  skills: Skills;
  size?: number;
};

const SKILL_LABELS = ["Driving", "Negotiation", "Stealth", "Combat"];
const SKILL_KEYS: (keyof Skills)[] = ["driving", "negotiation", "stealth", "combat"];

const MAX_SKILL = 10; // Skills range from 1-10

export function SkillRadar({ skills, size = 200 }: SkillRadarProps) {
  const center = size / 2;
  const maxRadius = (size - 40) / 2; // Leave room for labels
  const levels = [2.5, 5, 7.5, 10]; // Grid levels (out of 10)

  // Calculate points for each skill (4 skills = 90 degree intervals)
  const getPoint = (skillValue: number, index: number) => {
    const angle = (index * 90 - 90) * (Math.PI / 180); // Start from top
    const radius = (skillValue / MAX_SKILL) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  // Create polygon points for skill area
  const skillPoints = SKILL_KEYS.map((key, i) => getPoint(skills[key], i));
  const polygonPoints = skillPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Label positions (slightly outside the chart)
  const getLabelPos = (index: number) => {
    const angle = (index * 90 - 90) * (Math.PI / 180);
    const radius = maxRadius + 20;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  return (
    <div className="relative">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background grid circles */}
        {levels.map((level) => (
          <polygon
            key={level}
            points={[0, 1, 2, 3]
              .map((i) => {
                const p = getPoint(level, i);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            className="text-border"
          />
        ))}

        {/* Axis lines */}
        {[0, 1, 2, 3].map((i) => {
          const end = getPoint(MAX_SKILL, i);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeWidth={1}
              className="text-border"
            />
          );
        })}

        {/* Skill area */}
        <polygon
          points={polygonPoints}
          fill="currentColor"
          fillOpacity={0.3}
          stroke="currentColor"
          strokeWidth={2}
          className="text-emerald-500"
        />

        {/* Skill points */}
        {skillPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="currentColor"
            className="text-emerald-400"
          />
        ))}

        {/* Labels */}
        {SKILL_LABELS.map((label, i) => {
          const pos = getLabelPos(i);
          const anchor = i === 0 || i === 2 ? "middle" : i === 1 ? "start" : "end";
          const dy = i === 0 ? -5 : i === 2 ? 15 : 5;
          return (
            <text
              key={label}
              x={pos.x}
              y={pos.y}
              textAnchor={anchor}
              dy={dy}
              className="text-xs fill-muted-foreground"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Skill values */}
      <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-4 text-xs">
        {SKILL_KEYS.map((key) => (
          <span key={key} className="text-muted-foreground">
            {skills[key]}
          </span>
        ))}
      </div>
    </div>
  );
}
