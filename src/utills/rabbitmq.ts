import * as amqp from "amqplib";

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

export const connectRabbitMQ = async () => {
  try {
    const rmqUrl = process.env.RABBITMQ_URL || "amqp://localhost";
    connection = await amqp.connect(rmqUrl);
    channel = await connection.createChannel();
    
    await channel.assertQueue("votes.incoming", {
      durable: true,
    });
    
    // Assert DLQ
    await channel.assertQueue("votes.failed", {
      durable: true,
    });

    console.log("🐰 Connected to RabbitMQ");
  } catch (error) {
    console.error("Failed to connect to RabbitMQ", error);
  }
};

export const getChannel = () => {
    if (!channel) {
        throw new Error("RabbitMQ channel is not initialized");
    }
    return channel;
};

export const publishVote = async (message: {
  pollId: number;
  optionId: number;
  userId: number;
  voteId: string;
}) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    
    const queue = "votes.incoming";
    channel!.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
    
  } catch (error) {
    console.error("Failed to publish vote message", error);
    throw error;
  }
};
