import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiErrors = new Counter('api_errors');
const wsConnectionFailures = new Rate('ws_connection_failures');
const responseTime = new Trend('response_time');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000';

// Stress Test Configuration - Push system beyond normal capacity
export const options = {
  scenarios: {
    // Extreme load scenario
    extreme_load: {
      executor: 'ramping-vus',
      exec: 'stressTestAPI',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Ramp up to 100 users
        { duration: '3m', target: 300 },   // Spike to 300 users
        { duration: '5m', target: 500 },   // Push to 500 users
        { duration: '3m', target: 800 },   // Extreme: 800 users
        { duration: '5m', target: 1000 },  // Maximum: 1000 users
        { duration: '5m', target: 1000 },  // Sustain peak load
        { duration: '3m', target: 500 },   // Begin recovery
        { duration: '3m', target: 100 },   // Return to baseline
        { duration: '2m', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '1m',
    },

    // Concurrent WebSocket connections stress
    websocket_stress: {
      executor: 'ramping-vus',
      exec: 'stressTestWebSocket',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // 100 concurrent connections
        { duration: '3m', target: 300 },   // 300 concurrent connections
        { duration: '5m', target: 500 },   // 500 concurrent connections
        { duration: '5m', target: 500 },   // Sustain 500 connections
        { duration: '3m', target: 100 },   // Recovery
        { duration: '2m', target: 0 },     // Shutdown
      ],
      startTime: '2m',
      gracefulRampDown: '1m',
    },

    // Constant high load
    constant_stress: {
      executor: 'constant-vus',
      exec: 'stressTestAPI',
      vus: 400,
      duration: '10m',
      startTime: '28m', // After ramping scenarios
    },
  },

  thresholds: {
    // More relaxed thresholds for stress testing
    http_req_duration: ['p(90)<2000', 'p(95)<3000', 'p(99)<5000'],
    http_req_failed: ['rate<0.1'], // Accept up to 10% error rate under stress
    ws_connection_failures: ['rate<0.2'], // Accept up to 20% WebSocket failures
    response_time: ['p(95)<3000'],
  },
};

function generateRandomData() {
  return {
    content: `Stress test message ${Date.now()} ${Math.random().toString(36)}`,
    sender: `user_${Math.floor(Math.random() * 5000)}`,
    chat: `chat_${Math.floor(Math.random() * 50)}`,
  };
}

// Stress Test: API with minimal sleep to maximize load
export function stressTestAPI() {
  const chatId = `chat_${Math.floor(Math.random() * 50)}`;
  
  // Batch of rapid requests
  const requests = [
    { method: 'GET', url: `${BASE_URL}/messages?limit=100` },
    { method: 'GET', url: `${BASE_URL}/messages/chat/${chatId}` },
    { method: 'POST', url: `${BASE_URL}/messages`, body: JSON.stringify(generateRandomData()) },
  ];

  const responses = http.batch(requests.map(req => ({
    method: req.method,
    url: req.url,
    body: req.body,
    params: { headers: { 'Content-Type': 'application/json' } },
  })));

  responses.forEach((response, index) => {
    const success = check(response, {
      'status is 2xx or 3xx': (r) => r.status >= 200 && r.status < 400,
    });

    if (!success) {
      apiErrors.add(1);
    }

    responseTime.add(response.timings.duration);
  });

  // Minimal sleep to maintain high load
  sleep(0.1);

  // Create multiple messages rapidly
  for (let i = 0; i < 5; i++) {
    const response = http.post(
      `${BASE_URL}/messages`,
      JSON.stringify(generateRandomData()),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (response.status !== 201) {
      apiErrors.add(1);
    }
  }

  sleep(0.2);

  // Pagination stress - request large datasets
  const paginationTests = [
    `${BASE_URL}/messages?page=1&limit=1000`,
    `${BASE_URL}/messages?page=2&limit=1000`,
    `${BASE_URL}/messages/chat/${chatId}?page=1&limit=500`,
  ];

  paginationTests.forEach(url => {
    const response = http.get(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    check(response, {
      'pagination request successful': (r) => r.status === 200,
    });
  });

  sleep(0.1);
}

// Stress Test: WebSocket with rapid messaging
export function stressTestWebSocket() {
  const userId = `stress_user_${Math.floor(Math.random() * 5000)}`;
  const chatId = `chat_${Math.floor(Math.random() * 50)}`;
  const url = `${WS_URL}?userId=${userId}`;

  const response = ws.connect(url, { tags: { name: 'StressTest' } }, function (socket) {
    let connectionSuccess = false;

    socket.on('open', () => {
      connectionSuccess = true;

      // Join chat immediately
      socket.send(JSON.stringify({
        event: 'joinChat',
        data: { chatId: chatId }
      }));

      // Send burst of messages
      for (let i = 0; i < 50; i++) {
        socket.send(JSON.stringify({
          event: 'sendMessage',
          data: {
            content: `Stress burst message ${i} from ${userId}`,
            sender: userId,
            chat: chatId,
          }
        }));

        // Very short sleep between messages
        if (i % 10 === 0) {
          sleep(0.1);
        }
      }

      // Rapid typing indicators
      for (let i = 0; i < 20; i++) {
        socket.send(JSON.stringify({
          event: 'typing',
          data: { chatId: chatId, isTyping: i % 2 === 0 }
        }));
      }

      sleep(1);

      // Leave chat and close
      socket.send(JSON.stringify({
        event: 'leaveChat',
        data: { chatId: chatId }
      }));

      socket.close();
    });

    socket.on('error', (e) => {
      wsConnectionFailures.add(1);
      console.error(`WebSocket error for ${userId}:`, e);
    });

    socket.on('close', () => {
      if (!connectionSuccess) {
        wsConnectionFailures.add(1);
      }
    });

    // Timeout after 15 seconds
    socket.setTimeout(() => {
      socket.close();
    }, 15000);
  });

  check(response, {
    'WebSocket stress connection established': (r) => r && r.status === 101,
  });

  sleep(0.5);
}

// Soak test function - sustained load over time
export function soakTest() {
  stressTestAPI();
  
  if (Math.random() > 0.7) {
    stressTestWebSocket();
  }
  
  sleep(1);
}

export function setup() {
  console.log('='.repeat(60));
  console.log('STRESS TEST STARTING');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`WebSocket: ${WS_URL}`);
  console.log('WARNING: This test will push the system to its limits');
  console.log('='.repeat(60));

  // Create baseline data
  const warmupRequests = [];
  for (let i = 0; i < 20; i++) {
    warmupRequests.push({
      method: 'POST',
      url: `${BASE_URL}/messages`,
      body: JSON.stringify(generateRandomData()),
      params: { headers: { 'Content-Type': 'application/json' } },
    });
  }

  http.batch(warmupRequests);
  sleep(3);
}

export function teardown(data) {
  console.log('='.repeat(60));
  console.log('STRESS TEST COMPLETED');
  console.log('='.repeat(60));
  console.log('Review metrics for system behavior under stress');
  console.log('Check for:');
  console.log('- Response time degradation');
  console.log('- Error rate increases');
  console.log('- System recovery after peak load');
  console.log('- Resource utilization patterns');
  console.log('='.repeat(60));
}

export default function () {
  stressTestAPI();
}