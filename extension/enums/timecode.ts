export enum TimecodeTag {
  NUDITY = 100,
  VIOLENCE = 101,
  SENSITIVE_EXPRESSIONS = 102,
  SEXUAL_CONTENT_WITHOUT_NUDITY = 103,
  USE_DRUGS_ALCOHOL_TOBACCO = 104,
  PROHIBITED_SYMBOLS = 105,
  EROTIC_SOUNDS = 106
}

export enum TimecodeAction {
  noAction = 100,
  blur = 101,
  hide = 102,
  skip = 103,
  mute = 104,
  pause = 105,
  // 106 was "OBS scene switching" (removed in 5.0.0), replaced by obsSourceToggle.
  // Do not reuse 106 while the migration in utils/settings.ts exists (TODO(remove-obs-scene-migration)).
  obsSourceToggle = 107
}

export enum BlurPower {
  light = "light",
  base = "base",
  strong = "strong",
  max = "max"
}
