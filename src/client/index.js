import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { clientWelcome, commandStatus, getInput, printClientHelp, printQuit, printServerHelp } from "../internal/gamelogic/gamelogic.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/consume.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";
async function main() {
    const rabbitConnString = "amqp://guest:guest@localhost:5672/";
    const conn = await amqp.connect(rabbitConnString);
    console.log("RabbitMQ connected succesfully");
    console.log("To exit press ctrl+c combination");
    const userName = await clientWelcome();
    printServerHelp();
    process.on("SIGINT", () => {
        console.log("Caught interrupt, cleaingn up...");
        process.exit(0);
    });
    const state = { isPaused: true };
    const ch = await conn.createConfirmChannel();
    await ch.assertExchange(ExchangePerilDirect, "direct", { durable: true });
    await declareAndBind(conn, ExchangePerilDirect, `${PauseKey}.${userName}`, PauseKey, SimpleQueueType.Transient);
    const gameState = new GameState(userName);
    gameState.pauseGame();
    state.isPaused = gameState.isPaused();
    await publishJSON(ch, ExchangePerilDirect, PauseKey, state);
    let shouldExit = false;
    process.once("SIGINT", () => {
        console.log("Exiting...");
        shouldExit = true;
    });
    while (true) {
        if (shouldExit) {
            break;
        }
        const words = await getInput();
        if (words.length === 0) {
            continue;
        }
        const command = words[0]?.trim().toLowerCase();
        if (!command) {
            continue;
        }
        if (command === "pause") {
            console.log("sending a pause message...");
            const pauseState = { isPaused: true };
            gameState.pauseGame();
            await publishJSON(ch, ExchangePerilDirect, PauseKey, pauseState);
        }
        if (command === "spawn") {
            try {
                commandSpawn(gameState, words);
            }
            catch (err) {
                console.log(err.message);
            }
            continue;
        }
        if (command === "move") {
            try {
                const move = commandMove(gameState, words);
                console.log(`Move succeeded: moved ${move.units.length} unit(s) to ${move.toLocation}`);
            }
            catch (err) {
                console.log(err.message);
            }
            continue;
        }
        if (command === "help") {
            printClientHelp();
            continue;
        }
        if (command === "spam") {
            console.log("Spamming not allowed yet!");
            continue;
        }
        if (command === "status") {
            await commandStatus(gameState);
            continue;
        }
        if (command === "resume") {
            console.log("sending resume message");
            const resumeState = { isPaused: false };
            gameState.resumeGame();
            await publishJSON(ch, ExchangePerilDirect, PauseKey, resumeState);
            continue;
        }
        if (command === "quit") {
            console.log("Exiting...");
            printQuit();
            break;
        }
        if (command === "help") {
            printServerHelp();
            continue;
        }
        console.log(`Unknown command: ${command}`);
    }
    await ch.close();
    await conn.close();
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
