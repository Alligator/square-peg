const assert = require('assert');
const util = require('util');
const peg = require('./peg');

function ini() {
  const grammar = {
    char: peg.range('az'),
    header: peg.seq(['[', peg.some(peg.rule('char'), true), ']']),
    pair: peg.captureGroup(peg.seq([
      peg.some(peg.rule('char'), true),
      ' = ',
      peg.some(peg.rule('char'), true),
    ])),
    section: peg.captureGroup(peg.seq([
      peg.any(peg.seq([peg.rule('header'), '\n'])),
      peg.some(peg.seq([peg.rule('pair'), peg.any('\n')])),
    ])),
    main: peg.some(peg.rule('section')),
  };

  const text = `\
[main]
dog = good
cat = unknown

[other]
goose = chaos`;

  const [success, captures] = peg.match(grammar, text);
  console.log(util.inspect(captures, { depth: null }));
  assert.strictEqual(success, true);
}

function kvps() {
  const grammar = {
    character: peg.range('az'),
    string: peg.some(peg.rule('character')),
    pair: peg.captureGroup(peg.seq([peg.rule('string', true), ': ', peg.rule('string', true)])),
    main: peg.some(peg.seq([
      peg.rule('pair'),
      '\n',
    ])),
  };

  const text = `\
name: alligator
country: uk
age: rude
`;

  const [success, captures] = peg.match(grammar, text);
  console.log(util.inspect(captures, { depth: null }));
  assert.strictEqual(success, true);
}

function calculator() {
  const grammar = {
    number: peg.range('09'),
    whitespace: peg.any(' '),
    addition: peg.captureGroup(peg.seq([
      peg.rule('whitespace'),
      peg.rule('multiplication'),
      peg.rule('whitespace'),
      peg.any(peg.seq([
        peg.set('+-', true),
        peg.rule('addition'),
      ])),
    ])),
    multiplication: peg.captureGroup(peg.seq([
      peg.rule('whitespace'),
      peg.rule('number', true),
      peg.rule('whitespace'),
      peg.any(peg.seq([
        peg.set('*/', true),
        peg.rule('multiplication'),
      ])),
    ])),
    expression: peg.seq([
      peg.choice([
        peg.rule('addition'),
        peg.rule('multiplication'),
      ]),
    ]),
    main: peg.rule('expression'),
  };

  const text = '1 + 2 * 3';

  const [success, captures] = peg.match(grammar, text);
  console.log(util.inspect(captures, { depth: null }));
  assert.strictEqual(success, true);
}

ini();
kvps();
calculator();