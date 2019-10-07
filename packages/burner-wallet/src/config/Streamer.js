import Helper from "./Helper";

export default class Streamer {
  static parse(source) {
    const stream = {};
    stream.id = Helper.getValue("id", source);

    return stream;
  }
}
