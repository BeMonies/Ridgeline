/* Ridgeline visual identity v1.2, light theme. Canonical values: brand/ridgeline.tokens.json.
   The old names (ember, teal, ink…) are kept so existing components keep working, but they now
   carry the v1.2 roles: orange is the logo, the primary action and the selected date only;
   teal organises sections and timing; everything else is neutral. */
const T = {
  bg:"#F7F5F0", paper:"#F7F5F0", surface:"#FFFFFF", tint:"#EFEBE4",
  ink:"#1C2628", body:"#1C2628", muted:"#5E696B", faint:"#5E696B",
  rule:"#D8D3CB", ruleStrong:"#7A8586",                        /* border · control-border */
  brand:"#EB4817", action:"#EB4817", actionHover:"#F65B2E", actionPressed:"#FF7047", onAction:"#111718",
  ember:"#EB4817", emberDeep:"#B73610", emberWash:"#FCE6DE",   /* brand · accent-text · accent-soft */
  teal:"#4E8A94", tealDeep:"#35636B", tealWash:"#E6EFF0",      /* info · info-text / section-text · info-soft / section-bg */
  focus:"#35636B",
  success:"#286347", successWash:"#E5F0E9",
  flag:"#80530B", flagWash:"#FBF0D6",                          /* warning */
  alert:"#AF3038", alertWash:"#FBE8E9",                        /* error */
  night:"#111718", night2:"#1C2628", onNight:"#F7F5F0", onNightMuted:"#B4C1C2",
  nightAccent:"#FF9B78", nightInfo:"#A2CDD3", nightRule:"#405256",
};
const SANS = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const MONO = SANS;   /* v1.2: prescriptions use Inter with tabular numerals, not monospace */
