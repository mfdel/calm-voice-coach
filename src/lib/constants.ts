export const PROBLEM_CATEGORIES = [
  { code: "bedtime_resistance", label: "Bedtime resistance", emoji: "🌙" },
  { code: "meal_refusal", label: "Won't eat / food refusal", emoji: "🍽️" },
  { code: "morning_routine", label: "Morning routine meltdown", emoji: "☀️" },
  { code: "sibling_conflict", label: "Sibling conflict", emoji: "👫" },
  { code: "transition_meltdown", label: "Transition meltdown", emoji: "🔄" },
  { code: "dressing_refusal", label: "Refuses to get dressed", emoji: "👕" },
  { code: "public_tantrum", label: "Public tantrum", emoji: "🏪" },
  { code: "screen_time_battle", label: "Screen time battle", emoji: "📱" },
  { code: "homework_resistance", label: "Homework resistance", emoji: "📚" },
  { code: "bath_time_refusal", label: "Bath time refusal", emoji: "🛁" },
  { code: "sharing_conflict", label: "Won't share", emoji: "🧸" },
  { code: "separation_anxiety", label: "Separation anxiety", emoji: "😢" },
  { code: "hitting_aggression", label: "Hitting / aggression", emoji: "✋" },
  { code: "whining_crying", label: "Constant whining / crying", emoji: "😭" },
  { code: "cleanup_refusal", label: "Won't clean up", emoji: "🧹" },
] as const;

export const RED_LINE_OPTIONS = [
  { code: "cry_it_out", label: "No cry-it-out", severity: "hard_stop" as const },
  { code: "time_outs", label: "No time-outs", severity: "hard_stop" as const },
  { code: "physical_punishment", label: "No physical discipline", severity: "hard_stop" as const },
  { code: "yelling", label: "No yelling", severity: "hard_stop" as const },
  { code: "screen_bribery", label: "No screen bribery", severity: "avoid_if_possible" as const },
  { code: "food_rewards", label: "No food rewards", severity: "avoid_if_possible" as const },
  { code: "shame_language", label: "No shame language", severity: "hard_stop" as const },
  { code: "comparison", label: "No comparing to others", severity: "avoid_if_possible" as const },
] as const;

export const TRIGGER_OPTIONS = [
  "Transitions", "Fatigue", "Hunger", "Loud noises", "New environments",
  "Sharing toys", "Schedule changes", "Sensory overload", "Sibling conflict",
] as const;

export const AGE_GROUPS = [
  { value: "infant", label: "Infant (0-1)" },
  { value: "toddler", label: "Toddler (1-3)" },
  { value: "preschool", label: "Preschool (3-5)" },
  { value: "school_age", label: "School age (5-10)" },
] as const;
