// Lambda — API Gateway proxy integration
// Runtime: nodejs20.x
// Event: API Gateway REST proxy event format

export const handler = async (event) => {
  console.log("=== APIGW event ===");
  console.log(JSON.stringify({
    path: event.path,
    method: event.httpMethod,
    queryStringParameters: event.queryStringParameters,
    headers: Object.keys(event.headers ?? {}),
  }));

  const name = event.queryStringParameters?.name ?? "world";
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      message: `hello, ${name}`,
      path: event.path,
      method: event.httpMethod,
      timestamp: new Date().toISOString(),
    }),
  };
};
