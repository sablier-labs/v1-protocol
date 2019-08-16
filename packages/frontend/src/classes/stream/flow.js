import { Enum } from "enumify";

class StreamFlow extends Enum {}
StreamFlow.initEnum(["UNDEFINED", "IN", "OUT"]);

export default StreamFlow;
