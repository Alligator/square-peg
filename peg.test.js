const peg = require('./peg');

describe('set', () => {
  test.each([
    ['abc', 'a', true],
    ['abc', 'b', true],
    ['abc', 'c', true],
    ['abc', 'd', false],
  ])('set(%s) %s', (pattern, string, expected) => {
    expect(peg.match(peg.set(pattern), string)[0]).toBe(expected);
  });
});

describe('choice', () => {
  test.each([
    [['a', 'b', 'cd'], 'a', true],
    [['a', 'b', 'cd'], 'b', true],
    [['a', 'b', 'cd'], 'cd', true],
    [['a', 'b', 'cd'], 'ca', false],
  ])('choice(%s) %s', (choices, string, expected) => {
    expect(peg.match(peg.choice(choices), string)[0]).toBe(expected);
  });
});

describe('range', () => {
  test.each([
    ['ac', 'a', true],
    ['ac', 'b', true],
    ['ac', 'c', true],
    ['ac', 'd', false],
  ])('range(%s) %s', (range, string, expected) => {
    expect(peg.match(peg.range(range), string)[0]).toBe(expected);
  });

  test('validates the range is two charcters', () => {
    expect(() => {
      peg.range('abc');
    }).toThrow(/must be two characters/);
  });

  test('calculates the range', () => {
    const rule = peg.range('az');
    expect(rule.start).toBe(97);
    expect(rule.end).toBe(122);
  });
});

describe('some', () => {
  test.each([
    ['a', 'a', true],
    ['a', 'aa', true],
    ['a', 'aaa', true],
    ['a', '', false],
  ])('some(%s) %s', (some, string, expected) => {
    expect(peg.match(peg.some(some), string)[0]).toBe(expected);
  });
});

describe('between', () => {
  test.each([
    [['a', 1, 3], 'a', true],
    [['a', 1, 3], 'aa', true],
    [['a', 1, 3], 'aaa', true],
    [['a', 1, 3], '', false],
    [['a', 1, 3], 'aaaa', false],
  ])('between(%s) %s', ([text, min, max], string, expected) => {
    expect(peg.match(peg.between(text, min, max), string)[0]).toBe(expected);
  });
});

describe('rule', () => {
  test('matches the referenced rule', () => {
    const grammar = {
      ref: 'hello',
      main: [peg.rule('ref'), peg.rule('ref')],
    };
    expect(peg.match(grammar, 'hellohello')[0]).toBe(true);
  });

  test('fails if the rule fails', () => {
    const grammar = {
      ref: 'hello',
      main: [peg.rule('ref'), peg.rule('ref')],
    };
    expect(peg.match(grammar, 'helloolleh')[0]).toBe(false);
  });
});

describe('match', () => {
  test('matches the main rule', () => {
    expect(peg.match({ main: 'a', other: 'b' }, 'a')[0]).toBe(true);
  });

  test('matches a bare rule', () => {
    expect(peg.match('a', 'a')[0]).toBe(true);
  });

  test('fails if the rule partially matches', () => {
    expect(peg.match('ab', 'abc')[0]).toBe(false);
  });
});

describe('captures', () => {
  test('basic', () => {
    const [_, captures] = peg.match(peg.range('ac', 'captured'), 'b');
    expect(captures).toEqual({
      captured: {
        text: 'b',
      },
    });
  });

  test('multiple', () => {
    const [_, captures] = peg.match(peg.some(peg.choice(['a', 'b', 'c'], 'item'), 'captured'), 'abc');
    expect(captures).toEqual({
      captured: {
        text: 'abc',
        children: [
          { item: { text: 'a' } },
          { item: { text: 'b' } },
          { item: { text: 'c' } },
        ],
      },
    });
  });

  test('nested', () => {
    const grammar = {
      a: peg.some(peg.rule('b'), 'a'),
      b: peg.some(peg.rule('c'), 'b'),
      c: peg.range('aa', 'c'),
      main: peg.some(peg.rule('a'), 'main'),
    };
    const [_, captures] = peg.match(grammar, 'aaa');

    expect(captures).toEqual({
      main: {
        text: 'aaa',
        children: [
          {
            a: {
              text: 'aaa',
              children: [
                {
                  b: {
                    text: 'aaa',
                    children: [
                      { c: { text: 'a' } },
                      { c: { text: 'a' } },
                      { c: { text: 'a' } },
                    ],
                  },
                }
              ],
            }
          }
        ],
      },
    });

  });

  test('nested discards child captures', () => {
    const grammar = {
      a: peg.some(peg.rule('b'), 'a'),
      b: peg.some(peg.rule('c'), 'b'),
      c: peg.range('aa'), // no capture here
      main: peg.some(peg.rule('a'), 'main'),
    };
    const [_, captures] = peg.match(grammar, 'aaa');

    expect(captures).toEqual({
      main: {
        text: 'aaa',
        children: [
          {
            a: {
              text: 'aaa',
              children: [
                { b: { text: 'aaa' } }
              ],
            }
          }
        ],
      },
    });

  });

  test('array captures children', () => {
    const [_, captures] = peg.match([peg.range('az', 'one'), peg.range('az', 'two')], 'gh');
    expect(captures).toEqual({
      one: { text: 'g' },
      two: { text: 'h' },
    });
  });

  test('between captures children', () => {
    const [_, captures] = peg.match(peg.between(peg.range('az', 'char'), 1, 3, 'captured'), 'abc');
    expect(captures).toEqual({
      captured: {
        text: 'abc',
        children: [
          { char: { text: 'a' } },
          { char: { text: 'b' } },
          { char: { text: 'c' } },
        ]
      }
    });
  });

  test('throws an error on an unknown rule', () => {
    expect(() => {
      peg.match({ type: 'unknown' }, '');
    }).toThrow(/could not process rule/);
  });
});