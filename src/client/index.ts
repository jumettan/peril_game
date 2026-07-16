import amqp, { type ConfirmChannel } from "amqplib";
import { publishJSON, publishMsgPack } from "../internal/pubsub/publish.js";
import { ArmyMovesPrefix, ExchangePerilDeadLetter, ExchangePerilDirect, ExchangePerilTopic, GameLogSlug, PauseKey, WarRecognitionsPrefix } from "../internal/routing/routing.js";
import { GameState, type PlayingState } from "../internal/gamelogic/gamestate.js";
import { clientWelcome, commandStatus, getInput, getMaliciousLog, printClientHelp, printQuit, printServerHelp } from "../internal/gamelogic/gamelogic.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/consume.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { subscribeJSON } from "../internal/pubsub/subscribe.js";
import { handlerMove, handlerPause, handlerWar } from "./handlers.js";
import type { GameLog } from "../internal/gamelogic/logs.js";

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


  const state: PlayingState = { isPaused: true };
  const ch = await conn.createConfirmChannel();
  await ch.assertExchange(ExchangePerilDirect, "direct", { durable: true });
  await ch.assertExchange(ExchangePerilTopic, "topic", { durable: true });
  await ch.assertExchange(ExchangePerilDeadLetter, "fanout", { durable: true });
  await declareAndBind(conn, ExchangePerilDirect, `${PauseKey}.${userName}`, PauseKey, SimpleQueueType.Transient, ExchangePerilDeadLetter);
  const gameState = new GameState(userName);
  gameState.pauseGame();
  state.isPaused = gameState.isPaused();
  await subscribeJSON(conn, ExchangePerilDirect, `pause.${userName}`, PauseKey, SimpleQueueType.Transient, handlerPause(gameState));
  await subscribeJSON(conn, ExchangePerilTopic, `army_moves.${userName}`, `${ArmyMovesPrefix}.*`, SimpleQueueType.Transient, handlerMove(gameState, ch));
  await subscribeJSON(conn, ExchangePerilTopic, WarRecognitionsPrefix, `${WarRecognitionsPrefix}.*`, SimpleQueueType.Durable, handlerWar(gameState, ch));
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
      const pauseState: PlayingState = { isPaused: true };
      gameState.pauseGame();
      await publishJSON(ch, ExchangePerilDirect, PauseKey, pauseState);
    }
    if (command === "spawn") {
      try {
        commandSpawn(gameState, words);
      } catch (err) {
        console.log((err as Error).message);
      }
      continue;
    }

    if (command === "move") {
      try {
        const move = commandMove(gameState, words)
        console.log(`Move succeeded: moved ${move.units.length} unit(s) to ${move.toLocation}`)
        await publishJSON(ch, ExchangePerilTopic, `army_moves.${userName}`, move);
        console.log("Move published successfully.");

      } catch (err) {
        console.log((err as Error).message);
      }
      continue;
    }

    if (command === "help") {
      printClientHelp();
      continue;
    }
    if (command === "spam") {
      const value = words[1];
      if (!value) {
        console.log("Please provide a number.");
        continue;
      }


      const count = Number.parseInt(value, 10)

      if (Number.isNaN(count)) {
        console.log("Please provide a number.");
        continue;
      }

      for (let i = 0; i < count; i++) {
        await publishGameLog(ch, userName, getMaliciousLog());
      }
      continue;
    }
    if (command === "status") {
      await commandStatus(gameState);
      continue;
    }
    if (command === "resume") {
      console.log("sending resume message");
      const resumeState: PlayingState = { isPaused: false };
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

    console.log(`Unknown command: ${command}`)

  }
  await ch.close();
  await conn.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});


export async function publishGameLog(
  ch: ConfirmChannel,
  username: string,
  message: string,
): Promise<void> {
  const gamelog: GameLog = {
    username,
    message,
    currentTime: new Date(),
  };
  await publishMsgPack(ch, ExchangePerilTopic, `${GameLogSlug}.${username}`, gamelog);
}