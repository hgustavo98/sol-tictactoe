import { useTranslation } from "react-i18next";

export const MATCH_RULE_KEYS = [
  "forfeit",
  "winner",
  "draw",
  "timeout",
  "escrow",
  "cancelEarly",
  "waitingDisconnect",
  "rating",
] as const;

export function MatchRulesContent() {
  const { t } = useTranslation();

  return (
    <div className="match-rules-content">
      <ul className="match-rules-list">
        {MATCH_RULE_KEYS.map((key) => (
          <li key={key}>{t(`profile.rules.${key}`)}</li>
        ))}
      </ul>
    </div>
  );
}
