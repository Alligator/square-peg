# square peg

A proof of concept for a parsing expression grammar (PEG) library in javascript.

## functions

| name | description |
|------|-------------|
|`match(grammar, string)`|parse `string` using `grammar`. returns an array of `[success, captures]`|
|`'literal string'`|match the string literally|
|`set(string)`|match any of the characters in the string|
|`range(string)`|match any character in the range given in `string`. e.g. `'az'`|
|`choice([rule1, rule2, ...])`|match the first successful rule in `rules`. fails if none match|
|`seq([rule1, rule2, ...])`|match each rule in sequence. fails if any fail|
|`rule(name)`|match the rule in the grammar with the key `name`|
|`between(rule, min, max)`| match `rule` between `min` and `max` times|
|`some(rule)`|match `rule` one or more times|
|`any(rule)`|match `rule` zero or more times|
|`captureGroup(rule)`|match `rule` and put it's capture in a group (see below)|

## grammar

A grammar is either one of the above rules, or an object where each entry is one of the above rules. It must have a `main` entry, which is the rule `match` will start from. The `rule` function can be used to reference other rules in the grammar.

Here is an example grammar that parses newline separate key value pairs, like these:

```
name: alligator
country: uk
age: rude
```

First of all, define rules for characters and strings:

```js
const grammar = {
  character: peg.range('az'),
  string: peg.some(peg.rule('character')),
};
```

then add a rule to match each pair:

```js
const grammar = {
  character: peg.range('az'),
  string: peg.some(peg.rule('character')),
  pair: peg.seq([peg.rule('string'), ': ', peg.rule('string')]),
};
```

finally add a main rule to match any number of pairs followed by newlines:

```js
const grammar = {
  character: peg.range('az'),
  string: peg.some(peg.rule('character')),
  pair: peg.seq([peg.rule('string'), ': ', peg.rule('string')]),
  main: peg.some([
    peg.rule('pair'),
    '\n',
  ]),
};
```

this will now match the above example:

```js
const text = `\
name: alligator
country: uk
age: rude
`;

const [success, captures] = peg.match(grammar, text);
assert.strictEqual(success, true);
```

## captures

Rules can also capture text. Every rule function takes a final parameter to control this. If it's `true`, any captured text will be pushed to the capture stack. If it's a string, an object will be pushed to the capture stack where the name property is the given string, and the text property is the captured text.

Taking the grammar above, we can modify the pair rule to capture the key and value:
```js
peg.seq([peg.rule('string', true), ': ', peg.rule('string', true)]),
```

Matching this grammar with this input:

```
name: alligator
country: uk
age: rude
```

results in this set of captures:

```js
[ 'name', 'alligator', 'country', 'uk', 'age', 'rude' ]
```

Modifying the rule to use named captures:
```js
peg.seq([peg.rule('string', 'key'), ': ', peg.rule('string', 'value')]),
```

results in this:

```js
[
  { type: 'key', text: 'name' },
  { type: 'value', text: 'alligator' },
  { type: 'key', text: 'country' },
  { type: 'value', text: 'uk' },
  { type: 'key', text: 'age' },
  { type: 'value', text: 'rude' }
]
```

## capture groups

Sometimes you may want a rule to store it's captures in it's own capture stack instead of pushing them to the top level stack. This is achieved with the `captureGroup` function. It takes a rule as it's argument and pushes any captures that rule made as an array on to the stack.

We could modify our pairs rule further to capture the key and array in a group:
```js
peg.captureGroup(peg.seq([peg.rule('string', true), ': ', peg.rule('string', true)])),
```

this wil result in this set of captures:
```js
[ [ 'name', 'alligator' ], [ 'country', 'uk' ], [ 'age', 'rude' ] ]
```

Here is final grammar with captures and capture groups:
```js
const grammar = {
  character: peg.range('az'),
  string: peg.some(peg.rule('character')),
  pair: peg.captureGroup(peg.seq([peg.rule('string', true), ': ', peg.rule('string', true)])),
  main: peg.some(peg.seq([
    peg.rule('pair'),
    '\n',
  ])),
};
```