// Lambda — consume DynamoDB Streams
// Runtime: nodejs20.x

export const handler = async (event) => {
  console.log("=== DDB Stream event ===");
  for (const record of event.Records ?? []) {
    const { eventName, dynamodb } = record;
    const keys = dynamodb?.Keys ?? {};
    const newImg = dynamodb?.NewImage;
    const oldImg = dynamodb?.OldImage;
    console.log(`[${eventName}] keys=${JSON.stringify(keys)}`);
    if (newImg) console.log(`  NEW: ${JSON.stringify(newImg)}`);
    if (oldImg) console.log(`  OLD: ${JSON.stringify(oldImg)}`);
  }
  return { processed: event.Records?.length ?? 0 };
};
