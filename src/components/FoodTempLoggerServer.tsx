// Server component that gathers any server-only data, then renders the client logger.
import FoodTempLogger from "./FoodTempLogger";

type Props = {
  initials?: string[];
  locations?: string[];
};

export default async function FoodTempLoggerServer({ initials = [], locations = [] }: Props) {
  // (If you also load anything else on the server, keep doing that here.)
  return <FoodTempLogger initials={initials} locations={locations} />;
}
