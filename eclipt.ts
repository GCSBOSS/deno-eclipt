
export type CLIInput = {
    args: string[],
    data: Record<string, string | boolean | string[]>,
    parent?: CLIInput,
    name: string
};

type CLIAction = (input: CLIInput) => void;

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
    opts: CLIOptList
}

type CLIParsingFrame = {
    tokens: string[],
    input: CLIInput,
    spec: CLICommand,
    global: CLIGlobalParsingFrame,
}

type CLIGlobalParsingFrame = {
    tokens: string[],
    input: CLIInput,
    spec: CLICommand,
    global: CLIGlobalParsingFrame,
    output: unknown,
    stdout: boolean
}

type CLIParsingError = {
    type: string,
    alias?: string,
    command?: string,
    val?: string,
    opt?: CLIOpt,
    count?: number,
    spec: CLICommand,
    badOpt?: string
}

const ERROR_MESSAGES: Record<string, (err: CLIParsingError) => string> = {
    'unknown-opt': err => `Option --${err.badOpt} does not exist in this context`,
    'not-multi': err => `Option ${getOptDef(err.opt)} cannot be set more than once`,
    'flag-val': err => `Option ${getOptDef(err.opt)} cannot be assigned a value`,
    'missing-val': err => `Option ${getOptDef(err.opt)} requires a value but none was supplied`,
    'unknown-alias': err => `Option -${err.alias} does not exist in this context`,
    'bad-args': err => `Required ${err.spec.args?.length} arguments but ${err.count} were supplied`,
    'unknown-command': err => `Command '${err.command}' does not exist in this context`,
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
    return ERROR_MESSAGES[err.type](err) as string;
}

function getUsageLine(spec: CLICommand): string{
    let r = '';

    if(spec.path && spec.path.length > 0)
        r += spec.path.join(' ') + ' ';

    r += spec.name;

    if(spec.opts)
        r += ' [OPTIONS]';

    if(!spec.action)
        r += ' COMMAND';

    if(spec.action && spec.args)
        r += ' ' + spec.args.map(a => '<' + a + '>').join(' ');

    return r;
}

function getHelp(spec: CLICommand): string{
    let r = '\n';

    if(spec.description)
        r += spec.description + '\n\n'

    r += 'Usage:\n    ' + getUsageLine(spec) + '\n\n';

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

    if(spec.commands){
        r += 'Commands:\n';

        let size = 0;
        for(const name in spec.commands){
            const cmd = spec.commands[name];
            cmd.name = name;
            size = Math.max(name.length, size);
        }

        for(const name in spec.commands)
            r += '    ' + name.padEnd(size, ' ') + '    ' +
                (spec.commands[name].description ?? '') + '\n';

        r += '\n';
    }

    return r;
}

function getShortHelp(spec: CLICommand): string{
    return '\nUsage:\n\t' + getUsageLine(spec) + '\n\nFor more information try --help\n';
}

function parseOption({ input, spec, tokens }: CLIParsingFrame){
    let val, opt = tokens.shift()!.substr(2);

    if(opt.indexOf('=') > -1)
        [ opt, val ] = opt.split(/=/);

    if(!(opt in spec.opts))
        throw { type: 'unknown-opt', badOpt: opt, spec };

    const optSpec = spec.opts[opt];
    optSpec.name = opt;

    if(!optSpec.multi && opt in input.data)
        throw { type: 'not-multi', opt: optSpec, spec };

    if(typeof val == 'string' && optSpec.flag)
        throw { type: 'flag-val', opt: optSpec, spec };

    if(optSpec.flag){
        input.data[opt] = true;
        return;
    }

    if(typeof val != 'string'){
        if(!tokens[0] || tokens[0].charAt(0) == '-')
            throw { type: 'missing-val', opt: optSpec, spec };
        val = tokens.shift();
    }

    if(optSpec.multi && opt in input.data)
        (input.data[opt] as string[]).push(val as string);
    else if(optSpec.multi)
        input.data[opt] = [ val as string ];
    else
        input.data[opt] = val as string;
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

    throw { type: 'unknown-alias', alias, spec };
}

function parseArgs({ input, spec, tokens }: CLIParsingFrame){
    let count = 0;
    while(tokens.length > 0){
        count++
        input.args.push(tokens.shift() as string);
    }

    if(spec.args && spec.args.length != count)
        throw { type: 'bad-args', count, spec };
}

function parseGroup({ tokens }: CLIParsingFrame){

    const opts = tokens.shift()!.split('').slice(1).reverse();

    for(const o of opts)
        tokens.unshift('-' + o);
}

function parseCommand(frame: CLIParsingFrame): void{

    const name = frame.tokens.shift() as string;

    const newFrame = {
        input: { name, data: {}, args: [], parent: frame.input },
        tokens: frame.tokens,
        spec: frame.spec.commands![name],
        global: frame.global
    };

    newFrame.spec.path = newFrame.spec.path ?? [];
    newFrame.spec.path.push(frame.spec.name as string);
    newFrame.spec.name = name;

    parseUnknown(newFrame);
}

function parseUnknown(frame: CLIParsingFrame): void{

    const t = frame.tokens[0];

    if(t == '--help'){
        frame.global.output = getHelp(frame.spec);
        if(frame.global.stdout)
            console.log(frame.global.output);
        return;
    }

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

    if(t && frame.spec.commands && t in frame.spec.commands)
        return parseCommand(frame);

    if(t && frame.spec.commands && !frame.spec.action)
        throw { type: 'unknown-command', command: t, spec: frame.spec };

    if(t == '--')
        frame.tokens.shift();

    if(!frame.spec.action)
        throw { type: 'no-action', spec: frame.spec };

    parseArgs(frame);

    frame.global.output = frame.spec.action(frame.input);
}

export function eclipt(name: string, spec: CLICommand, tokens?: string[]){
    const stdout = !tokens;
    tokens = tokens ?? Deno.args;

    // TODO validate repeated aliases
    // TODO validate args is array
    // TODO validate opts is object

    const globalFrame = { input: { name, data: {}, args: [] }, tokens, spec,
        output: null, stdout, global: {} };
    globalFrame.spec.name = name;
    globalFrame.global = globalFrame as unknown as CLIGlobalParsingFrame;

    try{
        parseUnknown(globalFrame as unknown as CLIGlobalParsingFrame);
    }
    catch(err){
        err.output = '\n\u001b[38;5;203m' + getErrorMessage(err) +
            '\u001b[0m\n' + getShortHelp(err.spec);
        err.error = true;

        if(stdout)
            console.log(err.output);
        return err;
    }

    return globalFrame.output;
}