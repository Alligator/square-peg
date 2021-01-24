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

describe('any', () => {
  test.each([
    ['a', '', true],
    ['a', 'a', true],
    ['a', 'aa', true],
    ['a', 'b', false],
  ])('any(%s) %s', (any, string, expected) => {
    expect(peg.match(peg.any(any), string)[0]).toBe(expected);
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
      main: peg.seq([peg.rule('ref'), peg.rule('ref')]),
    };
    expect(peg.match(grammar, 'hellohello')[0]).toBe(true);
  });

  test('fails if the rule fails', () => {
    const grammar = {
      ref: 'hello',
      main: peg.seq([peg.rule('ref'), peg.rule('ref')]),
    };
    expect(peg.match(grammar, 'helloolleh')[0]).toBe(false);
  });

  test('throws an error if the rule is not found', () => {
    const grammar = {
      main: peg.rule('nope'),
    };
    expect(() => {
      peg.match(grammar, '');
    }).toThrow(/rule "nope" not found/);
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

  test('throws an error if a rule cannot be processed', () => {
    expect(() => {
      peg.match({ not: 'a rule' });
    }).toThrow(/could not process rule/);
  });
});

describe('captures', () => {
  test('basic', () => {
    const [success, captures] = peg.match(peg.range('09', true), '4');
    expect(captures).toEqual(['4']);
  });

  test('repeated', () => {
    const [success, captures] = peg.match(peg.some(peg.range('09', true)), '456');
    expect(captures).toEqual(['4', '5', '6']);
  });

  test('parent and child', () => {
    const [success, captures] = peg.match(peg.some(peg.range('09', true), true), '456');
    expect(captures).toEqual(['4', '5', '6', '456']);
  });

  test('named', () => {
    const [success, captures] = peg.match(peg.some(peg.range('09', 'digit'), 'digits'), '456');
    expect(captures).toEqual([
      { type: 'digit', text: '4' },
      { type: 'digit', text: '5' },
      { type: 'digit', text: '6' },
      { type: 'digits', text: '456' },
    ]);
  });

  test('capture groups', () => {
    const grammar = {
      digit: peg.range('09'),
      numbers: peg.captureGroup(peg.some(peg.seq([
        peg.some(peg.rule('digit'), true),
        peg.any(' '),
      ]))),
      main: peg.some(peg.seq([
        peg.some(peg.rule('numbers')),
        '\n',
      ])),
    };
    const [success, captures] = peg.match(grammar, '123 456\n789\n');
    expect(success).toBe(true);
    expect(captures).toEqual([
      ['123', '456'],
      ['789'],
    ]);
  });
});