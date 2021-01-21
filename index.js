const assert = require('assert');
const util = require('util');
const peg = require('./peg');

function ini() {
  const grammar = {
    char: peg.range('az'),
    header: ['[', peg.some(peg.rule('char'), 'title'), ']'],
    pair: [peg.some(peg.rule('char'), 'key'), ' = ', peg.some(peg.rule('char'), 'value')],
    main: peg.some(
      [
        peg.choice([peg.rule('header'), peg.rule('pair'), '\n']),
        peg.between('\n', 0, 1),
      ],
      'ini',
    ),
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
    pair: [peg.rule('string', 'key'), ': ', peg.rule('string', 'value')],
    main: peg.some([
      peg.rule('pair'),
      '\n',
    ], 'pairs'),
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

ini();
kvps();