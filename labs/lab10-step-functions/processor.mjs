// Lambda — process payment (đôi khi fail để demo Retry)
export const handler = async (event) => {
  console.log("process:", JSON.stringify(event));
  // 30% xác suất fail để Step Functions retry
  if (Math.random() < 0.3) {
    const err = new Error("downstream timeout");
    err.name = "TransientError";
    throw err;
  }
  return { ...event, processed: true, transactionId: `tx-${Date.now()}` };
};
