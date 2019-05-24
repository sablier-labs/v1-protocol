import { Enum } from "enumify";

export class StreamFlow extends Enum {}
StreamFlow.initEnum(["UNDEFINED", "IN", "OUT"]);

export class StreamStatus extends Enum {}
StreamStatus.initEnum(["UNDEFINED", "CREATED", "ACTIVE", "ENDED", "REDEEMED"]);
