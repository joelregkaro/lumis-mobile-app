import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RadarChartProps {
  scores: { label: string; value: number; color: string }[];
  previousScores?: number[];
  size?: number;
}

export default function RadarChart({ scores, previousScores, size = 260 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const levels = 4;
  const n = scores.length;
  const angleStep = (2 * Math.PI) / n;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(200, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [scores]);

  const getPoint = (index: number, value: number): [number, number] => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const getStaticPointStr = (index: number, value: number): string => {
    const [x, y] = getPoint(index, value);
    return `${x},${y}`;
  };

  const gridPolygons: string[] = [];
  for (let l = 1; l <= levels; l++) {
    const r = (l / levels) * radius;
    const pts = Array.from({ length: n }, (_, i) => {
      const angle = angleStep * i - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");
    gridPolygons.push(pts);
  }

  const axisLines = Array.from({ length: n }, (_, i) => {
    const angle = angleStep * i - Math.PI / 2;
    return {
      x2: cx + radius * Math.cos(angle),
      y2: cy + radius * Math.sin(angle),
    };
  });

  const animatedCurrentProps = useAnimatedProps(() => {
    const pts = scores
      .map((s, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = (s.value / 100) * radius * progress.value;
        return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
      })
      .join(" ");
    return { points: pts };
  });

  const prevPolygon =
    previousScores && previousScores.length === n
      ? previousScores.map((v, i) => getStaticPointStr(i, v)).join(" ")
      : null;

  const labelPositions = scores.map((s, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const labelR = radius + 30;
    return {
      x: cx + labelR * Math.cos(angle),
      y: cy + labelR * Math.sin(angle),
      label: s.label,
      value: s.value,
      color: s.color,
    };
  });

  const dotAnimProps = scores.map((s, i) => {
    const sv = useSharedValue(0);
    useEffect(() => {
      sv.value = 0;
      sv.value = withDelay(
        400 + i * 80,
        withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
      );
    }, [scores]);

    return useAnimatedProps(() => {
      const angle = angleStep * i - Math.PI / 2;
      const r = (s.value / 100) * radius * sv.value;
      return {
        cx: cx + r * Math.cos(angle),
        cy: cy + r * Math.sin(angle),
        opacity: sv.value,
      };
    });
  });

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#7C3AED" stopOpacity={0.08} />
            <Stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Circle cx={cx} cy={cy} r={radius} fill="url(#centerGlow)" />

        {gridPolygons.map((pts, i) => (
          <Polygon
            key={`grid-${i}`}
            points={pts}
            fill="none"
            stroke={i === levels - 1 ? "#242A4280" : "#242A4240"}
            strokeWidth={i === levels - 1 ? 1 : 0.5}
          />
        ))}

        {axisLines.map((line, i) => (
          <Line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={line.x2}
            y2={line.y2}
            stroke="#242A4250"
            strokeWidth={0.5}
          />
        ))}

        {prevPolygon && (
          <Polygon
            points={prevPolygon}
            fill="#5A617810"
            stroke="#5A6178"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        )}

        <AnimatedPolygon
          animatedProps={animatedCurrentProps}
          fill="#7C3AED18"
          stroke="#7C3AED"
          strokeWidth={2}
        />

        {scores.map((s, i) => (
          <AnimatedCircle
            key={`dot-${i}`}
            animatedProps={dotAnimProps[i]}
            r={5}
            fill={s.color}
            stroke="#0C1120"
            strokeWidth={2}
          />
        ))}

        {labelPositions.map((lp, i) => (
          <React.Fragment key={`label-${i}`}>
            <SvgText
              x={lp.x}
              y={lp.y - 7}
              fontSize={10}
              fontWeight="600"
              fill="#8B92A8"
              textAnchor="middle"
            >
              {lp.label}
            </SvgText>
            <SvgText
              x={lp.x}
              y={lp.y + 8}
              fontSize={13}
              fontWeight="800"
              fill={lp.color}
              textAnchor="middle"
            >
              {lp.value}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
