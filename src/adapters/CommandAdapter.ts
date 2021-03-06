import { Player } from '../classes/Player';
import { Playground } from '../classes/Playground';
import { Facing, isFacing } from '../types/Facing';
import { InvalidCommandError } from '../errors/InvalidCommandError';
import { PlayerReporter } from '../classes/PlayerReporter';
import { isInteger } from '../helpers/TypeGurads';

enum Command {
    'PLACE' = 'PLACE',
    'MOVE' = 'MOVE',
    'REPORT' = 'REPORT',
    'LEFT' = 'LEFT',
    'RIGHT' = 'RIGHT',
}

type PlaceCommandArguments = [number, number, Facing];

export class CommandAdapter {
    private readonly player: Player;
    private readonly playground: Playground;
    private reporterFunction: (player: Readonly<Player>) => void = PlayerReporter.asStandardOut;

    constructor(options: { player: Player; playground: Playground; reporter?: (player: Readonly<Player>) => void }) {
        this.player = options.player;
        this.playground = options.playground;
        if (options.reporter) {
            this.reporterFunction = options.reporter;
        }
    }

    private static get commandRegexMap(): Map<Command, RegExp> {
        return new Map([
            [Command.PLACE, /^PLACE (\d+),(\d+),(NORTH|SOUTH|EAST|WEST)$/g],
            [Command.LEFT, /^LEFT$/],
            [Command.RIGHT, /^RIGHT$/],
            [Command.MOVE, /^MOVE$/],
            [Command.REPORT, /^REPORT$/],
        ]);
    }

    private static isPotentialValidCommand(input: string): boolean {
        return (
            input.length === 4 || // LEFT, MOVE
            input.length === 'RIGHT'.length ||
            input.length === 'REPORT'.length ||
            input.length >= 'PLACE 0,0,EAST'.length
        );
    }

    public parseInput(input: string): ReadonlyArray<[Command, Readonly<PlaceCommandArguments | []>]> {
        const commands: Array<[Command, Readonly<PlaceCommandArguments | []>]> = [];
        let from = 0;
        /**
         * Loop through the input string from the start (from = 0).
         */
        for (let to = 1; to <= input.length; to++) {
            const inputSegment = input.substring(from, to).trim();
            if (!CommandAdapter.isPotentialValidCommand(inputSegment)) {
                continue;
            }
            for (const [command, regex] of CommandAdapter.commandRegexMap) {
                const matches = regex.exec(inputSegment);
                if (matches) {
                    if (command === Command.PLACE) {
                        const facing = matches[3].toLowerCase();
                        const x = Number(matches[1]);
                        const y = Number(matches[2]);
                        if (!isFacing(facing) || !isInteger(x) || !isInteger(y)) {
                            throw new InvalidCommandError({ info: [{ matches }] });
                        }
                        commands.push([command, [x, y, facing]]);
                    } else {
                        commands.push([command, []]);
                    }
                    /**
                     * If a valid command is found, move the cursor (from) to the next character (to),
                     * and stop matching for other command(s).
                     */
                    from = to;
                    break;
                }
            }
        }
        return commands;
    }

    public set reporter(reporter: (player: Readonly<Player>) => void) {
        this.reporterFunction = reporter;
    }

    public execute(input: string): void {
        const commands = this.parseInput(input.trim());
        for (const [command, args] of commands) {
            switch (command) {
                case Command.PLACE:
                    this.player.placeOnPlayground({
                        playground: this.playground,
                        facing: args[2],
                        position: { x: BigInt(args[0]), y: BigInt(args[1]) },
                    });
                    break;
                case Command.LEFT:
                    if (this.player.isOnPlayground) {
                        this.player.rotateCounterclockwise();
                    }
                    break;
                case Command.RIGHT:
                    if (this.player.isOnPlayground) {
                        this.player.rotateClockwise();
                    }
                    break;
                case Command.MOVE:
                    if (this.player.isOnPlayground) {
                        this.player.move();
                    }
                    break;
                case Command.REPORT:
                    if (this.player.isOnPlayground) {
                        this.reporterFunction(this.player);
                    }
                    break;
            }
        }
    }
}
