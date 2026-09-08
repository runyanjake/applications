import type { InterestLevel } from "../../types/application";
import { INTEREST_BADGE } from "../../config/theme";
import { formatInterest } from "../../utils/formatters";
import { Badge } from "../ui/badge";

export function InterestBadge({ interest }: { interest: InterestLevel }) {
  return <Badge tone={INTEREST_BADGE[interest]}>{formatInterest(interest)}</Badge>;
}
