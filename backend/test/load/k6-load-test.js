import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const messagesSent = new Counter('messages_sent');
const messagesReceived = new Counter('messages_received');
const wsConnections = new Counter('websocket_connections');
const wsErrors = new Rate('websocket_errors');
const messageLatency = new Trend('message_latency');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000';

function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  const randomPart = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
  return timestamp + randomPart;
}

function generateUserId() {
  return generateObjectId();
}

function generateChatId() {
  const chatIds = [
    '507f1f77bcf86cd799439011',
    '507f1f77bcf86cd799439012',
    '507f1f77bcf86cd799439013',
    '507f1f77bcf86cd799439014',
    '507f1f77bcf86cd799439015',
  ];
  return chatIds[Math.floor(Math.random() * chatIds.length)];
}

function generateMessage() {
  return {
    content: `Test message ${Date.now()} - ${Math.random().toString(36).substring(7)}`,
    sender: generateUserId(),
    chat: generateChatId(),
  };
}

export const options = {
  scenarios: {
    rest_api_load: {
      executor: 'ramping-vus',
      exec: 'testRestAPI',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },

    websocket_load: {
      executor: 'ramping-vus',
      exec: 'testWebSocket',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 30 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 60 },
        { duration: '5m', target: 60 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '1m',
    },

    spike_test: {
      executor: 'ramping-vus',
      exec: 'testRestAPI',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '2m', target: 70 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 0 },
      ],
      startTime: '18m',
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    websocket_errors: ['rate<0.05'],
    message_latency: ['p(95)<200'],
  },
};

export function testRestAPI() {
  const chatId = generateChatId();

  let response = http.get(`${BASE_URL}/messages`, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'GET /messages status is 200': (r) => r.status === 200,
    'GET /messages response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  const newMessage = generateMessage();
  response = http.post(`${BASE_URL}/messages`, JSON.stringify(newMessage), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'POST /messages status is 201': (r) => r.status === 201,
    'POST /messages response time < 500ms': (r) => r.timings.duration < 500,
    'POST /messages returns message id': (r) =>
      JSON.parse(r.body)._id !== undefined,
  });

  const createdMessageId =
    response.status === 201 ? JSON.parse(response.body)._id : null;

  sleep(1);

  response = http.get(`${BASE_URL}/messages/chat/${chatId}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'GET /messages/chat/:id status is 200': (r) => r.status === 200,
    'GET /messages/chat/:id response time < 500ms': (r) =>
      r.timings.duration < 500,
  });

  sleep(1);

  if (createdMessageId) {
    response = http.get(`${BASE_URL}/messages/${createdMessageId}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(response, {
      'GET /messages/:id status is 200': (r) => r.status === 200,
      'GET /messages/:id returns correct message': (r) => {
        const body = JSON.parse(r.body);
        return body._id === createdMessageId;
      },
    });

    sleep(1);

    response = http.patch(
      `${BASE_URL}/messages/${createdMessageId}`,
      JSON.stringify({ content: 'Updated message content' }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    check(response, {
      'PATCH /messages/:id status is 200': (r) => r.status === 200,
      'PATCH /messages/:id marks as edited': (r) =>
        JSON.parse(r.body).edited === true,
    });

    sleep(1);
  }

  response = http.get(`${BASE_URL}/messages/chat/${chatId}/stats`, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'GET /messages/chat/:id/stats status is 200': (r) => r.status === 200,
    'GET /messages/chat/:id/stats has totalMessages': (r) => {
      const body = JSON.parse(r.body);
      return body.totalMessages !== undefined;
    },
  });

  sleep(2);
}

export function testWebSocket() {
  const userId = generateUserId();
  const chatId = generateChatId();
  const url = `${WS_URL}?userId=${userId}`;

  const params = { tags: { name: 'WebSocketTest' } };

  const startTime = Date.now();
  let messagesReceivedCount = 0;

  const response = ws.connect(url, params, function (socket) {
    wsConnections.add(1);

    socket.on('open', () => {
      console.log(`WebSocket connected for user ${userId}`);

      socket.send(
        JSON.stringify({
          event: 'joinChat',
          data: { chatId: chatId },
        }),
      );

      sleep(1);

      for (let i = 0; i < 10; i++) {
        const messageData = {
          event: 'sendMessage',
          data: {
            content: `WebSocket message ${i} from ${userId}`,
            sender: userId,
            chat: chatId,
          },
        };

        const sendTime = Date.now();
        socket.send(JSON.stringify(messageData));
        messagesSent.add(1);

        sleep(2);

        socket.send(
          JSON.stringify({
            event: 'typing',
            data: {
              chatId: chatId,
              isTyping: i % 2 === 0,
            },
          }),
        );

        sleep(1);
      }

      sleep(2);
      socket.send(
        JSON.stringify({
          event: 'leaveChat',
          data: { chatId: chatId },
        }),
      );

      sleep(1);
      socket.close();
    });

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messagesReceivedCount++;
        messagesReceived.add(1);

        const latency = Date.now() - startTime;
        messageLatency.add(latency);

        check(message, {
          'WebSocket message has valid structure': (m) =>
            m !== null && typeof m === 'object',
        });
      } catch (e) {
        wsErrors.add(1);
        console.error('Error parsing WebSocket message:', e);
      }
    });

    socket.on('error', (e) => {
      wsErrors.add(1);
      console.error('WebSocket error:', e);
    });

    socket.on('close', () => {
      console.log(
        `WebSocket closed for user ${userId}. Received ${messagesReceivedCount} messages`,
      );
    });

    socket.setTimeout(() => {
      socket.close();
    }, 30000);
  });

  check(response, {
    'WebSocket connection established': (r) => r && r.status === 101,
  });
}

export function setup() {
  console.log('Starting load tests...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);

  for (let i = 0; i < 5; i++) {
    const message = generateMessage();
    http.post(`${BASE_URL}/messages`, JSON.stringify(message), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  sleep(2);
  console.log('Setup complete. Starting test scenarios...');
}

export function teardown(data) {
  console.log('Load tests completed.');
  console.log('Check the results for performance metrics and thresholds.');
}

export default function () {
  testRestAPI();
}
