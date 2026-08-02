'use strict';

// Escapes regex metacharacters in user-supplied search input before it's
// used to build a RegExp/$regex filter. Without this, a crafted pattern
// (e.g. nested quantifiers) can cause catastrophic backtracking, or a
// malformed one (e.g. a lone "(") throws an uncaught SyntaxError.
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
