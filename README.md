
# [Eclipt](https://gitlab.com/GCSBOSS/deno-eclipt) for Deno

A flexible library to create CLIs

## Features
- Regular options (`--foo bar`)
- Boolean options (`--foobar`)
- Key-value options (`--foo=bar`)
- Short aliases (`-f`)
- Array options (`--foo bar --foo baz`)
- Grouped aliased flags (`-abc`)
- Automatic `-h, --help` support
- Expected arguments
- Arbitrary depth of nested commands

## Usage

```ts

import { eclipt } from 'https://deno.land/x/eclipt@0.2.3/eclipt.ts';

eclipt('my-awesome-tool', {
    description: 'My Awesome Tool can do anything you with', // Optional description
    action: input => // optional action for the command
        console.log('You have run: %s with following input', input.name, input),
    args: [ 'MY_ARG_1', 'MY_ARG_2' ], // optional list of supported arguments
    opts: {

        // Any number of options
        foo: { flag: true }, // A boolean option
        bar: { value: 'value' }, // A regular key and the name for it's value
        baz: { multi: true, value: 'value' }, // An array option that can appear multiple times
        opt1: { value: 'value', alias: 'o' }, // Aliased option
        opt2: { description: 'Does that' } // Optional description
    },
    commands: {
        'command-name': { /* (description?, action?, args?, opts? commands?) */ }
    }
});

```

## TODO
- unquote arguments and values
- mark multi options some way in the help
- validate against repeated aliases

## Reporting Bugs
If you have found any problems with this module, please:

1. [Open an issue](https://gitlab.com/GCSBOSS/deno-eclipt/issues/new).
2. Describe what happened and how.
3. Also in the issue text, reference the label `~bug`.

We will make sure to take a look when time allows us.

## Proposing Features
If you wish to get that awesome feature or have some advice for us, please:
1. [Open an issue](https://gitlab.com/GCSBOSS/deno-eclipt/issues/new).
2. Describe your ideas.
3. Also in the issue text, reference the label `~proposal`.

## Contributing
If you have spotted any enhancements to be made and is willing to get your hands
dirty about it, fork us and
[submit your merge request](https://gitlab.com/GCSBOSS/deno-eclipt/merge_requests/new)
so we can collaborate effectively.
