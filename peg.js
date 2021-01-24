const assert = require('assert');
const util = require('util');

function capture(ctx, rule, text) {
  if (typeof rule.capture === 'boolean') {
    ctx.captures.push(text);
  } else if (typeof rule.capture === 'string') {
    ctx.captures.push({ type: rule.capture, text });
  }
}

function matchRule(ctx, rule, text) {
  // console.log(util.inspect(text), rule.type || rule);

  if (typeof rule === 'string') {
    if (text.startsWith(rule)) {
      capture(ctx, rule, text);
      return [true, rule.length];
    }
    return [false, 0];
  }

  if (rule.type === 'seq') {
    let totalLength = 0;

    for (let j = 0; j < rule.rules.length; j++) {
      const currentRule = rule.rules[j];
      const [success, matchLength] = matchRule(ctx, currentRule, text.slice(totalLength));
      if (!success) {
        return [false, 0];
      }
      totalLength += matchLength;
    }

    capture(ctx, rule, text.slice(0, totalLength));

    const r = [true, totalLength];
    return r;
  }

  if (rule.type === 'choice') {
    for (let j = 0; j < rule.choices.length; j++) {
      const choice = rule.choices[j];
      const [success, matchLength] = matchRule(ctx, choice, text);
      if (success) {
        capture(ctx, rule, text.slice(0, matchLength));
        return [true, matchLength];
      }
    }
    // no matches
    return [false, 0];
  }

  if (rule.type === 'range') {
    const char = text.charCodeAt(0);
    if (char >= rule.start && char <= rule.end) {
      capture(ctx, rule, text[0]);
      return [true, 1];
    }
    return [false, 0];
  }

  if (rule.type === 'rule') {
    if (!ctx.grammar[rule.name]) {
      throw new Error(`rule "${rule.name}" not found`);
    }

    const [success, matchLength] = matchRule(ctx, ctx.grammar[rule.name], text);
    if (success) {
      capture(ctx, rule, text.slice(0, matchLength));
      return [success, matchLength];
    }
    return [false, 0];
  }

  if (rule.type === 'between') {
    let matchCount = 0;
    let totalLength = 0;

    while (true) {
      const [success, matchLength] = matchRule(ctx, rule.rule, text.slice(totalLength));
      if (!success) {
        break;
      }
      totalLength += matchLength;
      matchCount++;
      if (typeof rule.max === 'number' && matchCount === rule.max) {
        break;
      }
    }

    if (matchCount < rule.min) {
      return [false, 0];
    }

    capture(ctx, rule, text.slice(0, totalLength));

    return [true, totalLength];
  }

  if (rule.type === 'capture-group') {
    const tempCtx = { ...ctx, captures: [] };
    const [success, matchLength] = matchRule(tempCtx, rule.rule, text);
    if (!success) {
      return [false, 0];
    }
    ctx.captures.push(tempCtx.captures);
    return [success, matchLength];
  }

  throw new Error(`could not process rule ${JSON.stringify(rule)}`);
}

function match(grammar, string) {
  let current = string;
  let rules = grammar;

  // if the grammar has no main property, assume it's a single rule
  if (!grammar.main) {
    rules = { main: grammar };
  }

  const mainRule = rules.main;
  const ctx = {
    grammar: rules,
    captures: [],
  };

  const [success, matchLength] = matchRule(ctx, mainRule, current);
  if (!success || matchLength !== string.length) {
    return [false, []];
  }

  return [true, ctx.captures];
}

function set(text, capture) {
  return {
    type: 'choice',
    choices: text.split(''),
    capture,
  };
}

function choice(choices, capture) {
  return {
    type: 'choice',
    choices,
    capture,
  };
}

function range(text, capture) {
  if (text.length !== 2) {
    throw new Error('range must be two characters');
  }

  const [start, end] = text;
  return {
    type: 'range',
    start: start.charCodeAt(0),
    end: end.charCodeAt(0),
    capture,
  };
}

function rule(name, capture) {
  return {
    type: 'rule',
    name,
    capture,
  };
}

function between(rule, min, max, capture) {
  return {
    type: 'between',
    rule,
    min,
    max,
    capture,
  };
}

function seq(rules, capture) {
  return {
    type: 'seq',
    rules,
    capture,
  };
}

function captureGroup(rule) {
  return {
    type: 'capture-group',
    rule,
  };
}

function some(rule, capture) {
  return between(rule, 1, null, capture);
}

function any(rule, capture) {
  return between(rule, 0, null, capture);
}

module.exports = {
  match,
  set,
  choice,
  range,
  rule,
  some,
  between,
  any,
  seq,
  captureGroup,
};