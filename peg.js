const assert = require('assert');
const util = require('util');

function getCapture(ctx, rule, text, matchLength, captures = null) {
  if (rule.tag) {
    return {
      ...captures,
      [rule.tag]: { text: text.slice(0, matchLength) },
    };
  }
  return captures;
}

function getChildCaptures(ctx, rule, text, matchLength, childCaptures = null) {
  if (rule.tag) {
    if (childCaptures && childCaptures.length) {
      return {
        [rule.tag]: {
          text: text.slice(0, matchLength),
          children: childCaptures,
        },
      };
    }
    return {
      [rule.tag]: {
        text: text.slice(0, matchLength),
      },
    };
  }
  if (Array.isArray(rule)) {
    return childCaptures;
  }
  return null;
}

// returns [success, matchLength, captures]
function matchRule(ctx, rule, text) {
  // console.log(util.inspect(text), util.inspect(rule));

  if (typeof rule === 'string') {
    if (text.startsWith(rule)) {
      return [true, rule.length];
    }
    return [false, 0];
  }

  if (Array.isArray(rule)) {
    let totalLength = 0;
    let allCaptures = {};
    for (let j = 0; j < rule.length; j++) {
      const currentRule = rule[j];
      const [success, matchLength, captures] = matchRule(ctx, currentRule, text.slice(totalLength));
      if (!success) {
        return [false, 0];
      }
      totalLength += matchLength;
      if (captures) {
        allCaptures = {
          ...allCaptures,
          ...captures,
        };
      }
    }
    const r = [true, totalLength, getChildCaptures(ctx, rule, text, totalLength, allCaptures)];
    return r;
  }

  if (rule.type === 'choice') {
    for (let j = 0; j < rule.choices.length; j++) {
      const choice = rule.choices[j];
      const [success, matchLength, captures] = matchRule(ctx, choice, text);
      if (success) {
        return [true, matchLength, getCapture(ctx, rule, text, matchLength, captures)];
      }
    }
    // no matches
    return [false, 0];
  }

  if (rule.type === 'range') {
    const char = text.charCodeAt(0);
    if (char >= rule.start && char <= rule.end) {
      return [true, 1, getCapture(ctx, rule, text, 1)];
    }
    return [false, 0];
  }

  if (rule.type === 'rule') {
    const [success, matchLength, captures] = matchRule(ctx, ctx.grammar[rule.name], text);
    if (success) {
      return [success, matchLength, getCapture(ctx, rule, text, matchLength, captures)];
    }
    return [false, 0];
  }

  if (rule.type === 'some') {
    let totalLength = 0;
    let matched = false;
    let allCaptures = [];
    while (true) {
      const [success, matchLength, captures] = matchRule(ctx, rule.rule, text.slice(totalLength));
      if (!success) {
        break;
      }
      matched = true;
      totalLength += matchLength;
      if (captures && Object.keys(captures).length) {
        allCaptures = [
          ...allCaptures,
          captures,
        ];
      }
    }

    if (!matched) {
      return [false, 0];
    }

    return [true, totalLength, getChildCaptures(ctx, rule, text, totalLength, allCaptures)];
  }

  if (rule.type === 'between') {
    let matchCount = 0;
    let totalLength = 0;
    let allCaptures = [];
    while (true) {
      const [success, matchLength, captures] = matchRule(ctx, rule.rule, text.slice(totalLength));
      if (!success) {
        break;
      }
      totalLength += matchLength;
      if (captures && Object.keys(captures).length) {
        allCaptures = [
          ...allCaptures,
          captures,
        ];
      }
      matchCount++;
      if (matchCount === rule.max) {
        break;
      }
    }

    if (matchCount < rule.min) {
      return [false, 0];
    }

    return [true, totalLength, getChildCaptures(ctx, rule, text, totalLength, allCaptures)];
  }

  throw new Error(`could not process rule ${JSON.stringify(rule)}`);
}

function match(grammar, string) {
  let current = string;
  let rules = grammar;

  // treat an array like a grammar with one main rule
  if (Array.isArray(grammar)) {
    rules = { main: grammar };
  }

  const mainRule = rules.main;
  const ctx = { grammar: rules };

  const [success, matchLength, captures] = matchRule(ctx, mainRule, current);
  if (!success) {
    return [false, []];
  }

  return [true, captures];
}

function set(text, tag) {
  return {
    type: 'choice',
    choices: text.split(''),
    tag,
  };
}

function choice(choices, tag) {
  return {
    type: 'choice',
    choices,
    tag,
  };
}

function range(text, tag) {
  if (text.length !== 2) {
    throw new Error('range must be two characters');
  }

  const [start, end] = text;
  return {
    type: 'range',
    start: start.charCodeAt(0),
    end: end.charCodeAt(0),
    tag,
  };
}

function rule(name, tag) {
  return {
    type: 'rule',
    name,
    tag,
  };
}

function some(rule, tag) {
  return {
    type: 'some',
    rule,
    tag,
  };
}

function between(rule, min, max, tag) {
  return {
    type: 'between',
    rule,
    min,
    max,
    tag,
  };
}

module.exports = {
  match,
  set,
  choice,
  range,
  rule,
  some,
  between,
};