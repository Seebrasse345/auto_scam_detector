#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import https from 'https';

// Threat detection patterns
const THREAT_PATTERNS = {
  crypto_scam: [
    /\b(btc|eth|bitcoin|ethereum|wallet)\b.*\b(send|donate|contribute)\b/i,
    /\b0x[a-fA-F0-9]{40}\b/, // Ethereum address
    /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/, // Bitcoin address
  ],
  social_engineering: [
    /curl.*\|.*sh/i,
    /wget.*\|.*bash/i,
    /labcanary/i,
    /liberation/i,
    /exfiltrate/i,
  ],
  malicious_links: [
    /bit\.ly/i,
    /tinyurl/i,
    /goo\.gl/i,
  ]
};

class MoltbookMCP {
  constructor() {
    this.apiKey = process.env.MOLTBOOK_API_KEY;
    if (!this.apiKey) {
      console.error('⚠️  MOLTBOOK_API_KEY not set');
    }
    this.baseUrl = 'www.moltbook.com';
    this.apiPath = '/api/v1';
  }

  // HTTP request helper
  async request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: `${this.apiPath}${path}`,
        method,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }
      };

      if (body) {
        const postData = JSON.stringify(body);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`API error ${res.statusCode}: ${parsed.error || data}`));
            }
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  // Threat detection
  detectThreats(text) {
    const threats = [];
    
    for (const [category, patterns] of Object.entries(THREAT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          threats.push({
            category,
            pattern: pattern.toString(),
            severity: category === 'social_engineering' ? 'HIGH' : 'MEDIUM'
          });
        }
      }
    }
    
    return threats;
  }

  // API Methods
  async getPosts(limit = 20) {
    return this.request('GET', `/posts?limit=${limit}`);
  }

  async getPost(postId) {
    return this.request('GET', `/posts/${postId}`);
  }

  async createPost(text, submolt = null) {
    const body = { text };
    if (submolt) body.submolt = submolt;
    return this.request('POST', '/posts', body);
  }

  async createComment(postId, text) {
    return this.request('POST', `/posts/${postId}/comments`, { text });
  }

  async upvote(postId) {
    return this.request('POST', `/posts/${postId}/upvote`);
  }

  async followUser(username) {
    return this.request('POST', `/users/${username}/follow`);
  }

  async unfollowUser(username) {
    return this.request('DELETE', `/users/${username}/follow`);
  }

  async getUser(username) {
    return this.request('GET', `/users/${username}`);
  }

  async searchPosts(query, limit = 20) {
    return this.request('GET', `/search/posts?q=${encodeURIComponent(query)}&limit=${limit}`);
  }
}

// MCP Server
const moltbook = new MoltbookMCP();
const server = new Server(
  {
    name: "moltbot-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "moltbook_get_posts",
        description: "Get recent posts from Moltbook feed",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of posts to retrieve (default 20)",
              default: 20
            }
          }
        }
      },
      {
        name: "moltbook_get_post",
        description: "Get a specific post with comments",
        inputSchema: {
          type: "object",
          properties: {
            postId: {
              type: "string",
              description: "Post ID"
            }
          },
          required: ["postId"]
        }
      },
      {
        name: "moltbook_create_post",
        description: "Create a new post on Moltbook",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Post content"
            },
            submolt: {
              type: "string",
              description: "Optional submolt name (e.g. 'lobstakingdom')"
            }
          },
          required: ["text"]
        }
      },
      {
        name: "moltbook_create_comment",
        description: "Comment on a post",
        inputSchema: {
          type: "object",
          properties: {
            postId: {
              type: "string",
              description: "Post ID to comment on"
            },
            text: {
              type: "string",
              description: "Comment content"
            }
          },
          required: ["postId", "text"]
        }
      },
      {
        name: "moltbook_upvote",
        description: "Upvote a post",
        inputSchema: {
          type: "object",
          properties: {
            postId: {
              type: "string",
              description: "Post ID to upvote"
            }
          },
          required: ["postId"]
        }
      },
      {
        name: "moltbook_follow",
        description: "Follow an agent",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "Username to follow"
            }
          },
          required: ["username"]
        }
      },
      {
        name: "moltbook_unfollow",
        description: "Unfollow an agent",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "Username to unfollow"
            }
          },
          required: ["username"]
        }
      },
      {
        name: "moltbook_get_user",
        description: "Get user profile information",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "Username to look up"
            }
          },
          required: ["username"]
        }
      },
      {
        name: "moltbook_search",
        description: "Search posts on Moltbook",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query"
            },
            limit: {
              type: "number",
              description: "Number of results (default 20)",
              default: 20
            }
          },
          required: ["query"]
        }
      },
      {
        name: "moltbook_detect_threats",
        description: "Scan text content for security threats (scams, social engineering, malicious patterns)",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text to scan for threats"
            }
          },
          required: ["text"]
        }
      }
    ]
  };
});

// Tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "moltbook_get_posts":
        const posts = await moltbook.getPosts(args.limit);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(posts, null, 2)
          }]
        };

      case "moltbook_get_post":
        const post = await moltbook.getPost(args.postId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(post, null, 2)
          }]
        };

      case "moltbook_create_post":
        const newPost = await moltbook.createPost(args.text, args.submolt);
        return {
          content: [{
            type: "text",
            text: `✅ Posted! https://www.moltbook.com/post/${newPost.id}`
          }]
        };

      case "moltbook_create_comment":
        const comment = await moltbook.createComment(args.postId, args.text);
        return {
          content: [{
            type: "text",
            text: `✅ Commented! ID: ${comment.id}`
          }]
        };

      case "moltbook_upvote":
        await moltbook.upvote(args.postId);
        return {
          content: [{
            type: "text",
            text: "✅ Upvoted!"
          }]
        };

      case "moltbook_follow":
        await moltbook.followUser(args.username);
        return {
          content: [{
            type: "text",
            text: `✅ Now following ${args.username}`
          }]
        };

      case "moltbook_unfollow":
        await moltbook.unfollowUser(args.username);
        return {
          content: [{
            type: "text",
            text: `✅ Unfollowed ${args.username}`
          }]
        };

      case "moltbook_get_user":
        const user = await moltbook.getUser(args.username);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(user, null, 2)
          }]
        };

      case "moltbook_search":
        const results = await moltbook.searchPosts(args.query, args.limit);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(results, null, 2)
          }]
        };

      case "moltbook_detect_threats":
        const threats = moltbook.detectThreats(args.text);
        if (threats.length === 0) {
          return {
            content: [{
              type: "text",
              text: "✅ No threats detected"
            }]
          };
        }
        return {
          content: [{
            type: "text",
            text: `⚠️ THREATS DETECTED:\n${JSON.stringify(threats, null, 2)}`
          }]
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🦞 MoltBot MCP server running");
}

main().catch(console.error);
