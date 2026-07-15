import type { ConfirmChannel } from "amqplib";
import type { ArmyMove, RecognitionOfWar } from "../internal/gamelogic/gamedata.js";
import type { GameState, PlayingState } from "../internal/gamelogic/gamestate.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { handleWar, WarOutcome } from "../internal/gamelogic/war.js";
import { AckType } from "../internal/pubsub/subscribe.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilTopic, WarRecognitionsPrefix } from "../internal/routing/routing.js";
import { publishGameLog } from "./index.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => AckType {


    return (ps: PlayingState) => {
        handlePause(gs, ps);
        process.stdout.write("> ");
        return AckType.Ack;
    };
}

export function handlerMove(gs: GameState, ch: ConfirmChannel): (move: ArmyMove) => AckType {
    return (move: ArmyMove) => {
        const movement = handleMove(gs, move);
        process.stdout.write("> ");

        if (movement === MoveOutcome.Safe) {
            return AckType.Ack;
        }
        if (movement === MoveOutcome.SamePlayer) {
            return AckType.NackDiscard;
        }

        if (movement === MoveOutcome.MakeWar) {
            const defender = gs.getPlayerSnap();
            const rw: RecognitionOfWar = {
                attacker: move.player,
                defender: defender,
            }
            const key = `${WarRecognitionsPrefix}.${defender.username}`;
            try {
                void publishJSON(ch, ExchangePerilTopic, key, rw);
                return AckType.Ack;
            } catch {
                return AckType.NackRequeue;
            }
        }

        return AckType.NackDiscard;
    }
}

export function handlerWar(
    gs: GameState,
    ch: ConfirmChannel,
): (war: RecognitionOfWar) => Promise<AckType> {
    return async (war: RecognitionOfWar): Promise<AckType> => {
        try {
            const outcome = handleWar(gs, war);
            let message;
            switch (outcome.result) {
                case WarOutcome.NotInvolved:
                    return AckType.NackRequeue;
                case WarOutcome.NoUnits:
                    return AckType.NackDiscard;
                case WarOutcome.YouWon: {
                    const message = `${outcome.winner} won a war against ${outcome.loser}`;
                    try {
                        await publishGameLog(ch, war.attacker.username, message);
                        return AckType.Ack;
                    } catch {
                        return AckType.NackRequeue;
                    }
                }
                case WarOutcome.OpponentWon: {
                    const message = `${outcome.winner} won a war against ${outcome.loser}`;
                    try {
                        await publishGameLog(ch, war.attacker.username, message);
                        return AckType.Ack;
                    } catch {
                        return AckType.NackRequeue;
                    }
                }
                case WarOutcome.Draw: {
                    const message = `A war between ${outcome.attacker} and ${outcome.defender} resulted in a draw`;
                    try {
                        await publishGameLog(ch, war.attacker.username, message);
                        return AckType.Ack;
                    } catch {
                        return AckType.NackRequeue;
                    }
                }
                default:
                    const unreachable: never = outcome;
                    console.log("Unexpected war resolution: ", unreachable);
                    return AckType.NackDiscard;
            }
        } finally {
            process.stdout.write("> ");
        }
    };
}