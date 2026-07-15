import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilDeadLetter, ExchangePerilDirect, ExchangePerilTopic, GameLogSlug, PauseKey } from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";
import type { GameLog } from "../internal/gamelogic/logs.js";
import { writeLog } from "../internal/gamelogic/logs.js";
import { SimpleQueueType } from "../internal/pubsub/consume.js";
import { AckType, subscribeMsgPack } from "../internal/pubsub/subscribe.js";

async function main() {
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("RabbitMQ connected succesfully");
  console.log("To exit press ctrl+c combination");
  process.on("SIGINT", () => {
    console.log("Caught interrupt, cleaingn up...");
    process.exit(0);
  })
  const state: PlayingState = { isPaused: true };
  const ch = await conn.createConfirmChannel();
  await ch.assertExchange(ExchangePerilDirect, "direct", { durable: true });
  await ch.assertExchange(ExchangePerilTopic, "topic", { durable: true });
  await ch.assertExchange(ExchangePerilDeadLetter, "fanout", { durable: true });
  await subscribeMsgPack<GameLog>(
    conn,
    ExchangePerilTopic,
    GameLogSlug,
    `${GameLogSlug}.*`,
    SimpleQueueType.Durable,
    async (gameLog) => {
      await writeLog(gameLog);
      process.stdout.write("> ");
      return AckType.Ack;
    },
  );

  await publishJSON(ch, ExchangePerilDirect, PauseKey, state);
  console.log("Waiting for interrupt...");
}
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
