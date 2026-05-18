// Lambda handler — Node.js 20+ (ESM)
// Runtime: nodejs20.x
// Event: S3 ObjectCreated notification

export const handler = async (event, context) => {
  console.log("=== S3 Event received ===");
  console.log(JSON.stringify(event, null, 2));

  const records = event.Records ?? [];
  for (const record of records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const size = record.s3.object.size ?? 0;
    const eventName = record.eventName;
    console.log(`[${eventName}] s3://${bucket}/${key} (${size} bytes)`);
  }

  return { statusCode: 200, processed: records.length };
};
