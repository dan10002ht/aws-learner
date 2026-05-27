// Lambda — validate order
export const handler = async (event) => {
  console.log("validate:", JSON.stringify(event));
  if (!event.orderId) throw new Error("missing orderId");
  if (event.amount > 10000) {
    const err = new Error("amount too large");
    err.name = "AmountTooLargeError";
    throw err;
  }
  return { ...event, validated: true };
};
