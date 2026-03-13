/**
 * Backward-compatible wrapper around HeroDroplet.
 * All existing imports of CompanionAvatar, CompanionExpression,
 * EvolutionTier, and getEvolutionTier continue to work unchanged.
 */
import HeroDroplet, {
  type CompanionExpression,
  type EvolutionTier,
  getEvolutionTier,
} from "./HeroDroplet";

export type { CompanionExpression, EvolutionTier };
export { getEvolutionTier };

interface Props {
  expression?: CompanionExpression;
  size?: "small" | "medium" | "large";
  tier?: EvolutionTier;
  name?: string;
  showGreeting?: boolean;
  greetingText?: string;
  showTier?: boolean;
}

export default function CompanionAvatar(props: Props) {
  return (
    <HeroDroplet
      expression={props.expression}
      size={props.size}
      tier={props.tier}
      name={props.name}
      showGreeting={props.showGreeting}
      greetingText={props.greetingText}
      showTier={props.showTier}
    />
  );
}
