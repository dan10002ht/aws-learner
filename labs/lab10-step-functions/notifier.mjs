// Lambda — send notification (success path)
export const handler = async (event) => {
  console.log("notify:", JSON.stringify(event));
  return { ...event, notified: true };
};
