// eslint-disable-next-line no-useless-escape
const SPECIAL_CHARS_REGEX = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;

export default function(text, pattern, tokenSeparator = / +/g) {
  const regex = new RegExp(pattern.replace(SPECIAL_CHARS_REGEX, "\\$&").replace(tokenSeparator, "|"));
  const matches = text.match(regex);
  const isMatch = !!matches;
  const matchedIndices = [];

  if (isMatch) {
    for (let i = 0, matchesLen = matches.length; i < matchesLen; i += 1) {
      const match = matches[i];
      matchedIndices.push([text.indexOf(match), match.length - 1]);
    }
  }

  return {
    // TODO: revisit this score
    score: isMatch ? 0.5 : 1,
    isMatch,
    matchedIndices,
  };
}
