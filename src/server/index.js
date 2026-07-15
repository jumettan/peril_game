import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publish.js";
import { ExchangePerilDirect, ExchangePerilTopic, GameLogSlug, PauseKey } from "../internal/routing/routing.js";
import { declareAndBind, SimpleQueueType } from "../internal/pubsub/consume.js";
async function main() {
    const rabbitConnString = "amqp://guest:guest@localhost:5672/";
    const conn = await amqp.connect(rabbitConnString);
    console.log("RabbitMQ connected succesfully");
    console.log("To exit press ctrl+c combination");
    process.on("SIGINT", () => {
        console.log("Caught interrupt, cleaingn up...");
        process.exit(0);
    });
    const state = { isPaused: true };
    const ch = await conn.createConfirmChannel();
    await ch.assertExchange(ExchangePerilDirect, "direct", { durable: true });
    await ch.assertExchange(ExchangePerilTopic, "topic", { durable: true });
    await publishJSON(ch, ExchangePerilDirect, PauseKey, state);
    await declareAndBind(conn, ExchangePerilTopic, GameLogSlug, "game_logs.*", SimpleQueueType.Durable);
    console.log("Waiting for interrupt...");
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
