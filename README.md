# square peg

A proof of concept for a parsing expression grammar (PEG) library in javascript.

## rules

| name | description |
|------|-------------|
|`match(grammar, string)`|parse `string` using `grammar`. returns an array of `[success, captures]`|
|`set(string)`|match any of the characters in the string.|
|`choice(rules)`|match the first successful rule in `rules`. fails if none match.|
|`range(string)`|match any character in the range given in string. e.g. `'az'`.|
|`rule(name)`|match the rule in the grammar with the key `name`|
|`some(rule)`|match `rule` one or more times|
|`between(rule, min, max)`| match `rule` between `min` and `max` times|
|`[rule1, rule2, ...]`|match each rule in the array in a sequence. if any fail the entire rule fails|
|`'literal string'`|match the string literally.|

## grammar

A grammar is either one of the above rules, or an object where each entry is one of the above rules. It must have a `main` entry, which is the rule `match` will start from. The `rule` function can be used to reference other rules in the grammar.

Here is an example grammar that parses newline separate key value pairs, like these:

```
name: alligator
country: uk
age: rude
```

First of all, define some rules for characters and strings:

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
  pair: [peg.rule('string'), ': ', peg.rule('string')],
};
```

finally add a main rule to match any number of pairs follow by newlines:

```js
const grammar = {
  character: peg.range('az'),
  string: peg.some(peg.rule('character')),
  pair: [peg.rule('string'), ': ', peg.rule('string')],
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

Just matching text is cool, but you probably want to extract some values from it. Every rule function takes a tag as it's final parameter. When this is set square peg will capture the text that matched under that tag.

Here's our grammar from above with added captures:
```js
const grammar = {
  character: peg.range('az'),
  string: peg.some(peg.rule('character')),
  pair: [peg.rule('string', 'key'), ': ', peg.rule('string', 'value')],
  main: peg.some([
    peg.rule('pair'),
    '\n',
  ], 'pairs'),
};
```

Note how the `pair` rule captures `key` and `value`, but since there are nested under the `main` rule that needs to capture too. If a rule doesn't have a tag, all of it's captures and ny captures by rules under it are thrown away.

Calling this with this input:

```
name: alligator
country: uk
age: rude
```

returns this capture object:
```js
{
  pairs: {
    text: 'name: alligator\ncountry: uk\nage: rude\n',
    children: [
      { key: { text: 'name' }, value: { text: 'alligator' } },
      { key: { text: 'country' }, value: { text: 'uk' } },
      { key: { text: 'age' }, value: { text: 'rude' } }
    ]
  }
}
```

`text` is all of the text the rule matched.  Rules that match a rule more than once (`some`, `between`) will have the `children` property, containing the captures for each time the rule matched.