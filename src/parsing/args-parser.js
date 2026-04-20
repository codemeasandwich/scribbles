/**
 * @file Argument-list parser for the Scribbles source transformer
 *
 * Domain context
 * --------------
 * When the source-code transformer encounters a call like
 *   scribbles.log("hello", user.name, err)
 * it needs to produce a parallel list of lazy thunks that capture the *source
 * text* of each argument, while still allowing the real values to be evaluated
 * at runtime in the caller's lexical scope. The target output is:
 *   args: [false, x => x`user.name`, x => x`err`]
 * where `false` marks argument slots that are literals/expressions we do not
 * want to present as a "variable name" (strings, numbers, `new Date()`,
 * arrow functions, etc.), and the tagged-template thunks carry the source
 * text so that it can be rendered alongside the runtime value (`user.name:Alice`).
 *
 * This module is a *character-at-a-time* parser operating on the raw source
 * stream produced by the transformer. It is intentionally kept syntax-tolerant
 * rather than AST-based: Scribbles must transform partial / unbalanced source
 * fragments that appear in logs like `scribbles.log({foo:{bar:1}}, err)` without
 * pulling in a full JS parser dependency.
 *
 * Technical context
 * -----------------
 * - `loadArgNames(getChar)` drives the parser by repeatedly asking the
 *   transformer for the next [preChar, char] pair until it sees the closing
 *   `)` at nesting depth 0. Multi-line calls work because `getChar` advances
 *   across lines transparently.
 * - `splitArgs(state, char, preChar)` is the state-machine step. It tracks:
 *     * opened brackets / string quotes (nesting)
 *     * `temp` — the text of the current argument so far
 *     * `raw` — a trimmed form used for classifying literals (`true`, `false`,
 *       numbers, `null`, `new Date`, arrow functions, named `function` exprs)
 *     * `names` — stack entries that accumulate template-interpolation
 *       fragments such as `${foo.bar}` so nested braces are preserved
 * - Strings inside strings, template-literal interpolations (`${...}`) inside
 *   backticks, and argument separators inside brackets are all handled by a
 *   single unified state machine with no recursion.
 * - Pure: no I/O, no globals. Extracted from the original `loader.js` during
 *   the v2 multi-runtime refactor so the same logic can be called from the
 *   Node-CJS hook, the Node-ESM loader, and (eventually) the Bun plugin
 *   without duplication.
 * - Preserves the exported names (`loadArgNames`, `splitArgs`) required by
 *   `loader.js`'s legacy `_loadArgNames` / `_splitArgs` aliases, which the
 *   existing test suite consumes directly.
 */

'use strict';

// Quote characters that open a string literal. Treated as atomic boundaries
// by the state machine — everything between matching quotes is opaque.
const allStrings = ['"', "'", '`'];

/**
 * Parse a single `scribbles.<level>(` argument list and return the comma-joined
 * text of lazy name thunks (or `false` markers) ready to be injected as the
 * `args: [...]` entry of the call's `.at(...)` metadata.
 *
 * @param {() => [string, string]} getChar - Character pump provided by the
 *        transformer. Returns `[prevChar, currentChar]` pairs, advancing one
 *        character per call; returns empty strings for positions past the
 *        final line in a multi-line call.
 * @returns {string} Comma-separated thunk expressions, e.g.
 *        `false,x=>x\`user.name\`,x=>x\`err\`` — safe to interpolate into the
 *        transformer's output template.
 */
function loadArgNames(getChar) {
  // Accumulator passed through every splitArgs step. Held in a plain object
  // (rather than closures) so the state machine is easy to reason about and
  // easy to test directly via the `_splitArgs` export.
  let result = {
    temp: "",          // raw text of the current argument (preserves brackets/quotes)
    opened: [],        // stack of currently open brackets / quotes
    args: [],          // finished arguments: either a name string or `false`
    fin: false,        // true once we see the closing `)` of the call
    procThisLoop: true,// whether this iteration should record chars into `names`
    names: [],         // stack of template-interpolation accumulators
    raw: ""            // raw trimmed text used for literal classification
  };

  let index = 0;
  do {
    const [preChar, char] = getChar();
    result = splitArgs(result, char, preChar);
    index++;
  } while (!result.fin);

  // Convert the flat `args` list into the final thunk text. `false` entries
  // mean "not a presentable variable name" (literal, arrow fn, keyword);
  // everything else becomes a tagged-template thunk that will be evaluated
  // later in the caller's scope to render "name:value".
  return result.args
    .map(line => line ? "x=>x`" + line + "`" : line)
    .join();
}

/**
 * Single state-machine step. Consumes one `(preChar, char)` pair and updates
 * the parser state in-place.
 *
 * Exported for tests: `__tests__/99-loader-utils.test.js` and friends drive
 * the state machine directly to cover edge cases (nested brackets, backtick
 * interpolations, keyword literals) that would otherwise require constructing
 * ambiguous real source strings.
 *
 * @param {object} all - Parser state accumulator (see `loadArgNames`).
 * @param {string} char - The character currently being consumed.
 * @param {string} preChar - The character immediately preceding `char`.
 *        Used only to detect template-literal interpolations (`${` must be
 *        preceded by `$`), which can otherwise be confused with plain `{`.
 * @returns {object} The updated state (same reference as `all`).
 */
function splitArgs(all, char, preChar) {
  // `lastOpened` is the top of the brackets/quotes stack. Tracks whether we
  // are currently inside a string, a template literal, an object literal, etc.
  const lastOpened = all.opened[all.opened.length - 1];

  // Skip leading whitespace at the very start of an argument. This lets
  // `scribbles.log(  foo , bar )` produce the same args as `scribbles.log(foo,bar)`.
  if ("" === all.temp && " " === char) {
    return all;
  }

  // Opening a complex arg (string, object, array): mark procThisLoop = false
  // so we don't start accumulating `names` for this arg — composite args
  // become `false` in the output because we can't present them as a clean
  // variable name.
  if ("" === all.temp
    && (allStrings.includes(char) || ['{', '['].includes(char))) {
    all.procThisLoop = false;
  }

  // Push a quote onto the opened-stack when we encounter one outside another
  // string context. Prevents `"a ' b"` from seeing the interior `'` as a new
  // opener (the outer `"` is still the top of stack).
  if (allStrings.includes(char) && !allStrings.includes(lastOpened)) {
    all.opened.push(char);
    all.procThisLoop = false;
  }

  // At nesting depth 0, `,` finalizes the current argument and `)` finalizes
  // the whole call. This classification switch is the "what kind of argument
  // was it?" decision point — literals/arrows/keywords become `false`, simple
  // identifiers become name strings.
  if (0 === all.opened.length) {
    switch (char) {
      case ')':
        all.fin = true;
      // fallthrough: `)` finalises the last arg using the same rules as `,`
      case ',':
        if (all.raw.includes("=>")
          || all.raw.includes("function")
          || "undefined" === all.raw.trim()
          || "true" === all.raw.trim()
          || "false" === all.raw.trim()
          || "new Date" === all.raw.trim()
          || "new Date()" === all.raw.trim()
          || /^-{0,1}\d+(\.\d+)?$/.test(all.raw.trim())
          || "null" === all.raw.trim()) {
          all.args.push(false);
        } else if (!['{', '[', '(', '"', "'", '`'].some(x => all.temp.includes(x))) {
          all.args.push(all.temp);
        } else if (!allStrings.includes(all.temp[0])
          && !['{', '['].includes(all.temp[0])) {
          all.args.push(all.temp);
        } else {
          all.args.push(false);
        }
        all.temp = "";
        all.raw = "";
        all.names = [];
        all.procThisLoop = true;
        return all;
    }
  }

  // Closing a previously-opened bracket / quote. When the matching pair is
  // detected, pop the stack and, if we were accumulating a template-literal
  // interpolation, decide whether to keep the captured name or discard it
  // (short numeric indices like `arr[0]` and labelled properties get
  // special-cased so rendering stays readable).
  if (allStrings.includes(lastOpened) && char === lastOpened
    || '}' === char && '{' === lastOpened
    || ')' === char && '(' === lastOpened
    || ']' === char && '[' === lastOpened) {
    all.opened.pop();
    if (all.procThisLoop && 0 < all.names.length) {
      const thisName = all.names[all.names.length - 1].slice(2);
      if (thisName.includes(":") || thisName === `${+thisName}`) {
        all.names.pop();
      } else {
        all.temp += all.names.pop() + '}';
      }
    }
    all.procThisLoop = !allStrings.includes(lastOpened);
  } else if ("`" === lastOpened && '{' === char && '$' === preChar) {
    // Start of a `${...}` template-literal interpolation inside backticks.
    // Push the `{` onto the opened-stack and begin accumulating the
    // interpolation's inner text as a name fragment.
    all.opened.push(char);
    if (all.procThisLoop) all.names.push("${");
  } else if (!allStrings.includes(lastOpened)
    && ['{', '[', '('].includes(char)) {
    // Opening a plain bracket outside a string: push onto stack and start a
    // fresh name accumulator for the potential interpolation.
    all.opened.push(char);
    if (all.procThisLoop) {
      all.names.push("${");
    }
  } else if (all.procThisLoop) {
    // Default path: we are inside an "active" region (not a string/opaque
    // literal). Append the current char to the top name accumulator, with
    // two special cases:
    //   * `:${string|digit` — a labelled property value, not a variable name
    //   * `,` — separator inside a nested structure; flush current name frag
    const named = all.names[all.names.length - 1];
    if (":${" === named
      && (allStrings.includes(char) || `${+char}` === char)) {
      all.procThisLoop = false;
      all.names.pop();
    } else if ("," === char) {
      all.temp += all.names.pop() + '}';
    } else {
      all.names[all.names.length - 1] = named + char;
    }
  } else if ("," === char && ['{', '[', '('].includes(lastOpened)) {
    // Comma inside a bracketed expression resumes name accumulation so that
    // `{a: foo.bar, b: baz}` still produces meaningful names for `foo.bar`
    // and `baz` as needed by the caller.
    all.procThisLoop = true;
    all.names.push("${");
  }

  // Always append to the running text/raw buffers. `temp` preserves formatting
  // (so brackets are matched correctly), `raw` is used for literal detection.
  all.temp += char;
  all.raw += char;
  return all;
}

module.exports = { loadArgNames, splitArgs };
