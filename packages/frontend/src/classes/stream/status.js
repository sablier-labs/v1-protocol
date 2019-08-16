import { Enum } from "enumify";

class StreamStatus extends Enum {}
StreamStatus.initEnum(["UNDEFINED", "CREATED", "ACTIVE", "ENDED", "REDEEMED"]);

export default StreamStatus;
