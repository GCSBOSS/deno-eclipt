import { assertEquals, assert } from "https://deno.land/std@0.92.0/testing/asserts.ts";
import { eclipt } from "./eclipt.ts";

Deno.env.set('ENV', 'testing');

Deno.test('parse arguments', () => {
    const out = eclipt('my-tool', { action: i => i },
        [ 'not-cmd' ]
    );

    assertEquals(out.args.length, 1);
});

Deno.test('fail when missing action', () => {
    const err = eclipt('my-tool', {  },
        [ ]
    );

    assertEquals(err.type, 'no-action');
});

Deno.test('fail when repeating option', () => {
    const err = eclipt('my-tool', { opts: { pa: { flag: true, alias: 'p' } } },
        [ '-p', '-p' ]
    );

    assertEquals(err.type, 'not-multi');
});

Deno.test('parse all as arguments after argument modifier', () => {
    const out = eclipt('my-tool', { action: i => i },
        [ '--', '-n', '--fake-opt', 'fakearg', 'arg1' ]
    );

    assertEquals(out.args.length, 4);
});

Deno.test('parse option', () => {
    const out = eclipt('my-tool', { action: i => i, opts: {
        op1: { }
    } },
        [ '--op1', 'foobar' ]
    );

    assertEquals(out.data.op1, 'foobar');
});

Deno.test('parse assigned option', () => {
    const out = eclipt('my-tool', { action: i => i, opts: {
        op1: { }
    } },
        [ '--op1=foobar' ]
    );

    assertEquals(out.data.op1, 'foobar');
});

Deno.test('fail when given option is not specified', () => {
    const err = eclipt('my-tool', { opts: { foo: { flag: true } } },
        [ '--bar', 'arg' ]);
    assertEquals(err.type, 'unknown-opt');
    assertEquals(err.token, 'bar');
});

Deno.test('fail when option value is not provided', () => {
    const err = eclipt('my-tool', { opts: { foo: { } } },
        [ '--foo' ]);
    assertEquals(err.type, 'missing-val');
    assertEquals(err.opt.name, 'foo');
});

Deno.test('fail when sending assigned value to flag option', () => {
    const err = eclipt('my-tool', { action: i => i, opts: { foo: { flag: true } } },
        [ '--foo=a' ]);
    assertEquals(err.type, 'flag-val');
});

Deno.test('fail unknown alias', () => {
    const err = eclipt('my-tool',
        { action: i => i, opts: {} },
        [ '-o', 'arg1', 'arg2' ]);

    assertEquals(err.type, 'unknown-alias');
    assertEquals(err.token, 'o');
});

Deno.test('parse aliased options', () => {
    const out = eclipt('my-tool',
        { action: i => i, opts: { foo: { value: 'thing', alias: 'o' } } },
        [ '-o', 'arg1', 'arg2' ]);

    assertEquals(out.data['foo'], 'arg1');
    assertEquals(out.args[0], 'arg2');
});

Deno.test('parse grouped aliased options', () => {
    const out = eclipt('my-tool',
        { action: i => i, opts: {
            opt1: { flag: true, alias: 'o' },
            opt2: { flag: true, alias: 'f' }
        } },
        [ '-of', 'arg2' ]);

    assertEquals(out.data.opt1, true);
    assertEquals(out.data.opt2, true);
    assertEquals(out.args[0], 'arg2');
});

Deno.test('parse array options', () => {
    const out = eclipt('my-tool',
        { action: i => i, opts: {
            opt1: { multi: true, value: 'thing', alias: 'o' }
        } },
        [ '-o', '1', '-o', '2', '-o', '3', 'arg2' ]);

    assertEquals(out.data.opt1.length, 3);
    assertEquals(out.args[0], 'arg2');
});

Deno.test('fail when not meeting args spec', () => {
    const err = eclipt('my-tool', { action: i => i, args: [ 'hu' ] },
        [ 'foo', 'bar', 'baz', 'arg' ]);
    assertEquals(err.type, 'bad-args');
});

Deno.test('parse a specified command', () => {
    const out = eclipt('my-tool', {
        commands: { doit: { action: i => i } }
    }, [ 'doit', 'arg' ]);

    assertEquals(out.name, 'doit');
    assertEquals(out.args[0], 'arg');
});

Deno.test('fail when given command doesn\'t exist', () => {
    const err = eclipt('my-tool', {
        commands: { doit: { action: i => i } }
    }, [ 'not-cmd' ]);

    assertEquals(err.type, 'unknown-command');
});

Deno.test('help option', () => {
    const out = eclipt('my-tool', {
        description: 'Test description',
        opts: {
            opt1: { flag: true },
            opt2: { flag: true, alias: 'f' }
        },
        commands: { doit: { action: i => i } }
    }, [ '--help' ]);

    assert(/Usage\:/.test(out.output));
    assert(/Options\:/.test(out.output));
    assert(/Commands\:/.test(out.output));
});

Deno.test('help alias', () => {
    const out = eclipt('my-tool', {
        commands: {
            foo: {
                description: 'Test description',
                opts: {
                    opt1: { flag: true },
                    opt2: { flag: true, alias: 'f' }
                }
            }
        }
    }, [ 'foo', '-h' ]);

    assert(/Test\ /.test(out.output));
    assert(/Usage\:/.test(out.output));
    assert(/Options\:/.test(out.output));
    assert(!/Commands\:/.test(out.output));
});

Deno.test('read ARGV when no args array is supplied', () => {
    const err = eclipt('my-tool', {});
    assertEquals(err.type, 'no-action');
});