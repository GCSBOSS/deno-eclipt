
export type CLIInput = {
    args: string[],
    opts: Record<string, string | boolean | string[]>,
    parent?: CLIInput,
    name: string
}

type CLIAction = (input: CLIInput) => unknown;

type CLIOpt = {
    name?: string,
    alias?: string,
    flag?: boolean,
    multi?: boolean,
    value?: string,
    description?: string,
    disableHelp?: boolean
}

type CLIOptList = Record<string, CLIOpt>;
type CLICommandList = Record<string, CLICommand>

type CLICommand = {
    description?: string,
    action?: CLIAction,
    commands?: CLICommandList,
    args?: string[],
    path?: string[],
    name?: string,
    opts?: CLIOptList
}

type CLIParsingFrame = {
    tokens: string[],
    input: CLIInput,
    spec: CLICommand
}

type CLIParsingError = {
    kind: string,
    token?: string,
    args?: string[],
    opt?: CLIOpt,
    count?: number
}

const ERROR_MESSAGES: Record<string, (err: CLIParsingError) => string> = {
    'unknown-opt': err => `Option --${err.token} does not exist in this context`,
    'not-multi': err => `Option ${getOptDef(err.opt)} cannot be set more than once`,
    'flag-val': err => `Option ${getOptDef(err.opt)} cannot be assigned a value`,
    'missing-val': err => `Option ${getOptDef(err.opt)} requires a value but none was supplied`,
    'unknown-alias': err => `Option -${err.token} does not exist in this context`,
    'bad-args': err => `Required ${err.args?.length} arguments but ${err.count} were supplied`,
    'unknown-command': err => `Command '${err.token}' does not exist in this context`,
    'no-action': () => `You must choose one of the available commands`
}

function getOptDef(opt?: CLIOpt){
    opt = opt as CLIOpt;
    let r = (opt.alias ? '-' + opt.alias + ', ' : '') + '--' + opt.name;

    if(!opt.flag){
        opt.value = opt.value ?? 'value'
        r += ' <' + opt.value + '>';
    }

    return r;
}

function getErrorMessage(err: CLIParsingError): string{
    return ERROR_MESSAGES[err.kind](err) as string;
}

function getUsageLine(spec: CLICommand): string{
    let r = 'Usage:\n    ';

    if(spec.path!.length > 0)
        r += spec.path!.join(' ') + ' ';

    r += spec.name;

    if(typeof spec.opts == 'object' && Object.keys(spec.opts).length > 0)
        r += ' [OPTIONS]';

    if(!spec.action)
        r += ' COMMAND';

    if(spec.action && spec.args)
        r += ' ' + spec.args.map(a => '<' + a + '>').join(' ');

    return r + '\n\n';
}

function getCommandsHelp(spec: CLICommand): string {
    let r = 'Commands:\n';

    let size = 0;
    for(const name in spec.commands){
        const cmd = spec.commands[name];
        cmd.name = name;
        size = Math.max(name.length, size);
    }

    for(const name in spec.commands)
        r += '    ' + name.padEnd(size, ' ') + '    ' +
            (spec.commands[name].description ?? '') + '\n';

    return r + '\n';
}

function getHelp(spec: CLICommand): string{
    let r = '\n';

    if(spec.description)
        r += spec.description + '\n\n'

    r += getUsageLine(spec);

    if(spec.opts){
        r += 'Options:\n';

        const defs = [];
        const descs = [];
        let defSize = 0;
        for(const name in spec.opts){
            const opt = spec.opts[name];
            opt.name = name;
            const d = (!opt.alias ? '    ' : '') + getOptDef(opt);
            defSize = Math.max(d.length, defSize);
            defs.push(d);
            descs.push(opt.description ?? '');
        }

        for(const d of defs)
            r += '    ' + d.padEnd(defSize, ' ') + '    ' + descs.shift() + '\n';

        r += '\n';
    }

    if(spec.commands)
        r += getCommandsHelp(spec);

    return r;
}

function parseOption({ input, spec, tokens }: CLIParsingFrame){
    let val, opt = tokens.shift()!.substr(2);

    if(opt.indexOf('=') > -1)
        [ opt, val ] = opt.split(/=/);

    if(!(opt in (spec.opts as CLIOptList)))
        throw { kind: 'unknown-opt', token: opt, spec };

    const optSpec = spec.opts![opt];
    optSpec.name = opt;

    if(!optSpec.multi && opt in input.opts)
        throw { kind: 'not-multi', opt: optSpec, spec };

    if(typeof val == 'string' && optSpec.flag)
        throw { kind: 'flag-val', opt: optSpec, spec };

    if(optSpec.flag){
        input.opts[opt] = true;
        return;
    }

    if(typeof val != 'string'){
        if(!tokens[0] || tokens[0].charAt(0) == '-')
            throw { kind: 'missing-val', opt: optSpec, spec };
        val = tokens.shift();
    }

    if(optSpec.multi && opt in input.opts)
        (input.opts[opt] as string[]).push(val as string);
    else if(optSpec.multi)
        input.opts[opt] = [ val as string ];
    else
        input.opts[opt] = val as string;
}

function parseAlias({ tokens, spec }: CLIParsingFrame){

    const alias = tokens[0].substr(1);

    if(alias == 'h'){
        tokens[0] = '--help';
        return;
    }

    for(const name in spec.opts){
        const opt = spec.opts![name];

        if(opt.alias == alias){
            tokens[0] = '--' + name;
            return;
        }
    }

    throw { kind: 'unknown-alias', token: alias, spec };
}

function parseArgs({ input, spec, tokens }: CLIParsingFrame){
    let count = 0;
    while(tokens.length > 0){
        count++
        input.args.push(tokens.shift() as string);
    }

    if(spec.args && spec.args.length != count)
        throw { kind: 'bad-args', count, args: spec.args };
}

function parseGroup({ tokens }: CLIParsingFrame){

    const opts = tokens.shift()!.split('').slice(1).reverse();

    for(const o of opts)
        tokens.unshift('-' + o);
}

function parseUnknown(frame: CLIParsingFrame): unknown{

    const t = frame.tokens[0];

    if(t == '--help')
        throw { kind: 'help', output: getHelp(frame.spec) };

    if(t && t.substr(0, 2) != '--' && t.charAt(0) == '-'){

        if(t.length > 2)
            parseGroup(frame);
        else
            parseAlias(frame);
        return parseUnknown(frame);
    }

    if(t && t != '--' && t.substr(0, 2) == '--'){
        parseOption(frame);
        return parseUnknown(frame);
    }

    if(t && frame.spec.commands && t in frame.spec.commands){
        const name = frame.tokens.shift() as string;
        const newSpec = frame.spec.commands![name];
        newSpec.path = frame.spec.path!.concat(frame.spec.name as string);
        return parseCommand(name, newSpec, frame.tokens, frame.input);
    }

    if(t && frame.spec.commands && !frame.spec.action)
        throw { kind: 'unknown-command', token: t, spec: frame.spec };

    if(t == '--')
        frame.tokens.shift();

    if(!frame.spec.action)
        throw { kind: 'no-action', spec: frame.spec };

    parseArgs(frame);

    return frame.spec.action(frame.input);
}

function parseCommand(name: string, spec: CLICommand, tokens: string[], parent?: CLIInput): unknown{

    const frame = {
        input: { name, opts: {}, args: [], parent }, tokens, spec
    };

    // TODO validate repeated aliases
    frame.spec.opts = frame.spec.opts || {};
    frame.spec.commands = frame.spec.commands || {};
    frame.spec.name = name;

    try{
        return parseUnknown(frame);
    }
    catch(err){

        if(!err.kind)
            throw err;

        if(!err.output){

            err.output = '\n\u001b[38;5;203m' + getErrorMessage(err) +
                '\u001b[0m\n\n' + getUsageLine(frame.spec);

            if(err.kind == 'unknown-command' || err.kind == 'no-action')
                err.output += getCommandsHelp(frame.spec);

            err.output += 'For more information try --help\n';
        }

        if(err.kind != 'help')
            err.error = true;

        if(Deno.env.get('ENV') != 'testing')
            console.log(err.output);
        return err;
    }
}

export function eclipt(name: string, spec: CLICommand, tokens?: string[]): unknown{
    tokens = tokens ?? [ ...Deno.args ];
    spec.path = [];
    return parseCommand(name, spec, tokens);
}